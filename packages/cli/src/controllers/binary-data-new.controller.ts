import { BinaryDataQueryDto, BinaryDataSignedQueryDto, BinaryDataUploadDto } from '@n8n/api-types';
import { Get, Post, Delete, Query, Body, Param, RestController } from '@n8n/decorators';
import { Request, Response } from 'express';
import { JsonWebTokenError } from 'jsonwebtoken';
import {
	BinaryDataService as CoreBinaryDataService,
	FileNotFoundError,
	isValidNonDefaultMode,
} from 'n8n-core';
import { ApplicationError } from 'n8n-workflow';
import * as multer from 'multer';

import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { BinaryDataService } from '@/services/binary-data.service';

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

		if (
			action === 'view' &&
			(!mimeType ||
				!['image/jpeg', 'image/png', 'image/gif', 'text/plain', 'application/pdf'].includes(
					mimeType.toLowerCase(),
				))
		) {
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
}
