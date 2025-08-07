import { Logger } from '@n8n/backend-common';
import { Service } from '@n8n/di';
import type { User } from '@n8n/db';
import { BinaryDataService as CoreBinaryDataService } from 'n8n-core';
import { ApplicationError } from 'n8n-workflow';
import { createHash } from 'crypto';
import { createReadStream, createWriteStream, promises as fs } from 'fs';
import { join } from 'path';
import { pipeline } from 'stream/promises';
import { promisify } from 'util';
import { gunzip, gzip } from 'zlib';
import type { Readable } from 'stream';
import axios from 'axios';

import { BinaryDataService } from './binary-data.service';
import { EventService } from '@/events/event.service';

interface BinaryMigrationExportRequest {
	binaryDataIds?: string[];
	workflowIds?: string[];
	executionIds?: string[];
	includeMetadata?: boolean;
	compressionLevel?: number;
	outputPath?: string;
}

interface BinaryMigrationImportRequest {
	exportPath?: string;
	exportData?: Buffer;
	targetWorkflowId?: string;
	targetExecutionId?: string;
	overwriteExisting?: boolean;
	validateChecksums?: boolean;
}

interface CrossInstanceBinaryTransferRequest {
	targetInstanceUrl: string;
	targetApiKey?: string;
	targetAuthToken?: string;
	targetUsername?: string;
	targetPassword?: string;
	binaryDataIds: string[];
	compressionLevel?: number;
	chunkSize?: number;
}

interface BinaryMigrationExportResult {
	exportId: string;
	exportPath: string;
	totalBinaryFiles: number;
	totalSize: number;
	compressionRatio: number;
	checksum: string;
	metadata: {
		exportedAt: Date;
		exportedBy: string;
		n8nVersion: string;
		binaryDataIds: string[];
	};
}

interface BinaryMigrationImportResult {
	importId: string;
	totalImported: number;
	totalSkipped: number;
	totalErrors: number;
	importedBinaryDataIds: string[];
	errors: Array<{
		binaryDataId: string;
		error: string;
		severity: 'warning' | 'error';
	}>;
}

interface CrossInstanceTransferResult {
	transferId: string;
	status: 'success' | 'partial' | 'failed';
	totalTransferred: number;
	totalFailed: number;
	transferredSize: number;
	duration: number;
	errors: Array<{
		binaryDataId: string;
		error: string;
	}>;
}

interface BinaryIntegrityValidationResult {
	isValid: boolean;
	totalValidated: number;
	issues: Array<{
		binaryDataId: string;
		issue: string;
		severity: 'warning' | 'error' | 'critical';
		recommendation?: string;
	}>;
	checksumMismatches: Array<{
		binaryDataId: string;
		expectedChecksum: string;
		actualChecksum: string;
	}>;
	missingFiles: string[];
	orphanedFiles: string[];
}

@Service()
export class BinaryMigrationService {
	private readonly tempDir = join(process.cwd(), 'temp', 'binary-migrations');

	constructor(
		private readonly binaryDataService: BinaryDataService,
		private readonly coreBinaryDataService: CoreBinaryDataService,
		private readonly eventService: EventService,
		private readonly logger: Logger,
	) {
		this.ensureTempDirectory();
	}

