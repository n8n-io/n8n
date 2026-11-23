import type { ProjectPoliciesResponse, ProjectPolicyKindSummary } from '@n8n/api-types';
import { LICENSE_FEATURES, MISSING_SCOPE_ERROR_MESSAGE } from '@n8n/constants';
import { AuthenticatedRequest, ProjectRepository } from '@n8n/db';
import { Get, GlobalScope, Licensed, RestController } from '@n8n/decorators';
import { ForbiddenError } from '@n8n/errors';
import { hasGlobalScope } from '@n8n/permissions';

import { CredentialTypes } from '@/credential-types';
import { NodeTypes } from '@/node-types';

import { CREDENTIAL_TYPES_KIND, NODE_TYPES_KIND } from './constants';
import {
	TypeAvailabilityPolicyService,
	type ProjectPolicyKindSummaries,
} from './type-availability-policy.service';

@RestController('/project-policies')
export class ProjectPoliciesController {
	constructor(
		private readonly service: TypeAvailabilityPolicyService,
		private readonly projectRepository: ProjectRepository,
		private readonly nodeTypes: NodeTypes,
		private readonly credentialTypes: CredentialTypes,
	) {}

	@Get('/')
	@Licensed(LICENSE_FEATURES.TYPE_AVAILABILITY_POLICIES)
	@GlobalScope('nodeTypePolicy:manage')
	async listProjectPolicies(req: AuthenticatedRequest): Promise<ProjectPoliciesResponse> {
		// `@GlobalScope` checks one scope, and the response covers credential types too.
		if (!hasGlobalScope(req.user, 'credentialTypePolicy:manage')) {
			throw new ForbiddenError(MISSING_SCOPE_ERROR_MESSAGE);
		}

		const [projects, node, credential] = await Promise.all([
			this.projectRepository.findTeamProjectsWithMemberCount(),
			this.service.summarizeProjectPolicies(
				NODE_TYPES_KIND,
				Object.keys(this.nodeTypes.getKnownTypes()),
			),
			this.service.summarizeProjectPolicies(
				CREDENTIAL_TYPES_KIND,
				Object.keys(this.credentialTypes.getKnownTypes()),
			),
		]);

		return {
			projects: projects.map((project) => {
				const nodeSummary = node.byProject.get(project.id);
				const credentialSummary = credential.byProject.get(project.id);
				const updatedAt = latest(nodeSummary?.updatedAt, credentialSummary?.updatedAt);

				return {
					projectId: project.id,
					name: project.name,
					icon: project.icon,
					memberCount: project.memberCount,
					hasPolicy: updatedAt !== null,
					updatedAt: updatedAt?.toISOString() ?? null,
					node: toKindSummary(node, nodeSummary),
					credential: toKindSummary(credential, credentialSummary),
				};
			}),
		};
	}
}

function toKindSummary(
	summaries: ProjectPolicyKindSummaries,
	project: { summary: ProjectPolicyKindSummary } | undefined,
): ProjectPolicyKindSummary {
	return (
		project?.summary ?? { restricted: 0, optedIn: 0, effective: summaries.withoutProjectPolicy }
	);
}

function latest(...dates: Array<Date | undefined>): Date | null {
	const defined = dates.filter((date): date is Date => date !== undefined);
	if (defined.length === 0) return null;

	return new Date(Math.max(...defined.map((date) => date.getTime())));
}
