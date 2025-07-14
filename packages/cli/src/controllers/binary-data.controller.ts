import { BinaryDataQueryDto, BinaryDataSignedQueryDto, ViewableMimeTypes } from '@n8n/api-types';
import { Get, Query, RestController } from '@n8n/decorators';
import { Request, Response } from 'express';
import { JsonWebTokenError } from 'jsonwebtoken';
import { BinaryDataService, FileNotFoundError, isValidNonDefaultMode } from 'n8n-core';

import { BadRequestError } from '@/errors/response-errors/bad-request.error';

@RestController('/binary-data')
export class BinaryDataController {
	constructor(private readonly binaryDataService: BinaryDataService) {}

	@Get('/')
	async get(
		_: Request,
		res: Response,
		@Query { id: binaryDataId, action, fileName, mimeType }: BinaryDataQueryDto,
	) {
		try {
			this.validateBinaryDataId(binaryDataId);
			await this.setContentHeaders(binaryDataId, action, res, fileName, mimeType);
			return await this.binaryDataService.getAsStream(binaryDataId);
		} catch (error) {
			if (error instanceof FileNotFoundError) return res.status(404).end();
			if (error instanceof BadRequestError) return res.status(400).end(error.message);
			else throw error;
		}
	}

	@Get('/signed', { skipAuth: true })
	async getSigned(_: Request, res: Response, @Query { token }: BinaryDataSignedQueryDto) {
		try {
			const binaryDataId = this.binaryDataService.validateSignedToken(token);
			this.validateBinaryDataId(binaryDataId);
			await this.setContentHeaders(binaryDataId, 'download', res);
			return await this.binaryDataService.getAsStream(binaryDataId);
		} catch (error) {
			if (error instanceof FileNotFoundError) return res.status(404).end();
			if (error instanceof BadRequestError || error instanceof JsonWebTokenError)
				return res.status(400).end(error.message);
			else throw error;
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
			const metadata = await this.binaryDataService.getMetadata(binaryDataId);
			fileName = metadata.fileName ?? fileName;
			mimeType = metadata.mimeType ?? mimeType;
			res.setHeader('Content-Length', metadata.fileSize);
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
}
