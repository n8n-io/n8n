import {
	CreatePolicyDocumentDto,
	PutInstancePolicyDto,
	ReplaceAttachmentsDto,
	UpdatePolicyDocumentDto,
} from '@n8n/api-types';
import { LICENSE_FEATURES } from '@n8n/constants';
import { AuthenticatedRequest } from '@n8n/db';
import {
	Body,
	Delete,
	Get,
	GlobalScope,
	Licensed,
	Param,
	Patch,
	Post,
	Put,
	RestController,
} from '@n8n/decorators';
import type { Response } from 'express';

import { NotFoundError } from '@/errors/response-errors/not-found.error';

import { CREDENTIAL_TYPES_KIND } from './constants';
import { TypeAvailabilityPolicyService } from './type-availability-policy.service';

/**
 * Instance-scope REST surface for credential type availability policies. Same shape as
 * `TypeAvailabilityPolicyInstanceController`, mounted on its own path and kind: every route
 * requires `LICENSE_FEATURES.TYPE_AVAILABILITY_POLICIES` and `credentialTypePolicy:manage`, a separate
 * permission from `nodeTypePolicy:manage` (see the scope's own ticket for why).
 */
@RestController('/credential-type-policies')
export class CredentialTypePolicyInstanceController {
	constructor(private readonly service: TypeAvailabilityPolicyService) {}

	@Get('/instance')
	@Licensed(LICENSE_FEATURES.TYPE_AVAILABILITY_POLICIES)
	@GlobalScope('credentialTypePolicy:manage')
	async getInstancePolicy() {
		const effective = await this.service.getEffectivePolicy(CREDENTIAL_TYPES_KIND, null);

		return {
			scopeId: effective.scopeId,
			rules: effective.rules,
			defaultAction: effective.defaultAction,
			version: effective.version,
		};
	}

	@Put('/instance')
	@Licensed(LICENSE_FEATURES.TYPE_AVAILABILITY_POLICIES)
	@GlobalScope('credentialTypePolicy:manage')
	async putInstancePolicy(
		req: AuthenticatedRequest,
		_res: Response,
		@Body dto: PutInstancePolicyDto,
	) {
		const result = await this.service.setEffectivePolicy(
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
			warnings: result.warnings,
		};
	}

	@Post('/policies')
	@Licensed(LICENSE_FEATURES.TYPE_AVAILABILITY_POLICIES)
	@GlobalScope('credentialTypePolicy:manage')
	async createPolicy(
		req: AuthenticatedRequest,
		_res: Response,
		@Body dto: CreatePolicyDocumentDto,
	) {
		const { policy, warnings } = await this.service.createPolicyDocument(
			CREDENTIAL_TYPES_KIND,
			dto.rules,
			req.user.id,
		);

		return { policy, warnings };
	}

	@Get('/policies')
	@Licensed(LICENSE_FEATURES.TYPE_AVAILABILITY_POLICIES)
	@GlobalScope('credentialTypePolicy:manage')
	async listPolicies() {
		return await this.service.listPolicyDocuments(CREDENTIAL_TYPES_KIND);
	}

	@Get('/policies/:policyId')
	@Licensed(LICENSE_FEATURES.TYPE_AVAILABILITY_POLICIES)
	@GlobalScope('credentialTypePolicy:manage')
	async getPolicy(_req: AuthenticatedRequest, _res: Response, @Param('policyId') policyId: string) {
		const policy = await this.service.getPolicyDocument(CREDENTIAL_TYPES_KIND, policyId);
		if (!policy) {
			throw new NotFoundError(`Policy document not found: ${policyId}`);
		}

		return policy;
	}

	@Patch('/policies/:policyId')
	@Licensed(LICENSE_FEATURES.TYPE_AVAILABILITY_POLICIES)
	@GlobalScope('credentialTypePolicy:manage')
	async updatePolicy(
		req: AuthenticatedRequest,
		_res: Response,
		@Param('policyId') policyId: string,
		@Body dto: UpdatePolicyDocumentDto,
	) {
		const { policy, warnings } = await this.service.updatePolicyDocument(
			CREDENTIAL_TYPES_KIND,
			policyId,
			dto.rules,
			dto.version,
			req.user.id,
		);

		return { policy, warnings };
	}

	@Delete('/policies/:policyId')
	@Licensed(LICENSE_FEATURES.TYPE_AVAILABILITY_POLICIES)
	@GlobalScope('credentialTypePolicy:manage')
	async deletePolicy(
		req: AuthenticatedRequest,
		_res: Response,
		@Param('policyId') policyId: string,
	) {
		await this.service.deletePolicyDocument(CREDENTIAL_TYPES_KIND, policyId, req.user.id);

		return { success: true };
	}

	@Put('/scopes/:scopeId/attachments')
	@Licensed(LICENSE_FEATURES.TYPE_AVAILABILITY_POLICIES)
	@GlobalScope('credentialTypePolicy:manage')
	async replaceAttachments(
		req: AuthenticatedRequest,
		_res: Response,
		@Param('scopeId') scopeId: string,
		@Body dto: ReplaceAttachmentsDto,
	) {
		return await this.service.replaceAttachments(
			CREDENTIAL_TYPES_KIND,
			scopeId,
			dto.attachments,
			req.user.id,
		);
	}
}
