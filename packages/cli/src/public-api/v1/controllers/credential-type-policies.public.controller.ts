import {
	CreatePolicyDocumentDto,
	ListNodeTypePolicyDocumentsQueryDto,
	PolicyAttachmentsPublicDto,
	PolicyDocumentListPublicDto,
	PolicyDocumentPublicDto,
	PolicyDocumentWriteResultPublicDto,
	PolicyEffectivePublicDto,
	PolicyEffectiveWriteResultPublicDto,
	PutInstancePolicyDto,
	PutProjectPolicyDto,
	ReplaceAttachmentsDto,
	UpdatePolicyDocumentDto,
	credentialTypePolicyIdParamSchema,
	credentialTypePolicyScopeIdParamSchema,
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
	Delete,
	Get,
	GlobalScope,
	Licensed,
	Param,
	Post,
	ProjectScope,
	PublicApiController,
	Put,
	Query,
} from '@n8n/decorators';
import { Container } from '@n8n/di';
import type { Response } from 'express';

import { NotFoundError } from '@/errors/response-errors/not-found.error';
import { ServiceUnavailableError } from '@/errors/response-errors/service-unavailable.error';
import { CREDENTIAL_TYPES_KIND } from '@/modules/type-availability-policies/constants';
import type { TypeAvailabilityPolicy } from '@/modules/type-availability-policies/database/entities/type-availability-policy.entity';
import {
	encodeNextCursor,
	resolveOffsetPagination,
} from '@/public-api/v1/shared/services/pagination.service';

const tags = ['CredentialTypePolicy'];

function toPublicDocument(policy: TypeAvailabilityPolicy): PolicyDocumentPublicDto {
	return {
		id: policy.id,
		kind: policy.kind,
		rules: [...policy.rules],
		version: policy.version,
		updatedBy: policy.updatedBy,
		createdAt: policy.createdAt.toISOString(),
		updatedAt: policy.updatedAt.toISOString(),
	};
}

/**
 * Public API surface for credential type availability policies. Every route delegates to the
 * same `TypeAvailabilityPolicyService` methods as the internal `/rest` controllers and reuses
 * their request DTOs, so validation, RBAC, and audit events are identical on both surfaces. Only
 * the response shapes differ, as public allowlists.
 */
@PublicApiController('/credential-type-policies')
export class CredentialTypePoliciesPublicController {
	constructor(private readonly moduleRegistry: ModuleRegistry) {}

	private async service() {
		if (!this.moduleRegistry.isActive('type-availability-policies')) {
			throw new ServiceUnavailableError('Credential type policies module is not enabled');
		}
		const { TypeAvailabilityPolicyService } = await import(
			'@/modules/type-availability-policies/type-availability-policy.service.js'
		);
		return Container.get(TypeAvailabilityPolicyService);
	}

	@Get('/instance')
	@Licensed(LICENSE_FEATURES.TYPE_AVAILABILITY_POLICIES)
	@ApiKeyScope('credentialTypePolicy:manage')
	@GlobalScope('credentialTypePolicy:manage')
	@ApiSummary('Retrieve the instance credential type policy')
	@ApiDescription(
		'Returns the composed instance-scope policy: its default action and the rules of every attached policy document in evaluation order. An instance that was never configured reports `scopeId: null`, no rules, `defaultAction: allow`, and `version: 0`.',
	)
	@ApiTags(tags)
	@ApiResponse(200, PolicyEffectivePublicDto)
	@ApiErrorResponse(503)
	async getCredentialTypeInstancePolicy(): Promise<PolicyEffectivePublicDto> {
		const effective = await (await this.service()).getEffectivePolicy(CREDENTIAL_TYPES_KIND, null);

		return {
			scopeId: effective.scopeId,
			rules: [...effective.rules],
			defaultAction: effective.defaultAction,
			version: effective.version,
		};
	}

