import type { Project } from '@n8n/db';
import { CredentialsRepository, SharedCredentialsRepository, UserRepository } from '@n8n/db';
import { Service } from '@n8n/di';
import { hasGlobalScope } from '@n8n/permissions';
import type { INode, INodeTypeDescription } from 'n8n-workflow';
import { getActiveCredentialTypes, UserError } from 'n8n-workflow';

import { CredentialsFinderService } from '@/credentials/credentials-finder.service';
import type { CredentialRef } from '@/credentials/credential-usability.service';
import { CredentialUsabilityService } from '@/credentials/credential-usability.service';
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

/**
 * A credential that belongs to someone personally, reached by somebody else.
 * Names the credential and the node, and says who to ask.
 */
class UnusableCredentialError extends UserError {
	override description: string;

	constructor(
		readonly node: INode,
		credentialName: string,
		ownerName?: string,
	) {
		super(`Node "${node.name}" uses the credential "${credentialName}", which you cannot use`);
		this.description = ownerName
			? `"${credentialName}" belongs to ${ownerName}. Ask them to run or publish this workflow, or to share the credential with you.`
			: `"${credentialName}" belongs to someone else. Ask them to run or publish this workflow, or to share the credential with you.`;
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
		private readonly credentialUsabilityService: CredentialUsabilityService,
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

		// Load the role relation (scopes are eager) so hasGlobalScope can resolve.
		const user = await this.userRepository.findOne({
			where: { id: userId },
			relations: ['role'],
		});
		if (!user) {
			// Cannot resolve the triggering user - fail closed.
			throw new InaccessibleCredentialForUserError(credIdsToNodes[workflowCredIds[0]][0]);
		}
		const unavailableCredentials =
			await this.credentialsRepository.findNonProjectCredentialsByIds(workflowCredIds);
		if (unavailableCredentials.length > 0) {
			throw new InaccessibleCredentialForUserError(credIdsToNodes[unavailableCredentials[0].id][0]);
		}

		// A user with instance-wide credential listing can use any credential.
		if (hasGlobalScope(user, 'credential:list')) return;

		// `use`, not `read`: a credential restricted to its owner is readable by
		// the whole project but runnable by nobody else. Identical for every other
		// credential, since both pre-existing sharing roles carry `credential:use`.
		const accessibleCredentials = await this.credentialsFinderService.findCredentialsForUser(user, [
			'credential:use',
		]);
		const accessibleSet = new Set(accessibleCredentials.map((cred) => cred.id));

		for (const credentialsId of workflowCredIds) {
			if (!accessibleSet.has(credentialsId)) {
				throw new InaccessibleCredentialForUserError(credIdsToNodes[credentialsId][0]);
			}
		}
	}

	/**
	 * Check that a workflow may execute.
	 *
	 * Two routes, and either is enough:
	 * 1. the credential is shared with a project the workflow belongs to, so
	 *    everyone in that project may use it — the long-standing rule; or
	 * 2. the acting user may use the credential themselves, wherever it lives.
	 *
	 * Route 2 is what makes a personal credential work in every project its owner
	 * has access to without being shared into any of them. It only ever *adds*
	 * permitted runs, so no workflow that runs today stops running.
	 *
	 * @param actingUserId - who the run acts as: the session user for a manual
	 * run, the workflow's publisher for a triggered one. Only consulted for
	 * credentials route 1 already rejected, so a fully project-shared workflow
	 * behaves exactly as before whether or not a user is attached.
	 */
	async check(workflowId: string, nodes: INode[], actingUserId?: string) {
		const credIdsToNodes = this.mapCredIdsToNodes(nodes);

		const workflowCredIds = Object.keys(credIdsToNodes);

		if (workflowCredIds.length === 0) return;

		const { homeProject, inaccessibleIds, unavailableIds } = await this.findInaccessible(
			workflowId,
			workflowCredIds,
		);

		// Not available to workflows at all, so no acting user can unlock it.
		if (unavailableIds.length > 0) {
			throw new InaccessibleCredentialError(credIdsToNodes[unavailableIds[0]][0], homeProject);
		}

		if (inaccessibleIds.length === 0) return;

		const unusable = await this.findUnusableByActingUser(inaccessibleIds, actingUserId);

		if (unusable === 'no-acting-user') {
			// Nothing to evaluate route 2 against. Fail closed with the project-route
			// message: without an identity we cannot tell a colleague's personal
			// credential from one simply never shared here, and the sharing hint is
			// the accurate one for the common case.
			throw new InaccessibleCredentialError(credIdsToNodes[inaccessibleIds[0]][0], homeProject);
		}

		if (unusable.length > 0) {
			const [{ id, name, ownerName }] = unusable;
			throw new UnusableCredentialError(credIdsToNodes[id][0], name, ownerName);
		}
	}

	/**
	 * Of the credentials the project route rejected, the ones the acting user
	 * cannot use either. `'no-acting-user'` when there is no identity to ask
	 * about, which fails the run closed.
	 */
	private async findUnusableByActingUser(
		credentialIds: string[],
		actingUserId?: string,
	): Promise<CredentialRef[] | 'no-acting-user'> {
		if (!actingUserId) return 'no-acting-user';

		const user = await this.userRepository.findOne({
			where: { id: actingUserId },
			relations: ['role'],
		});
		if (!user) return 'no-acting-user';

		return await this.credentialUsabilityService.findUnusableByUser(user, credentialIds);
	}

	/**
	 * The credentials among `credentialIds` that the workflow's projects cannot
	 * use, in the order the check finds them. The same rule as `check`, for a
	 * caller that has credential ids but no nodes.
	 *
	 * `unavailableIds` is the subset that is not available to workflows at all
	 * (instance-scoped provider connections). It is always part of
	 * `inaccessibleIds`, and no acting user can unlock it.
	 */
	async findInaccessible(
		workflowId: string,
		credentialIds: string[],
	): Promise<{ homeProject: Project; inaccessibleIds: string[]; unavailableIds: string[] }> {
		const homeProject = await this.ownershipService.getWorkflowProjectCached(workflowId);

		const unavailableCredentials =
			await this.credentialsRepository.findNonProjectCredentialsByIds(credentialIds);
		if (unavailableCredentials.length > 0) {
			const unavailableIds = unavailableCredentials.map((c) => c.id);
			return { homeProject, inaccessibleIds: unavailableIds, unavailableIds };
		}

		const homeProjectOwner = await this.ownershipService.getPersonalProjectOwnerCached(
			homeProject.id,
		);
		if (
			homeProject.type === 'personal' &&
			homeProjectOwner &&
			hasGlobalScope(homeProjectOwner, 'credential:list')
		) {
			// Workflow belongs to a project by a user with privileges
			// so all credentials are usable. Skip credential checks.
			return { homeProject, inaccessibleIds: [], unavailableIds: [] };
		}
		const projectIds = await this.projectService.findProjectsWorkflowIsIn(workflowId);

		const accessible = await this.sharedCredentialsRepository.getFilteredAccessibleCredentials(
			projectIds,
			credentialIds,
		);

		// Global credentials are usable by every project.
		const global = await this.credentialsRepository.findGlobalProjectCredentialIds(credentialIds);
		const accessibleSet = new Set([...accessible, ...global]);

		return {
			homeProject,
			inaccessibleIds: credentialIds.filter((id) => !accessibleSet.has(id)),
			unavailableIds: [],
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
