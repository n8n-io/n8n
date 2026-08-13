import { ProjectFilesConfig } from '@n8n/config';
import { Service } from '@n8n/di';
import type { Request, RequestHandler } from 'express';
import multer from 'multer';
import { nanoid } from 'nanoid';
import { mkdir } from 'node:fs/promises';

import type {
	MulterDestinationCallback,
	MulterFilenameCallback,
	ProjectFileRequestWithFile,
} from './project-files.types';

/**
 * Stages one multipart upload per request on disk, so a large file is never
 * buffered in memory on its way to `BinaryDataService`.
 *
 * No MIME or extension filtering: downloads are always served as
 * `Content-Disposition: attachment` and there is no inline-view route, so no file
 * type is renderable on the n8n origin.
 *
 * Errors are attached to the request rather than thrown, because multer runs
 * before the handler and an exception here would bypass the controller's error
 * translation.
 */
@Service()
export class ProjectFileUploadMiddleware {
	private readonly upload: multer.Multer;

	constructor(private readonly config: ProjectFilesConfig) {
		void this.ensureUploadDirExists();

		this.upload = multer({
			storage: multer.diskStorage({
				destination: (
					_req: Request,
					_file: Express.Multer.File,
					done: MulterDestinationCallback,
				) => {
					done(null, this.config.uploadDir);
				},
				// Opaque staged name: the client-supplied name is never used as a path.
				filename: (_req: Request, _file: Express.Multer.File, done: MulterFilenameCallback) => {
					done(null, nanoid(10));
				},
			}),
			limits: {
				fileSize: this.config.maxFileSize,
				files: 1,
			},
		});
	}

	single(fieldName: string): RequestHandler {
		return (req, res, next) => {
			void this.upload.single(fieldName)(req, res, (error) => {
				if (error) {
					(req as ProjectFileRequestWithFile).fileUploadError =
						error instanceof Error ? error : new Error('File upload failed');
				}
				next();
			});
		};
	}

	private async ensureUploadDirExists() {
		await mkdir(this.config.uploadDir, { recursive: true });
	}
}
