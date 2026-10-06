import { Logger } from '@n8n/backend-common';
import type { Project, User } from '@n8n/db';
import { CredentialsRepository, SharedCredentialsRepository, UserRepository } from '@n8n/db';
import { Service } from '@n8n/di';
import { hasGlobalScope } from '@n8n/permissions';
import type { INode, INodeTypeDescription } from 'n8n-workflow';
import { getActiveCredentialTypes, UserError } from 'n8n-workflow';

import { isCredSharingEnabled } from '@/constants/credential-sharing';
import { CredentialsFinderService, type UnusableCredential } from '@n8n/backend-services';
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

/**
 * Two reasons a run may not use a credential, kept apart because the advice
 * differs: a provider connection cannot be made usable by sharing it, so
 * telling someone to ask its owner would send them nowhere.
 */
type UnusableCredentials = {
	/** Not usable by any workflow, whoever asks. */
	instanceScoped: UnusableCredential[];
	/** Usable in principle, but not granted to this user. */
	notGranted: UnusableCredential[];
};

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
		private readonly logger: Logger,
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

		const { instanceScoped, notGranted } = await this.findUnusable(
			await this.loadUserWithRole(userId),
			workflowCredIds,
		);

		// No owner to ask: sharing a provider connection cannot make a workflow able
		// to use it, so the richer message would point the user nowhere.
		if (instanceScoped.length > 0) {
			throw new InaccessibleCredentialForUserError(credIdsToNodes[instanceScoped[0].id][0]);
		}

		if (notGranted.length === 0) return;

		const nodeToFlag = credIdsToNodes[notGranted[0].id][0];
		// The richer message is part of the feature, so it stays behind the flag
		// along with everything else the user can see.
		throw isCredSharingEnabled()
			? new UnusableCredentialForUserError(nodeToFlag, notGranted[0])
			: new InaccessibleCredentialForUserError(nodeToFlag);
	}

	/**
	 * Non-throwing, named-credential check for publish validation: what a triggered
	 * run acting as the publisher could not use in this workflow (see
	 * {@link findUnusableInWorkflow}). Gated behind {@link isCredSharingEnabled}.
	 */
	async findInaccessibleForUser(
		userId: string,
		nodes: INode[],
		workflowId: string,
	): Promise<Array<{ id: string; name: string; exists: boolean }>> {
		if (!isCredSharingEnabled()) return [];

		const credIdsToNodes = this.mapCredIdsToNodes(nodes);
		const workflowCredIds = Object.keys(credIdsToNodes);

		if (workflowCredIds.length === 0) return [];

		const unusable = await this.findUnusableInWorkflow(workflowId, workflowCredIds, userId);

		return unusable.map(({ id, name, exists }) => ({
			id,
			// An entry the database could not name carries its id. This caller holds
			// the nodes, so it can do better: use the name the node remembers.
			name: name === id ? this.cachedCredentialName(id, credIdsToNodes) : name,
			exists,
		}));
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
	 * Everything among `credentialIds` that this run may not use: the
	 * instance-scoped provider connections no workflow may use at all, then
	 * whatever `user` personally cannot use of the rest.
	 *
	 * The one composition every entry point in this file needs, so they cannot
	 * answer the same question differently. A `null` user means the acting user
	 * could not be resolved: nothing is usable, and the credentials are still
	 * described as they are.
	 *
	 * Entries the database could not name carry the id as their name. A caller
	 * holding the nodes can do better, and {@link findInaccessibleForUser} does.
	 */
	private async findUnusable(
		user: User | null,
		credentialIds: string[],
		options: { ignoreGlobalUseScope?: boolean } = {},
	): Promise<UnusableCredentials> {
		const { instanceScopedIds, projectScopedIds } = await this.partitionByUsageScope(credentialIds);

		// A provider connection is not something a workflow may use, whoever asks, so
		// there is no usability question to put — only a name to report, and it has
		// to be the stored one: a node's remembered name goes stale the moment the
		// connection is renamed.
		const instanceScoped = instanceScopedIds.length
			? await this.credentialsFinderService.describeCredentials(instanceScopedIds)
			: [];

		if (projectScopedIds.length === 0) return { instanceScoped, notGranted: [] };

		// Handles an unresolvable user too, and describes the credentials as they are
		// rather than guessing that they are gone.
		const notGranted = await this.credentialsFinderService.findUnusableCredentialsForUser(
			user,
			projectScopedIds,
			options,
		);

		return { instanceScoped, notGranted };
	}

	/** Everything in both groups, for a caller that does not care which is which. */
	private static flatten({ instanceScoped, notGranted }: UnusableCredentials) {
		return [...instanceScoped, ...notGranted];
	}

	/** Splits ids by whether a workflow may use them at all. */
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

	/**
	 * Id-based sibling of {@link resolveInaccessibleCredentialIdsForUser}, for a caller
	 * that only has a user id and not an already-loaded `User` (e.g. a triggering user
	 * looked up from a sub-workflow's parameter data).
	 */
	async resolveInaccessibleCredentialIdsForUserId(
		userId: string,
		credentialIds: string[],
		options: { ignoreGlobalUseScope?: boolean } = {},
	): Promise<string[]> {
		const unusable = CredentialsPermissionChecker.flatten(
			await this.findUnusable(await this.loadUserWithRole(userId), credentialIds, options),
		);
		return unusable.map((c) => c.id);
	}

	/**
	 * The ids among `credentialIds` that `user` personally cannot use, plus the ones
	 * no workflow may use at all. Ids only, for callers that do not need to name them
	 * in an error — redaction, which only has to decide whether to redact.
	 */
	async resolveInaccessibleCredentialIdsForUser(
		user: User,
		credentialIds: string[],
		options: { ignoreGlobalUseScope?: boolean } = {},
	): Promise<string[]> {
		const unusable = CredentialsPermissionChecker.flatten(
			await this.findUnusable(user, credentialIds, options),
		);
		return unusable.map((c) => c.id);
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
		if (!isCredSharingEnabled()) {
			return { homeProject, inaccessibleIds: rejectedByProject, unusableForActingUser: [] };
		}

		if (!actingUserId) {
			// Says out loud what the sharing message cannot: the run was refused for
			// want of an identity, not because the credential was never shared. Hit by
			// a workflow published before publisher attribution existed, or one whose
			// publisher was deleted. Republishing writes the record and restores it.
			this.logger.warn(
				'Refusing a run with no identity to attribute it to; republish the workflow to restore attribution',
				{ workflowId, credentialIds: rejectedByProject },
			);
			return { homeProject, inaccessibleIds: rejectedByProject, unusableForActingUser: [] };
		}

		const actingUser = await this.loadUserWithRole(actingUserId);
		if (!actingUser) {
			return { homeProject, inaccessibleIds: rejectedByProject, unusableForActingUser: [] };
		}

		// Asks the finder directly rather than going through `findUnusable`: the ids
		// here are already the project route's leftovers, so re-partitioning would
		// re-query for nothing, and an unresolvable user has to keep the sharing
		// answer above instead of failing closed with a named credential.
		//
		// In a team project, the acting user's own access only: an Owner's or Admin's
		// instance-wide `credential:use` does not reach a credential nobody gave the
		// project.
		const unusableForActingUser =
			await this.credentialsFinderService.findUnusableCredentialsForUser(
				actingUser,
				rejectedByProject,
				{ ignoreGlobalUseScope: homeProject.type === 'team' },
			);

		return {
			homeProject,
			inaccessibleIds: rejectedByProject.filter((id) =>
				unusableForActingUser.some((c) => c.id === id),
			),
			unusableForActingUser,
		};
	}

	/**
	 * Behind {@link isCredSharingEnabled}: the credentials `userId` may not use in
	 * this workflow. The workflow payload and the publish check share it.
	 *
	 * Global credentials and credentials of the workflow's team project are
	 * usable. Anything else needs the user's own access, and in a team project an
	 * Owner's or Admin's global `credential:use` does not count. A personal
	 * project does not lend its owner's credentials.
	 */
	async findUnusableInWorkflow(
		workflowId: string,
		credentialIds: string[],
		userId: string,
	): Promise<UnusableCredential[]> {
		if (!isCredSharingEnabled() || credentialIds.length === 0) return [];

		const homeProject = await this.ownershipService.getWorkflowProjectCached(workflowId);
		const isTeamProject = homeProject.type === 'team';
		const { instanceScopedIds, projectScopedIds } = await this.partitionByUsageScope(credentialIds);
		const carried = await this.findCarried(isTeamProject ? homeProject : null, projectScopedIds);
		const leftover = projectScopedIds.filter((id) => !carried.has(id));

		// The ids are already partitioned, so this asks the finder directly rather
		// than through `findUnusable`, which would partition them again.
		const [instanceScoped, notGranted] = await Promise.all([
			instanceScopedIds.length > 0
				? this.credentialsFinderService.describeCredentials(instanceScopedIds)
				: [],
			leftover.length > 0
				? this.credentialsFinderService.findUnusableCredentialsForUser(
						await this.loadUserWithRole(userId),
						leftover,
						{ ignoreGlobalUseScope: isTeamProject },
					)
				: [],
		]);

		return [...instanceScoped, ...notGranted];
	}

	/** The ids among `projectScopedIds` that are global, or shared with `teamProject`. */
	private async findCarried(
		teamProject: Project | null,
		projectScopedIds: string[],
	): Promise<ReadonlySet<string>> {
		if (projectScopedIds.length === 0) return new Set();

		const [shared, global] = await Promise.all([
			teamProject
				? this.sharedCredentialsRepository.getFilteredAccessibleCredentials(
						[teamProject.id],
						projectScopedIds,
					)
				: [],
			this.credentialsRepository.findGlobalProjectCredentialIds(projectScopedIds),
		]);

		return new Set([...shared, ...global]);
	}

	/**
	 * The ids of the credentials actively referenced by `nodes` — filtered to
	 * the credential type actually selected on each node's current
	 * configuration, same as `mapCredIdsToNodes` — deduplicated.
	 *
	 * Unlike `mapCredIdsToNodes`, this never throws on a credential reference
	 * with no id: it is used on the read path for past executions (redaction),
	 * where a malformed or legacy reference must be skipped, not treated as a
	 * validation failure worth failing the request over.
	 */
	getCredentialIdsForNodes(nodes: INode[]): string[] {
		const ids = new Set<string>();
		for (const node of nodes) {
			if (node.disabled || !node.credentials) continue;

			const activeCredTypes = this.getActiveCredentialTypes(node);

			for (const [credType, cred] of Object.entries(node.credentials)) {
				if (!cred.id) continue;
				if (activeCredTypes !== null && !activeCredTypes.has(credType)) continue;
				ids.add(cred.id);
			}
		}
		return [...ids];
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
