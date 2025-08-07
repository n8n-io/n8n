import {
	BinaryDataQueryDto,
	BinaryDataSignedQueryDto,
	BinaryDataUploadDto,
	ViewableMimeTypes,
} from '@n8n/api-types';
import {
	Get,
	Post,
	Delete,
	Query,
	Body,
	Param,
	RestController,
	GlobalScope,
	Licensed,
} from '@n8n/decorators';
import type { AuthenticatedRequest } from '@n8n/db';
import { Request, Response } from 'express';
import { JsonWebTokenError } from 'jsonwebtoken';
import {
	BinaryDataService as CoreBinaryDataService,
	FileNotFoundError,
	isValidNonDefaultMode,
} from 'n8n-core';
import { ApplicationError } from 'n8n-workflow';
import multer from 'multer';

import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { InternalServerError } from '@/errors/response-errors/internal-server.error';
import { BinaryDataService } from '@/services/binary-data.service';
import { BinaryMigrationService } from '@/services/binary-migration.service';
import { BinaryExportService } from '@/services/binary-export.service';

// Configure multer for file uploads
const upload = multer({
	storage: multer.memoryStorage(),
	limits: {
		fileSize: 100 * 1024 * 1024, // 100MB limit
		files: 1, // Only one file at a time
	},
});

@RestController('/binary-data')
export class BinaryDataController {
	constructor(
		private readonly binaryDataService: BinaryDataService,
		private readonly coreBinaryDataService: CoreBinaryDataService,
		private readonly binaryMigrationService: BinaryMigrationService,
		private readonly binaryExportService: BinaryExportService,
	) {}

	@Get('/')
	async get(_: Request, res: Response, @Query payload: BinaryDataQueryDto) {
		try {
			const { id: binaryDataId, action, fileName, mimeType } = payload;
			this.validateBinaryDataId(binaryDataId);
			await this.setContentHeaders(binaryDataId, action, res, fileName, mimeType);
			return await this.binaryDataService.getBinaryDataStream(binaryDataId);
		} catch (error) {
			if (error instanceof FileNotFoundError) return res.status(404).end();
			if (error instanceof BadRequestError || error instanceof ApplicationError) {
				return res.status(400).end(error.message);
			} else throw error;
		}
	}

	@Get('/signed', { skipAuth: true })
	async getSigned(_: Request, res: Response, @Query payload: BinaryDataSignedQueryDto) {
		try {
			const binaryDataId = this.binaryDataService.validateSignedToken(payload.token);
			this.validateBinaryDataId(binaryDataId);
			await this.setContentHeaders(binaryDataId, 'download', res);
			return await this.binaryDataService.getBinaryDataStream(binaryDataId);
		} catch (error) {
			if (error instanceof FileNotFoundError) return res.status(404).end();
			if (
				error instanceof BadRequestError ||
				error instanceof JsonWebTokenError ||
				error instanceof ApplicationError
			)
				return res.status(400).end(error.message);
			else throw error;
		}
	}

	@Post('/upload')
	async upload(req: Request, res: Response, @Body payload: BinaryDataUploadDto) {
		return new Promise((resolve, reject) => {
			upload.single('file')(req, res, async (uploadError) => {
				if (uploadError) {
					if (uploadError instanceof multer.MulterError) {
						if (uploadError.code === 'LIMIT_FILE_SIZE') {
							return res.status(413).json({ error: 'File too large (max 100MB)' });
						}
						return res.status(400).json({ error: uploadError.message });
					}
					return reject(uploadError);
				}

				if (!req.file) {
					return res.status(400).json({ error: 'No file uploaded' });
				}

				try {
					const metadata = await this.binaryDataService.uploadBinaryData(req.file.buffer, {
						fileName: payload.fileName || req.file.originalname,
						mimeType: payload.mimeType || req.file.mimetype,
						workflowId: payload.workflowId,
						executionId: payload.executionId,
					});

					resolve(
						res.status(201).json({
							success: true,
							data: metadata,
						}),
					);
				} catch (error) {
					if (error instanceof ApplicationError) {
						return res.status(400).json({ error: error.message });
					}
					reject(error);
				}
			});
		});
	}

	@Get('/:id/download')
	async download(_: Request, res: Response, @Param('id') binaryDataId: string) {
		try {
			if (!binaryDataId) {
				return res.status(400).json({ error: 'Binary data ID is required' });
			}

			this.validateBinaryDataId(binaryDataId);
			await this.setContentHeaders(binaryDataId, 'download', res);
			return await this.binaryDataService.getBinaryDataStream(binaryDataId);
		} catch (error) {
			if (error instanceof FileNotFoundError) return res.status(404).end();
			if (error instanceof BadRequestError || error instanceof ApplicationError) {
				return res.status(400).end(error.message);
			} else throw error;
		}
	}

