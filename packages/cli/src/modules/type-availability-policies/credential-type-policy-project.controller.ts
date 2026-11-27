import {
	PutCredentialTypeProjectPolicyDto,
	SetProjectTypeAccessDto,
	type CredentialTypeUsageResponse,
	type ProjectTypeAccessResponse,
} from '@n8n/api-types';
import { LICENSE_FEATURES } from '@n8n/constants';
import { AuthenticatedRequest } from '@n8n/db';
import { Body, Get, Licensed, Patch, ProjectScope, Put, RestController } from '@n8n/decorators';
import type { Response } from 'express';

import { CredentialTypes } from '@/credential-types';

import { CREDENTIAL_TYPES_KIND } from './constants';
import { TypeUsageRepository } from './database/repositories/type-usage.repository';
import { TypeAvailabilityPolicyService } from './type-availability-policy.service';

/**
 * Project-scope REST surface for a project's own credential type availability policy row. Same
 * shape as `TypeAvailabilityPolicyProjectController`, mounted on its own path and kind, granted
 * to project admins via `credentialTypePolicy:manage`.
 *
 * Deliberately narrower than the instance controller: the composed read/write, the access read
 * and write, and the usage read. Policy document CRUD and multi-attachment management stay
 * instance-only.
 */
@RestController('/projects/:projectId/credential-type-policies')
export class CredentialTypePolicyProjectController {
	constructor(
		private readonly service: TypeAvailabilityPolicyService,
		private readonly typeUsageRepository: TypeUsageRepository,
		private readonly credentialTypes: CredentialTypes,
	) {}

	@Get('/project')
	@Licensed(LICENSE_FEATURES.TYPE_AVAILABILITY_POLICIES)
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

	@Get('/project/access')
	@Licensed(LICENSE_FEATURES.TYPE_AVAILABILITY_POLICIES)
	@ProjectScope('credentialTypePolicy:manage')
	async getProjectAccess(
		req: AuthenticatedRequest<{ projectId: string }>,
	): Promise<ProjectTypeAccessResponse> {
		return await this.service.getProjectAccess(
			CREDENTIAL_TYPES_KIND,
			req.params.projectId,
			Object.keys(this.credentialTypes.getKnownTypes()),
		);
	}

	@Get('/usage')
	@Licensed(LICENSE_FEATURES.TYPE_AVAILABILITY_POLICIES)
	@ProjectScope('credentialTypePolicy:manage')
	async getUsage(
		req: AuthenticatedRequest<{ projectId: string }>,
	): Promise<CredentialTypeUsageResponse> {
		return await this.typeUsageRepository.countCredentialTypeUsage(req.params.projectId, {});
	}

	@Patch('/project/access')
	@Licensed(LICENSE_FEATURES.TYPE_AVAILABILITY_POLICIES)
	@ProjectScope('credentialTypePolicy:manage')
	async setProjectAccess(
		req: AuthenticatedRequest<{ projectId: string }>,
		_res: Response,
		@Body dto: SetProjectTypeAccessDto,
	) {
		const result = await this.service.setTypeAccess(
			CREDENTIAL_TYPES_KIND,
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
	@ProjectScope('credentialTypePolicy:manage')
	async putProjectPolicy(
		req: AuthenticatedRequest<{ projectId: string }>,
		_res: Response,
		@Body dto: PutCredentialTypeProjectPolicyDto,
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
