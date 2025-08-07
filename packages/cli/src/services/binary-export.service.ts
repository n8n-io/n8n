import { Logger } from '@n8n/backend-common';
import { Service } from '@n8n/di';
import type { User } from '@n8n/db';
import { BinaryDataService as CoreBinaryDataService } from 'n8n-core';
import { ApplicationError } from 'n8n-workflow';
import { createHash } from 'crypto';
import { promises as fs } from 'fs';
import { join } from 'path';
import { promisify } from 'util';
import { gzip, gunzip } from 'zlib';
import type { Readable } from 'stream';
import archiver from 'archiver';

import { BinaryDataService } from './binary-data.service';
import { EventService } from '@/events/event.service';
import { WorkflowRepository, ExecutionRepository } from '@n8n/db';

interface BulkExportRequest {
	workflowIds?: string[];
	executionIds?: string[];
	binaryDataIds?: string[];
	includeWorkflowData?: boolean;
	includeExecutionData?: boolean;
	compressionLevel?: number;
	outputFormat?: 'zip' | 'tar' | 'json';
	filterByDateRange?: {
		from: Date;
		to: Date;
	};
	filterBySize?: {
		minSize?: number;
		maxSize?: number;
	};
}

interface WorkflowPackageRequest {
	workflowId: string;
	includeExecutions?: boolean;
	includeBinaryData?: boolean;
	executionLimit?: number;
	compressionLevel?: number;
}

interface BinarySearchRequest {
	workflowIds?: string[];
	executionIds?: string[];
	mimeTypeFilter?: string[];
	sizeRange?: {
		minSize: number;
		maxSize: number;
	};
	dateRange?: {
		from: Date;
		to: Date;
	};
	fileNamePattern?: string;
	limit?: number;
	offset?: number;
}

interface BulkExportResult {
	exportId: string;
	exportPath: string;
	totalFiles: number;
	totalWorkflows: number;
	totalExecutions: number;
	totalBinaryFiles: number;
	originalSize: number;
	compressedSize: number;
	compressionRatio: number;
	checksum: string;
	metadata: {
		exportedAt: Date;
		exportedBy: string;
		exportFormat: string;
		includesWorkflowData: boolean;
		includesExecutionData: boolean;
		binaryDataIds: string[];
	};
}

interface WorkflowPackageResult {
	packageId: string;
	packagePath: string;
	workflowData: any;
	executionCount: number;
	binaryFileCount: number;
	totalSize: number;
	checksum: string;
	metadata: {
		workflowId: string;
		workflowName: string;
		packagedAt: Date;
		packagedBy: string;
		n8nVersion: string;
	};
}

interface BinarySearchResult {
	totalCount: number;
	results: Array<{
		binaryDataId: string;
		workflowId?: string;
		executionId?: string;
		fileName?: string;
		mimeType?: string;
		fileSize: number;
		createdAt: Date;
		checksum?: string;
	}>;
	pagination: {
		limit: number;
		offset: number;
		hasMore: boolean;
	};
}

interface ProgressTrackingInfo {
	operationId: string;
	operationType: 'bulk-export' | 'workflow-package' | 'binary-search';
	status: 'pending' | 'in-progress' | 'completed' | 'failed';
	progress: {
		current: number;
		total: number;
		percentage: number;
	};
	details?: {
		currentFile?: string;
		processedSize?: number;
		totalSize?: number;
		estimatedTimeRemaining?: number;
	};
	startTime: Date;
	lastUpdate: Date;
	completedAt?: Date;
	error?: string;
}

@Service()
export class BinaryExportService {
	private readonly tempDir = join(process.cwd(), 'temp', 'binary-exports');
	private readonly progressTracking = new Map<string, ProgressTrackingInfo>();

	constructor(
		private readonly binaryDataService: BinaryDataService,
		private readonly coreBinaryDataService: CoreBinaryDataService,
		private readonly workflowRepository: WorkflowRepository,
		private readonly executionRepository: ExecutionRepository,
		private readonly eventService: EventService,
		private readonly logger: Logger,
	) {
		this.ensureTempDirectory();
		this.startProgressCleanupInterval();
	}

	async bulkExportBinaryData(user: User, request: BulkExportRequest): Promise<BulkExportResult> {
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
				throw new ApplicationError('No data found matching the specified criteria');
			}

			this.updateProgress(operationId, binaryDataIds.length, 0);

			const exportPath = join(this.tempDir, `${exportId}.${request.outputFormat || 'zip'}`);
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

