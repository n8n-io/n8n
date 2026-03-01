import type { Project } from '@n8n/db';
import { CredentialsRepository, SharedCredentialsRepository } from '@n8n/db';
import { Service } from '@n8n/di';
import { hasGlobalScope } from '@n8n/permissions';
import type { INode } from 'n8n-workflow';
import { displayParameter, UserError } from 'n8n-workflow';

import { NodeTypes } from '@/node-types';
import { OwnershipService } from '@/services/ownership.service';
import { ProjectService } from '@/services/project.service.ee';

class InvalidCredentialError extends UserError {
	override description = 'Please recreate the credential.';

	constructor(readonly node: INode) {
		super(`Node "${node.name}" uses invalid credential`);
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
	) {}

	/**
	 * Check if a workflow has the ability to execute based on the projects it's apart of.
	 */
	async check(workflowId: string, nodes: INode[]) {
		const homeProject = await this.ownershipService.getWorkflowProjectCached(workflowId);
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
			return;
		}
		const projectIds = await this.projectService.findProjectsWorkflowIsIn(workflowId);
		const credIdsToNodes = this.mapCredIdsToNodes(nodes);

		const workflowCredIds = Object.keys(credIdsToNodes);

		if (workflowCredIds.length === 0) return;

		const accessible = await this.sharedCredentialsRepository.getFilteredAccessibleCredentials(
			projectIds,
			workflowCredIds,
		);

		const accessibleSet = await this.addGlobalCredentialsToAccessibleSet(accessible);

		for (const credentialsId of workflowCredIds) {
			if (!accessibleSet.has(credentialsId)) {
				const nodeToFlag = credIdsToNodes[credentialsId][0];
				throw new InaccessibleCredentialError(nodeToFlag, homeProject);
			}
		}
	}

	/**
	 * Adds global credentials (isGlobal: true) to the set of accessible credentials.
	 */
	private async addGlobalCredentialsToAccessibleSet(
		accessibleCredentialIds: string[],
	): Promise<Set<string>> {
		const accessibleSet = new Set(accessibleCredentialIds);
		const globalCredentials = await this.credentialsRepository.find({
			where: { isGlobal: true },
			select: ['id'],
		});
		for (const globalCred of globalCredentials) {
			accessibleSet.add(globalCred.id);
		}
		return accessibleSet;
	}

	private mapCredIdsToNodes(nodes: INode[]) {
		return nodes.reduce<{ [credentialId: string]: INode[] }>((map, node) => {
			if (node.disabled || !node.credentials) return map;

			const activeCredTypes = this.getActiveCredentialTypes(node);

			for (const [credType, cred] of Object.entries(node.credentials)) {
				if (!cred.id) throw new InvalidCredentialError(node);

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
		try {
			const nodeType = this.nodeTypes.getByNameAndVersion(node.type, node.typeVersion);
			const activeTypes = new Set<string>();

			// Check credentials defined in the node type description with display options
			for (const credDef of nodeType.description.credentials ?? []) {
				if (displayParameter(node.parameters, credDef, node, nodeType.description)) {
					activeTypes.add(credDef.name);
				}
			}

			// For nodes using predefined credential type (e.g., HTTP Request node),
			// the active credential is specified by the nodeCredentialType parameter
			const { nodeCredentialType } = node.parameters;
			if (typeof nodeCredentialType === 'string' && nodeCredentialType) {
				activeTypes.add(nodeCredentialType);
			}

			return activeTypes;
		} catch {
			// If we can't resolve the node type, fall back to checking all credentials
			return null;
		}
	}
}
