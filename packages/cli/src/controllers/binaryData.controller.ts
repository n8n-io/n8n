import { Service } from 'typedi';
import express from 'express';
import { BinaryDataService, FileNotFoundError, isValidNonDefaultMode } from 'n8n-core';
import { Get, RestController } from '@/decorators';
import { BinaryDataRequest } from '@/requests';

@RestController('/binary-data')
@Service()
export class BinaryDataController {
	constructor(private readonly binaryDataService: BinaryDataService) {}

	@Get('/')
	async get(req: BinaryDataRequest, res: express.Response) {
		const { id: binaryDataId, action } = req.query;

		if (!binaryDataId) {
			return res.status(400).end('Missing binary data ID');
		}

		if (!binaryDataId.includes(':')) {
			return res.status(400).end('Missing binary data mode');
		}

		const [mode] = binaryDataId.split(':');

		if (!isValidNonDefaultMode(mode)) {
			return res.status(400).end('Invalid binary data mode');
		}

		let { fileName, mimeType } = req.query;

		try {
			if (!fileName || !mimeType) {
				try {
					const metadata = await this.binaryDataService.getMetadata(binaryDataId);
					fileName = metadata.fileName;
					mimeType = metadata.mimeType;
					res.setHeader('Content-Length', metadata.fileSize);
				} catch {}
			}

			if (mimeType) res.setHeader('Content-Type', mimeType);

			if (action === 'download') {
				res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
			}

			return await this.binaryDataService.getAsStream(binaryDataId);
		} catch (error) {
			if (error instanceof FileNotFoundError) return res.writeHead(404).end();
			else throw error;
		}
	}
}
