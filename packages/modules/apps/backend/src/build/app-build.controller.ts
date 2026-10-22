import type { AuthenticatedRequest } from '@n8n/db';
import { Get, Post, ProjectScope, RestController } from '@n8n/decorators';

import { AppBuildService } from './app-build.service';

type BuildRequest = AuthenticatedRequest<{ projectId: string; appId: string; versionId: string }>;

@RestController('/projects/:projectId/apps/:appId/versions/:versionId/build')
export class AppBuildController {
	constructor(private readonly builds: AppBuildService) {}

	@Get('/')
	@ProjectScope('app:read')
	async status(req: BuildRequest) {
		const { projectId, appId, versionId } = req.params;
		return await this.builds.status(projectId, appId, versionId);
	}

	@Post('/retry')
	@ProjectScope('app:update')
	async retry(req: BuildRequest) {
		const { projectId, appId, versionId } = req.params;
		return await this.builds.build(projectId, appId, versionId, true);
	}
}
