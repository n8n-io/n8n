import { Service } from '@n8n/di';

import { CredentialImporter } from '../entities/credential/credential-importer';
import { workflowsBlockedFromPublish } from '../entities/credential/credential-missing-mode';
import type {
	CredentialApplyResult,
	CredentialBindingRequest,
	CredentialResolution,
	CredentialResolutionFailure,
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

export interface ImportOrchestrationInput {
	context: ImportContext;
	folders: PreparedFolder[];
	workflows: PreparedWorkflow[];
	credentialRequest: CredentialBindingRequest;
	options: ImportWorkflowProperties & ImportFolderProperties;
}

export interface ImportOrchestrationResult {
	workflowOutcomes: WorkflowImportOutcome[];
	folderSummaries: ImportedFolderSummary[];
	bindings: PackageImportBindings;
	credentialResult: CredentialApplyResult;
}

/**
 * Coordinates the credential, folder, and workflow importers to bring a package's
 * contents into one resolved project scope
 */
@Service()
export class ImportOrchestrator {
	constructor(
		private readonly credentialImporter: CredentialImporter,
		private readonly folderImporter: FolderImporter,
		private readonly workflowImporter: WorkflowImporter,
		private readonly workflowPublisher: WorkflowPublisher,
	) {}

	async import(input: ImportOrchestrationInput): Promise<ImportOrchestrationResult> {
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

	private collectBlockingIssues(
		workflowPlan: WorkflowImportPlan,
		credentialResolution: CredentialResolution,
		credentialRequest: CredentialBindingRequest,
		folderPlan: FolderImportPlan,
	): BlockingIssue[] {
		return [
			...workflowPlan.conflicts.map(
				(conflict): BlockingIssue => ({ type: 'workflow-conflict', ...conflict }),
			),
			...workflowPlan.idConflicts.map(
				(conflict): BlockingIssue => ({ type: 'workflow-id-conflict', ...conflict }),
			),
			...workflowPlan.folderConflicts.map(
				(conflict): BlockingIssue => ({ type: 'workflow-folder-conflict', ...conflict }),
			),
			...folderPlan.conflicts.map(
				(conflict): BlockingIssue => ({ type: 'folder-conflict', ...conflict }),
			),
			...this.credentialImporter
				.blockingFailures(credentialRequest, credentialResolution)
				.map(toCredentialBlockingIssue),
		];
	}
}

function toCredentialBlockingIssue(failure: CredentialResolutionFailure): BlockingIssue {
	const { kind, sourceId, targetId, expectedType, actualType, usedByWorkflows } = failure;
	return {
		type: 'credential-unresolved',
		kind,
		sourceId,
		...(targetId ? { targetId } : {}),
		...(expectedType ? { expectedType } : {}),
		...(actualType ? { actualType } : {}),
		usedByWorkflows,
	};
}
