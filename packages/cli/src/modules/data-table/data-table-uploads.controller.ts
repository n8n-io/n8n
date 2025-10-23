import { Post, RestController } from '@n8n/decorators';
import { Container } from '@n8n/di';

import { MulterUploadMiddleware } from './multer-upload-middleware';
import { AuthenticatedRequestWithFile } from './types';
import { FileUploadError } from './errors/data-table-file-upload.error';

import { BadRequestError } from '@/errors/response-errors/bad-request.error';

const uploadMiddleware = Container.get(MulterUploadMiddleware);

@RestController('/data-tables/uploads')
export class DataTableUploadsController {
	@Post('/', {
		middlewares: [uploadMiddleware.single('file')],
		skipAuth: false,
	})
	uploadFile(req: AuthenticatedRequestWithFile, _res: Response) {
		try {
			return {
				originalName: req.file.originalname,
				id: req.file.filename.split('-')[0],
			};
		} catch (e: unknown) {
			if (e instanceof FileUploadError) {
				throw new BadRequestError(e.message);
			}
			throw e;
		}
	}
}