	@Delete('/:id')
	async delete(_: Request, res: Response, @Param('id') binaryDataId: string) {
		try {
			if (!binaryDataId) {
				return res.status(400).json({ error: 'Binary data ID is required' });
			}

			this.validateBinaryDataId(binaryDataId);
			await this.binaryDataService.deleteBinaryData(binaryDataId);

			return res.status(200).json({
				success: true,
				message: 'Binary data deleted successfully',
				id: binaryDataId,
			});
		} catch (error) {
			if (error instanceof FileNotFoundError) {
				return res.status(404).json({ error: 'Binary data not found' });
			}
			if (error instanceof ApplicationError || error instanceof BadRequestError) {
				return res.status(400).json({ error: error.message });
			}
			throw error;
		}
	}

	private validateBinaryDataId(binaryDataId: string) {
		if (!binaryDataId) {
			throw new BadRequestError('Missing binary data ID');
		}

		const separatorIndex = binaryDataId.indexOf(':');

		if (separatorIndex === -1) {
			throw new BadRequestError('Malformed binary data ID');
		}

		const mode = binaryDataId.substring(0, separatorIndex);

		if (!isValidNonDefaultMode(mode)) {
			throw new BadRequestError('Invalid binary data mode');
		}

		const path = binaryDataId.substring(separatorIndex + 1);

		if (path === '' || path === '/' || path === '//') {
			throw new BadRequestError('Malformed binary data ID');
		}
	}

	private async setContentHeaders(
		binaryDataId: string,
		action: 'view' | 'download',
		res: Response,
		fileName?: string,
		mimeType?: string,
	) {
		try {
			const metadata = await this.binaryDataService.getBinaryDataMetadata(binaryDataId);
			fileName = (metadata.fileName as string) ?? fileName;
			mimeType = (metadata.mimeType as string) ?? mimeType;
			if (metadata.fileSize && typeof metadata.fileSize === 'number') {
				res.setHeader('Content-Length', metadata.fileSize);
			}
		} catch {}

		if (action === 'view' && (!mimeType || !ViewableMimeTypes.includes(mimeType.toLowerCase()))) {
			throw new BadRequestError('Content not viewable');
		}

		if (mimeType) {
			res.setHeader('Content-Type', mimeType);
		}

		if (action === 'download' && fileName) {
			const encodedFilename = encodeURIComponent(fileName);
			res.setHeader('Content-Disposition', `attachment; filename="${encodedFilename}"`);
		}
	}

	@Post('/bulk/export')
	@GlobalScope('instance:read')
	@Licensed('feat:advancedPermissions')
	async bulkExport(
		req: AuthenticatedRequest,
		res: Response,
		@Body request: {
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
		},
	): Promise<any> {
		try {
			if (
				!request.workflowIds?.length &&
				!request.executionIds?.length &&
				!request.binaryDataIds?.length
			) {
				return res.status(400).json({
					error: 'At least one of workflowIds, executionIds, or binaryDataIds must be provided',
				});
			}

			const result = await this.binaryExportService.bulkExportBinaryData(req.user, request);

			return res.status(201).json({
				success: true,
				data: result,
			});
		} catch (error) {
			if (error instanceof BadRequestError || error instanceof ApplicationError) {
				return res.status(400).json({ error: error.message });
			}
			throw new InternalServerError('Bulk export operation failed');
		}
	}

	@Post('/bulk/import')
	@GlobalScope('instance:write')
	@Licensed('feat:advancedPermissions')
	async bulkImport(
		req: AuthenticatedRequest,
		res: Response,
		@Body request: {
			exportPath?: string;
			exportData?: Buffer;
			targetWorkflowId?: string;
			targetExecutionId?: string;
			overwriteExisting?: boolean;
			validateChecksums?: boolean;
		},
	): Promise<any> {
		try {
			if (!request.exportPath && !request.exportData) {
				return res.status(400).json({
					error: 'Either exportPath or exportData must be provided',
				});
			}

			const result = await this.binaryMigrationService.importBinaryData(req.user, request);

			return res.status(201).json({
				success: true,
				data: result,
			});
		} catch (error) {
			if (error instanceof BadRequestError || error instanceof ApplicationError) {
				return res.status(400).json({ error: error.message });
			}
			throw new InternalServerError('Bulk import operation failed');
		}
	}

	@Post('/migrate/transfer')
	@GlobalScope('instance:write')
	@Licensed('feat:advancedPermissions')
	async crossInstanceTransfer(
		req: AuthenticatedRequest,
		res: Response,
		@Body request: {
			targetInstanceUrl: string;
			targetApiKey?: string;
			targetAuthToken?: string;
			targetUsername?: string;
			targetPassword?: string;
			binaryDataIds: string[];
			compressionLevel?: number;
			chunkSize?: number;
		},
	): Promise<any> {
		try {
			if (!request.targetInstanceUrl) {
				return res.status(400).json({
					error: 'Target instance URL is required',
				});
			}

			if (!request.binaryDataIds?.length) {
				return res.status(400).json({
					error: 'At least one binary data ID must be provided',
				});
			}

			if (
				!request.targetApiKey &&
				!request.targetAuthToken &&
				!(request.targetUsername && request.targetPassword)
			) {
				return res.status(400).json({
					error:
						'Target instance authentication is required (apiKey, authToken, or username/password)',
				});
			}

			const result = await this.binaryMigrationService.transferToInstance(req.user, request);

			return res.status(201).json({
				success: true,
				data: result,
			});
		} catch (error) {
			if (error instanceof BadRequestError || error instanceof ApplicationError) {
				return res.status(400).json({ error: error.message });
			}
			throw new InternalServerError('Cross-instance transfer failed');
		}
	}

