import { ListProjectFilesQueryDto } from '@n8n/api-types';
import { AuthenticatedRequest } from '@n8n/db';
import { Get, GlobalScope, Query, RestController } from '@n8n/decorators';

import { FileStorageAggregateService } from './file-storage-aggregate.service';
import { ProjectFileService } from './file-storage.service';

/**
 * Cross-project surface for /home/files. Deliberately `/files`, not
 * `/files-global`: the data-table aggregate's `-global` suffix is a rename
 * artifact (from `/data-stores-global`), the prefix is free, and `/files` is
 * also the natural home for the Phase 2 signed-download route.
 */
@RestController('/files')
export class FileStorageAggregateController {
	constructor(
		private readonly fileStorageAggregateService: FileStorageAggregateService,
		private readonly projectFileService: ProjectFileService,
	) {}

	@Get('/')
	@GlobalScope('file:list')
	async listFiles(
		req: AuthenticatedRequest,
		_res: Response,
		@Query payload: ListProjectFilesQueryDto,
	) {
		const { count, data } = await this.fileStorageAggregateService.getManyAndCount(
			req.user,
			payload,
		);
		return {
			count,
			data: data.map((file) => ({
				id: file.id,
				name: file.name,
				mimeType: file.mimeType,
				sizeBytes: file.fileSizeBytes,
				projectId: file.projectId,
				project: file.project
					? { id: file.project.id, name: file.project.name, type: file.project.type }
					: undefined,
				createdAt: file.createdAt,
				updatedAt: file.updatedAt,
			})),
		};
	}

	@Get('/limits')
	@GlobalScope('file:list')
	async getFileStorageSize(_req: AuthenticatedRequest) {
		return await this.projectFileService.getFileStorageSize();
	}
}
