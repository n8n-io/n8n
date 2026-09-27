import type { Project } from '@n8n/db';
import { CredentialsRepository, SharedCredentialsRepository, UserRepository } from '@n8n/db';
import { Service } from '@n8n/di';
import { hasGlobalScope } from '@n8n/permissions';
import type { INode, INodeTypeDescription } from 'n8n-workflow';
import { getActiveCredentialTypes, UserError } from 'n8n-workflow';

import { isCredSharingEnabled } from '@/constants/credential-sharing';
import {
	CredentialsFinderService,
	type UnusableCredential,
} from '@/credentials/credentials-finder.service';
import { NodeTypes } from '@/node-types';
import { OwnershipService } from '@/services/ownership.service';
import { ProjectService } from '@/services/project.service.ee';

class InvalidCredentialError extends UserError {
	override description = 'Please recreate the credential.';

	constructor(readonly node: INode) {
		super(`Node "${node.name}" uses invalid credential`);
	}
}

class InaccessibleCredentialForUserError extends UserError {
	override description =
		'This node uses a credential you do not have access to. Ask its owner to share it with you.';

	constructor(readonly node: INode) {
		super(`Node "${node.name}" uses a credential you do not have access to`);
	}
}

class UnusableCredentialForUserError extends UserError {
	override description: string;

	constructor(
		readonly node: INode,
		credential: UnusableCredential,
	) {
		super(`Node "${node.name}" uses the credential "${credential.name}", which you cannot use`);
		this.description =
			credential.ownerProject?.type === 'team'
				? `Ask an admin of the project "${credential.ownerProject.name}" to share this credential with you.`
				: 'Ask its owner to share this credential with you.';
	}
}

class InaccessibleCredentialError extends UserError {
	override description =
		this.project.type === 'personal'
			? 'Please recreate the credential or ask its owner to share it with you.'
			: `Please make sure that the credential is shared with the project "${this.project.name}"`;

	constructor(
		readonly node: INode,
		private readonly project: Project,
	) {
		super(`Node "${node.name}" does not have access to the credential`);
	}
}

@Service()
export class CredentialsPermissionChecker {
	constructor(
		private readonly sharedCredentialsRepository: SharedCredentialsRepository,
		private readonly credentialsRepository: CredentialsRepository,
		private readonly ownershipService: OwnershipService,
		private readonly projectService: ProjectService,
		private readonly nodeTypes: NodeTypes,
		private readonly userRepository: UserRepository,
		private readonly credentialsFinderService: CredentialsFinderService,
	) {}

	/**
	 * Check that a specific user can use every credential referenced by the given
	 * nodes. Used for sub-workflows whose source is not a stored database workflow
	 * (inline/parameter, file, url): these carry no project of their own, so their
	 * credentials must be evaluated against the user triggering the run rather than
	 * against the parent workflow's project.
	 */
	async checkForUser(userId: string, nodes: INode[]) {
		const credIdsToNodes = this.mapCredIdsToNodes(nodes);
		const workflowCredIds = Object.keys(credIdsToNodes);

		if (workflowCredIds.length === 0) return;

		const { instanceScopedIds, projectScopedIds } =
			await this.partitionByUsageScope(workflowCredIds);

		// Not usable by a workflow at all, whoever is asking.
		if (instanceScopedIds.length > 0) {
			throw new InaccessibleCredentialForUserError(credIdsToNodes[instanceScopedIds[0]][0]);
		}

		const user = await this.loadUserWithRole(userId);
		if (!user) {
			// Cannot resolve the acting user - fail closed.
			throw new InaccessibleCredentialForUserError(credIdsToNodes[projectScopedIds[0]][0]);
		}

		const unusable = await this.credentialsFinderService.findUnusableCredentialsForUser(
			user,
			projectScopedIds,
		);
		if (unusable.length === 0) return;

		const nodeToFlag = credIdsToNodes[unusable[0].id][0];
		// The richer message is part of the feature, so it stays behind the flag
		// along with everything else the user can see.
		throw isCredSharingEnabled()
			? new UnusableCredentialForUserError(nodeToFlag, unusable[0])
			: new InaccessibleCredentialForUserError(nodeToFlag);
	}

