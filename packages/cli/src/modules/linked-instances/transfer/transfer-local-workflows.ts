import type { LinkedInstanceTransferSubWorkflow } from '@n8n/api-types';
import { CredentialsFinderService } from '@n8n/backend-services';
import type { User, WorkflowEntity } from '@n8n/db';
import { Service } from '@n8n/di';
import { BadRequestError, ForbiddenError, NotFoundError } from '@n8n/errors';
import type { Scope } from '@n8n/permissions';

import { instanceMcpPackageSizeLimit } from '@/modules/n8n-packages/capabilities/mcp-package-size-limit';
import type { ImportedWorkflowPackage } from '@/modules/n8n-packages/capabilities/import-summary';
import {
	type CredentialSummary,
	nodeTypeLabels,
	staticSubWorkflowIds,
	workflowLabel,
} from '@/modules/n8n-packages/capabilities/package-requirements';
import {
	exportWorkflowPackage,
	type ExportedWorkflowPackage,
} from '@/modules/n8n-packages/capabilities/workflow-package-export';
import { CredentialRequirementsExtractor } from '@/modules/n8n-packages/entities/credential/credential-requirements.extractor';
import { WorkflowFinderService } from '@/workflows/workflow-finder.service';

import { LocalPackageImport, type LocalImportArgs } from './local-package-import';
import { LocalWorkflowDeactivator, type TurnOffOptions } from './local-workflow-deactivator';
import { TRANSFER_MESSAGES } from './transfer-errors';
import type { LocalTransferRequirements } from './transfer-preflight';

// The export of a move checks `workflow:export`, so a move needs it besides read access.
const MOVE_SCOPES: Scope[] = ['workflow:read', 'workflow:export'];

// A message names at most this many workflows, so that it stays short.
const MAX_NAMED_WORKFLOWS = 5;

/** For example: "Send invoice" (wf-2), "wf-3", and 2 more */
export function describeSubWorkflowCalls(
	calls: readonly LinkedInstanceTransferSubWorkflow[],
): string {
	const labels = calls
		.slice(0, MAX_NAMED_WORKFLOWS)
		.map(({ id, name }) => workflowLabel({ id, name: name ?? undefined }));
	const more = calls.length - labels.length;
	return more > 0 ? `${labels.join(', ')}, and ${more} more` : labels.join(', ');
}

/** The workflows of this instance in a move, checked as the acting user. */
@Service()
export class TransferLocalWorkflows {
	constructor(
		private readonly workflowFinder: WorkflowFinderService,
		private readonly credentialsFinder: CredentialsFinderService,
		private readonly deactivator: LocalWorkflowDeactivator,
		private readonly packageImport: LocalPackageImport,
	) {}

	/**
	 * The workflow, when the user can read and export it and it is not archived. The export checks
	 * the same scopes, so this check comes before any request to the linked instance.
	 * @throws {NotFoundError} when the user cannot read it
	 * @throws {ForbiddenError} when the user can read it, but cannot export it
	 * @throws {BadRequestError} when it is archived
	 */
	async findMovable(user: User, workflowId: string): Promise<WorkflowEntity> {
		const workflow = await this.workflowFinder.findWorkflowForUser(workflowId, user, MOVE_SCOPES);
		if (!workflow) throw await this.refusalFor(user, workflowId);
		// The linked instance refuses a package with an archived workflow.
		if (workflow.isArchived) throw new BadRequestError(TRANSFER_MESSAGES.archived);
		return workflow;
	}

	/**
	 * A package holds one workflow only. The export also stops for these calls, but only after
	 * the request to the linked instance, and with the text of the package tool.
	 * @throws {BadRequestError} that names the workflows that the workflow calls by a fixed ID
	 */
	async assertNoSubWorkflowCalls(user: User, workflow: WorkflowEntity): Promise<void> {
		const calls = await this.subWorkflowCallsOf(user, workflow);
		if (calls.length === 0) return;
		throw new BadRequestError(TRANSFER_MESSAGES.subWorkflowCalls(describeSubWorkflowCalls(calls)));
	}

	/** @throws {ForbiddenError} when the user cannot turn off the workflow */
	async assertCanTurnOff(user: User, workflowId: string): Promise<void> {
		const workflow = await this.workflowFinder.findWorkflowForUser(workflowId, user, [
			'workflow:unpublish',
		]);
		if (!workflow) throw new ForbiddenError(TRANSFER_MESSAGES.cannotTurnOff);
	}

	/** @throws {ForbiddenError} when the user cannot import workflows into the project */
	async assertCanImportInto(user: User, projectId: string | undefined): Promise<void> {
		await this.packageImport.assertCanImportInto(user, projectId);
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
		return await this.packageImport.importPackage(user, args);
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

	/** A user who can see the workflow learns why it cannot move. Others learn nothing about it. */
	private async refusalFor(user: User, workflowId: string): Promise<Error> {
		const readable = await this.workflowFinder.findWorkflowForUser(workflowId, user, [
			'workflow:read',
		]);
		return readable
			? new ForbiddenError(TRANSFER_MESSAGES.cannotExport)
			: new NotFoundError(TRANSFER_MESSAGES.workflowNotFound);
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
