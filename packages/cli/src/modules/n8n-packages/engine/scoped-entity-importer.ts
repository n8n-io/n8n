import { Service } from '@n8n/di';

import { CredentialImporter } from '../entities/credential/credential-importer';
import { workflowsBlockedFromPublish } from '../entities/credential/credential-missing-mode';
import type {
	CredentialBindingRequest,
	CredentialResolution,
} from '../entities/credential/credential.types';
import { FolderImporter } from '../entities/folder/folder-importer';
import type { FolderImportPlan, PreparedFolder } from '../entities/folder/folder-import.types';
import type {
	PreparedWorkflow,
	WorkflowImportOutcome,
	WorkflowImportPlan,
} from '../entities/workflow/workflow-import.types';
import { WorkflowImporter } from '../entities/workflow/workflow-importer';
import { WorkflowPublisher } from '../entities/workflow/workflow-publisher';
import { createBindings } from '../n8n-packages.types';
import type {
	BlockingIssue,
	ImportContext,
	ImportedFolderSummary,
	ImportFolderProperties,
	ImportWorkflowProperties,
	PackageImportBindings,
} from '../n8n-packages.types';
import { toImportBlockedError } from './import-blocked.error';

export interface ScopedImportInput {
	context: ImportContext;
	folders: PreparedFolder[];
	workflows: PreparedWorkflow[];
	credentialRequest: CredentialBindingRequest;
	options: ImportWorkflowProperties & ImportFolderProperties;
}

export interface ScopedImportResult {
	workflowOutcomes: WorkflowImportOutcome[];
	folderSummaries: ImportedFolderSummary[];
	bindings: PackageImportBindings;
	credentialResult: Awaited<ReturnType<CredentialImporter['apply']>>;
}

/**
 * Imports a set of folders, workflows, and credentials into a single project scope
 */
@Service()
export class ScopedEntityImporter {
	constructor(
		private readonly credentialImporter: CredentialImporter,
		private readonly folderImporter: FolderImporter,
		private readonly workflowImporter: WorkflowImporter,
		private readonly workflowPublisher: WorkflowPublisher,
	) {}

	async import(input: ScopedImportInput): Promise<ScopedImportResult> {
		const { context, folders, workflows, credentialRequest, options } = input;

		// PublishAll requires publish scope up front; other policies are checked per workflow.
		await this.workflowPublisher.assertCanPublish(
			context.user,
			context.projectId,
			options.workflowPublishingPolicy,
		);

		const credentialPlan = await this.credentialImporter.plan(context, credentialRequest);
		const workflowPlan = await this.workflowImporter.plan(context, workflows, options);
		const folderContext = { ...context, folderConflictPolicy: options.folderConflictPolicy };
		const folderPlan = await this.folderImporter.plan(folderContext, folders);

		const blockingIssues = this.collectBlockingIssues(
			workflowPlan,
			credentialPlan,
			credentialRequest,
			folderPlan,
		);
		if (blockingIssues.length > 0) {
			throw toImportBlockedError(blockingIssues);
		}

		const folderSummaries = await this.folderImporter.apply(folderContext, folderPlan);

		const credentialResult = await this.credentialImporter.apply(
			context,
			credentialRequest,
			credentialPlan,
		);
		const publishBlockedSourceWorkflowIds = workflowsBlockedFromPublish(
			credentialRequest.requirements,
			new Set(credentialResult.stubbed),
		);

		const { outcomes, bindings } = await this.workflowImporter.apply(
			{
				...context,
				publishingPolicy: options.workflowPublishingPolicy,
				publishBlockedSourceWorkflowIds,
			},
			workflowPlan,
			createBindings({ credentials: credentialResult.bindings }),
		);

		return {
			workflowOutcomes: outcomes,
			folderSummaries,
			bindings,
			credentialResult,
		};
	}

	/** Folds every subsystem's blocking conditions into one uniformly-typed list. */
	private collectBlockingIssues(
		workflowPlan: WorkflowImportPlan,
		credentialResolution: CredentialResolution,
		credentialRequest: CredentialBindingRequest,
		folderPlan: FolderImportPlan,
	): BlockingIssue[] {
		const workflowConflicts: BlockingIssue[] = workflowPlan.conflicts.map((conflict) => ({
			type: 'workflow-conflict',
			...conflict,
		}));
		const workflowIdConflicts: BlockingIssue[] = workflowPlan.idConflicts.map((conflict) => ({
			type: 'workflow-id-conflict',
			...conflict,
		}));
		const workflowFolderConflicts: BlockingIssue[] = workflowPlan.folderConflicts.map(
			(conflict) => ({ type: 'workflow-folder-conflict', ...conflict }),
		);
		const folderConflicts: BlockingIssue[] = folderPlan.conflicts.map((conflict) => ({
			type: 'folder-conflict',
			...conflict,
		}));
		const credentialFailures: BlockingIssue[] = this.credentialImporter
			.blockingFailures(credentialRequest, credentialResolution)
			.map(({ kind, sourceId, targetId, expectedType, actualType, usedByWorkflows }) => ({
				type: 'credential-unresolved',
				kind,
				sourceId,
				...(targetId ? { targetId } : {}),
				...(expectedType ? { expectedType } : {}),
				...(actualType ? { actualType } : {}),
				usedByWorkflows,
			}));

		return [
			...workflowConflicts,
			...workflowIdConflicts,
			...workflowFolderConflicts,
			...folderConflicts,
			...credentialFailures,
		];
	}
}
