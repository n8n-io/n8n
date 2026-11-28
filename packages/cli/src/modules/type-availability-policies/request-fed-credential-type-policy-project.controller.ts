import { PutCredentialTypeProjectPolicyDto } from '@n8n/api-types';
import { LICENSE_FEATURES } from '@n8n/constants';
import { AuthenticatedRequest } from '@n8n/db';
import { Body, Get, Licensed, ProjectScope, Put, RestController } from '@n8n/decorators';
import type { Response } from 'express';

import { REQUEST_FED_CREDENTIAL_TYPES_KIND } from './constants';
import { TypeAvailabilityPolicyService } from './type-availability-policy.service';

/**
 * Project-scope REST surface for a project's own request-fed credential type policy row. A
 * project can deny a type. It cannot loosen the instance choice: the evaluator composes the two
 * scopes, so a project `allow` never overrides an instance `deny`.
 *
 * Narrower than the instance controller: only the composed read and write.
 */
@RestController('/projects/:projectId/request-fed-credential-type-policies')
export class RequestFedCredentialTypePolicyProjectController {
	constructor(private readonly service: TypeAvailabilityPolicyService) {}

	@Get('/project')
	@Licensed(LICENSE_FEATURES.TYPE_AVAILABILITY_POLICIES)
	@ProjectScope('credentialTypePolicy:manageRequestFed')
	async getProjectPolicy(req: AuthenticatedRequest<{ projectId: string }>) {
		const effective = await this.service.getEffectivePolicy(
			REQUEST_FED_CREDENTIAL_TYPES_KIND,
			req.params.projectId,
		);

		return {
			scopeId: effective.scopeId,
			rules: effective.rules,
			defaultAction: effective.defaultAction,
			version: effective.version,
		};
	}

	@Put('/project')
	@Licensed(LICENSE_FEATURES.TYPE_AVAILABILITY_POLICIES)
	@ProjectScope('credentialTypePolicy:manageRequestFed')
	async putProjectPolicy(
		req: AuthenticatedRequest<{ projectId: string }>,
		_res: Response,
		@Body dto: PutCredentialTypeProjectPolicyDto,
	) {
		const result = await this.service.setEffectivePolicy(
			REQUEST_FED_CREDENTIAL_TYPES_KIND,
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
