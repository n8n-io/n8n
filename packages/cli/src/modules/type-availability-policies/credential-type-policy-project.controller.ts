import { PutProjectPolicyDto } from '@n8n/api-types';
import { LICENSE_FEATURES } from '@n8n/constants';
import { AuthenticatedRequest } from '@n8n/db';
import { Body, Get, Licensed, ProjectScope, Put, RestController } from '@n8n/decorators';
import type { Response } from 'express';

import { CREDENTIAL_TYPES_KIND } from './constants';
import { TypeAvailabilityPolicyService } from './type-availability-policy.service';

/**
 * Project-scope REST surface for a project's own credential type availability policy row. Same
 * shape as `TypeAvailabilityPolicyProjectController`, mounted on its own path and kind, granted
 * to project admins via `credentialTypePolicy:manage`.
 *
 * Deliberately narrower than the instance controller: only the composed read/write. Policy
 * document CRUD and multi-attachment management stay instance-only.
 */
@RestController('/projects/:projectId/credential-type-policies')
export class CredentialTypePolicyProjectController {
	constructor(private readonly service: TypeAvailabilityPolicyService) {}

	@Get('/project')
	@Licensed(LICENSE_FEATURES.NODE_TYPE_POLICIES)
	@ProjectScope('credentialTypePolicy:manage')
	async getProjectPolicy(req: AuthenticatedRequest<{ projectId: string }>) {
		const effective = await this.service.getEffectivePolicy(
			CREDENTIAL_TYPES_KIND,
			req.params.projectId,
		);

		return {
			scopeId: effective.scopeId,
			rules: effective.rules,
			defaultAction: effective.defaultAction,
			version: effective.version,
		};
	}

	@Put('/project')
	@Licensed(LICENSE_FEATURES.NODE_TYPE_POLICIES)
	@ProjectScope('credentialTypePolicy:manage')
	async putProjectPolicy(
		req: AuthenticatedRequest<{ projectId: string }>,
		_res: Response,
		@Body dto: PutProjectPolicyDto,
	) {
		const result = await this.service.setEffectivePolicy(
			CREDENTIAL_TYPES_KIND,
			req.params.projectId,
			{ rules: dto.rules, defaultAction: dto.defaultAction },
			dto.version,
			req.user.id,
		);

		return {
			scopeId: result.scopeId,
			rules: result.rules,
			defaultAction: result.defaultAction,
			version: result.version,
			warnings: result.warnings,
		};
	}
}
