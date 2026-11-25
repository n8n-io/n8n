import {
	DeleteProjectPolicyQueryDto,
	type ProjectPoliciesResponse,
	type ProjectPolicyEffectiveCounts,
	type ProjectPolicyKindSummary,
} from '@n8n/api-types';
import { LICENSE_FEATURES, MISSING_SCOPE_ERROR_MESSAGE } from '@n8n/constants';
import { AuthenticatedRequest, ProjectRepository } from '@n8n/db';
import { Delete, Get, GlobalScope, Licensed, Param, Query, RestController } from '@n8n/decorators';
import { ForbiddenError } from '@n8n/errors';
import { hasGlobalScope } from '@n8n/permissions';
import type { Response } from 'express';

import { CredentialTypes } from '@/credential-types';
import { NodeTypes } from '@/node-types';

import { CREDENTIAL_TYPES_KIND, NODE_TYPES_KIND } from './constants';
import { ListedNodeTypes } from './listed-node-types';
import { TypeAvailabilityPolicyService } from './type-availability-policy.service';

@RestController('/project-policies')
export class ProjectPoliciesController {
	constructor(
		private readonly service: TypeAvailabilityPolicyService,
		private readonly projectRepository: ProjectRepository,
		private readonly nodeTypes: NodeTypes,
		private readonly credentialTypes: CredentialTypes,
		private readonly listedNodeTypes: ListedNodeTypes,
	) {}

	@Get('/')
	@Licensed(LICENSE_FEATURES.TYPE_AVAILABILITY_POLICIES)
	@GlobalScope('nodeTypePolicy:manage')
	async listProjectPolicies(req: AuthenticatedRequest): Promise<ProjectPoliciesResponse> {
		assertCanManageCredentialTypePolicies(req);

		const [projects, node, credential] = await Promise.all([
			this.projectRepository.findTeamProjectsWithMemberCount(),
			this.summarizeNodeTypes(),
			this.service.summarizeProjectPolicies(
				CREDENTIAL_TYPES_KIND,
				Object.keys(this.credentialTypes.getKnownTypes()),
			),
		]);

		return {
			projects: projects.map((project) => {
				const nodeSummary = node.byProject.get(project.id);
				const credentialSummary = credential.byProject.get(project.id);
				const updatedAt = later(nodeSummary?.updatedAt, credentialSummary?.updatedAt);

				return {
					projectId: project.id,
					name: project.name,
					icon: project.icon,
					memberCount: project.memberCount,
					hasPolicy: updatedAt !== null,
					updatedAt: updatedAt?.toISOString() ?? null,
					node: kindSummary(nodeSummary?.summary, node.withoutProjectPolicy),
					credential: kindSummary(credentialSummary?.summary, credential.withoutProjectPolicy),
				};
			}),
		};
	}

	@Delete('/:projectId')
	@Licensed(LICENSE_FEATURES.TYPE_AVAILABILITY_POLICIES)
	@GlobalScope('nodeTypePolicy:manage')
	async deleteProjectPolicy(
		req: AuthenticatedRequest,
		_res: Response,
		@Param('projectId') projectId: string,
		@Query query: DeleteProjectPolicyQueryDto,
	) {
		assertCanManageCredentialTypePolicies(req);

		await this.service.deleteProjectPolicy(
			projectId,
			{
				[NODE_TYPES_KIND]: query.nodeTypesVersion,
				[CREDENTIAL_TYPES_KIND]: query.credentialTypesVersion,
			},
			req.user.id,
		);

		return { success: true };
	}

	private async summarizeNodeTypes() {
		return await this.service.summarizeProjectPolicies(
			NODE_TYPES_KIND,
			Object.keys(this.nodeTypes.getKnownTypes()),
			await this.listedNodeTypes.filter(),
		);
	}
}

/** `@GlobalScope` checks one scope, and these routes cover credential types too. */
function assertCanManageCredentialTypePolicies(req: AuthenticatedRequest) {
	if (!hasGlobalScope(req.user, 'credentialTypePolicy:manage')) {
		throw new ForbiddenError(MISSING_SCOPE_ERROR_MESSAGE);
	}
}

function kindSummary(
	summary: ProjectPolicyKindSummary | undefined,
	withoutProjectPolicy: ProjectPolicyEffectiveCounts,
): ProjectPolicyKindSummary {
	return summary ?? { restricted: 0, optedIn: 0, effective: withoutProjectPolicy };
}

function later(a: Date | undefined, b: Date | undefined): Date | null {
	if (!a || !b) return a ?? b ?? null;
	return a > b ? a : b;
}