	/**
	 * Non-throwing, named-credential sibling of `checkForUser`, for publish validation. Gated
	 * behind {@link isCredSharingEnabled}, same as the acting-user route inside `findInaccessible`.
	 */
	async findInaccessibleForUser(
		userId: string,
		nodes: INode[],
	): Promise<Array<{ id: string; name: string; exists: boolean }>> {
		if (!isCredSharingEnabled()) return [];

		const credIdsToNodes = this.mapCredIdsToNodes(nodes);
		const workflowCredIds = Object.keys(credIdsToNodes);

		if (workflowCredIds.length === 0) return [];

		const { instanceScopedIds, projectScopedIds } =
			await this.partitionByUsageScope(workflowCredIds);

		const user = await this.loadUserWithRole(userId);
		// Unresolvable user: report everything, the same fail-closed answer `checkForUser` gives.
		const unusable = user
			? await this.credentialsFinderService.findUnusableCredentialsForUser(user, projectScopedIds)
			: projectScopedIds.map((id) => ({ id, name: id, exists: false, ownerProject: null }));

		// Their rows exist; only their names were never fetched, so read them off the node.
		const instanceScoped = instanceScopedIds.map((id) => ({
			id,
			name: this.cachedCredentialName(id, credIdsToNodes),
			exists: true,
		}));

		return [
			...instanceScoped,
			...unusable.map(({ id, name, exists }) => ({
				id,
				// The row is gone, so fall back to the name the node itself remembers.
				name: exists ? name : this.cachedCredentialName(id, credIdsToNodes),
				exists,
			})),
		];
	}

	/** Best-effort name for a credential id from the node's own cached reference, for when the credential row is gone. */
	private cachedCredentialName(
		credentialId: string,
		credIdsToNodes: { [id: string]: INode[] },
	): string {
		for (const cred of Object.values(credIdsToNodes[credentialId]?.[0]?.credentials ?? {})) {
			if (cred.id === credentialId) return cred.name;
		}
		return credentialId;
	}

	/**
	 * Splits ids into those a workflow may never use (instance-scoped provider
	 * connections) and the rest. The first group fails for everyone, so it must
	 * never reach the acting-user question.
	 */
	private async partitionByUsageScope(
		credentialIds: string[],
	): Promise<{ instanceScopedIds: string[]; projectScopedIds: string[] }> {
		const instanceScoped =
			await this.credentialsRepository.findNonProjectCredentialsByIds(credentialIds);
		if (instanceScoped.length === 0) {
			return { instanceScopedIds: [], projectScopedIds: credentialIds };
		}

		const instanceScopedSet = new Set(instanceScoped.map((c) => c.id));
		return {
			instanceScopedIds: credentialIds.filter((id) => instanceScopedSet.has(id)),
			projectScopedIds: credentialIds.filter((id) => !instanceScopedSet.has(id)),
		};
	}

	/** Loads the role relation (scopes are eager) so `hasGlobalScope` can resolve. */
	private async loadUserWithRole(userId: string) {
		return await this.userRepository.findOne({ where: { id: userId }, relations: ['role'] });
	}

	/**
	 * Check if a workflow may run: every credential it references has to be
	 * reachable by the workflow's projects, or usable by whoever the run acts as.
	 *
	 * @param actingUserId - the session user on a manual run, the publishing user
	 * on a triggered one. Consulted only for credentials the project route already
	 * rejected, so a workflow whose credentials are all shared with its project
	 * never needs one.
	 */
	async check(workflowId: string, nodes: INode[], actingUserId?: string) {
		const credIdsToNodes = this.mapCredIdsToNodes(nodes);

		const workflowCredIds = Object.keys(credIdsToNodes);

		if (workflowCredIds.length === 0) return;

		const { homeProject, inaccessibleIds, unusableForActingUser } = await this.findInaccessible(
			workflowId,
			workflowCredIds,
			actingUserId,
		);

		if (inaccessibleIds.length === 0) return;

		const unusable = unusableForActingUser.find((c) => c.id === inaccessibleIds[0]);
		const nodeToFlag = credIdsToNodes[inaccessibleIds[0]][0];
		throw unusable
			? new UnusableCredentialForUserError(nodeToFlag, unusable)
			: new InaccessibleCredentialError(nodeToFlag, homeProject);
	}

