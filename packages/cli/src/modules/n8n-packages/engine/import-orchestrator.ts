import { LicenseState } from '@n8n/backend-common';
import { Service } from '@n8n/di';

import { NodeTypes } from '@/node-types';

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
import { TagImporter } from '../entities/tag/tag-importer';
import { contestedReconcileTargetFailures, droppedTagIds } from '../entities/tag/tag.types';
import type { TagImportPlan, TagImportRequest } from '../entities/tag/tag.types';
import { VariableImporter } from '../entities/variable/variable-importer';
import type {
	VariableApplyResult,
	VariableImportPlan,
	VariableImportRequest,
} from '../entities/variable/variable.types';
import {
	collectMissingNodeTypes,
	missingNodeTypeBlockingFailures,
	workflowsWithMissingNodeTypes,
	type MissingNodeTypeRequirement,
} from '../entities/workflow/missing-node-type-mode';
import type {
	PersistedWorkflowOutcome,
	PreparedWorkflow,
	WorkflowImportPlan,
} from '../entities/workflow/workflow-import.types';
import { WorkflowImporter } from '../entities/workflow/workflow-importer';
import { WorkflowPublisher } from '../entities/workflow/workflow-publisher';
import type { WorkflowPublishingBlockedReason } from '../entities/workflow/workflow-publishing-policy.types';
import { createBindings } from '../n8n-packages.types';
import type {
	BlockingIssue,
	ImportBindingMap,
	ImportContext,
	ImportedFolderSummary,
	ImportFolderProperties,
	ImportWorkflowProperties,
	MissingNodeTypeMode,
	PackageImportBindings,
} from '../n8n-packages.types';
import type { PackageWorkflowRequirement } from '../spec/requirements.schema';
import { toImportBlockedError } from './import-blocked.error';
import { assertVariableCreationAllowed } from './import-gates';

export interface ImportOrchestrationInput {
	context: ImportContext;
	folders: PreparedFolder[];
	workflows: PreparedWorkflow[];
	credentialRequest: CredentialBindingRequest;
	dataTableRequest: DataTableImportRequest;
	variableRequest: VariableImportRequest;
	tagRequest: TagImportRequest;
	options: ImportWorkflowProperties & ImportFolderProperties;
	/** The target project does not exist yet and will be created by this import (project packages). */
	projectPendingCreation?: boolean;
	/** Sub-workflow dependency graph from the manifest, used to order the import. */
	subWorkflowRequirements?: PackageWorkflowRequirement[];
}

/**
 * Everything one scope's {@link ImportOrchestrator.apply} wrote, before the package-wide publish
 * sweep runs. Telemetry consumes this shape directly — it only reads statuses and ids.
 */
export interface ImportContentResult {
	workflowOutcomes: PersistedWorkflowOutcome[];
	folderSummaries: ImportedFolderSummary[];
	bindings: PackageImportBindings;
	credentialResult: CredentialApplyResult;
	dataTablePlan: DataTableImportPlan;
	variablePlan: VariableImportPlan;
	variableResult: VariableApplyResult;
	tagPlan: TagImportPlan;
}

