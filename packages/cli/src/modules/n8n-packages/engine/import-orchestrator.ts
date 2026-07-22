import { Service } from '@n8n/di';

import { toImportBlockedError } from './import-blocked.error';
import { CredentialImporter } from '../entities/credential/credential-importer';
import { workflowsBlockedFromPublish } from '../entities/credential/credential-missing-mode';
import type {
	CredentialApplyResult,
	CredentialBindingRequest,
	CredentialResolution,
	CredentialResolutionFailure,
} from '../entities/credential/credential.types';
import { DataTableImporter } from '../entities/data-table/data-table-importer';
import type {
	DataTableImportPlan,
	DataTableImportRequest,
} from '../entities/data-table/data-table.types';
import type {
	FolderImportContext,
	FolderImportPlan,
	PreparedFolder,
} from '../entities/folder/folder-import.types';
import { FolderImporter } from '../entities/folder/folder-importer';
import { VariableImporter } from '../entities/variable/variable-importer';
import type {
	VariableImportPlan,
	VariableImportRequest,
} from '../entities/variable/variable.types';
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

export interface ImportOrchestrationInput {
	context: ImportContext;
	folders: PreparedFolder[];
	workflows: PreparedWorkflow[];
	credentialRequest: CredentialBindingRequest;
	dataTableRequest: DataTableImportRequest;
	variableRequest: VariableImportRequest;
	options: ImportWorkflowProperties & ImportFolderProperties;
	/** The target project does not exist yet and will be created by this import (project packages). */
	projectPendingCreation?: boolean;
}

export interface ImportOrchestrationResult {
	workflowOutcomes: WorkflowImportOutcome[];
	folderSummaries: ImportedFolderSummary[];
	bindings: PackageImportBindings;
	credentialResult: CredentialApplyResult;
	dataTablePlan: DataTableImportPlan;
	variablePlan: VariableImportPlan;
}

export interface ImportPlan {
	input: ImportOrchestrationInput;
	folderContext: FolderImportContext;
	credentialPlan: CredentialResolution;
	workflowPlan: WorkflowImportPlan;
	folderPlan: FolderImportPlan;
	dataTablePlan: DataTableImportPlan;
	variablePlan: VariableImportPlan;
	blockingIssues: BlockingIssue[];
}

/**
 * Coordinates the credential, folder, and workflow importers to bring a package's
 * contents into one resolved project scope
 */
@Service()
export class ImportOrchestrator {
	constructor(
		private readonly credentialImporter: CredentialImporter,
		private readonly dataTableImporter: DataTableImporter,
		private readonly variableImporter: VariableImporter,
		private readonly folderImporter: FolderImporter,
		private readonly workflowImporter: WorkflowImporter,
		private readonly workflowPublisher: WorkflowPublisher,
	) {}

	async import(input: ImportOrchestrationInput): Promise<ImportOrchestrationResult> {
		const plan = await this.plan(input);
		if (plan.blockingIssues.length > 0) {
			throw toImportBlockedError(plan.blockingIssues);
		}
		return await this.apply(plan);
	}

	async plan(input: ImportOrchestrationInput): Promise<ImportPlan> {
		const {
			context,
			folders,
			workflows,
			credentialRequest,
			dataTableRequest,
			variableRequest,
			options,
		} = input;

		await this.workflowPublisher.assertCanPublish(
			context.user,
			context.projectId,
			options.workflowPublishingPolicy,
			input.projectPendingCreation,
		);

		const credentialPlan = await this.credentialImporter.plan(context, credentialRequest);
		const dataTablePlan = await this.dataTableImporter.plan(context, dataTableRequest);
		const variablePlan = await this.variableImporter.plan(context, variableRequest);
		const workflowPlan = await this.workflowImporter.plan(context, workflows, options);
		const folderContext = { ...context, folderConflictPolicy: options.folderConflictPolicy };
		const folderPlan = await this.folderImporter.plan(folderContext, folders);

		const blockingIssues = this.collectBlockingIssues({
			workflowPlan,
			credentialPlan,
			credentialRequest,
			folderPlan,
			dataTablePlan,
			variableRequest,
			variablePlan,
		});

		return {
			input,
			folderContext,
			credentialPlan,
			workflowPlan,
			folderPlan,
			dataTablePlan,
			variablePlan,
			blockingIssues,
		};
	}

	async apply(plan: ImportPlan): Promise<ImportOrchestrationResult> {
		const {
			input,
			folderContext,
			credentialPlan,
			workflowPlan,
			folderPlan,
			dataTablePlan,
			variablePlan,
		} = plan;
		const { context, credentialRequest, options } = input;

		const folderSummaries = await this.folderImporter.apply(folderContext, folderPlan);

		const credentialResult = await this.credentialImporter.apply(
			context,
			credentialRequest,
			credentialPlan,
		);

		await this.dataTableImporter.apply(context, dataTablePlan);
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
			dataTablePlan,
			variablePlan,
		};
	}

	private collectBlockingIssues({
		workflowPlan,
		credentialPlan,
		credentialRequest,
		folderPlan,
		dataTablePlan,
		variableRequest,
		variablePlan,
	}: {
		workflowPlan: WorkflowImportPlan;
		credentialPlan: CredentialResolution;
		credentialRequest: CredentialBindingRequest;
		folderPlan: FolderImportPlan;
		dataTablePlan: DataTableImportPlan;
		variableRequest: VariableImportRequest;
		variablePlan: VariableImportPlan;
	}): BlockingIssue[] {
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
			...dataTablePlan.failures.map(
				(failure): BlockingIssue => ({ type: 'data-table-unresolved', ...failure }),
			),
			...this.credentialImporter
				.blockingFailures(credentialRequest, credentialPlan)
				.map(toCredentialBlockingIssue),
			...this.variableImporter
				.blockingFailures(variableRequest, variablePlan)
				.map((failure): BlockingIssue => ({ type: 'variable-unresolved', ...failure })),
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
