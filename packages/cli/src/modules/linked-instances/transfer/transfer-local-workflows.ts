import type { LinkedInstanceTransferSubWorkflow } from '@n8n/api-types';
import { CredentialsFinderService } from '@n8n/backend-services';
import type { User, WorkflowEntity } from '@n8n/db';
import { Service } from '@n8n/di';
import { BadRequestError, ForbiddenError, NotFoundError } from '@n8n/errors';

import { instanceMcpPackageSizeLimit } from '@/modules/n8n-packages/capabilities/mcp-package-size-limit';
import type { ImportedWorkflowPackage } from '@/modules/n8n-packages/capabilities/import-summary';
import {
	type CredentialSummary,
	nodeTypeLabels,
	staticSubWorkflowIds,
} from '@/modules/n8n-packages/capabilities/package-requirements';
import {
	exportWorkflowPackage,
	type ExportedWorkflowPackage,
} from '@/modules/n8n-packages/capabilities/workflow-package-export';
import {
	importWorkflowPackage,
	type WorkflowPackageImportRules,
} from '@/modules/n8n-packages/capabilities/workflow-package-import';
import { CredentialRequirementsExtractor } from '@/modules/n8n-packages/entities/credential/credential-requirements.extractor';
import { ProjectService } from '@/services/project.service.ee';
import { WorkflowFinderService } from '@/workflows/workflow-finder.service';

import { LocalWorkflowDeactivator, type TurnOffOptions } from './local-workflow-deactivator';
import { TRANSFER_MESSAGES } from './transfer-errors';
import type { LocalTransferRequirements } from './transfer-preflight';

/**
 * A pull updates the workflow of an earlier pull of the same workflow. An archived workflow stays
 * as it is: the user restores it first.
 */
function assertUpdatableOverRest(workflow: WorkflowEntity): void {
	if (workflow.isArchived) {
		throw new BadRequestError(TRANSFER_MESSAGES.archivedLocalCopy(workflow.name));
	}
}

/** The rules of the REST surface for the workflow that a pull writes. */
export const REST_IMPORT_RULES: WorkflowPackageImportRules = {
	assertUpdatable: assertUpdatableOverRest,
};

export type LocalImportArgs = {
	packageBase64: string;
	/** Defaults to the personal project of the user. */
	projectId?: string;
	/** The id of the workflow in the linked instance. The import refuses a package without it. */
	sourceWorkflowId: string;
};

/** The workflows of this instance in a move, checked as the acting user. */
@Service()
export class TransferLocalWorkflows {
	constructor(
		private readonly workflowFinder: WorkflowFinderService,
		private readonly projectService: ProjectService,
		private readonly credentialsFinder: CredentialsFinderService,
		private readonly deactivator: LocalWorkflowDeactivator,
	) {}

	/**
	 * The workflow, when the user can read it and it is not archived.
	 * @throws {NotFoundError} when the user cannot read it
	 * @throws {BadRequestError} when it is archived
	 */
	async findMovable(user: User, workflowId: string): Promise<WorkflowEntity> {
		const workflow = await this.workflowFinder.findWorkflowForUser(workflowId, user, [
			'workflow:read',
		]);
		if (!workflow) throw new NotFoundError(TRANSFER_MESSAGES.workflowNotFound);
		// The linked instance refuses a package with an archived workflow.
		if (workflow.isArchived) throw new BadRequestError(TRANSFER_MESSAGES.archived);
		return workflow;
	}

	/** @throws {ForbiddenError} when the user cannot turn off the workflow */
	async assertCanTurnOff(user: User, workflowId: string): Promise<void> {
		const workflow = await this.workflowFinder.findWorkflowForUser(workflowId, user, [
			'workflow:unpublish',
		]);
		if (!workflow) throw new ForbiddenError(TRANSFER_MESSAGES.cannotTurnOff);
	}

	/**
	 * The import checks the same scopes. This check comes before any request to the linked instance.
	 * @throws {ForbiddenError} when the user cannot import workflows into the project
	 */
	async assertCanImportInto(user: User, projectId: string | undefined): Promise<void> {
		// The personal project of the user is the default, and its owner can import into it.
		if (projectId === undefined) return;
		const project = await this.projectService.getProjectWithScope(user, projectId, [
			'workflow:import',
			'workflow:create',
		]);
		if (!project) throw new ForbiddenError(TRANSFER_MESSAGES.cannotCreateInProject);
	}

	/** What the workflow needs in the linked instance. Reads only. */
	async readRequirements(user: User, workflow: WorkflowEntity): Promise<LocalTransferRequirements> {
		const nodes = workflow.nodes ?? [];
		return {
			workflowName: workflow.name,
			nodeCount: nodes.length,
			nodeTypes: nodeTypeLabels(nodes),
			credentials: await this.credentialsOf(user, workflow),
			subWorkflowCalls: await this.subWorkflowCallsOf(user, workflow),
		};
	}

	/** Exports with the normal access of the user, not the MCP access rule. */
	async exportPackage(user: User, workflow: WorkflowEntity): Promise<ExportedWorkflowPackage> {
		return await exportWorkflowPackage({
			user,
			workflowId: workflow.id,
			// The caller found the workflow with the access rules of this surface.
			findWorkflow: async () => workflow,
			limit: instanceMcpPackageSizeLimit(),
		});
	}

	async importPackage(user: User, args: LocalImportArgs): Promise<ImportedWorkflowPackage> {
		return await importWorkflowPackage({
			user,
			packageBase64: args.packageBase64,
			limit: instanceMcpPackageSizeLimit(),
			projectId: args.projectId,
			sourceWorkflowId: args.sourceWorkflowId,
			rules: REST_IMPORT_RULES,
		});
	}

	/** @returns true when no version of the workflow is live afterwards */
	async turnOff(user: User, workflowId: string, options: TurnOffOptions): Promise<boolean> {
		return await this.deactivator.turnOff(user, workflowId, options);
	}

	/**
	 * The credentials with the names that the export puts in the package: the stored name when
	 * the user can read the credential, else the name in the node.
	 */
	private async credentialsOf(user: User, workflow: WorkflowEntity): Promise<CredentialSummary[]> {
		const references = new CredentialRequirementsExtractor().extract(workflow);
		return await Promise.all(
			references.map(async ({ credentialId, credentialName, credentialType }) => {
				const stored = await this.credentialsFinder.findCredentialForUser(credentialId, user, [
					'credential:read',
				]);
				return stored
					? { name: stored.name, type: stored.type }
					: { name: credentialName, type: credentialType };
			}),
		);
	}

	/** The workflows that the workflow calls by a fixed ID, with names that the user can read. */
	private async subWorkflowCallsOf(
		user: User,
		workflow: WorkflowEntity,
	): Promise<LinkedInstanceTransferSubWorkflow[]> {
		const ids = staticSubWorkflowIds(workflow);
		if (ids.length === 0) return [];
		const readable = await this.workflowFinder.findWorkflowsByIdsForUser(ids, user, [
			'workflow:read',
		]);
		const names = new Map(readable.map(({ id, name }) => [id, name]));
		return ids.map((id) => ({ id, name: names.get(id) ?? null }));
	}
}