	/**
	 * The credentials among `credentialIds` that this run may not use, in the
	 * order the check finds them. The same rule as `check`, for a caller that has
	 * credential ids but no nodes.
	 *
	 * Two routes, in order. The project route asks whether the workflow's own
	 * projects carry the credential; whatever it accepts is settled and the
	 * acting user is never consulted for it, which is what keeps every workflow
	 * that runs today running. Only what the project route rejects goes to the
	 * acting user, who may still use a credential of their own that the project
	 * never received.
	 */
	async findInaccessible(
		workflowId: string,
		credentialIds: string[],
		actingUserId?: string,
	): Promise<{
		homeProject: Project;
		inaccessibleIds: string[];
		/** Details for the ids the acting user personally cannot use, to name them in an error. */
		unusableForActingUser: UnusableCredential[];
	}> {
		const homeProject = await this.ownershipService.getWorkflowProjectCached(workflowId);

		const { instanceScopedIds, projectScopedIds } = await this.partitionByUsageScope(credentialIds);
		if (instanceScopedIds.length > 0) {
			// Never usable by a workflow, so they do not fall through to the user route.
			return { homeProject, inaccessibleIds: instanceScopedIds, unusableForActingUser: [] };
		}

		const homeProjectOwner = await this.ownershipService.getPersonalProjectOwnerCached(
			homeProject.id,
		);
		if (
			homeProject.type === 'personal' &&
			homeProjectOwner &&
			hasGlobalScope(homeProjectOwner, 'credential:use')
		) {
			// Workflow belongs to a personal project whose owner may use any credential
			// on the instance, so all credentials are usable. Skip credential checks.
			//
			// This skip is deliberately wider than the NDV picker, which offers a
			// personal-project owner only personal credentials: here a team-project
			// credential passes too. "The instance owner can run anything" is the
			// intended contract, so it is not narrowed. The consequence is that the
			// picker's personal-only restriction is cosmetic for Owner/Admin — a
			// hand-edited or imported workflow in their personal space still runs a
			// team credential.
			return { homeProject, inaccessibleIds: [], unusableForActingUser: [] };
		}
		const projectIds = await this.projectService.findProjectsWorkflowIsIn(workflowId);

		const accessible = await this.sharedCredentialsRepository.getFilteredAccessibleCredentials(
			projectIds,
			projectScopedIds,
		);

		// Global credentials are usable by every project.
		const global =
			await this.credentialsRepository.findGlobalProjectCredentialIds(projectScopedIds);
		const accessibleSet = new Set([...accessible, ...global]);

		const rejectedByProject = projectScopedIds.filter((id) => !accessibleSet.has(id));
		if (rejectedByProject.length === 0) {
			return { homeProject, inaccessibleIds: [], unusableForActingUser: [] };
		}

		// Behind the flag, and only for what the project route rejected. Without an
		// acting user we cannot tell a colleague's personal credential from one
		// simply never shared here, so keep the sharing answer, which is the
		// accurate one for the common case.
		if (!isCredSharingEnabled() || !actingUserId) {
			return { homeProject, inaccessibleIds: rejectedByProject, unusableForActingUser: [] };
		}

		const actingUser = await this.loadUserWithRole(actingUserId);
		if (!actingUser) {
			return { homeProject, inaccessibleIds: rejectedByProject, unusableForActingUser: [] };
		}

		const unusableForActingUser =
			await this.credentialsFinderService.findUnusableCredentialsForUser(
				actingUser,
				rejectedByProject,
			);

		return {
			homeProject,
			inaccessibleIds: rejectedByProject.filter((id) =>
				unusableForActingUser.some((c) => c.id === id),
			),
			unusableForActingUser,
		};
	}

	private mapCredIdsToNodes(nodes: INode[]) {
		return nodes.reduce<{ [credentialId: string]: INode[] }>((map, node) => {
			if (node.disabled || !node.credentials) return map;

			const activeCredTypes = this.getActiveCredentialTypes(node);

			for (const [credType, cred] of Object.entries(node.credentials)) {
				if (!cred.id) {
					// AI Gateway managed credentials have no real DB id — skip permission check
					if (cred.__aiGatewayManaged === true) continue;
					throw new InvalidCredentialError(node);
				}

				// Skip credentials that are not actively used by the node's current configuration
				if (activeCredTypes !== null && !activeCredTypes.has(credType)) continue;

				map[cred.id] = map[cred.id] ? [...map[cred.id], node] : [node];
			}

			return map;
		}, {});
	}

	/**
	 * Determines which credential types are actively used by a node based on its
	 * current configuration. Returns null if the node type cannot be resolved,
	 * in which case all credentials should be checked as a safe fallback.
	 */
	private getActiveCredentialTypes(node: INode): Set<string> | null {
		let nodeTypeDescription: INodeTypeDescription | null = null;
		try {
			nodeTypeDescription = this.nodeTypes.getByNameAndVersion(
				node.type,
				node.typeVersion,
			).description;
		} catch {
			// If we can't resolve the node type, fall back to checking all credentials
		}
		return getActiveCredentialTypes(node, nodeTypeDescription);
	}
}
