import {
	NodeTypePolicyEffectivePublicDto,
	NodeTypePolicyEffectiveWriteResultPublicDto,
	PutInstancePolicyDto,
	PutProjectPolicyDto,
	projectIdParamSchema,
} from '@n8n/api-types';
import { ModuleRegistry } from '@n8n/backend-common';
import { LICENSE_FEATURES } from '@n8n/constants';
import type { AuthenticatedRequest } from '@n8n/db';
import {
	ApiDescription,
	ApiErrorResponse,
	ApiKeyScope,
	ApiResponse,
	ApiSummary,
	ApiTags,
	Body,
	Get,
	GlobalScope,
	Licensed,
	Param,
	ProjectScope,
	PublicApiController,
	Put,
} from '@n8n/decorators';
import { Container } from '@n8n/di';
import type { Response } from 'express';

import { ServiceUnavailableError } from '@/errors/response-errors/service-unavailable.error';
import { NODE_TYPES_KIND } from '@/modules/type-availability-policies/constants';

const tags = ['NodeTypePolicy'];

/**
 * Public API surface for node type availability policies. Every route delegates to the same
 * `TypeAvailabilityPolicyService` methods as the internal `/rest` controllers and reuses their
 * request DTOs, so validation, RBAC, and audit events are identical on both surfaces. Only the
 * response shapes differ, as public allowlists.
 */
@PublicApiController('/node-type-policies')
export class NodeTypePoliciesPublicController {
	constructor(private readonly moduleRegistry: ModuleRegistry) {}

	private async service() {
		if (!this.moduleRegistry.isActive('type-availability-policies')) {
			throw new ServiceUnavailableError('Node type policies module is not enabled');
		}
		const { TypeAvailabilityPolicyService } = await import(
			'@/modules/type-availability-policies/type-availability-policy.service.js'
		);
		return Container.get(TypeAvailabilityPolicyService);
	}

	@Get('/instance')
	@Licensed(LICENSE_FEATURES.NODE_TYPE_POLICIES)
	@ApiKeyScope('nodeTypePolicy:manage')
	@GlobalScope('nodeTypePolicy:manage')
	@ApiSummary('Retrieve the instance node type policy')
	@ApiDescription(
		'Returns the composed instance-scope policy: its default action and the rules of every attached policy document in evaluation order. An instance that was never configured reports `scopeId: null`, no rules, `defaultAction: allow`, and `version: 0`.',
	)
	@ApiTags(tags)
	@ApiResponse(200, NodeTypePolicyEffectivePublicDto)
	@ApiErrorResponse(503)
	async getInstancePolicy(): Promise<NodeTypePolicyEffectivePublicDto> {
		const effective = await (await this.service()).getEffectivePolicy(NODE_TYPES_KIND, null);

		return {
			scopeId: effective.scopeId,
			rules: [...effective.rules],
			defaultAction: effective.defaultAction,
			version: effective.version,
		};
	}

	@Put('/instance')
	@Licensed(LICENSE_FEATURES.NODE_TYPE_POLICIES)
	@ApiKeyScope('nodeTypePolicy:manage')
	@GlobalScope('nodeTypePolicy:manage')
	@ApiSummary('Replace the instance node type policy')
	@ApiDescription(
		'Sets the instance default action and replaces the rules of its single policy document, creating both on first write. `version` must equal the version last read; a stale value is rejected with 409. Rule ids must be unique within the list.',
	)
	@ApiTags(tags)
	@ApiResponse(200, NodeTypePolicyEffectiveWriteResultPublicDto)
	@ApiErrorResponse(409)
	@ApiErrorResponse(503)
	async putInstancePolicy(
		req: AuthenticatedRequest,
		_res: Response,
		@Body dto: PutInstancePolicyDto,
	): Promise<NodeTypePolicyEffectiveWriteResultPublicDto> {
		const result = await (await this.service()).setEffectivePolicy(
			NODE_TYPES_KIND,
			null,
			{ rules: dto.rules, defaultAction: dto.defaultAction },
			dto.version,
			req.user.id,
		);

		return {
			scopeId: result.scopeId,
			rules: result.rules,
			defaultAction: result.defaultAction,
			version: result.version,
			warnings: [...result.warnings],
		};
	}

	@Get('/projects/:projectId')
	@Licensed(LICENSE_FEATURES.NODE_TYPE_POLICIES)
	@ApiKeyScope('nodeTypePolicy:manage')
	@ProjectScope('nodeTypePolicy:manage')
	@ApiSummary("Retrieve a project's node type policy")
	@ApiDescription(
		"Returns the project's own composed policy, not the result of combining it with the instance policy. A project that was never configured reports `scopeId: null`, no rules, `defaultAction: allow`, and `version: 0`.",
	)
	@ApiTags(tags)
	@ApiResponse(200, NodeTypePolicyEffectivePublicDto)
	@ApiErrorResponse(503)
	async getProjectPolicy(
		_req: AuthenticatedRequest,
		_res: Response,
		@Param('projectId', projectIdParamSchema) projectId: string,
	): Promise<NodeTypePolicyEffectivePublicDto> {
		const effective = await (await this.service()).getEffectivePolicy(NODE_TYPES_KIND, projectId);

		return {
			scopeId: effective.scopeId,
			rules: [...effective.rules],
			defaultAction: effective.defaultAction,
			version: effective.version,
		};
	}

	@Put('/projects/:projectId')
	@Licensed(LICENSE_FEATURES.NODE_TYPE_POLICIES)
	@ApiKeyScope('nodeTypePolicy:manage')
	@ProjectScope('nodeTypePolicy:manage')
	@ApiSummary("Replace a project's node type policy")
	@ApiDescription(
		"Sets the project's default action and replaces the rules of its single policy document, creating both on first write. The `delegate` action is not accepted at project scope. `version` must equal the version last read; a stale value is rejected with 409, as is a project document that is shared with another scope.",
	)
	@ApiTags(tags)
	@ApiResponse(200, NodeTypePolicyEffectiveWriteResultPublicDto)
	@ApiErrorResponse(409)
	@ApiErrorResponse(503)
	async putProjectPolicy(
		req: AuthenticatedRequest,
		_res: Response,
		@Param('projectId', projectIdParamSchema) projectId: string,
		@Body dto: PutProjectPolicyDto,
	): Promise<NodeTypePolicyEffectiveWriteResultPublicDto> {
		const result = await (await this.service()).setEffectivePolicy(
			NODE_TYPES_KIND,
			projectId,
			{ rules: dto.rules, defaultAction: dto.defaultAction },
			dto.version,
			req.user.id,
		);

		return {
			scopeId: result.scopeId,
			rules: result.rules,
			defaultAction: result.defaultAction,
			version: result.version,
			warnings: [...result.warnings],
		};
	}
}