export interface ImportPlan {
	input: ImportOrchestrationInput;
	folderContext: FolderImportContext;
	credentialPlan: CredentialResolution;
	workflowPlan: WorkflowImportPlan;
	folderPlan: FolderImportPlan;
	dataTablePlan: DataTableImportPlan;
	variablePlan: VariableImportPlan;
	tagPlan: TagImportPlan;
	missingNodeTypes: MissingNodeTypeRequirement[];
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
		private readonly tagImporter: TagImporter,
		private readonly folderImporter: FolderImporter,
		private readonly workflowImporter: WorkflowImporter,
		private readonly workflowPublisher: WorkflowPublisher,
		private readonly nodeTypes: NodeTypes,
		private readonly licenseState: LicenseState,
	) {}

	/**
	 * Gates variable creation in instance-to-project order so the broadest cause wins: licence and API
	 * key scope, then each scope's create permission, then the quota. An unlicensed instance also reports
	 * a zero quota, which would otherwise surface as a limit issue instead of the real cause.
	 */
	async assertNotBlocked(
		plans: ImportPlan[],
		options: { apiKeyScopes: string[] | undefined },
	): Promise<void> {
		const creations = plans.flatMap((plan) => plan.variablePlan.creations);

		assertVariableCreationAllowed({
			licenseState: this.licenseState,
			apiKeyScopes: options.apiKeyScopes,
			hasCreations: creations.length > 0,
		});

		for (const { input, variablePlan } of plans) {
			if (variablePlan.creations.length === 0) continue;
			await this.variableImporter.assertCanCreate(
				input.context,
				variablePlan.creations,
				input.projectPendingCreation ?? false,
			);
		}

		const issues = plans.flatMap((plan) => plan.blockingIssues);

		issues.push(
			...contestedReconcileTargetFailures(
				plans.map((plan) => ({
					tagPlan: plan.tagPlan,
					workflows: plan.workflowPlan.items.filter((item) => item.action !== 'skip'),
				})),
			).map((failure): BlockingIssue => ({ type: 'tag-unresolved', ...failure })),
		);

		const quotaFailure = await this.variableImporter.quotaFailure(creations);
		if (quotaFailure) issues.push({ type: 'variable-limit-exceeded', ...quotaFailure });

		if (issues.length > 0) throw toImportBlockedError(issues);
	}

	async plan(input: ImportOrchestrationInput): Promise<ImportPlan> {
		const {
			context,
			folders,
			workflows,
			credentialRequest,
			dataTableRequest,
			variableRequest,
			tagRequest,
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
		// Tags plan after workflows: only tags referenced by non-skipped workflows gate or create.
		const tagPlan = await this.tagImporter.plan(
			context,
			tagRequest,
			workflowPlan.items.filter((item) => item.action !== 'skip'),
		);
		const folderContext = { ...context, folderConflictPolicy: options.folderConflictPolicy };
		const folderPlan = await this.folderImporter.plan(folderContext, folders);

		// Skipped workflows are never written, so their node types don't gate the import.
		const missingNodeTypes = collectMissingNodeTypes(
			workflowPlan.items.filter((item) => item.action !== 'skip'),
			(nodeType) => this.nodeTypes.getSupportedVersions(nodeType),
		);

		const blockingIssues = this.collectBlockingIssues({
			workflowPlan,
			credentialPlan,
			credentialRequest,
			folderPlan,
			dataTablePlan,
			variableRequest,
			variablePlan,
			tagPlan,
			missingNodeTypes,
			missingNodeTypeMode: options.missingNodeTypeMode,
		});

		return {
			input,
			folderContext,
			credentialPlan,
			workflowPlan,
			folderPlan,
			dataTablePlan,
			variablePlan,
			tagPlan,
			missingNodeTypes,
			blockingIssues,
		};
	}

	/**
	 * Writes this scope's content. Workflows land unpublished: publishing needs every workflow in
	 * the package present first, so the caller runs {@link WorkflowPublisher.applyToPackage} once
	 * all scopes have been applied.
	 */
	async apply(
		plan: ImportPlan,
		seedWorkflowBindings?: ImportBindingMap,
	): Promise<ImportContentResult> {
		const {
			input,
			folderContext,
			credentialPlan,
			workflowPlan,
			folderPlan,
			dataTablePlan,
			variablePlan,
			tagPlan,
		} = plan;
		const { context, credentialRequest } = input;

		// Variables and tags go first: their creations are the apply steps that can still fail
		// after the blocking-issue gate (a near-quota or unique-index race), and they depend on
		// nothing below — applying them before any other write keeps a raced import from
		// persisting anything else.
		const variableResult = await this.variableImporter.apply(context, variablePlan);
		await this.tagImporter.apply(context, tagPlan);

		const folderSummaries = await this.folderImporter.apply(folderContext, folderPlan);

		const credentialResult = await this.credentialImporter.apply(
			context,
			credentialRequest,
			credentialPlan,
		);

		await this.dataTableImporter.apply(context, dataTablePlan);

		// Which workflows the publish phase must leave inactive. Known only now, because it depends
		// on which credentials actually ended up stubbed.
		const blockedFromPublish = new Map<string, WorkflowPublishingBlockedReason>();
		for (const sourceWorkflowId of workflowsBlockedFromPublish(
			credentialRequest.requirements,
			new Set(credentialResult.stubbed),
		)) {
			blockedFromPublish.set(sourceWorkflowId, 'stub-credential');
		}
		// A workflow blocked for both reasons reports missing-node-type: it physically can't run.
		for (const sourceWorkflowId of workflowsWithMissingNodeTypes(plan.missingNodeTypes)) {
			blockedFromPublish.set(sourceWorkflowId, 'missing-node-type');
		}

		const { outcomes, bindings } = await this.workflowImporter.apply(
			{ ...context, droppedTagIds: droppedTagIds(tagPlan) },
			workflowPlan,
			createBindings({
				credentials: credentialResult.bindings,
				// Seeds cross-scope workflow ids so a project package can resolve
				// sub-workflow references that point into another project.
				...(seedWorkflowBindings ? { workflows: seedWorkflowBindings } : {}),
			}),
		);

		return {
			workflowOutcomes: outcomes.map((outcome) =>
				withBlockedFromPublish(outcome, blockedFromPublish.get(outcome.sourceWorkflowId)),
			),
			folderSummaries,
			bindings,
			credentialResult,
			dataTablePlan,
			variablePlan,
			variableResult,
			tagPlan,
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
		tagPlan,
		missingNodeTypes,
		missingNodeTypeMode,
	}: {
		workflowPlan: WorkflowImportPlan;
		credentialPlan: CredentialResolution;
		credentialRequest: CredentialBindingRequest;
		folderPlan: FolderImportPlan;
		dataTablePlan: DataTableImportPlan;
		variableRequest: VariableImportRequest;
		variablePlan: VariableImportPlan;
		tagPlan: TagImportPlan;
		missingNodeTypes: MissingNodeTypeRequirement[];
		missingNodeTypeMode: MissingNodeTypeMode;
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
			...tagPlan.failures.map((failure): BlockingIssue => ({ type: 'tag-unresolved', ...failure })),
			...this.credentialImporter
				.blockingFailures(credentialRequest, credentialPlan)
				.map(toCredentialBlockingIssue),
			...this.variableImporter
				.blockingFailures(variableRequest, variablePlan)
				.map((failure): BlockingIssue => ({ type: 'variable-unresolved', ...failure })),
			...missingNodeTypeBlockingFailures(missingNodeTypeMode, missingNodeTypes).map(
				({ type, typeVersion, usedByWorkflows }): BlockingIssue => ({
					type: 'missing-node-type',
					nodeType: type,
					typeVersion,
					usedByWorkflows,
				}),
			),
		];
	}
}

function withBlockedFromPublish(
	outcome: PersistedWorkflowOutcome,
	blockedFromPublish: WorkflowPublishingBlockedReason | undefined,
): PersistedWorkflowOutcome {
	if (outcome.status === 'skipped' || !blockedFromPublish) return outcome;
	return { ...outcome, blockedFromPublish };
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