	@Put('/instance')
	@Licensed(LICENSE_FEATURES.TYPE_AVAILABILITY_POLICIES)
	@ApiKeyScope('credentialTypePolicy:manage')
	@GlobalScope('credentialTypePolicy:manage')
	@ApiSummary('Replace the instance credential type policy')
	@ApiDescription(
		'Sets the instance default action and replaces the rules of its single policy document, creating both on first write. `version` must equal the version last read; a stale value is rejected with 409. Rule ids must be unique within the list.',
	)
	@ApiTags(tags)
	@ApiResponse(200, PolicyEffectiveWriteResultPublicDto)
	@ApiErrorResponse(409)
	@ApiErrorResponse(503)
	async putCredentialTypeInstancePolicy(
		req: AuthenticatedRequest,
		_res: Response,
		@Body dto: PutInstancePolicyDto,
	): Promise<PolicyEffectiveWriteResultPublicDto> {
		const result = await (await this.service()).setEffectivePolicy(
			CREDENTIAL_TYPES_KIND,
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
	@Licensed(LICENSE_FEATURES.TYPE_AVAILABILITY_POLICIES)
	@ApiKeyScope('credentialTypePolicy:manage')
	@ProjectScope('credentialTypePolicy:manage')
	@ApiSummary("Retrieve a project's credential type policy")
	@ApiDescription(
		"Returns the project's own composed policy, not the result of combining it with the instance policy. A project that was never configured reports `scopeId: null`, no rules, `defaultAction: allow`, and `version: 0`.",
	)
	@ApiTags(tags)
	@ApiResponse(200, PolicyEffectivePublicDto)
	@ApiErrorResponse(503)
	async getCredentialTypeProjectPolicy(
		_req: AuthenticatedRequest,
		_res: Response,
		@Param('projectId', projectIdParamSchema) projectId: string,
	): Promise<PolicyEffectivePublicDto> {
		const effective = await (await this.service()).getEffectivePolicy(
			CREDENTIAL_TYPES_KIND,
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
	@ApiKeyScope('credentialTypePolicy:manage')
	@ProjectScope('credentialTypePolicy:manage')
	@ApiSummary("Replace a project's credential type policy")
	@ApiDescription(
		"Sets the project's default action and replaces the rules of its single policy document, creating both on first write. The `delegate` action is not accepted at project scope. `version` must equal the version last read; a stale value is rejected with 409, as is a project document that is shared with another scope.",
	)
	@ApiTags(tags)
	@ApiResponse(200, PolicyEffectiveWriteResultPublicDto)
	@ApiErrorResponse(409)
	@ApiErrorResponse(503)
	async putCredentialTypeProjectPolicy(
		req: AuthenticatedRequest,
		_res: Response,
		@Param('projectId', projectIdParamSchema) projectId: string,
		@Body dto: PutProjectPolicyDto,
	): Promise<PolicyEffectiveWriteResultPublicDto> {
		const result = await (await this.service()).setEffectivePolicy(
			CREDENTIAL_TYPES_KIND,
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

	@Get('/policies')
	@Licensed(LICENSE_FEATURES.TYPE_AVAILABILITY_POLICIES)
	@ApiKeyScope('credentialTypePolicy:manage')
	@GlobalScope('credentialTypePolicy:manage')
	@ApiSummary('List credential type policy documents')
	@ApiDescription('Returns a cursor-paginated list of reusable policy documents.')
	@ApiTags(tags)
	@ApiResponse(200, PolicyDocumentListPublicDto)
	@ApiErrorResponse(503)
	async listCredentialTypePolicyDocuments(
		_req: AuthenticatedRequest,
		_res: Response,
		@Query query: ListNodeTypePolicyDocumentsQueryDto,
	): Promise<PolicyDocumentListPublicDto> {
		const { offset, limit } = resolveOffsetPagination(query);

		const { items, count } = await (await this.service()).listPolicyDocumentsPage(
			CREDENTIAL_TYPES_KIND,
			offset,
			limit,
		);

		return {
			data: items.map(toPublicDocument),
			nextCursor: encodeNextCursor({ offset, limit, numberOfTotalRecords: count }),
		};
	}

	@Post('/policies')
	@Licensed(LICENSE_FEATURES.TYPE_AVAILABILITY_POLICIES)
	@ApiKeyScope('credentialTypePolicy:manage')
	@GlobalScope('credentialTypePolicy:manage')
	@ApiSummary('Create a credential type policy document')
	@ApiDescription(
		'Creates a reusable policy document that is not yet attached to any scope. Rule ids must be unique within the list. `warnings` lists rules that an earlier rule already shadows.',
	)
	@ApiTags(tags)
	@ApiResponse(201, PolicyDocumentWriteResultPublicDto)
	@ApiErrorResponse(503)
	async createCredentialTypePolicyDocument(
		req: AuthenticatedRequest,
		_res: Response,
		@Body dto: CreatePolicyDocumentDto,
	): Promise<PolicyDocumentWriteResultPublicDto> {
		const { policy, warnings } = await (await this.service()).createPolicyDocument(
			CREDENTIAL_TYPES_KIND,
			dto.rules,
			req.user.id,
		);

		return { policy: toPublicDocument(policy), warnings: [...warnings] };
	}

	@Get('/policies/:policyId')
	@Licensed(LICENSE_FEATURES.TYPE_AVAILABILITY_POLICIES)
	@ApiKeyScope('credentialTypePolicy:manage')
	@GlobalScope('credentialTypePolicy:manage')
	@ApiSummary('Retrieve a credential type policy document')
	@ApiTags(tags)
	@ApiResponse(200, PolicyDocumentPublicDto)
	@ApiErrorResponse(404)
	@ApiErrorResponse(503)
	async getCredentialTypePolicyDocument(
		_req: AuthenticatedRequest,
		_res: Response,
		@Param('policyId', credentialTypePolicyIdParamSchema) policyId: string,
	): Promise<PolicyDocumentPublicDto> {
		const policy = await (await this.service()).getPolicyDocument(CREDENTIAL_TYPES_KIND, policyId);
		if (!policy) {
			throw new NotFoundError(`Policy document not found: ${policyId}`);
		}

		return toPublicDocument(policy);
	}

	@Put('/policies/:policyId')
	@Licensed(LICENSE_FEATURES.TYPE_AVAILABILITY_POLICIES)
	@ApiKeyScope('credentialTypePolicy:manage')
	@GlobalScope('credentialTypePolicy:manage')
	@ApiSummary('Replace the rules of a credential type policy document')
	@ApiDescription(
		"Replaces the document's whole rule list. `version` must equal the version last read; a stale value is rejected with 409. Every scope the document is attached to has its version bumped. A `delegate` rule is rejected when the document is attached to a project scope.",
	)
	@ApiTags(tags)
	@ApiResponse(200, PolicyDocumentWriteResultPublicDto)
	@ApiErrorResponse(404)
	@ApiErrorResponse(409)
	@ApiErrorResponse(503)
	async updateCredentialTypePolicyDocument(
		req: AuthenticatedRequest,
		_res: Response,
		@Param('policyId', credentialTypePolicyIdParamSchema) policyId: string,
		@Body dto: UpdatePolicyDocumentDto,
	): Promise<PolicyDocumentWriteResultPublicDto> {
		const { policy, warnings } = await (await this.service()).updatePolicyDocument(
			CREDENTIAL_TYPES_KIND,
			policyId,
			dto.rules,
			dto.version,
			req.user.id,
		);

		return { policy: toPublicDocument(policy), warnings: [...warnings] };
	}

	@Delete('/policies/:policyId')
	@Licensed(LICENSE_FEATURES.TYPE_AVAILABILITY_POLICIES)
	@ApiKeyScope('credentialTypePolicy:manage')
	@GlobalScope('credentialTypePolicy:manage')
	@ApiSummary('Delete a credential type policy document')
	@ApiDescription(
		'Deletes a policy document. A document that is still attached to a scope is rejected with 409; detach it first.',
	)
	@ApiTags(tags)
	@ApiResponse(204)
	@ApiErrorResponse(404)
	@ApiErrorResponse(409)
	@ApiErrorResponse(503)
	async deleteCredentialTypePolicyDocument(
		req: AuthenticatedRequest,
		_res: Response,
		@Param('policyId', credentialTypePolicyIdParamSchema) policyId: string,
	): Promise<void> {
		await (await this.service()).deletePolicyDocument(CREDENTIAL_TYPES_KIND, policyId, req.user.id);
	}

	@Put('/scopes/:scopeId/attachments')
	@Licensed(LICENSE_FEATURES.TYPE_AVAILABILITY_POLICIES)
	@ApiKeyScope('credentialTypePolicy:manage')
	@GlobalScope('credentialTypePolicy:manage')
	@ApiSummary("Replace a scope's attached policy documents")
	@ApiDescription(
		"Replaces every attachment on a scope. `scopeId` comes from the scope's `GET` response once it has been written. Each `policyId` and each `(isFloor, priority)` pair must be unique within the list. Last write wins; the scope's version is bumped.",
	)
	@ApiTags(tags)
	@ApiResponse(200, PolicyAttachmentsPublicDto)
	@ApiErrorResponse(404)
	@ApiErrorResponse(503)
	async replaceCredentialTypePolicyAttachments(
		req: AuthenticatedRequest,
		_res: Response,
		@Param('scopeId', credentialTypePolicyScopeIdParamSchema) scopeId: string,
		@Body dto: ReplaceAttachmentsDto,
	): Promise<PolicyAttachmentsPublicDto> {
		const result = await (await this.service()).replaceAttachments(
			CREDENTIAL_TYPES_KIND,
			scopeId,
			dto.attachments,
			req.user.id,
		);

		return {
			attachments: result.attachments.map((attachment) => ({
				policyId: attachment.policyId,
				rules: [...attachment.rules],
				priority: attachment.priority,
				isFloor: attachment.isFloor,
			})),
			version: result.version,
		};
	}
}
