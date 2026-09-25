import type { Project } from '@n8n/db';
import {
	CredentialsRepository,
	ProjectRelationRepository,
	SharedCredentialsRepository,
	UserRepository,
} from '@n8n/db';
import { Service } from '@n8n/di';
import { hasGlobalScope } from '@n8n/permissions';
import type { INode, INodeTypeDescription } from 'n8n-workflow';
import { getActiveCredentialTypes, UserError } from 'n8n-workflow';

import { isCredSharingEnabled } from '@/constants/credential-sharing';
import { CredentialsFinderService } from '@/credentials/credentials-finder.service';
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
		private readonly projectRelationRepository: ProjectRelationRepository,
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

		const inaccessibleIds = await this.resolveInaccessibleCredentialIdsForUser(
			userId,
			workflowCredIds,
		);
		if (inaccessibleIds.length > 0) {
			throw new InaccessibleCredentialForUserError(credIdsToNodes[inaccessibleIds[0]][0]);
		}
	}

	/**
	 * Non-throwing, named-credential sibling of `checkForUser`, for publish validation. Gated
	 * behind {@link isCredSharingEnabled}, same as the personal route inside `findInaccessible`.
	 */
	async findInaccessibleForUser(
		userId: string,
		nodes: INode[],
	): Promise<Array<{ id: string; name: string; exists: boolean }>> {
		if (!isCredSharingEnabled()) return [];

		const credIdsToNodes = this.mapCredIdsToNodes(nodes);
		const workflowCredIds = Object.keys(credIdsToNodes);

		if (workflowCredIds.length === 0) return [];

		const inaccessibleIds = await this.resolveInaccessibleCredentialIdsForUser(
			userId,
			workflowCredIds,
		);
		if (inaccessibleIds.length === 0) return [];

		const dbNames = await this.credentialsRepository.findNamesByIds(inaccessibleIds);
		const nameById = new Map(dbNames.map((c) => [c.id, c.name]));

		return inaccessibleIds.map((id) => {
			const dbName = nameById.get(id);
			return {
				id,
				name: dbName ?? this.cachedCredentialName(id, credIdsToNodes),
				exists: dbName !== undefined,
			};
		});
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

	/** The ids among `credentialIds` that `userId` personally cannot use. */
	private async resolveInaccessibleCredentialIdsForUser(
		userId: string,
		credentialIds: string[],
	): Promise<string[]> {
		// Load the role relation (scopes are eager) so hasGlobalScope can resolve.
		const user = await this.userRepository.findOne({
			where: { id: userId },
			relations: ['role'],
		});
		if (!user) {
			// Cannot resolve the triggering user - fail closed.
			return credentialIds;
		}

		const unavailableCredentials =
			await this.credentialsRepository.findNonProjectCredentialsByIds(credentialIds);
		const unavailableIds = unavailableCredentials.map((c) => c.id);
		const unavailableSet = new Set(unavailableIds);
		const remainingIds = credentialIds.filter((id) => !unavailableSet.has(id));

		// Nothing left to check once every id is already unavailable outright.
		if (remainingIds.length === 0) return unavailableIds;

		// A user who may use any credential on the instance needs no further check for the rest —
		// except a credential that no longer exists at all, which nobody can use, owner included.
		if (hasGlobalScope(user, 'credential:use')) {
			const existingIds = new Set(await this.credentialsRepository.findExistingIds(remainingIds));
			const deletedIds = remainingIds.filter((id) => !existingIds.has(id));
			return [...unavailableIds, ...deletedIds];
		}

		const accessibleSet = await this.credentialsFinderService.findCredentialIdsWithScopeForUser(
			remainingIds,
			user,
			['credential:read'],
		);
		const stillInaccessible = remainingIds.filter((id) => !accessibleSet.has(id));

		return [...unavailableIds, ...stillInaccessible];
	}

	/**
	 * Check if a workflow has the ability to execute based on the projects it's apart of.
	 */
	async check(workflowId: string, nodes: INode[]) {
		const credIdsToNodes = this.mapCredIdsToNodes(nodes);

		const workflowCredIds = Object.keys(credIdsToNodes);

		if (workflowCredIds.length === 0) return;

		const { homeProject, inaccessibleIds } = await this.findInaccessible(
			workflowId,
			workflowCredIds,
		);

		if (inaccessibleIds.length > 0) {
			const nodeToFlag = credIdsToNodes[inaccessibleIds[0]][0];
			throw new InaccessibleCredentialError(nodeToFlag, homeProject);
		}
	}

	/**
	 * The credentials among `credentialIds` that the workflow's projects cannot
	 * use, in the order the check finds them. The same rule as `check`, for a
	 * caller that has credential ids but no nodes.
	 */
	async findInaccessible(
		workflowId: string,
		credentialIds: string[],
	): Promise<{ homeProject: Project; inaccessibleIds: string[] }> {
		const homeProject = await this.ownershipService.getWorkflowProjectCached(workflowId);

		const unavailableCredentials =
			await this.credentialsRepository.findNonProjectCredentialsByIds(credentialIds);
		if (unavailableCredentials.length > 0) {
			return { homeProject, inaccessibleIds: unavailableCredentials.map((c) => c.id) };
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
			return { homeProject, inaccessibleIds: [] };
		}
		const projectIds = await this.projectService.findProjectsWorkflowIsIn(workflowId);

		const accessible = await this.sharedCredentialsRepository.getFilteredAccessibleCredentials(
			projectIds,
			credentialIds,
		);

		// Global credentials are usable by every project.
		const global = await this.credentialsRepository.findGlobalProjectCredentialIds(credentialIds);
		const accessibleSet = new Set([...accessible, ...global]);

		if (isCredSharingEnabled()) {
			const stillInaccessible = credentialIds.filter((id) => !accessibleSet.has(id));
			if (stillInaccessible.length > 0) {
				const viaPersonalRoute = await this.findAccessibleViaPersonalRoute(
					stillInaccessible,
					projectIds,
				);
				for (const id of viaPersonalRoute) accessibleSet.add(id);
			}
		}

		return {
			homeProject,
			inaccessibleIds: credentialIds.filter((id) => !accessibleSet.has(id)),
		};
	}

	/**
	 * Personal route: a credential owned by a user's personal project is
	 * usable in any other project that user belongs to, without a
	 * SharedCredentials row into that project. Additive to the project route
	 * above.
	 */
	private async findAccessibleViaPersonalRoute(
		credentialIds: string[],
		projectIds: string[],
	): Promise<string[]> {
		const ownerProjects =
			await this.sharedCredentialsRepository.findOwnerProjectsByCredentialIds(credentialIds);

		const personalOwnerProjectIds = [
			...new Set(
				[...ownerProjects.values()]
					.filter((project) => project.type === 'personal')
					.map((project) => project.id),
			),
		];
		if (personalOwnerProjectIds.length === 0) return [];

		const owners =
			await this.ownershipService.getPersonalProjectOwnersCached(personalOwnerProjectIds);
		const ownerUserIdByProjectId = new Map<string, string>();
		personalOwnerProjectIds.forEach((projectId) => {
			const owner = owners.get(projectId);
			if (owner) ownerUserIdByProjectId.set(projectId, owner.id);
		});

		const memberProjectIdsByUserId = await this.projectRelationRepository.findProjectIdsByUserIds([
			...new Set(ownerUserIdByProjectId.values()),
		]);

		const projectIdSet = new Set(projectIds);
		return [...ownerProjects]
			.filter(([, ownerProject]) => {
				const ownerUserId = ownerUserIdByProjectId.get(ownerProject.id);
				if (!ownerUserId) return false;
				const memberProjectIds = memberProjectIdsByUserId.get(ownerUserId);
				return memberProjectIds?.some((id) => projectIdSet.has(id)) ?? false;
			})
			.map(([credentialId]) => credentialId);
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