	async exportBinaryData(
		user: User,
		request: BinaryMigrationExportRequest,
	): Promise<BinaryMigrationExportResult> {
		const exportId = `binary-export-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
		const exportPath = request.outputPath || join(this.tempDir, `${exportId}.tar.gz`);

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
				throw new ApplicationError('No binary data found matching the specified criteria');
			}

			const exportData = await this.createBinaryExportArchive(
				binaryDataIds,
				exportPath,
				request.compressionLevel || 6,
			);

			const result: BinaryMigrationExportResult = {
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

			// TODO: Add proper event emission once binary export events are defined in EventService
			// this.eventService.emit('binary-export-completed', {
			//	exportId,
			//	userId: user.id,
			//	totalFiles: result.totalBinaryFiles,
			//	totalSize: result.totalSize,
			// });

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

			// TODO: Add proper event emission once binary export events are defined in EventService
			// this.eventService.emit('binary-export-failed', {
			//	exportId,
			//	userId: user.id,
			//	error: error instanceof Error ? error.message : 'Unknown error',
			// });

			throw error;
		}
	}

	async importBinaryData(
		user: User,
		request: BinaryMigrationImportRequest,
	): Promise<BinaryMigrationImportResult> {
		const importId = `binary-import-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;

		try {
			this.logger.info('Starting binary data import', {
				importId,
				userId: user.id,
				hasExportPath: !!request.exportPath,
				hasExportData: !!request.exportData,
			});

			const exportData =
				request.exportData || (request.exportPath ? await fs.readFile(request.exportPath) : null);

			if (!exportData) {
				throw new ApplicationError('Either exportPath or exportData must be provided');
			}

			const importResult = await this.processBinaryImportArchive(
				exportData,
				request.targetWorkflowId,
				request.targetExecutionId,
				request.overwriteExisting || false,
				request.validateChecksums !== false,
			);

			const result: BinaryMigrationImportResult = {
				importId,
				totalImported: importResult.imported.length,
				totalSkipped: importResult.skipped.length,
				totalErrors: importResult.errors.length,
				importedBinaryDataIds: importResult.imported,
				errors: importResult.errors,
			};

			// TODO: Add proper event emission once binary import events are defined in EventService
			// this.eventService.emit('binary-import-completed', {
			//	importId,
			//	userId: user.id,
			//	totalImported: result.totalImported,
			//	totalSkipped: result.totalSkipped,
			//	totalErrors: result.totalErrors,
			// });

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

			// TODO: Add proper event emission once binary import events are defined in EventService
			// this.eventService.emit('binary-import-failed', {
			//	importId,
			//	userId: user.id,
			//	error: error instanceof Error ? error.message : 'Unknown error',
			// });

			throw error;
		}
	}

	async transferToInstance(
		user: User,
		request: CrossInstanceBinaryTransferRequest,
	): Promise<CrossInstanceTransferResult> {
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
			const result: CrossInstanceTransferResult = {
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

			// TODO: Add proper event emission once cross-instance transfer events are defined in EventService
			// this.eventService.emit('cross-instance-binary-transfer-completed', {
			//	transferId,
			//	userId: user.id,
			//	targetUrl: this.sanitizeUrl(request.targetInstanceUrl),
			//	status: result.status,
			//	totalTransferred: result.totalTransferred,
			//	totalFailed: result.totalFailed,
			// });

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

			// TODO: Add proper event emission once cross-instance transfer events are defined in EventService
			// this.eventService.emit('cross-instance-binary-transfer-failed', {
			//	transferId,
			//	userId: user.id,
			//	error: error instanceof Error ? error.message : 'Unknown error',
			// });

			throw error;
		}
	}

