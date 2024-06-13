import { Response } from 'express';
import { BinaryDataService, FileNotFoundError } from 'n8n-core';
import { Get, Query, Res, RestController } from '@/decorators';
import { GetBinaryData } from '@/dtos/binaryData';

@RestController('/binary-data')
export class BinaryDataController {
	constructor(private readonly binaryDataService: BinaryDataService) {}

	@Get('/')
	async get(@Query query: GetBinaryData, @Res res: Response) {
		try {
			if (!query.fileName || !query.mimeType) {
				try {
					const metadata = await this.binaryDataService.getMetadata(query.id);
					query.fileName = metadata.fileName;
					query.mimeType = metadata.mimeType;
					res.setHeader('Content-Length', metadata.fileSize);
				} catch {}
			}

			if (query.mimeType) res.setHeader('Content-Type', query.mimeType);

			if (query.action === 'download' && query.fileName) {
				const encodedFilename = encodeURIComponent(query.fileName);
				res.setHeader('Content-Disposition', `attachment; filename="${encodedFilename}"`);
			}

			return await this.binaryDataService.getAsStream(query.id);
		} catch (error) {
			if (error instanceof FileNotFoundError) return res.writeHead(404).end();
			else throw error;
		}
	}
}
