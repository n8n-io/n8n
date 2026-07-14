import { AuthenticatedRequest } from '@n8n/db';
import { Get, ProjectScope, RestController } from '@n8n/decorators';
import { Response } from 'express';

import { ProjectDependencyGraphService } from './project-dependency-graph.service';

@RestController('/projects/:projectId/dependency-graph')
export class ProjectDependencyGraphController {
	constructor(private readonly graphService: ProjectDependencyGraphService) {}

	@Get('/')
	@ProjectScope('project:read')
	async getDependencyGraph(req: AuthenticatedRequest<{ projectId: string }>, _res: Response) {
		const { projectId } = req.params;
		const query = req.query as Record<string, string | undefined>;

		return await this.graphService.getGraph(projectId, req.user, {
			folderId: query.folderId,
			explode: query.explode === 'true',
			draft: query.draft === 'true' ? true : undefined,
			relationshipTypes: query.relationshipTypes?.split(',').filter(Boolean),
		});
	}
}
