import type { ChatPayload, RestrictedNodeTypeRef } from '@n8n/ai-workflow-builder';
import { Logger } from '@n8n/backend-common';
import { ProjectRepository, SharedWorkflowRepository, type User } from '@n8n/db';
import { Service } from '@n8n/di';

import { NodeTypes } from '@/node-types';
import { userHasScopes } from '@/permissions.ee/check-access';
import { TypeRestrictionProviderProxy } from '@/policy/type-restriction-provider-proxy.service';

/**
 * The node types a policy restricts for the project that the editor's AI builder works in.
 *
 * A saved workflow names its project. A workflow that is not saved yet uses the project that the
 * editor reports, when the user may create workflows there, and else the personal project.
 */
@Service()
export class BuilderRestrictedNodeTypes {
	constructor(
		private readonly restrictions: TypeRestrictionProviderProxy,
		private readonly nodeTypes: NodeTypes,
		private readonly sharedWorkflowRepository: SharedWorkflowRepository,
		private readonly projectRepository: ProjectRepository,
		private readonly logger: Logger,
	) {}

	async find(
		payload: ChatPayload,
		user: User,
		editorProjectId?: string,
	): Promise<RestrictedNodeTypeRef[]> {
		if (!this.restrictions.hasProvider()) return [];

		try {
			const projectId = await this.resolveProjectId(payload, user, editorProjectId);
			const restricted = await this.restrictions.findRestrictedTypes(
				'node',
				projectId,
				Object.keys(this.nodeTypes.getKnownTypes()),
			);

			return [...restricted].map(([name, { scope }]) => ({ name, scope }));
		} catch (error) {
			this.logger.warn('Failed to read node type restrictions for the AI builder', { error });
			return [];
		}
	}

	private async resolveProjectId(
		payload: ChatPayload,
		user: User,
		editorProjectId?: string,
	): Promise<string> {
		// The id comes from the client, so the user must be able to read that workflow.
		const workflowId = payload.workflowContext?.currentWorkflow?.id;
		const owningProject =
			workflowId && (await userHasScopes(user, ['workflow:read'], false, { workflowId }))
				? await this.sharedWorkflowRepository.getWorkflowOwningProject(workflowId)
				: undefined;
		if (owningProject) return owningProject.id;

		// The editor sends this id, so the user must be able to create workflows there.
		if (
			editorProjectId &&
			(await userHasScopes(user, ['workflow:create'], false, { projectId: editorProjectId }))
		) {
			return editorProjectId;
		}

		return (await this.projectRepository.getPersonalProjectForUserOrFail(user.id)).id;
	}
}