	async validateBinaryIntegrity(
		user: User,
		binaryDataIds: string[],
	): Promise<BinaryIntegrityValidationResult> {
		try {
			this.logger.info('Starting binary integrity validation', {
				userId: user.id,
				totalBinaryFiles: binaryDataIds.length,
			});

			const issues: Array<{
				binaryDataId: string;
				issue: string;
				severity: 'warning' | 'error' | 'critical';
				recommendation?: string;
			}> = [];
			const checksumMismatches: Array<{
				binaryDataId: string;
				expectedChecksum: string;
				actualChecksum: string;
			}> = [];
			const missingFiles: string[] = [];
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
							expectedChecksum: metadata.checksum as string,
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

			const result: BinaryIntegrityValidationResult = {
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

	async cleanupOrphanedBinaryData(user: User): Promise<{
		cleanupId: string;
		totalCleaned: number;
		totalSize: number;
		cleanedFiles: string[];
	}> {
		const cleanupId = `binary-cleanup-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;

		try {
			this.logger.info('Starting orphaned binary data cleanup', {
				cleanupId,
				userId: user.id,
			});

			const orphanedFiles = await this.findOrphanedBinaryFiles();
			let totalSize = 0;
			const cleanedFiles: string[] = [];

			for (const binaryDataId of orphanedFiles) {
				try {
					const metadata = await this.binaryDataService.getBinaryDataMetadata(binaryDataId);
					totalSize += (metadata.fileSize as number) || 0;

					await this.binaryDataService.deleteBinaryData(binaryDataId);
					cleanedFiles.push(binaryDataId);
				} catch (error) {
					this.logger.warn('Failed to cleanup orphaned binary file', {
						binaryDataId,
						error: error instanceof Error ? error.message : 'Unknown error',
					});
				}
			}

			// TODO: Add proper event emission once binary cleanup events are defined in EventService
			// this.eventService.emit('binary-cleanup-completed', {
			//	cleanupId,
			//	userId: user.id,
			//	totalCleaned: cleanedFiles.length,
			//	totalSize,
			// });

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

	private async resolveBinaryDataIds(request: BinaryMigrationExportRequest): Promise<string[]> {
		let binaryDataIds: string[] = [];

		if (request.binaryDataIds?.length) {
			binaryDataIds = request.binaryDataIds;
		}

		return binaryDataIds;
	}

	private async createBinaryExportArchive(
		binaryDataIds: string[],
		outputPath: string,
		compressionLevel: number,
	): Promise<{
		totalFiles: number;
		originalSize: number;
		compressedSize: number;
		checksum: string;
	}> {
		const archiveData: Array<{
			id: string;
			metadata: any;
			data: Buffer;
		}> = [];

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

		const gzipAsync = promisify(gzip);
		const compressedData = await gzipAsync(archiveBuffer, { level: compressionLevel });

		await fs.writeFile(outputPath, compressedData);

		const checksum = this.calculateChecksum(compressedData);

		return {
			totalFiles: archiveData.length,
			originalSize,
			compressedSize: compressedData.length,
			checksum,
		};
	}

	private async processBinaryImportArchive(
		exportData: Buffer,
		targetWorkflowId?: string,
		targetExecutionId?: string,
		overwriteExisting = false,
		validateChecksums = true,
	): Promise<{
		imported: string[];
		skipped: string[];
		errors: Array<{
			binaryDataId: string;
			error: string;
			severity: 'warning' | 'error';
		}>;
	}> {
		const imported: string[] = [];
		const skipped: string[] = [];
		const errors: Array<{
			binaryDataId: string;
			error: string;
			severity: 'warning' | 'error';
		}> = [];

		try {
			const gunzipAsync = promisify(gunzip);
			const decompressedData = await gunzipAsync(exportData);
			const archiveContent = JSON.parse(decompressedData.toString());

			if (!archiveContent.manifest || !archiveContent.binaryData) {
				throw new ApplicationError('Invalid binary export archive format');
			}

			for (const item of archiveContent.binaryData) {
				try {
					const binaryBuffer = Buffer.from(item.data, 'base64');

					if (validateChecksums) {
						const actualChecksum = this.calculateChecksum(binaryBuffer);
						const metadata = archiveContent.manifest.files.find((f: any) => f.id === item.id);

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
			throw new ApplicationError(
				`Failed to process binary import archive: ${error instanceof Error ? error.message : 'Unknown error'}`,
			);
		}

		return {
			imported,
			skipped,
			errors,
		};
	}

	private async executeCrossInstanceTransfer(
		request: CrossInstanceBinaryTransferRequest,
		transferId: string,
	): Promise<{
		transferred: string[];
		failed: Array<{
			binaryDataId: string;
			error: string;
		}>;
		totalSize: number;
	}> {
		const transferred: string[] = [];
		const failed: Array<{
			binaryDataId: string;
			error: string;
		}> = [];
		let totalSize = 0;

		const headers = this.buildAuthHeaders(request);
		const chunkSize = request.chunkSize || 10 * 1024 * 1024;

		for (const binaryDataId of request.binaryDataIds) {
			try {
				const metadata = await this.binaryDataService.getBinaryDataMetadata(binaryDataId);
				const stream = await this.binaryDataService.getBinaryDataStream(binaryDataId, chunkSize);
				const data = await this.streamToBuffer(stream);

				const response = await axios.post(
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

	private buildAuthHeaders(request: CrossInstanceBinaryTransferRequest): Record<string, string> {
		const headers: Record<string, string> = {
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

	private async findOrphanedBinaryFiles(): Promise<string[]> {
		return [];
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

	private sanitizeUrl(url: string): string {
		try {
			const parsed = new URL(url);
			return `${parsed.protocol}//${parsed.hostname}:${parsed.port || (parsed.protocol === 'https:' ? '443' : '80')}`;
		} catch {
			return '[invalid-url]';
		}
	}

	private async ensureTempDirectory(): Promise<void> {
		try {
			await fs.access(this.tempDir);
		} catch {
			await fs.mkdir(this.tempDir, { recursive: true });
		}
	}
}
