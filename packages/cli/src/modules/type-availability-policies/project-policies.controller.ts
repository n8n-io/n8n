import {
	CreateProjectPolicyDto,
	type ProjectPoliciesResponse,
	type ProjectPolicyEffectiveCounts,
	type ProjectPolicyKindSummary,
	type ProjectPolicySummary,
} from '@n8n/api-types';
import { LICENSE_FEATURES, MISSING_SCOPE_ERROR_MESSAGE } from '@n8n/constants';
import { ProjectNotFoundError } from '@n8n/backend-services';
import { AuthenticatedRequest, ProjectRepository, type User } from '@n8n/db';
import { Body, Get, GlobalScope, Licensed, Post, RestController } from '@n8n/decorators';
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
		assertCanManageBothKinds(req.user);

		return { projects: await this.summarize() };
	}

	/** Gives a team project its own policy of both kinds. Returns the same entry as the list. */
	@Post('/')
	@Licensed(LICENSE_FEATURES.TYPE_AVAILABILITY_POLICIES)
	@GlobalScope('nodeTypePolicy:manage')
	async createProjectPolicy(
		req: AuthenticatedRequest,
		_res: Response,
		@Body dto: CreateProjectPolicyDto,
	): Promise<ProjectPolicySummary> {
		assertCanManageBothKinds(req.user);

		await this.service.createProjectPolicy(dto.projectId, req.user.id);

		// Missing only when the project was deleted after the policy was created.
		const [summary] = await this.summarize(dto.projectId);
		ProjectNotFoundError.isDefinedAndNotNull(summary, dto.projectId);
		return summary;
	}

	/** Every team project, or only the one with `projectId` when it is given. */
	private async summarize(projectId?: string): Promise<ProjectPolicySummary[]> {
		const [projects, node, credential] = await Promise.all([
			this.projectRepository.findTeamProjectsWithMemberCount(projectId),
			this.summarizeNodeTypes(projectId),
			this.service.summarizeProjectPolicies(
				CREDENTIAL_TYPES_KIND,
				Object.keys(this.credentialTypes.getKnownTypes()),
				undefined,
				projectId,
			),
		]);

		return projects.map((project) => {
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
		});
	}

	private async summarizeNodeTypes(projectId?: string) {
		return await this.service.summarizeProjectPolicies(
			NODE_TYPES_KIND,
			Object.keys(this.nodeTypes.getKnownTypes()),
			await this.listedNodeTypes.filter(),
			projectId,
		);
	}
}

/** `@GlobalScope` checks one scope, and these routes cover credential types too. */
function assertCanManageBothKinds(user: User) {
	if (!hasGlobalScope(user, 'credentialTypePolicy:manage')) {
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
