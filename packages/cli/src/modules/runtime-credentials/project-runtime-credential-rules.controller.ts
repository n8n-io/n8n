import type { ProjectRuntimeCredentialRule } from '@n8n/api-types';
import { LICENSE_FEATURES } from '@n8n/constants';
import type { AuthenticatedRequest } from '@n8n/db';
import { Get, Licensed, ProjectScope, RestController } from '@n8n/decorators';

import { ProjectRuntimeCredentialRulesService } from './project-runtime-credential-rules.service';

/**
 * The rules that apply to a project and the access that the request-fed credential type policy
 * gives each one. Read-only. A project admin can read it, because they own the project policy
 * that decides the access.
 */
@RestController('/projects/:projectId/runtime-credential-rules')
export class ProjectRuntimeCredentialRulesController {
	constructor(private readonly service: ProjectRuntimeCredentialRulesService) {}

	@Get('/')
	@Licensed(LICENSE_FEATURES.TYPE_AVAILABILITY_POLICIES)
	@ProjectScope('credentialTypePolicy:manageRequestFed')
	async list(
		req: AuthenticatedRequest<{ projectId: string }>,
	): Promise<{ rules: ProjectRuntimeCredentialRule[] }> {
		return { rules: await this.service.listForProject(req.params.projectId) };
	}
}
