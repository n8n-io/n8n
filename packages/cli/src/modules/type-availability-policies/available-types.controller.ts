import type { AvailableTypesResponse, NodeTypeAvailability } from '@n8n/api-types';
import { LICENSE_FEATURES } from '@n8n/constants';
import { Get, Licensed, Param, ProjectScope, RestController } from '@n8n/decorators';
import type { Request, Response } from 'express';

import { NodeTypes } from '@/node-types';

import { NODE_TYPES_KIND } from './constants';
import {
	TypeAvailabilityPolicyService,
	type ComposedTypeVerdict,
} from './type-availability-policy.service';

/**
 * Only unavailable entries carry a reason, so the response for ~1,400 types stays small on the
 * common path — the builder fetches it on every workflow open.
 */
function toAvailabilityEntry(verdict: ComposedTypeVerdict): NodeTypeAvailability {
	if (verdict.action === 'allow') return { name: verdict.name, available: true };

	return {
		name: verdict.name,
		available: false,
		scope: verdict.scope,
		...(verdict.matchedRuleId !== null && { matchedRuleId: verdict.matchedRuleId }),
		...(verdict.optInAvailable && { optInAvailable: true }),
	};
}

/**
 * The effective node type set for one project — the builder UI's only source for what a member
 * may use and why. Gated on `project:read`: per the RFC, reading effective availability takes
 * only project membership, while authoring the policy stays with project admins.
 *
 * Kept out of `TypeAvailabilityPolicyProjectController` because that controller's whole surface
 * is admin-gated, and this is the one read every member makes.
 */
@RestController('/projects/:projectId/available-types')
export class AvailableTypesController {
	constructor(
		private readonly service: TypeAvailabilityPolicyService,
		private readonly nodeTypes: NodeTypes,
	) {}

	@Get('/')
	@Licensed(LICENSE_FEATURES.NODE_TYPE_POLICIES)
	@ProjectScope('project:read')
	async getAvailableTypes(
		_req: Request,
		_res: Response,
		@Param('projectId') projectId: string,
	): Promise<AvailableTypesResponse> {
		// The known-nodes registry, not the type descriptions: those are released from memory
		// after startup, and availability needs nothing but the names.
		const typeNames = Object.keys(this.nodeTypes.getKnownTypes());

		const verdicts = await this.service.evaluateComposedTypes(
			NODE_TYPES_KIND,
			projectId,
			typeNames,
		);

		return verdicts.map(toAvailabilityEntry);
	}
}
