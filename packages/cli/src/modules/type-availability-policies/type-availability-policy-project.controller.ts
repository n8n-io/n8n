import { PutProjectPolicyDto } from '@n8n/api-types';
import { LICENSE_FEATURES } from '@n8n/constants';
import { AuthenticatedRequest } from '@n8n/db';
import { Body, Get, Licensed, ProjectScope, Put, RestController } from '@n8n/decorators';
import type { Response } from 'express';

import { NODE_TYPES_KIND } from './constants';
import { TypeAvailabilityPolicyService } from './type-availability-policy.service';

/**
 * Project-scope REST surface for a project's own node type availability policy row. Every
 * route requires `LICENSE_FEATURES.NODE_TYPE_POLICIES` and `nodeTypePolicy:manage`, granted to
 * project admins so they self-govern their own project's row (per IAM-1142's RFC decision).
 *
 * Deliberately narrower than the instance controller: only the composed read/write, mirroring
 * `GET`/`PUT /instance`. Policy-document CRUD and multi-attachment management stay
 * instance-only — those act on documents and attachments potentially shared across scopes.
 */
@RestController('/projects/:projectId/node-type-policies')
export class TypeAvailabilityPolicyProjectController {
	constructor(private readonly service: TypeAvailabilityPolicyService) {}

	@Get('/project')
	@Licensed(LICENSE_FEATURES.NODE_TYPE_POLICIES)
	@ProjectScope('nodeTypePolicy:manage')
	async getProjectPolicy(req: AuthenticatedRequest<{ projectId: string }>) {
		const effective = await this.service.getEffectivePolicy(NODE_TYPES_KIND, req.params.projectId);

		return {
			scopeId: effective.scopeId,
			rules: effective.rules,
			defaultAction: effective.defaultAction,
			version: effective.version,
		};
	}

	@Put('/project')
	@Licensed(LICENSE_FEATURES.NODE_TYPE_POLICIES)
	@ProjectScope('nodeTypePolicy:manage')
	async putProjectPolicy(
		req: AuthenticatedRequest<{ projectId: string }>,
		_res: Response,
		@Body dto: PutProjectPolicyDto,
	) {
		const result = await this.service.setEffectivePolicy(
			NODE_TYPES_KIND,
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
