import {
	CreateCredentialTypePolicyDocumentDto,
	PutCredentialTypeInstancePolicyDto,
	ReplaceAttachmentsDto,
	UpdateCredentialTypePolicyDocumentDto,
	type InstanceTypeAccessResponse,
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

import { NotFoundError } from '@n8n/errors';

import { CredentialTypes } from '@/credential-types';

import { REQUEST_FED_CREDENTIAL_TYPES_KIND } from './constants';
import { TypeAvailabilityPolicyService } from './type-availability-policy.service';

/**
 * Instance-scope REST surface for the request-fed credential type policy: which credential
 * types may receive a value from the incoming request. Same shape as
 * `CredentialTypePolicyInstanceController`, on its own path and kind. Every route requires
 * `LICENSE_FEATURES.TYPE_AVAILABILITY_POLICIES` and `credentialTypePolicy:manageRequestFed`.
 */
@RestController('/request-fed-credential-type-policies')
export class RequestFedCredentialTypePolicyInstanceController {
	constructor(
		private readonly service: TypeAvailabilityPolicyService,
		private readonly credentialTypes: CredentialTypes,
	) {}

	@Get('/instance')
	@Licensed(LICENSE_FEATURES.TYPE_AVAILABILITY_POLICIES)
	@GlobalScope('credentialTypePolicy:manageRequestFed')
	async getInstancePolicy() {
		const effective = await this.service.getEffectivePolicy(
			REQUEST_FED_CREDENTIAL_TYPES_KIND,
			null,
		);

		return {
			scopeId: effective.scopeId,
			rules: effective.rules,
			defaultAction: effective.defaultAction,
			version: effective.version,
		};
	}

	@Get('/instance/access')
	@Licensed(LICENSE_FEATURES.TYPE_AVAILABILITY_POLICIES)
	@GlobalScope('credentialTypePolicy:manageRequestFed')
	async getInstanceAccess(): Promise<InstanceTypeAccessResponse> {
		return await this.service.getInstanceAccess(
			REQUEST_FED_CREDENTIAL_TYPES_KIND,
			Object.keys(this.credentialTypes.getKnownTypes()),
		);
	}

	@Put('/instance')
	@Licensed(LICENSE_FEATURES.TYPE_AVAILABILITY_POLICIES)
	@GlobalScope('credentialTypePolicy:manageRequestFed')
	async putInstancePolicy(
		req: AuthenticatedRequest,
		_res: Response,
		@Body dto: PutCredentialTypeInstancePolicyDto,
	) {
		const result = await this.service.setEffectivePolicy(
			REQUEST_FED_CREDENTIAL_TYPES_KIND,
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
	@GlobalScope('credentialTypePolicy:manageRequestFed')
	async createPolicy(
		req: AuthenticatedRequest,
		_res: Response,
		@Body dto: CreateCredentialTypePolicyDocumentDto,
	) {
		const { policy, warnings } = await this.service.createPolicyDocument(
			REQUEST_FED_CREDENTIAL_TYPES_KIND,
			dto.rules,
			req.user.id,
		);

		return { policy, warnings };
	}

	@Get('/policies')
	@Licensed(LICENSE_FEATURES.TYPE_AVAILABILITY_POLICIES)
	@GlobalScope('credentialTypePolicy:manageRequestFed')
	async listPolicies() {
		return await this.service.listPolicyDocuments(REQUEST_FED_CREDENTIAL_TYPES_KIND);
	}

	@Get('/policies/:policyId')
	@Licensed(LICENSE_FEATURES.TYPE_AVAILABILITY_POLICIES)
	@GlobalScope('credentialTypePolicy:manageRequestFed')
	async getPolicy(_req: AuthenticatedRequest, _res: Response, @Param('policyId') policyId: string) {
		const policy = await this.service.getPolicyDocument(
			REQUEST_FED_CREDENTIAL_TYPES_KIND,
			policyId,
		);
		if (!policy) {
			throw new NotFoundError(`Policy document not found: ${policyId}`);
		}

		return policy;
	}

	@Patch('/policies/:policyId')
	@Licensed(LICENSE_FEATURES.TYPE_AVAILABILITY_POLICIES)
	@GlobalScope('credentialTypePolicy:manageRequestFed')
	async updatePolicy(
		req: AuthenticatedRequest,
		_res: Response,
		@Param('policyId') policyId: string,
		@Body dto: UpdateCredentialTypePolicyDocumentDto,
	) {
		const { policy, warnings } = await this.service.updatePolicyDocument(
			REQUEST_FED_CREDENTIAL_TYPES_KIND,
			policyId,
			dto.rules,
			dto.version,
			req.user.id,
		);

		return { policy, warnings };
	}

	@Delete('/policies/:policyId')
	@Licensed(LICENSE_FEATURES.TYPE_AVAILABILITY_POLICIES)
	@GlobalScope('credentialTypePolicy:manageRequestFed')
	async deletePolicy(
		req: AuthenticatedRequest,
		_res: Response,
		@Param('policyId') policyId: string,
	) {
		await this.service.deletePolicyDocument(
			REQUEST_FED_CREDENTIAL_TYPES_KIND,
			policyId,
			req.user.id,
		);

		return { success: true };
	}

	@Get('/scopes/:scopeId/attachments')
	@Licensed(LICENSE_FEATURES.TYPE_AVAILABILITY_POLICIES)
	@GlobalScope('credentialTypePolicy:manageRequestFed')
	async getAttachments(
		_req: AuthenticatedRequest,
		_res: Response,
		@Param('scopeId') scopeId: string,
	) {
		return await this.service.getAttachments(REQUEST_FED_CREDENTIAL_TYPES_KIND, scopeId);
	}

	@Put('/scopes/:scopeId/attachments')
	@Licensed(LICENSE_FEATURES.TYPE_AVAILABILITY_POLICIES)
	@GlobalScope('credentialTypePolicy:manageRequestFed')
	async replaceAttachments(
		req: AuthenticatedRequest,
		_res: Response,
		@Param('scopeId') scopeId: string,
		@Body dto: ReplaceAttachmentsDto,
	) {
		return await this.service.replaceAttachments(
			REQUEST_FED_CREDENTIAL_TYPES_KIND,
			scopeId,
			dto.attachments,
			dto.version,
			req.user.id,
		);
	}
}
