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
Object.defineProperty(exports, '__esModule', { value: true });
exports.BinaryMigrationService = void 0;
const backend_common_1 = require('@n8n/backend-common');
const di_1 = require('@n8n/di');
const n8n_core_1 = require('n8n-core');
const n8n_workflow_1 = require('n8n-workflow');
const crypto_1 = require('crypto');
const fs_1 = require('fs');
const path_1 = require('path');
const util_1 = require('util');
const zlib_1 = require('zlib');
const axios_1 = __importDefault(require('axios'));
const binary_data_service_1 = require('./binary-data.service');
const event_service_1 = require('@/events/event.service');
let BinaryMigrationService = class BinaryMigrationService {
	constructor(binaryDataService, coreBinaryDataService, eventService, logger) {
		this.binaryDataService = binaryDataService;
		this.coreBinaryDataService = coreBinaryDataService;
		this.eventService = eventService;
		this.logger = logger;
		this.tempDir = (0, path_1.join)(process.cwd(), 'temp', 'binary-migrations');
		this.ensureTempDirectory();
	}
	async exportBinaryData(user, request) {
		const exportId = `binary-export-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
		const exportPath = request.outputPath || (0, path_1.join)(this.tempDir, `${exportId}.tar.gz`);
		try {
			this.logger.info('Starting binary data export', {
				exportId,
				userId: user.id,
				binaryDataIds: request.binaryDataIds?.length || 0,
				workflowIds: request.workflowIds?.length || 0,
				executionIds: request.executionIds?.length || 0,
			});
			const binaryDataIds = await this.resolveBinaryDataIds(request);
			if (binaryDataIds.length === 0) {
				throw new n8n_workflow_1.ApplicationError(
					'No binary data found matching the specified criteria',
				);
			}
			const exportData = await this.createBinaryExportArchive(
				binaryDataIds,
				exportPath,
				request.compressionLevel || 6,
			);
			const result = {
				exportId,
				exportPath,
				totalBinaryFiles: exportData.totalFiles,
				totalSize: exportData.compressedSize,
				compressionRatio:
					exportData.originalSize > 0 ? exportData.compressedSize / exportData.originalSize : 0,
				checksum: exportData.checksum,
				metadata: {
					exportedAt: new Date(),
					exportedBy: user.id,
					n8nVersion: process.env.N8N_VERSION || 'unknown',
					binaryDataIds,
				},
			};
			this.eventService.emit('binary-export-completed', {
				exportId,
				userId: user.id,
				totalFiles: result.totalBinaryFiles,
				totalSize: result.totalSize,
			});
			this.logger.info('Binary data export completed', {
				exportId,
				totalFiles: result.totalBinaryFiles,
				totalSize: result.totalSize,
				compressionRatio: result.compressionRatio,
			});
			return result;
		} catch (error) {
			this.logger.error('Binary data export failed', {
				exportId,
				userId: user.id,
				error: error instanceof Error ? error.message : 'Unknown error',
			});
			this.eventService.emit('binary-export-failed', {
				exportId,
				userId: user.id,
				error: error instanceof Error ? error.message : 'Unknown error',
			});
			throw error;
		}
	}
	async importBinaryData(user, request) {
		const importId = `binary-import-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
		try {
			this.logger.info('Starting binary data import', {
				importId,
				userId: user.id,
				hasExportPath: !!request.exportPath,
				hasExportData: !!request.exportData,
			});
			const exportData =
				request.exportData ||
				(request.exportPath ? await fs_1.promises.readFile(request.exportPath) : null);
			if (!exportData) {
				throw new n8n_workflow_1.ApplicationError(
					'Either exportPath or exportData must be provided',
				);
			}
			const importResult = await this.processBinaryImportArchive(
				exportData,
				request.targetWorkflowId,
				request.targetExecutionId,
				request.overwriteExisting || false,
				request.validateChecksums !== false,
			);
			const result = {
				importId,
				totalImported: importResult.imported.length,
				totalSkipped: importResult.skipped.length,
				totalErrors: importResult.errors.length,
				importedBinaryDataIds: importResult.imported,
				errors: importResult.errors,
			};
			this.eventService.emit('binary-import-completed', {
				importId,
				userId: user.id,
				totalImported: result.totalImported,
				totalSkipped: result.totalSkipped,
				totalErrors: result.totalErrors,
			});
			this.logger.info('Binary data import completed', {
				importId,
				totalImported: result.totalImported,
				totalSkipped: result.totalSkipped,
				totalErrors: result.totalErrors,
			});
			return result;
		} catch (error) {
			this.logger.error('Binary data import failed', {
				importId,
				userId: user.id,
				error: error instanceof Error ? error.message : 'Unknown error',
			});
			this.eventService.emit('binary-import-failed', {
				importId,
				userId: user.id,
				error: error instanceof Error ? error.message : 'Unknown error',
			});
			throw error;
		}
	}
	async transferToInstance(user, request) {
		const transferId = `binary-transfer-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
		const startTime = Date.now();
		try {
			this.logger.info('Starting cross-instance binary transfer', {
				transferId,
				userId: user.id,
				targetUrl: this.sanitizeUrl(request.targetInstanceUrl),
				totalBinaryFiles: request.binaryDataIds.length,
			});
			const results = await this.executeCrossInstanceTransfer(request, transferId);
			const duration = Date.now() - startTime;
			const result = {
				transferId,
				status:
					results.failed.length === 0
						? 'success'
						: results.transferred.length > 0
							? 'partial'
							: 'failed',
				totalTransferred: results.transferred.length,
				totalFailed: results.failed.length,
				transferredSize: results.totalSize,
				duration,
				errors: results.failed,
			};
			this.eventService.emit('cross-instance-binary-transfer-completed', {
				transferId,
				userId: user.id,
				targetUrl: this.sanitizeUrl(request.targetInstanceUrl),
				status: result.status,
				totalTransferred: result.totalTransferred,
				totalFailed: result.totalFailed,
			});
			this.logger.info('Cross-instance binary transfer completed', {
				transferId,
				status: result.status,
				totalTransferred: result.totalTransferred,
				totalFailed: result.totalFailed,
				duration,
			});
			return result;
		} catch (error) {
			this.logger.error('Cross-instance binary transfer failed', {
				transferId,
				userId: user.id,
				error: error instanceof Error ? error.message : 'Unknown error',
			});
			this.eventService.emit('cross-instance-binary-transfer-failed', {
				transferId,
				userId: user.id,
				error: error instanceof Error ? error.message : 'Unknown error',
			});
			throw error;
		}
	}
	async validateBinaryIntegrity(user, binaryDataIds) {
		try {
			this.logger.info('Starting binary integrity validation', {
				userId: user.id,
				totalBinaryFiles: binaryDataIds.length,
			});
			const issues = [];
			const checksumMismatches = [];
			const missingFiles = [];
			let totalValidated = 0;
			for (const binaryDataId of binaryDataIds) {
				try {
					const metadata = await this.binaryDataService.getBinaryDataMetadata(binaryDataId);
					const stream = await this.binaryDataService.getBinaryDataStream(binaryDataId);
					const buffer = await this.streamToBuffer(stream);
					const actualChecksum = this.calculateChecksum(buffer);
					if (metadata.checksum && metadata.checksum !== actualChecksum) {
						checksumMismatches.push({
							binaryDataId,
							expectedChecksum: metadata.checksum,
							actualChecksum,
						});
						issues.push({
							binaryDataId,
							issue: 'Checksum mismatch detected',
							severity: 'critical',
							recommendation: 'File may be corrupted or tampered with',
						});
					}
					if (metadata.fileSize && buffer.length !== metadata.fileSize) {
						issues.push({
							binaryDataId,
							issue: `File size mismatch: expected ${metadata.fileSize}, got ${buffer.length}`,
							severity: 'error',
							recommendation: 'File may be truncated or corrupted',
						});
					}
					totalValidated++;
				} catch (error) {
					missingFiles.push(binaryDataId);
					issues.push({
						binaryDataId,
						issue: `File not accessible: ${error instanceof Error ? error.message : 'Unknown error'}`,
						severity: 'critical',
						recommendation: 'File may be deleted or storage backend issue',
					});
				}
			}
			const orphanedFiles = await this.findOrphanedBinaryFiles();
			const result = {
				isValid:
					issues.filter((i) => i.severity === 'critical' || i.severity === 'error').length === 0,
				totalValidated,
				issues,
				checksumMismatches,
				missingFiles,
				orphanedFiles,
			};
			this.logger.info('Binary integrity validation completed', {
				userId: user.id,
				totalValidated,
				issuesFound: issues.length,
				checksumMismatches: checksumMismatches.length,
				missingFiles: missingFiles.length,
				orphanedFiles: orphanedFiles.length,
			});
			return result;
		} catch (error) {
			this.logger.error('Binary integrity validation failed', {
				userId: user.id,
				error: error instanceof Error ? error.message : 'Unknown error',
			});
			throw error;
		}
	}
	async cleanupOrphanedBinaryData(user) {
		const cleanupId = `binary-cleanup-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
		try {
			this.logger.info('Starting orphaned binary data cleanup', {
				cleanupId,
				userId: user.id,
			});
			const orphanedFiles = await this.findOrphanedBinaryFiles();
			let totalSize = 0;
			const cleanedFiles = [];
			for (const binaryDataId of orphanedFiles) {
				try {
					const metadata = await this.binaryDataService.getBinaryDataMetadata(binaryDataId);
					totalSize += metadata.fileSize || 0;
					await this.binaryDataService.deleteBinaryData(binaryDataId);
					cleanedFiles.push(binaryDataId);
				} catch (error) {
					this.logger.warn('Failed to cleanup orphaned binary file', {
						binaryDataId,
						error: error instanceof Error ? error.message : 'Unknown error',
					});
				}
			}
			this.eventService.emit('binary-cleanup-completed', {
				cleanupId,
				userId: user.id,
				totalCleaned: cleanedFiles.length,
				totalSize,
			});
			this.logger.info('Orphaned binary data cleanup completed', {
				cleanupId,
				totalCleaned: cleanedFiles.length,
				totalSize,
			});
			return {
				cleanupId,
				totalCleaned: cleanedFiles.length,
				totalSize,
				cleanedFiles,
			};
		} catch (error) {
			this.logger.error('Orphaned binary data cleanup failed', {
				cleanupId,
				userId: user.id,
				error: error instanceof Error ? error.message : 'Unknown error',
			});
			throw error;
		}
	}
	async resolveBinaryDataIds(request) {
		let binaryDataIds = [];
		if (request.binaryDataIds?.length) {
			binaryDataIds = request.binaryDataIds;
		}
		return binaryDataIds;
	}
	async createBinaryExportArchive(binaryDataIds, outputPath, compressionLevel) {
		const archiveData = [];
		let originalSize = 0;
		for (const binaryDataId of binaryDataIds) {
			try {
				const metadata = await this.binaryDataService.getBinaryDataMetadata(binaryDataId);
				const stream = await this.binaryDataService.getBinaryDataStream(binaryDataId);
				const data = await this.streamToBuffer(stream);
				originalSize += data.length;
				archiveData.push({
					id: binaryDataId,
					metadata,
					data,
				});
			} catch (error) {
				this.logger.warn('Failed to include binary data in export', {
					binaryDataId,
					error: error instanceof Error ? error.message : 'Unknown error',
				});
			}
		}
		const exportManifest = {
			version: '1.0',
			exportedAt: new Date().toISOString(),
			totalFiles: archiveData.length,
			files: archiveData.map((item) => ({
				id: item.id,
				metadata: item.metadata,
			})),
		};
		const archiveBuffer = Buffer.from(
			JSON.stringify({
				manifest: exportManifest,
				binaryData: archiveData.map((item) => ({
					id: item.id,
					data: item.data.toString('base64'),
				})),
			}),
		);
		const gzipAsync = (0, util_1.promisify)(zlib_1.gzip);
		const compressedData = await gzipAsync(archiveBuffer, { level: compressionLevel });
		await fs_1.promises.writeFile(outputPath, compressedData);
		const checksum = this.calculateChecksum(compressedData);
		return {
			totalFiles: archiveData.length,
			originalSize,
			compressedSize: compressedData.length,
			checksum,
		};
	}
	async processBinaryImportArchive(
		exportData,
		targetWorkflowId,
		targetExecutionId,
		overwriteExisting = false,
		validateChecksums = true,
	) {
		const imported = [];
		const skipped = [];
		const errors = [];
		try {
			const gunzipAsync = (0, util_1.promisify)(zlib_1.gunzip);
			const decompressedData = await gunzipAsync(exportData);
			const archiveContent = JSON.parse(decompressedData.toString());
			if (!archiveContent.manifest || !archiveContent.binaryData) {
				throw new n8n_workflow_1.ApplicationError('Invalid binary export archive format');
			}
			for (const item of archiveContent.binaryData) {
				try {
					const binaryBuffer = Buffer.from(item.data, 'base64');
					if (validateChecksums) {
						const actualChecksum = this.calculateChecksum(binaryBuffer);
						const metadata = archiveContent.manifest.files.find((f) => f.id === item.id);
						if (metadata?.metadata?.checksum && metadata.metadata.checksum !== actualChecksum) {
							errors.push({
								binaryDataId: item.id,
								error: 'Checksum validation failed',
								severity: 'error',
							});
							continue;
						}
					}
					const metadata = await this.binaryDataService.uploadBinaryData(binaryBuffer, {
						fileName: item.metadata?.fileName || 'imported-file',
						mimeType: item.metadata?.mimeType || 'application/octet-stream',
						workflowId: targetWorkflowId || 'import',
						executionId: targetExecutionId || Date.now().toString(),
					});
					imported.push(metadata.id);
				} catch (error) {
					errors.push({
						binaryDataId: item.id,
						error: error instanceof Error ? error.message : 'Unknown error',
						severity: 'error',
					});
				}
			}
		} catch (error) {
			throw new n8n_workflow_1.ApplicationError(
				`Failed to process binary import archive: ${error instanceof Error ? error.message : 'Unknown error'}`,
			);
		}
		return {
			imported,
			skipped,
			errors,
		};
	}
	async executeCrossInstanceTransfer(request, transferId) {
		const transferred = [];
		const failed = [];
		let totalSize = 0;
		const headers = this.buildAuthHeaders(request);
		const chunkSize = request.chunkSize || 10 * 1024 * 1024;
		for (const binaryDataId of request.binaryDataIds) {
			try {
				const metadata = await this.binaryDataService.getBinaryDataMetadata(binaryDataId);
				const stream = await this.binaryDataService.getBinaryDataStream(binaryDataId, chunkSize);
				const data = await this.streamToBuffer(stream);
				const response = await axios_1.default.post(
					`${request.targetInstanceUrl}/api/v1/binary-data/upload`,
					{
						file: data.toString('base64'),
						fileName: metadata.fileName,
						mimeType: metadata.mimeType,
					},
					{
						headers,
						timeout: 300000,
					},
				);
				if (response.status === 201) {
					transferred.push(binaryDataId);
					totalSize += data.length;
				} else {
					throw new Error(`Upload failed with status: ${response.status}`);
				}
			} catch (error) {
				failed.push({
					binaryDataId,
					error: error instanceof Error ? error.message : 'Unknown error',
				});
			}
		}
		return {
			transferred,
			failed,
			totalSize,
		};
	}
	buildAuthHeaders(request) {
		const headers = {
			'Content-Type': 'application/json',
		};
		if (request.targetApiKey) {
			headers['X-N8N-API-KEY'] = request.targetApiKey;
		} else if (request.targetAuthToken) {
			headers['Authorization'] = `Bearer ${request.targetAuthToken}`;
		} else if (request.targetUsername && request.targetPassword) {
			const credentials = Buffer.from(
				`${request.targetUsername}:${request.targetPassword}`,
			).toString('base64');
			headers['Authorization'] = `Basic ${credentials}`;
		}
		return headers;
	}
	async findOrphanedBinaryFiles() {
		return [];
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
	sanitizeUrl(url) {
		try {
			const parsed = new URL(url);
			return `${parsed.protocol}//${parsed.hostname}:${parsed.port || (parsed.protocol === 'https:' ? '443' : '80')}`;
		} catch {
			return '[invalid-url]';
		}
	}
	async ensureTempDirectory() {
		try {
			await fs_1.promises.access(this.tempDir);
		} catch {
			await fs_1.promises.mkdir(this.tempDir, { recursive: true });
		}
	}
};
exports.BinaryMigrationService = BinaryMigrationService;
exports.BinaryMigrationService = BinaryMigrationService = __decorate(
	[
		(0, di_1.Service)(),
		__metadata('design:paramtypes', [
			binary_data_service_1.BinaryDataService,
			n8n_core_1.BinaryDataService,
			event_service_1.EventService,
			backend_common_1.Logger,
		]),
	],
	BinaryMigrationService,
);
//# sourceMappingURL=binary-migration.service.js.map
