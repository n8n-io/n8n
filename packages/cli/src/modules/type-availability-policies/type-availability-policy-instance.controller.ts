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

import { CreatePolicyDocumentDto } from './dto/create-policy-document.dto';
import { PutInstancePolicyDto } from './dto/put-instance-policy.dto';
import { ReplaceAttachmentsDto } from './dto/replace-attachments.dto';
import { UpdatePolicyDocumentDto } from './dto/update-policy-document.dto';
import { TypeAvailabilityPolicyService } from './type-availability-policy.service';

/**
 * The one `kind` this REST surface manages. Other kinds (e.g. credential types) would get
 * their own controller mounted on their own path, reusing the same service and DTOs.
 */
const NODE_TYPES_KIND = 'node-types';

/**
 * Instance-scope REST surface for node type availability policies. Every route requires
 * `LICENSE_FEATURES.NODE_TYPE_POLICIES` and `nodeTypePolicy:manage` (owner-only, per IAM-1327).
 * The flag name is a placeholder pending a final SKU decision (see IAM-1332); renaming it later
 * is a one-line change here.
 */
@RestController('/node-type-policies')
export class TypeAvailabilityPolicyInstanceController {
	constructor(private readonly service: TypeAvailabilityPolicyService) {}

	@Get('/instance')
	@Licensed(LICENSE_FEATURES.NODE_TYPE_POLICIES)
	@GlobalScope('nodeTypePolicy:manage')
	async getInstancePolicy() {
		const effective = await this.service.getEffectivePolicy(NODE_TYPES_KIND, null);

		return {
			scopeId: effective.scopeId,
			rules: effective.rules,
			defaultAction: effective.defaultAction,
			version: effective.version,
		};
	}

	@Put('/instance')
	@Licensed(LICENSE_FEATURES.NODE_TYPE_POLICIES)
	@GlobalScope('nodeTypePolicy:manage')
	async putInstancePolicy(
		req: AuthenticatedRequest,
		_res: Response,
		@Body dto: PutInstancePolicyDto,
	) {
		const result = await this.service.setEffectivePolicy(
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
			warnings: result.warnings,
		};
	}

	@Post('/policies')
	@Licensed(LICENSE_FEATURES.NODE_TYPE_POLICIES)
	@GlobalScope('nodeTypePolicy:manage')
	async createPolicy(
		req: AuthenticatedRequest,
		_res: Response,
		@Body dto: CreatePolicyDocumentDto,
	) {
		const { policy, warnings } = await this.service.createPolicyDocument(
			NODE_TYPES_KIND,
			dto.rules,
			req.user.id,
		);

		return { policy, warnings };
	}

	@Get('/policies')
	@Licensed(LICENSE_FEATURES.NODE_TYPE_POLICIES)
	@GlobalScope('nodeTypePolicy:manage')
	async listPolicies() {
		return await this.service.listPolicyDocuments(NODE_TYPES_KIND);
	}

	@Get('/policies/:policyId')
	@Licensed(LICENSE_FEATURES.NODE_TYPE_POLICIES)
	@GlobalScope('nodeTypePolicy:manage')
	async getPolicy(_req: AuthenticatedRequest, _res: Response, @Param('policyId') policyId: string) {
		const policy = await this.service.getPolicyDocument(policyId, NODE_TYPES_KIND);
		if (!policy) {
			throw new NotFoundError(`Policy document not found: ${policyId}`);
		}

		return policy;
	}

	@Patch('/policies/:policyId')
	@Licensed(LICENSE_FEATURES.NODE_TYPE_POLICIES)
	@GlobalScope('nodeTypePolicy:manage')
	async updatePolicy(
		req: AuthenticatedRequest,
		_res: Response,
		@Param('policyId') policyId: string,
		@Body dto: UpdatePolicyDocumentDto,
	) {
		const { policy, warnings } = await this.service.updatePolicyDocument(
			policyId,
			NODE_TYPES_KIND,
			dto.rules,
			req.user.id,
		);

		return { policy, warnings };
	}

	@Delete('/policies/:policyId')
	@Licensed(LICENSE_FEATURES.NODE_TYPE_POLICIES)
	@GlobalScope('nodeTypePolicy:manage')
	async deletePolicy(
		req: AuthenticatedRequest,
		_res: Response,
		@Param('policyId') policyId: string,
	) {
		await this.service.deletePolicyDocument(policyId, NODE_TYPES_KIND, req.user.id);

		return { success: true };
	}

	@Put('/scopes/:scopeId/attachments')
	@Licensed(LICENSE_FEATURES.NODE_TYPE_POLICIES)
	@GlobalScope('nodeTypePolicy:manage')
	async replaceAttachments(
		req: AuthenticatedRequest,
		_res: Response,
		@Param('scopeId') scopeId: string,
		@Body dto: ReplaceAttachmentsDto,
	) {
		return await this.service.replaceAttachments(scopeId, dto.attachments, req.user.id);
	}
}
