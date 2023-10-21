import config from '@/config';
import { Authorized, Delete, Get, Patch, Post, RestController } from '@/decorators';
import { FolderService } from '@/services/folder.service';
import { FoldersRequest } from '@/requests';
import { Service } from 'typedi';

@Authorized()
@RestController('/folders')
@Service()
export class FoldersController {
	private config = config;

	constructor(private folderService: FolderService) {}

	@Get('/')
	async getAll(req: FoldersRequest.GetAll) {
		return this.folderService.getAll({ withUsageCount: req.query.withUsageCount === 'true' });
	}

	@Post('/')
	async createFolder(req: FoldersRequest.Create) {
		const folder = this.folderService.toEntity({ name: req.body.name });

		return this.folderService.save(folder, 'create');
	}

	@Patch('/:id(\\w+)')
	async updateFolder(req: FoldersRequest.Update) {
		const newFolder = this.folderService.toEntity({
			id: req.params.id,
			name: req.body.name.trim(),
		});

		return this.folderService.save(newFolder, 'update');
	}

	@Authorized(['global', 'owner'])
	@Delete('/:id(\\w+)')
	async deleteFolder(req: FoldersRequest.Delete) {
		const { id } = req.params;

		await this.folderService.delete(id);

		return true;
	}
}
