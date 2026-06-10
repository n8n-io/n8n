import type { AuthenticatedRequest } from '@n8n/db';
import { Get, Param, Post, RestController } from '@n8n/decorators';
import { Response } from 'express';

import { N8nPackagesRegistryService } from './n8n-packages-registry.service';

@RestController('/n8n-packages-registry')
export class N8nPackagesRegistryController {
	constructor(private readonly registryService: N8nPackagesRegistryService) {}

	@Get('/settings')
	async getSettings(_req: AuthenticatedRequest) {
		const isConnected = await this.registryService.isConnected();
		return { connected: isConnected };
	}

	@Get('/registries')
	async listRegistries(_req: AuthenticatedRequest) {
		return await this.registryService.listRegistries();
	}

	@Get('/registries/:registryId/projects')
	async findRegistryProjects(
		req: AuthenticatedRequest,
		_res: Response,
		@Param('registryId') registryId: string,
	) {
		return await this.registryService.findAllProjects(req.user, registryId);
	}

	@Get('/registries/:registryId/importable-changes')
	async findRegistryImportableChanges(
		req: AuthenticatedRequest,
		_res: Response,
		@Param('registryId') registryId: string,
	) {
		return await this.registryService.findImportableChangesGroupedByProject(req.user, registryId);
	}

	@Post('/registries/:registryId/projects/:projectId/import')
	async importRegistryProjectChanges(
		req: AuthenticatedRequest,
		_res: Response,
		@Param('registryId') registryId: string,
		@Param('projectId') projectId: string,
	) {
		return await this.registryService.importProjectChanges(req.user, projectId, registryId);
	}

	@Get('/projects')
	async findAllProjects(req: AuthenticatedRequest) {
		return await this.registryService.findAllProjects(req.user);
	}

	@Get('/importable-changes')
	async findImportableChanges(req: AuthenticatedRequest) {
		return await this.registryService.findImportableChangesGroupedByProject(req.user);
	}

	@Post('/projects/:projectId/import')
	async importProjectChanges(
		req: AuthenticatedRequest,
		_res: Response,
		@Param('projectId') projectId: string,
	) {
		return await this.registryService.importProjectChanges(req.user, projectId);
	}
}