	@Post('/validate/integrity')
	@GlobalScope('instance:read')
	async validateIntegrity(
		req: AuthenticatedRequest,
		res: Response,
		@Body request: { binaryDataIds: string[] },
	): Promise<any> {
		try {
			if (!request.binaryDataIds?.length) {
				return res.status(400).json({
					error: 'At least one binary data ID must be provided',
				});
			}

			const result = await this.binaryMigrationService.validateBinaryIntegrity(
				req.user,
				request.binaryDataIds,
			);

			return res.status(200).json({
				success: true,
				data: result,
			});
		} catch (error) {
			if (error instanceof BadRequestError || error instanceof ApplicationError) {
				return res.status(400).json({ error: error.message });
			}
			throw new InternalServerError('Integrity validation failed');
		}
	}

	@Post('/cleanup/orphaned')
	@GlobalScope('instance:write')
	@Licensed('feat:advancedPermissions')
	async cleanupOrphaned(req: AuthenticatedRequest, res: Response): Promise<any> {
		try {
			const result = await this.binaryMigrationService.cleanupOrphanedBinaryData(req.user);

			return res.status(200).json({
				success: true,
				data: result,
			});
		} catch (error) {
			if (error instanceof BadRequestError || error instanceof ApplicationError) {
				return res.status(400).json({ error: error.message });
			}
			throw new InternalServerError('Cleanup operation failed');
		}
	}

	@Post('/workflow/package')
	@GlobalScope('workflow:read')
	@Licensed('feat:advancedPermissions')
	async createWorkflowPackage(
		req: AuthenticatedRequest,
		res: Response,
		@Body request: {
			workflowId: string;
			includeExecutions?: boolean;
			includeBinaryData?: boolean;
			executionLimit?: number;
			compressionLevel?: number;
		},
	): Promise<any> {
		try {
			if (!request.workflowId) {
				return res.status(400).json({
					error: 'Workflow ID is required',
				});
			}

			const result = await this.binaryExportService.createWorkflowPackage(req.user, request);

			return res.status(201).json({
				success: true,
				data: result,
			});
		} catch (error) {
			if (error instanceof BadRequestError || error instanceof ApplicationError) {
				return res.status(400).json({ error: error.message });
			}
			throw new InternalServerError('Workflow package creation failed');
		}
	}

	@Post('/search')
	@GlobalScope('instance:read')
	async searchBinaryData(
		req: AuthenticatedRequest,
		res: Response,
		@Body request: {
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
		},
	): Promise<any> {
		try {
			const result = await this.binaryExportService.searchBinaryData(req.user, request);

			return res.status(200).json({
				success: true,
				data: result,
			});
		} catch (error) {
			if (error instanceof BadRequestError || error instanceof ApplicationError) {
				return res.status(400).json({ error: error.message });
			}
			throw new InternalServerError('Binary data search failed');
		}
	}

	@Get('/operations/:operationId/progress')
	@GlobalScope('instance:read')
	async getOperationProgress(
		req: AuthenticatedRequest,
		res: Response,
		@Param('operationId') operationId: string,
	): Promise<any> {
		try {
			if (!operationId) {
				return res.status(400).json({
					error: 'Operation ID is required',
				});
			}

			const result = await this.binaryExportService.getOperationProgress(operationId);

			if (!result) {
				return res.status(404).json({
					error: 'Operation not found',
				});
			}

			return res.status(200).json({
				success: true,
				data: result,
			});
		} catch (error) {
			if (error instanceof BadRequestError || error instanceof ApplicationError) {
				return res.status(400).json({ error: error.message });
			}
			throw new InternalServerError('Failed to get operation progress');
		}
	}

	@Get('/operations')
	@GlobalScope('instance:read')
	async listActiveOperations(req: AuthenticatedRequest, res: Response): Promise<any> {
		try {
			const result = await this.binaryExportService.listActiveOperations(req.user);

			return res.status(200).json({
				success: true,
				data: {
					operations: result,
					total: result.length,
				},
			});
		} catch (error) {
			if (error instanceof BadRequestError || error instanceof ApplicationError) {
				return res.status(400).json({ error: error.message });
			}
			throw new InternalServerError('Failed to list active operations');
		}
	}

	@Delete('/operations/:operationId')
	@GlobalScope('instance:write')
	async cancelOperation(
		req: AuthenticatedRequest,
		res: Response,
		@Param('operationId') operationId: string,
	): Promise<any> {
		try {
			if (!operationId) {
				return res.status(400).json({
					error: 'Operation ID is required',
				});
			}

			const result = await this.binaryExportService.cancelOperation(req.user, operationId);

			return res.status(200).json({
				success: true,
				data: result,
			});
		} catch (error) {
			if (error instanceof BadRequestError || error instanceof ApplicationError) {
				return res.status(400).json({ error: error.message });
			}
			throw new InternalServerError('Failed to cancel operation');
		}
	}
}
