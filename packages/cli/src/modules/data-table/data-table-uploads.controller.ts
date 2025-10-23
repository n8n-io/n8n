import { Post, RestController } from '@n8n/decorators';
import { Container } from '@n8n/di';
import multer from 'multer';

import { BadRequestError } from '@/errors/response-errors/bad-request.error';

import { CsvParserService } from './csv-parser.service';
import { MulterUploadMiddleware } from './multer-upload-middleware';
import { AuthenticatedRequestWithFile } from './types';

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

		const filePath = req.file.path;
		const metadata = await this.csvParserService.parseFile(filePath);

		return {
			originalName: req.file.originalname,
			id: req.file.filename,
			rowCount: metadata.rowCount,
			columnCount: metadata.columnCount,
			columns: metadata.columns,
		};
	}
}
