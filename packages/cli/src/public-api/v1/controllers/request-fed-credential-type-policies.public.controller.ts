import {
	CredentialTypePolicyEffectivePublicDto,
	CredentialTypePolicyEffectiveWriteResultPublicDto,
	PutCredentialTypeInstancePolicyDto,
	PutCredentialTypeProjectPolicyDto,
	projectIdParamSchema,
} from '@n8n/api-types';
import { ModuleRegistry, isEnvFeatureEnabled } from '@n8n/backend-common';
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
import { ServiceUnavailableError } from '@n8n/errors';
import type { Response } from 'express';

import { REQUEST_FED_CREDENTIAL_TYPES_KIND } from '@/modules/type-availability-policies/constants';

const tags = ['RuntimeCredentialRule'];

const PREVIEW = '**Preview.** Breaking changes may still occur without a major version bump.\n\n';

/**
 * Public API surface for the request-fed credential type policy: which credential types may
 * receive a value from the incoming request. Same shape and service calls as the credential type
 * policy routes, on the `request-fed-credential-types` kind. Policy documents and attachments
 * stay on the internal API.
 */
@PublicApiController('/request-fed-credential-type-policies')
export class RequestFedCredentialTypePoliciesPublicController {
	constructor(private readonly moduleRegistry: ModuleRegistry) {}

	private async service() {
		if (!isEnvFeatureEnabled('N8N_ENV_FEAT_RUNTIME_CREDENTIALS')) {
			throw new ServiceUnavailableError('Run-time credentials are not enabled');
		}
		if (!this.moduleRegistry.isActive('type-availability-policies')) {
			throw new ServiceUnavailableError('Type availability policies module is not enabled');
		}
		const { TypeAvailabilityPolicyService } = await import(
			'@/modules/type-availability-policies/type-availability-policy.service.js'
		);
		return Container.get(TypeAvailabilityPolicyService);
	}

	@Get('/instance')
	@Licensed(LICENSE_FEATURES.TYPE_AVAILABILITY_POLICIES)
	@ApiKeyScope('credentialTypePolicy:manageRequestFed')
	@GlobalScope('credentialTypePolicy:manageRequestFed')
	@ApiSummary('Preview: Retrieve the instance request-fed credential type policy')
	@ApiDescription(
		`${PREVIEW}Returns the composed instance policy for credential types that may receive a value from the incoming request. An instance that was never configured reports \`scopeId: null\`, no rules, \`defaultAction: allow\`, and \`version: 0\`.`,
	)
	@ApiTags(tags)
	@ApiResponse(200, CredentialTypePolicyEffectivePublicDto)
	@ApiErrorResponse(503)
	async getRequestFedCredentialTypeInstancePolicy(): Promise<CredentialTypePolicyEffectivePublicDto> {
		const effective = await (await this.service()).getEffectivePolicy(
			REQUEST_FED_CREDENTIAL_TYPES_KIND,
			null,
		);

		return {
			scopeId: effective.scopeId,
			rules: [...effective.rules],
			defaultAction: effective.defaultAction,
			version: effective.version,
		};
	}

	@Put('/instance')
	@Licensed(LICENSE_FEATURES.TYPE_AVAILABILITY_POLICIES)
	@ApiKeyScope('credentialTypePolicy:manageRequestFed')
	@GlobalScope('credentialTypePolicy:manageRequestFed')
	@ApiSummary('Preview: Replace the instance request-fed credential type policy')
	@ApiDescription(
		`${PREVIEW}Sets the instance default action and replaces the rules of its single policy document, creating both on first write. \`version\` must equal the version last read. A stale value is rejected with 409.`,
	)
	@ApiTags(tags)
	@ApiResponse(200, CredentialTypePolicyEffectiveWriteResultPublicDto)
	@ApiErrorResponse(409)
	@ApiErrorResponse(503)
	async putRequestFedCredentialTypeInstancePolicy(
		req: AuthenticatedRequest,
		_res: Response,
		@Body dto: PutCredentialTypeInstancePolicyDto,
	): Promise<CredentialTypePolicyEffectiveWriteResultPublicDto> {
		const result = await (await this.service()).setEffectivePolicy(
			REQUEST_FED_CREDENTIAL_TYPES_KIND,
			null,
			{ rules: dto.rules, defaultAction: dto.defaultAction },
			dto.version,
			req.user.id,
			req.ctx,
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
	@Licensed(LICENSE_FEATURES.TYPE_AVAILABILITY_POLICIES)
	@ApiKeyScope('credentialTypePolicy:manageRequestFed')
	@ProjectScope('credentialTypePolicy:manageRequestFed')
	@ApiSummary("Preview: Retrieve a project's request-fed credential type policy")
	@ApiDescription(
		`${PREVIEW}Returns the project's own composed policy, not the result of combining it with the instance policy. A project that was never configured reports \`scopeId: null\`, no rules, \`defaultAction: allow\`, and \`version: 0\`.`,
	)
	@ApiTags(tags)
	@ApiResponse(200, CredentialTypePolicyEffectivePublicDto)
	@ApiErrorResponse(503)
	async getRequestFedCredentialTypeProjectPolicy(
		_req: AuthenticatedRequest,
		_res: Response,
		@Param('projectId', projectIdParamSchema) projectId: string,
	): Promise<CredentialTypePolicyEffectivePublicDto> {
		const effective = await (await this.service()).getEffectivePolicy(
			REQUEST_FED_CREDENTIAL_TYPES_KIND,
			projectId,
		);

		return {
			scopeId: effective.scopeId,
			rules: [...effective.rules],
			defaultAction: effective.defaultAction,
			version: effective.version,
		};
	}

	@Put('/projects/:projectId')
	@Licensed(LICENSE_FEATURES.TYPE_AVAILABILITY_POLICIES)
	@ApiKeyScope('credentialTypePolicy:manageRequestFed')
	@ProjectScope('credentialTypePolicy:manageRequestFed')
	@ApiSummary("Preview: Replace a project's request-fed credential type policy")
	@ApiDescription(
		`${PREVIEW}Sets the project's default action and replaces the rules of its single policy document, creating both on first write. A project can block a type. It cannot allow a type that the instance policy blocks. The \`delegate\` action is not accepted at project scope. \`version\` must equal the version last read. A stale value is rejected with 409.`,
	)
	@ApiTags(tags)
	@ApiResponse(200, CredentialTypePolicyEffectiveWriteResultPublicDto)
	@ApiErrorResponse(409)
	@ApiErrorResponse(503)
	async putRequestFedCredentialTypeProjectPolicy(
		req: AuthenticatedRequest,
		_res: Response,
		@Param('projectId', projectIdParamSchema) projectId: string,
		@Body dto: PutCredentialTypeProjectPolicyDto,
	): Promise<CredentialTypePolicyEffectiveWriteResultPublicDto> {
		const result = await (await this.service()).setEffectivePolicy(
			REQUEST_FED_CREDENTIAL_TYPES_KIND,
			projectId,
			{ rules: dto.rules, defaultAction: dto.defaultAction },
			dto.version,
			req.user.id,
			req.ctx,
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