			const result: BulkExportResult = {
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

			// TODO: Add proper event emission once binary export events are defined in EventService
			// this.eventService.emit('bulk-binary-export-completed', {
			//	exportId,
			//	userId: user.id,
			//	totalFiles: result.totalFiles,
			//	totalBinaryFiles: result.totalBinaryFiles,
			//	compressedSize: result.compressedSize,
			// });

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

			// TODO: Add proper event emission once binary export events are defined in EventService
			// this.eventService.emit('bulk-binary-export-failed', {
			//	exportId,
			//	userId: user.id,
			//	error: error instanceof Error ? error.message : 'Unknown error',
			// });

			throw error;
		}
	}

	async createWorkflowPackage(
		user: User,
		request: WorkflowPackageRequest,
	): Promise<WorkflowPackageResult> {
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
				throw new ApplicationError(`Workflow not found: ${request.workflowId}`);
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

			const packagePath = join(this.tempDir, `${packageId}.zip`);
			const packageData = await this.createWorkflowPackageArchive(
				workflowData,
				executions,
				binaryDataIds,
				packagePath,
				request.compressionLevel || 6,
				operationId,
			);

			const result: WorkflowPackageResult = {
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

			// TODO: Add proper event emission once workflow package events are defined in EventService
			// this.eventService.emit('workflow-package-created', {
			//	packageId,
			//	userId: user.id,
			//	workflowId: request.workflowId,
			//	totalSize: result.totalSize,
			// });

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

	async searchBinaryData(user: User, request: BinarySearchRequest): Promise<BinarySearchResult> {
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

			const result: BinarySearchResult = {
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

	async getOperationProgress(operationId: string): Promise<ProgressTrackingInfo | null> {
		return this.progressTracking.get(operationId) || null;
	}

	async listActiveOperations(user: User): Promise<ProgressTrackingInfo[]> {
		return Array.from(this.progressTracking.values()).filter(
			(progress) => progress.status === 'pending' || progress.status === 'in-progress',
		);
	}

	async cancelOperation(user: User, operationId: string): Promise<{ cancelled: boolean }> {
		const progress = this.progressTracking.get(operationId);

		if (!progress) {
			throw new ApplicationError(`Operation not found: ${operationId}`);
		}

		if (progress.status === 'completed' || progress.status === 'failed') {
			throw new ApplicationError(`Operation cannot be cancelled (status: ${progress.status})`);
		}

		this.failProgressTracking(operationId, 'Cancelled by user');

		this.logger.info('Operation cancelled', {
			operationId,
			userId: user.id,
			operationType: progress.operationType,
		});

		return { cancelled: true };
	}

	private async resolveBulkExportData(request: BulkExportRequest): Promise<{
		binaryDataIds: string[];
		workflows: any[];
		executions: any[];
	}> {
		let binaryDataIds: string[] = [];
		let workflows: any[] = [];
		let executions: any[] = [];

		if (request.binaryDataIds?.length) {
			binaryDataIds = request.binaryDataIds;
		}

		if (request.workflowIds?.length) {
			workflows = await this.workflowRepository.findByIds(request.workflowIds);

			if (!request.binaryDataIds?.length) {
				for (const workflowId of request.workflowIds) {
					const workflowBinaryData = await this.findBinaryDataForWorkflow(workflowId);
					binaryDataIds.push(...workflowBinaryData);
				}
			}
		}

		if (request.executionIds?.length) {
			executions = await this.executionRepository.findByIds(request.executionIds);

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

	private async createBulkExportPackage(
		data: {
			binaryDataIds: string[];
			workflows: any[];
			executions: any[];
		},
		outputPath: string,
		format: string,
		compressionLevel: number,
		operationId: string,
	): Promise<{
		totalFiles: number;
		originalSize: number;
		compressedSize: number;
		checksum: string;
	}> {
		const archive = archiver(format === 'zip' ? 'zip' : 'tar', {
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

		const stats = await fs.stat(outputPath);
		const compressedSize = stats.size;

		const fileBuffer = await fs.readFile(outputPath);
		const checksum = this.calculateChecksum(fileBuffer);

		return {
			totalFiles,
			originalSize,
			compressedSize,
			checksum,
		};
	}

	private async createWorkflowPackageArchive(
		workflow: any,
		executions: any[],
		binaryDataIds: string[],
		packagePath: string,
		compressionLevel: number,
		operationId: string,
	): Promise<{
		compressedSize: number;
		checksum: string;
	}> {
		const archive = archiver('zip', {
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

		const stats = await fs.stat(packagePath);
		const compressedSize = stats.size;

		const fileBuffer = await fs.readFile(packagePath);
		const checksum = this.calculateChecksum(fileBuffer);

		return {
			compressedSize,
			checksum,
		};
	}

	private async performBinaryDataSearch(request: BinarySearchRequest): Promise<{
		totalCount: number;
		items: Array<{
			binaryDataId: string;
			workflowId?: string;
			executionId?: string;
			fileName?: string;
			mimeType?: string;
			fileSize: number;
			createdAt: Date;
			checksum?: string;
		}>;
	}> {
		return {
			totalCount: 0,
			items: [],
		};
	}

	private async findBinaryDataForWorkflow(workflowId: string): Promise<string[]> {
		return [];
	}

	private async findBinaryDataForExecution(executionId: string): Promise<string[]> {
		return [];
	}

	private initializeProgressTracking(
		operationId: string,
		operationType: 'bulk-export' | 'workflow-package' | 'binary-search',
	): void {
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

	private updateProgress(
		operationId: string,
		total: number,
		current: number,
		currentFile?: string,
	): void {
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

	private completeProgressTracking(operationId: string): void {
		const progress = this.progressTracking.get(operationId);
		if (!progress) return;

		progress.status = 'completed';
		progress.progress.current = progress.progress.total;
		progress.progress.percentage = 100;
		progress.completedAt = new Date();
		progress.lastUpdate = new Date();

		this.progressTracking.set(operationId, progress);
	}

	private failProgressTracking(operationId: string, error: string): void {
		const progress = this.progressTracking.get(operationId);
		if (!progress) return;

		progress.status = 'failed';
		progress.error = error;
		progress.lastUpdate = new Date();

		this.progressTracking.set(operationId, progress);
	}

	private startProgressCleanupInterval(): void {
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

	private async streamToBuffer(stream: Readable): Promise<Buffer> {
		const chunks: Buffer[] = [];

		return new Promise((resolve, reject) => {
			stream.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
			stream.on('error', reject);
			stream.on('end', () => resolve(Buffer.concat(chunks)));
		});
	}

	private calculateChecksum(buffer: Buffer): string {
		return createHash('sha256').update(buffer).digest('hex');
	}

	private async ensureTempDirectory(): Promise<void> {
		try {
			await fs.access(this.tempDir);
		} catch {
			await fs.mkdir(this.tempDir, { recursive: true });
		}
	}
}
