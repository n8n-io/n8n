'use strict';
var __decorate =
	(this && this.__decorate) ||
	function (decorators, target, key, desc) {
		var c = arguments.length,
			r =
				c < 3
					? target
					: desc === null
						? (desc = Object.getOwnPropertyDescriptor(target, key))
						: desc,
			d;
		if (typeof Reflect === 'object' && typeof Reflect.decorate === 'function')
			r = Reflect.decorate(decorators, target, key, desc);
		else
			for (var i = decorators.length - 1; i >= 0; i--)
				if ((d = decorators[i]))
					r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
		return c > 3 && r && Object.defineProperty(target, key, r), r;
	};
var __metadata =
	(this && this.__metadata) ||
	function (k, v) {
		if (typeof Reflect === 'object' && typeof Reflect.metadata === 'function')
			return Reflect.metadata(k, v);
	};
var __importDefault =
	(this && this.__importDefault) ||
	function (mod) {
		return mod && mod.__esModule ? mod : { default: mod };
	};
var _a, _b;
Object.defineProperty(exports, '__esModule', { value: true });
exports.BinaryExportService = void 0;
const backend_common_1 = require('@n8n/backend-common');
const di_1 = require('@n8n/di');
const n8n_core_1 = require('n8n-core');
const n8n_workflow_1 = require('n8n-workflow');
const crypto_1 = require('crypto');
const fs_1 = require('fs');
const path_1 = require('path');
const archiver_1 = __importDefault(require('archiver'));
const binary_data_service_1 = require('./binary-data.service');
const event_service_1 = require('@/events/event.service');
const workflow_repository_1 = require('@/databases/repositories/workflow.repository');
const execution_repository_1 = require('@/databases/repositories/execution.repository');
let BinaryExportService = class BinaryExportService {
	constructor(
		binaryDataService,
		coreBinaryDataService,
		workflowRepository,
		executionRepository,
		eventService,
		logger,
	) {
		this.binaryDataService = binaryDataService;
		this.coreBinaryDataService = coreBinaryDataService;
		this.workflowRepository = workflowRepository;
		this.executionRepository = executionRepository;
		this.eventService = eventService;
		this.logger = logger;
		this.tempDir = (0, path_1.join)(process.cwd(), 'temp', 'binary-exports');
		this.progressTracking = new Map();
		this.ensureTempDirectory();
		this.startProgressCleanupInterval();
	}
	async bulkExportBinaryData(user, request) {
		const exportId = `bulk-export-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
		const operationId = `operation-${exportId}`;
		try {
			this.logger.info('Starting bulk binary data export', {
				exportId,
				userId: user.id,
				workflowIds: request.workflowIds?.length || 0,
				executionIds: request.executionIds?.length || 0,
				binaryDataIds: request.binaryDataIds?.length || 0,
				includeWorkflowData: request.includeWorkflowData,
				includeExecutionData: request.includeExecutionData,
				outputFormat: request.outputFormat || 'zip',
			});
			this.initializeProgressTracking(operationId, 'bulk-export');
			const { binaryDataIds, workflows, executions } = await this.resolveBulkExportData(request);
			if (
				binaryDataIds.length === 0 &&
				!request.includeWorkflowData &&
				!request.includeExecutionData
			) {
				throw new n8n_workflow_1.ApplicationError('No data found matching the specified criteria');
			}
			this.updateProgress(operationId, binaryDataIds.length, 0);
			const exportPath = (0, path_1.join)(
				this.tempDir,
				`${exportId}.${request.outputFormat || 'zip'}`,
			);
			const exportResult = await this.createBulkExportPackage(
				{
					binaryDataIds,
					workflows: request.includeWorkflowData ? workflows : [],
					executions: request.includeExecutionData ? executions : [],
				},
				exportPath,
				request.outputFormat || 'zip',
				request.compressionLevel || 6,
				operationId,
			);
			const result = {
				exportId,
				exportPath,
				totalFiles: exportResult.totalFiles,
				totalWorkflows: workflows.length,
				totalExecutions: executions.length,
				totalBinaryFiles: binaryDataIds.length,
				originalSize: exportResult.originalSize,
				compressedSize: exportResult.compressedSize,
				compressionRatio:
					exportResult.originalSize > 0
						? exportResult.compressedSize / exportResult.originalSize
						: 0,
				checksum: exportResult.checksum,
				metadata: {
					exportedAt: new Date(),
					exportedBy: user.id,
					exportFormat: request.outputFormat || 'zip',
					includesWorkflowData: request.includeWorkflowData || false,
					includesExecutionData: request.includeExecutionData || false,
					binaryDataIds,
				},
			};
			this.completeProgressTracking(operationId);
			this.eventService.emit('bulk-binary-export-completed', {
				exportId,
				userId: user.id,
				totalFiles: result.totalFiles,
				totalBinaryFiles: result.totalBinaryFiles,
				compressedSize: result.compressedSize,
			});
			this.logger.info('Bulk binary data export completed', {
				exportId,
				totalFiles: result.totalFiles,
				totalBinaryFiles: result.totalBinaryFiles,
				compressionRatio: result.compressionRatio,
			});
			return result;
		} catch (error) {
			this.failProgressTracking(
				operationId,
				error instanceof Error ? error.message : 'Unknown error',
			);
			this.logger.error('Bulk binary data export failed', {
				exportId,
				userId: user.id,
				error: error instanceof Error ? error.message : 'Unknown error',
			});
			this.eventService.emit('bulk-binary-export-failed', {
				exportId,
				userId: user.id,
				error: error instanceof Error ? error.message : 'Unknown error',
			});
			throw error;
		}
	}
	async createWorkflowPackage(user, request) {
		const packageId = `workflow-package-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
		const operationId = `operation-${packageId}`;
		try {
			this.logger.info('Starting workflow package creation', {
				packageId,
				userId: user.id,
				workflowId: request.workflowId,
				includeExecutions: request.includeExecutions,
				includeBinaryData: request.includeBinaryData,
			});
			this.initializeProgressTracking(operationId, 'workflow-package');
			const workflowData = await this.workflowRepository.findById(request.workflowId);
			if (!workflowData) {
				throw new n8n_workflow_1.ApplicationError(`Workflow not found: ${request.workflowId}`);
			}
			const executions = request.includeExecutions
				? await this.executionRepository.findManyByWorkflowId(
						request.workflowId,
						request.executionLimit || 50,
					)
				: [];
			const binaryDataIds = request.includeBinaryData
				? await this.findBinaryDataForWorkflow(request.workflowId)
				: [];
			this.updateProgress(operationId, 1 + executions.length + binaryDataIds.length, 0);
			const packagePath = (0, path_1.join)(this.tempDir, `${packageId}.zip`);
			const packageData = await this.createWorkflowPackageArchive(
				workflowData,
				executions,
				binaryDataIds,
				packagePath,
				request.compressionLevel || 6,
				operationId,
			);
			const result = {
				packageId,
				packagePath,
				workflowData: {
					id: workflowData.id,
					name: workflowData.name,
					active: workflowData.active,
					nodes: workflowData.nodes,
					connections: workflowData.connections,
					settings: workflowData.settings,
				},
				executionCount: executions.length,
				binaryFileCount: binaryDataIds.length,
				totalSize: packageData.compressedSize,
				checksum: packageData.checksum,
				metadata: {
					workflowId: request.workflowId,
					workflowName: workflowData.name,
					packagedAt: new Date(),
					packagedBy: user.id,
					n8nVersion: process.env.N8N_VERSION || 'unknown',
				},
			};
			this.completeProgressTracking(operationId);
			this.eventService.emit('workflow-package-created', {
				packageId,
				userId: user.id,
				workflowId: request.workflowId,
				totalSize: result.totalSize,
			});
			this.logger.info('Workflow package creation completed', {
				packageId,
				workflowId: request.workflowId,
				totalSize: result.totalSize,
			});
			return result;
		} catch (error) {
			this.failProgressTracking(
				operationId,
				error instanceof Error ? error.message : 'Unknown error',
			);
			this.logger.error('Workflow package creation failed', {
				packageId,
				userId: user.id,
				workflowId: request.workflowId,
				error: error instanceof Error ? error.message : 'Unknown error',
			});
			throw error;
		}
	}
	async searchBinaryData(user, request) {
		const operationId = `search-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
		try {
			this.logger.info('Starting binary data search', {
				userId: user.id,
				workflowIds: request.workflowIds?.length || 0,
				executionIds: request.executionIds?.length || 0,
				mimeTypeFilter: request.mimeTypeFilter?.length || 0,
				limit: request.limit || 50,
				offset: request.offset || 0,
			});
			this.initializeProgressTracking(operationId, 'binary-search');
			const searchResults = await this.performBinaryDataSearch(request);
			const result = {
				totalCount: searchResults.totalCount,
				results: searchResults.items,
				pagination: {
					limit: request.limit || 50,
					offset: request.offset || 0,
					hasMore: searchResults.totalCount > (request.offset || 0) + (request.limit || 50),
				},
			};
			this.completeProgressTracking(operationId);
			this.logger.info('Binary data search completed', {
				userId: user.id,
				totalCount: result.totalCount,
				returnedCount: result.results.length,
			});
			return result;
		} catch (error) {
			this.failProgressTracking(
				operationId,
				error instanceof Error ? error.message : 'Unknown error',
			);
			this.logger.error('Binary data search failed', {
				userId: user.id,
				error: error instanceof Error ? error.message : 'Unknown error',
			});
			throw error;
		}
	}
	async getOperationProgress(operationId) {
		return this.progressTracking.get(operationId) || null;
	}
	async listActiveOperations(user) {
		return Array.from(this.progressTracking.values()).filter(
			(progress) => progress.status === 'pending' || progress.status === 'in-progress',
		);
	}
	async cancelOperation(user, operationId) {
		const progress = this.progressTracking.get(operationId);
		if (!progress) {
			throw new n8n_workflow_1.ApplicationError(`Operation not found: ${operationId}`);
		}
		if (progress.status === 'completed' || progress.status === 'failed') {
			throw new n8n_workflow_1.ApplicationError(
				`Operation cannot be cancelled (status: ${progress.status})`,
			);
		}
		this.failProgressTracking(operationId, 'Cancelled by user');
		this.logger.info('Operation cancelled', {
			operationId,
			userId: user.id,
			operationType: progress.operationType,
		});
		return { cancelled: true };
	}
	async resolveBulkExportData(request) {
		let binaryDataIds = [];
		let workflows = [];
		let executions = [];
		if (request.binaryDataIds?.length) {
			binaryDataIds = request.binaryDataIds;
		}
		if (request.workflowIds?.length) {
			workflows = await this.workflowRepository.findManyByIds(request.workflowIds);
			if (!request.binaryDataIds?.length) {
				for (const workflowId of request.workflowIds) {
					const workflowBinaryData = await this.findBinaryDataForWorkflow(workflowId);
					binaryDataIds.push(...workflowBinaryData);
				}
			}
		}
		if (request.executionIds?.length) {
			executions = await this.executionRepository.findManyByIds(request.executionIds);
			if (!request.binaryDataIds?.length && !request.workflowIds?.length) {
				for (const executionId of request.executionIds) {
					const executionBinaryData = await this.findBinaryDataForExecution(executionId);
					binaryDataIds.push(...executionBinaryData);
				}
			}
		}
		binaryDataIds = [...new Set(binaryDataIds)];
		return {
			binaryDataIds,
			workflows,
			executions,
		};
	}
	async createBulkExportPackage(data, outputPath, format, compressionLevel, operationId) {
		const archive = (0, archiver_1.default)(format === 'zip' ? 'zip' : 'tar', {
			zlib: { level: compressionLevel },
		});
		const output = require('fs').createWriteStream(outputPath);
		archive.pipe(output);
		let originalSize = 0;
		let totalFiles = 0;
		let processed = 0;
		if (data.workflows.length > 0) {
			const workflowsData = JSON.stringify(data.workflows, null, 2);
			archive.append(workflowsData, { name: 'workflows.json' });
			originalSize += Buffer.byteLength(workflowsData, 'utf8');
			totalFiles++;
		}
		if (data.executions.length > 0) {
			const executionsData = JSON.stringify(data.executions, null, 2);
			archive.append(executionsData, { name: 'executions.json' });
			originalSize += Buffer.byteLength(executionsData, 'utf8');
			totalFiles++;
		}
		for (const binaryDataId of data.binaryDataIds) {
			try {
				const metadata = await this.binaryDataService.getBinaryDataMetadata(binaryDataId);
				const stream = await this.binaryDataService.getBinaryDataStream(binaryDataId);
				const buffer = await this.streamToBuffer(stream);
				const fileName = `binary-data/${binaryDataId.replace(/[/:]/g, '_')}`;
				archive.append(buffer, { name: fileName });
				const metadataFileName = `binary-data/${binaryDataId.replace(/[/:]/g, '_')}.meta.json`;
				archive.append(JSON.stringify(metadata, null, 2), { name: metadataFileName });
				originalSize += buffer.length;
				totalFiles += 2;
				processed++;
				this.updateProgress(operationId, data.binaryDataIds.length, processed, binaryDataId);
			} catch (error) {
				this.logger.warn('Failed to include binary data in export', {
					binaryDataId,
					error: error instanceof Error ? error.message : 'Unknown error',
				});
			}
		}
		const manifestData = {
			exportType: 'bulk-export',
			exportedAt: new Date().toISOString(),
			totalFiles,
			binaryDataCount: data.binaryDataIds.length,
			workflowCount: data.workflows.length,
			executionCount: data.executions.length,
			n8nVersion: process.env.N8N_VERSION || 'unknown',
		};
		archive.append(JSON.stringify(manifestData, null, 2), { name: 'manifest.json' });
		totalFiles++;
		await archive.finalize();
		const stats = await fs_1.promises.stat(outputPath);
		const compressedSize = stats.size;
		const fileBuffer = await fs_1.promises.readFile(outputPath);
		const checksum = this.calculateChecksum(fileBuffer);
		return {
			totalFiles,
			originalSize,
			compressedSize,
			checksum,
		};
	}
	async createWorkflowPackageArchive(
		workflow,
		executions,
		binaryDataIds,
		packagePath,
		compressionLevel,
		operationId,
	) {
		const archive = (0, archiver_1.default)('zip', {
			zlib: { level: compressionLevel },
		});
		const output = require('fs').createWriteStream(packagePath);
		archive.pipe(output);
		archive.append(JSON.stringify(workflow, null, 2), { name: 'workflow.json' });
		if (executions.length > 0) {
			archive.append(JSON.stringify(executions, null, 2), { name: 'executions.json' });
		}
		let processed = 1 + (executions.length > 0 ? 1 : 0);
		for (const binaryDataId of binaryDataIds) {
			try {
				const metadata = await this.binaryDataService.getBinaryDataMetadata(binaryDataId);
				const stream = await this.binaryDataService.getBinaryDataStream(binaryDataId);
				const buffer = await this.streamToBuffer(stream);
				const fileName = `binary-data/${binaryDataId.replace(/[/:]/g, '_')}`;
				archive.append(buffer, { name: fileName });
				const metadataFileName = `binary-data/${binaryDataId.replace(/[/:]/g, '_')}.meta.json`;
				archive.append(JSON.stringify(metadata, null, 2), { name: metadataFileName });
				processed++;
				this.updateProgress(
					operationId,
					1 + (executions.length > 0 ? 1 : 0) + binaryDataIds.length,
					processed,
				);
			} catch (error) {
				this.logger.warn('Failed to include binary data in package', {
					binaryDataId,
					error: error instanceof Error ? error.message : 'Unknown error',
				});
			}
		}
		const packageManifest = {
			packageType: 'workflow-package',
			workflowId: workflow.id,
			workflowName: workflow.name,
			packagedAt: new Date().toISOString(),
			executionCount: executions.length,
			binaryDataCount: binaryDataIds.length,
			n8nVersion: process.env.N8N_VERSION || 'unknown',
		};
		archive.append(JSON.stringify(packageManifest, null, 2), { name: 'package.json' });
		await archive.finalize();
		const stats = await fs_1.promises.stat(packagePath);
		const compressedSize = stats.size;
		const fileBuffer = await fs_1.promises.readFile(packagePath);
		const checksum = this.calculateChecksum(fileBuffer);
		return {
			compressedSize,
			checksum,
		};
	}
	async performBinaryDataSearch(request) {
		return {
			totalCount: 0,
			items: [],
		};
	}
	async findBinaryDataForWorkflow(workflowId) {
		return [];
	}
	async findBinaryDataForExecution(executionId) {
		return [];
	}
	initializeProgressTracking(operationId, operationType) {
		this.progressTracking.set(operationId, {
			operationId,
			operationType,
			status: 'pending',
			progress: {
				current: 0,
				total: 0,
				percentage: 0,
			},
			startTime: new Date(),
			lastUpdate: new Date(),
		});
	}
	updateProgress(operationId, total, current, currentFile) {
		const progress = this.progressTracking.get(operationId);
		if (!progress) return;
		progress.status = 'in-progress';
		progress.progress.total = total;
		progress.progress.current = current;
		progress.progress.percentage = total > 0 ? Math.round((current / total) * 100) : 0;
		progress.lastUpdate = new Date();
		if (currentFile) {
			if (!progress.details) progress.details = {};
			progress.details.currentFile = currentFile;
		}
		this.progressTracking.set(operationId, progress);
	}
	completeProgressTracking(operationId) {
		const progress = this.progressTracking.get(operationId);
		if (!progress) return;
		progress.status = 'completed';
		progress.progress.current = progress.progress.total;
		progress.progress.percentage = 100;
		progress.completedAt = new Date();
		progress.lastUpdate = new Date();
		this.progressTracking.set(operationId, progress);
	}
	failProgressTracking(operationId, error) {
		const progress = this.progressTracking.get(operationId);
		if (!progress) return;
		progress.status = 'failed';
		progress.error = error;
		progress.lastUpdate = new Date();
		this.progressTracking.set(operationId, progress);
	}
	startProgressCleanupInterval() {
		setInterval(
			() => {
				const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
				for (const [operationId, progress] of this.progressTracking.entries()) {
					if (
						progress.lastUpdate < cutoff &&
						(progress.status === 'completed' || progress.status === 'failed')
					) {
						this.progressTracking.delete(operationId);
					}
				}
			},
			60 * 60 * 1000,
		);
	}
	async streamToBuffer(stream) {
		const chunks = [];
		return new Promise((resolve, reject) => {
			stream.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
			stream.on('error', reject);
			stream.on('end', () => resolve(Buffer.concat(chunks)));
		});
	}
	calculateChecksum(buffer) {
		return (0, crypto_1.createHash)('sha256').update(buffer).digest('hex');
	}
	async ensureTempDirectory() {
		try {
			await fs_1.promises.access(this.tempDir);
		} catch {
			await fs_1.promises.mkdir(this.tempDir, { recursive: true });
		}
	}
};
exports.BinaryExportService = BinaryExportService;
exports.BinaryExportService = BinaryExportService = __decorate(
	[
		(0, di_1.Service)(),
		__metadata('design:paramtypes', [
			binary_data_service_1.BinaryDataService,
			n8n_core_1.BinaryDataService,
			typeof (_a =
				typeof workflow_repository_1.WorkflowRepository !== 'undefined' &&
				workflow_repository_1.WorkflowRepository) === 'function'
				? _a
				: Object,
			typeof (_b =
				typeof execution_repository_1.ExecutionRepository !== 'undefined' &&
				execution_repository_1.ExecutionRepository) === 'function'
				? _b
				: Object,
			event_service_1.EventService,
			backend_common_1.Logger,
		]),
	],
	BinaryExportService,
);
//# sourceMappingURL=binary-export.service.js.map
