import { Post, RestController } from '@n8n/decorators';
import { Container } from '@n8n/di';
import { createReadStream } from 'fs';
import { unlink } from 'fs/promises';
import multer from 'multer';
import type { IBinaryData } from 'n8n-workflow';

import { BinaryDataService } from 'n8n-core';
import { BadRequestError } from '@/errors/response-errors/bad-request.error';

import { FileUploadMulterMiddleware } from './file-upload-multer.middleware';
import type { AuthenticatedRequestWithFile } from './types';

const uploadMiddleware = Container.get(FileUploadMulterMiddleware);

@RestController('/file-uploads')
export class FileUploadController {
	constructor(private readonly binaryDataService: BinaryDataService) {}

	@Post('/', {
		middlewares: [uploadMiddleware.single('file')],
	})
	async uploadFile(req: AuthenticatedRequestWithFile) {
		if (req.fileUploadError) {
			const error = req.fileUploadError;
			if (error instanceof multer.MulterError) {
				throw new BadRequestError(`File upload error: ${error.message}`);
			} else if (error instanceof BadRequestError) {
				throw error;
			} else {
				throw new BadRequestError('File upload failed');
			}
		}

		if (!req.file) {
			throw new BadRequestError('No file uploaded');
		}

		const { path: tempPath, originalname: fileName, mimetype: mimeType } = req.file;

		try {
			const stream = createReadStream(tempPath);

			const binaryData: IBinaryData = {
				fileName,
				mimeType,
				data: '',
			};

			const location = {
				type: 'custom' as const,
				pathSegments: ['file-uploads'],
			};

			const stored = await this.binaryDataService.store(location, stream, binaryData);

			return {
				fileId: stored.id,
				fileName,
				mimeType,
				fileSize: stored.bytes,
			};
		} finally {
			await unlink(tempPath).catch(() => {});
		}
	}
}
