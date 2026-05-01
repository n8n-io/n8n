import { Post, RestController } from '@n8n/decorators';
import { Container } from '@n8n/di';
import multer from 'multer';

import { BadRequestError } from '@/errors/response-errors/bad-request.error';

import { CsvParserService } from './csv-parser.service';
import { MulterUploadMiddleware } from './multer-upload-middleware';
import { AuthenticatedRequestWithFile, hasStringProperty } from './types';

const uploadMiddleware = Container.get(MulterUploadMiddleware);

@RestController('/data-tables/uploads')
export class DataTableUploadsController {
	constructor(private readonly csvParserService: CsvParserService) {}

	@Post('/', {
		middlewares: [uploadMiddleware.single('file')],
	})
	async uploadFile(req: AuthenticatedRequestWithFile, _res: Response) {
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

		// Extract hasHeaders parameter from request body (multer parses form fields to body), default to true
		const hasHeaders =
			hasStringProperty(req.body, 'hasHeaders') && req.body.hasHeaders === 'false' ? false : true;

		const metadata = await this.csvParserService.parseFile(req.file.filename, hasHeaders);

		return {
			originalName: req.file.originalname,
			id: req.file.filename,
			rowCount: metadata.rowCount,
			columnCount: metadata.columnCount,
			columns: metadata.columns,
		};
	}
}
