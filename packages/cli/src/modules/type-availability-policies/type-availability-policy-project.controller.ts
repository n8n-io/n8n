import {
	PutProjectPolicyDto,
	SetProjectTypeAccessDto,
	type NodeTypeUsageResponse,
} from '@n8n/api-types';
import { LICENSE_FEATURES } from '@n8n/constants';
import { AuthenticatedRequest } from '@n8n/db';
import { Body, Get, Licensed, Patch, ProjectScope, Put, RestController } from '@n8n/decorators';
import type { Response } from 'express';

import { NODE_TYPES_KIND } from './constants';
import { NodeTypeUsageService } from './node-type-usage.service';
import { TypeAvailabilityPolicyService } from './type-availability-policy.service';

/**
 * Project-scope REST surface for a project's own node type availability policy row. Every
 * route requires `LICENSE_FEATURES.TYPE_AVAILABILITY_POLICIES` and `nodeTypePolicy:manage`,
 * granted to project admins so they self-govern their own project's row (per IAM-1142's RFC
 * decision).
 *
 * Deliberately narrower than the instance controller: the composed read/write, mirroring
 * `GET`/`PUT /instance`, the access write, and the usage read. Policy-document CRUD and multi-attachment management stay
 * instance-only — those act on documents and attachments potentially shared across scopes.
 */
@RestController('/projects/:projectId/node-type-policies')
export class TypeAvailabilityPolicyProjectController {
	constructor(
		private readonly service: TypeAvailabilityPolicyService,
		private readonly nodeTypeUsageService: NodeTypeUsageService,
	) {}

	@Get('/project')
	@Licensed(LICENSE_FEATURES.TYPE_AVAILABILITY_POLICIES)
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

	@Get('/usage')
	@Licensed(LICENSE_FEATURES.TYPE_AVAILABILITY_POLICIES)
	@ProjectScope('nodeTypePolicy:manage')
	async getUsage(req: AuthenticatedRequest<{ projectId: string }>): Promise<NodeTypeUsageResponse> {
		return await this.nodeTypeUsageService.getUsage(req.params.projectId);
	}

	@Patch('/project/access')
	@Licensed(LICENSE_FEATURES.TYPE_AVAILABILITY_POLICIES)
	@ProjectScope('nodeTypePolicy:manage')
	async setProjectAccess(
		req: AuthenticatedRequest<{ projectId: string }>,
		_res: Response,
		@Body dto: SetProjectTypeAccessDto,
	) {
		const result = await this.service.setTypeAccess(
			NODE_TYPES_KIND,
			req.params.projectId,
			dto.changes,
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

	@Put('/project')
	@Licensed(LICENSE_FEATURES.TYPE_AVAILABILITY_POLICIES)
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
