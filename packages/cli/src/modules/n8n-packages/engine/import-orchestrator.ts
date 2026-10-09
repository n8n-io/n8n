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
	DataTableResolutionFailure,
} from '../entities/data-table/data-table.types';
import type {
	FolderImportContext,
	FolderImportPlan,
	PreparedFolder,
} from '../entities/folder/folder-import.types';
import { removesUnpackagedWorkflows } from '../entities/folder/folder-conflict-policy';
import { FolderImporter } from '../entities/folder/folder-importer';
import type { FolderRemovalPlan } from '../entities/folder/folder-removal.types';
import { FolderRemover } from '../entities/folder/folder-remover';
import { TagImporter } from '../entities/tag/tag-importer';
import { contestedReconcileTargetFailures, droppedTagIds } from '../entities/tag/tag.types';
import type {
	TagImportPlan,
	TagImportRequest,
	TagResolutionFailure,
} from '../entities/tag/tag.types';
import { VariableImporter } from '../entities/variable/variable-importer';
import { divergentOverwrites } from '../entities/variable/variable.types';
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
import type { WorkflowRemovalPlan } from '../entities/workflow/workflow-removal.types';
import { WorkflowRemover } from '../entities/workflow/workflow-remover';
import { WorkflowPublisher } from '../entities/workflow/workflow-publisher';
import type { WorkflowPublishingBlockedReason } from '../entities/workflow/workflow-publishing-policy.types';
import { createBindings } from '../n8n-packages.types';
import type {
	BlockingIssue,
	ImportBindingMap,
	ImportContext,
	ImportedFolderSummary,
	ImportWorkflowProperties,
	MissingNodeTypeMode,
	PackageImportBindings,
	PackageImportSource,
	RemovedFolderSummary,
	RemovedWorkflowSummary,
	ResolvedImportFolderProperties,
} from '../n8n-packages.types';
import { mergeRequirementConsumers } from '../spec/requirement-consumers';
import type {
	PackageRequirementConsumer,
	PackageWorkflowRequirement,
} from '../spec/requirements.schema';
import { ContentImportPolicyGate, contentImportTransport } from './content-import-policy';
import { toImportBlockedError } from './import-blocked.error';
import { assertDataTableWritesAllowed, assertVariableWritesAllowed } from './import-gates';

export interface ImportOrchestrationInput {
	context: ImportContext;
	folders: PreparedFolder[];
	workflows: PreparedWorkflow[];
	credentialRequest: CredentialBindingRequest;
	dataTableRequest: DataTableImportRequest;
	variableRequest: VariableImportRequest;
	tagRequest: TagImportRequest;
	options: ImportWorkflowProperties & ResolvedImportFolderProperties;
	/** The target project does not exist yet and will be created by this import (project packages). */
	projectPendingCreation?: boolean;
	/** Sub-workflow dependency graph from the manifest, used to order the import. */
	subWorkflowRequirements?: PackageWorkflowRequirement[];
	importSource?: PackageImportSource;
	/** Destination workflow IDs to remove, even under `merge`. */
	explicitDeleteWorkflowIds?: string[];
}

/**
 * Everything one scope's {@link ImportOrchestrator.apply} wrote, before the package-wide publish
 * sweep runs. Telemetry consumes this shape directly — it only reads statuses and ids.
 */
export interface ImportContentResult {
	workflowOutcomes: PersistedWorkflowOutcome[];
	removedWorkflows: RemovedWorkflowSummary[];
	removedFolders: RemovedFolderSummary[];
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
	removalPlan: WorkflowRemovalPlan;
	folderRemovalPlan: FolderRemovalPlan;
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
		private readonly folderRemover: FolderRemover,
		private readonly workflowImporter: WorkflowImporter,
		private readonly workflowRemover: WorkflowRemover,
		private readonly workflowPublisher: WorkflowPublisher,
		private readonly contentImportPolicyGate: ContentImportPolicyGate,
		private readonly nodeTypes: NodeTypes,
		private readonly licenseState: LicenseState,
	) {}

	/**
	 * Licence and scope before quota: an unlicensed instance also reports a zero quota, which would
	 * otherwise surface as a limit issue instead of the real cause.
	 */
	async assertNotBlocked(
		plans: ImportPlan[],
		options: { apiKeyScopes: string[] | undefined },
	): Promise<void> {
		const creations = plans.flatMap((plan) => plan.variablePlan.creations);
		const overwrites = plans.flatMap((plan) => plan.variablePlan.overwrites);

		assertVariableWritesAllowed({
			licenseState: this.licenseState,
			apiKeyScopes: options.apiKeyScopes,
			hasCreations: creations.length > 0,
			hasOverwrites: overwrites.length > 0,
		});
		assertDataTableWritesAllowed(
			options.apiKeyScopes,
			plans.map((plan) => plan.dataTablePlan),
		);

		for (const { input, variablePlan } of plans) {
			if (variablePlan.creations.length > 0) {
				await this.variableImporter.assertCanCreate(
					input.context,
					variablePlan.creations,
					input.projectPendingCreation ?? false,
				);
			}
			if (variablePlan.overwrites.length > 0) {
				await this.variableImporter.assertCanUpdate(input.context, variablePlan.overwrites);
			}
		}

		const issues = await this.collectPackageBlockingIssues(plans);
		if (issues.length > 0) throw toImportBlockedError(issues);
	}

	private async collectPackageBlockingIssues(plans: ImportPlan[]): Promise<BlockingIssue[]> {
		const issues = plans.flatMap((plan) => plan.blockingIssues);

		issues.push(
			...contestedReconcileTargetFailures(plans.map((plan) => plan.tagPlan)).map((failure) =>
				toTagBlockingIssue(failure, plans),
			),
		);

		const divergent = new Set(
			divergentOverwrites(plans.flatMap((plan) => plan.variablePlan.overwrites)),
		);
		for (const { input, variablePlan } of plans) {
			issues.push(
				...variablePlan.overwrites
					.filter((overwrite) => divergent.has(overwrite))
					.map(
						({ variableId, value, ...conflict }): BlockingIssue => ({
							type: 'variable-conflict',
							...conflict,
							usedBy: variableConsumers(input.variableRequest, conflict.name),
						}),
					),
			);
		}

		const quotaFailure = await this.variableImporter.quotaFailure(
			plans.flatMap((plan) => plan.variablePlan.creations),
		);
		if (quotaFailure) {
			const consumers = plans.flatMap(({ input, variablePlan }) => {
				const createdNames = new Set(variablePlan.creations.map(({ name }) => name));
				return (input.variableRequest.requirements ?? [])
					.filter(({ name }) => createdNames.has(name))
					.flatMap(({ usedBy }) => usedBy);
			});
			issues.push({
				type: 'variable-limit-exceeded',
				...quotaFailure,
				usedBy: mergeRequirementConsumers(consumers),
			});
		}

		return issues;
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

		const packageFolderIds = folders.map(({ sourceFolderId }) => sourceFolderId);
		const removalPlan = await this.workflowRemover.plan(context, {
			folderConflictPolicy: options.folderConflictPolicy,
			deletionPolicy: options.overwriteDeletionPolicy,
			workflowItems: workflowPlan.items,
			packageFolderIds,
			subWorkflowRequirementIds: input.subWorkflowRequirements?.map(({ id }) => id),
			projectPendingCreation: input.projectPendingCreation,
			importSource: input.importSource,
			explicitDeleteIds: input.explicitDeleteWorkflowIds,
		});

		// Which folders end up empty depends on which workflows survive, so this follows the plan above
		// and reads the surviving placements off it.
		const folderRemovalPlan =
			removesUnpackagedWorkflows(options.folderConflictPolicy) && !input.projectPendingCreation
				? await this.folderRemover.plan(context, {
						packageFolderIds,
						occupiedFolderIds: removalPlan.occupiedFolderIds,
					})
				: { removals: [], failures: [] };

		// Skipped workflows are never written, so their node types don't gate the import.
		const missingNodeTypes = collectMissingNodeTypes(
			workflowPlan.items.filter((item) => item.action !== 'skip'),
			(nodeType) => this.nodeTypes.getSupportedVersions(nodeType),
		);

		const refusedByPolicy = await this.contentImportPolicyGate.refusedWorkflows(
			workflowPlan.items,
			context.projectId,
			contentImportTransport(input.importSource),
			{ kind: 'user', user: context.user },
		);

		const blockingIssues = this.collectBlockingIssues({
			workflowPlan,
			credentialPlan,
			credentialRequest,
			folderPlan,
			dataTableRequest,
			dataTablePlan,
			variableRequest,
			variablePlan,
			tagPlan,
			removalPlan,
			folderRemovalPlan,
			missingNodeTypes,
			missingNodeTypeMode: options.missingNodeTypeMode,
		});

		blockingIssues.push(...refusedByPolicy);

		return {
			input,
			folderContext,
			credentialPlan,
			workflowPlan,
			folderPlan,
			dataTablePlan,
			variablePlan,
			tagPlan,
			removalPlan,
			folderRemovalPlan,
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

		// Tags go first because the workflow write attaches them by id.
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

		// Last of the writes: an overwrite is the only step that rewrites pre-existing data, and no
		// step above reads a variable, since `$vars` resolves by name at runtime. Still ahead of the
		// publish sweep, which evaluates trigger parameters against variable values.
		const variableResult = await this.variableImporter.apply(context, variablePlan);

		// Removal trails every write: the package's own content is in place first, so a failure
		// earlier leaves the target with more than the package asked for rather than less. It sits
		// after the variables above only because nothing here reads them.
		const removedWorkflows = await this.workflowRemover.apply(context, plan.removalPlan);
		// After the workflows: a folder is only removed once nothing is left inside it.
		const removedFolders = await this.folderRemover.apply(context, plan.folderRemovalPlan);

		return {
			workflowOutcomes: outcomes.map((outcome) =>
				withBlockedFromPublish(outcome, blockedFromPublish.get(outcome.sourceWorkflowId)),
			),
			removedWorkflows,
			removedFolders,
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
		dataTableRequest,
		dataTablePlan,
		variableRequest,
		variablePlan,
		tagPlan,
		removalPlan,
		folderRemovalPlan,
		missingNodeTypes,
		missingNodeTypeMode,
	}: {
		workflowPlan: WorkflowImportPlan;
		credentialPlan: CredentialResolution;
		credentialRequest: CredentialBindingRequest;
		folderPlan: FolderImportPlan;
		dataTableRequest: DataTableImportRequest;
		dataTablePlan: DataTableImportPlan;
		variableRequest: VariableImportRequest;
		variablePlan: VariableImportPlan;
		tagPlan: TagImportPlan;
		removalPlan: WorkflowRemovalPlan;
		folderRemovalPlan: FolderRemovalPlan;
		missingNodeTypes: MissingNodeTypeRequirement[];
		missingNodeTypeMode: MissingNodeTypeMode;
	}): BlockingIssue[] {
		return [
			...workflowPlan.conflicts.map(
				(conflict): BlockingIssue => ({ type: 'workflow-conflict', ...conflict }),
			),
			...workflowPlan.lineageConflicts.map(
				(conflict): BlockingIssue => ({ type: 'workflow-lineage-conflict', ...conflict }),
			),
			...workflowPlan.idConflicts.map(
				(conflict): BlockingIssue => ({ type: 'workflow-id-conflict', ...conflict }),
			),
			...workflowPlan.folderConflicts.map(
				(conflict): BlockingIssue => ({ type: 'workflow-folder-conflict', ...conflict }),
			),
			...workflowPlan.archiveForbidden.map(
				(failure): BlockingIssue => ({ type: 'workflow-archive-forbidden', ...failure }),
			),
			...folderPlan.conflicts.map(
				(conflict): BlockingIssue => ({ type: 'folder-conflict', ...conflict }),
			),
			...removalPlan.failures.map(
				(failure): BlockingIssue => ({ type: 'workflow-removal-forbidden', ...failure }),
			),
			...removalPlan.conflicts.map(
				(conflict): BlockingIssue => ({ type: 'workflow-removal-conflict', ...conflict }),
			),
			...folderRemovalPlan.failures.map(
				(failure): BlockingIssue => ({ type: 'folder-removal-forbidden', ...failure }),
			),
			...dataTablePlan.failures.map((failure) =>
				toDataTableBlockingIssue(failure, dataTableRequest, dataTablePlan),
			),
			...tagPlan.failures.map((failure) =>
				toTagBlockingIssue(failure, [{ tagPlan, workflowPlan }]),
			),
			...this.credentialImporter
				.blockingFailures(credentialRequest, credentialPlan)
				.map((failure) => toCredentialBlockingIssue(failure, credentialRequest)),
			...this.variableImporter.blockingFailures(variableRequest, variablePlan).map(
				(failure): BlockingIssue => ({
					type: 'variable-unresolved',
					...failure,
					usedBy: variableConsumers(variableRequest, failure.name),
				}),
			),
			...this.variableImporter.blockingConflicts(variableRequest, variablePlan).map(
				(conflict): BlockingIssue => ({
					type: 'variable-conflict',
					...conflict,
					usedBy: variableConsumers(variableRequest, conflict.name),
				}),
			),
			...missingNodeTypeBlockingFailures(missingNodeTypeMode, missingNodeTypes).map(
				(requirement): BlockingIssue => ({
					type: 'missing-node-type',
					nodeType: requirement.type,
					typeVersion: requirement.typeVersion,
					usedBy: requirement.usedBy,
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

function toCredentialBlockingIssue(
	failure: CredentialResolutionFailure,
	request: CredentialBindingRequest,
): BlockingIssue {
	const { kind, sourceId, targetId, expectedType, actualType } = failure;
	return {
		type: 'credential-unresolved',
		kind,
		sourceId,
		...(targetId ? { targetId } : {}),
		...(expectedType ? { expectedType } : {}),
		...(actualType ? { actualType } : {}),
		usedBy: mergeRequirementConsumers(
			request.requirements?.find(({ id }) => id === sourceId)?.usedBy ?? [],
		),
	};
}

function toDataTableBlockingIssue(
	failure: DataTableResolutionFailure,
	request: DataTableImportRequest,
	plan: DataTableImportPlan,
): BlockingIssue {
	let requirements = request.requirements ?? [];
	if (failure.sourceId) {
		requirements = requirements.filter(({ id }) => id === failure.sourceId);
	} else if (failure.kind === 'permission-denied') {
		const writtenIds = new Set(
			failure.missingScope === 'dataTable:create'
				? plan.creations.map(({ id }) => id)
				: plan.updates.map(({ table }) => table.id),
		);
		requirements = requirements.filter(({ id }) => writtenIds.has(id));
	}

	return {
		type: 'data-table-unresolved',
		...failure,
		usedBy: mergeRequirementConsumers(requirements.flatMap(({ usedBy }) => usedBy)),
	};
}

function toTagBlockingIssue(
	failure: TagResolutionFailure,
	plans: Array<Pick<ImportPlan, 'tagPlan' | 'workflowPlan'>>,
): BlockingIssue {
	const consumers = plans.flatMap(({ tagPlan, workflowPlan }) => {
		let tagIds: string[];
		if (failure.sourceId) {
			tagIds = [failure.sourceId];
		} else if (failure.missingScope === 'tag:create') {
			tagIds = tagPlan.creations.map(({ id }) => id);
		} else {
			tagIds = [...tagPlan.renames, ...tagPlan.reconciles].map(({ id }) => id);
		}

		return workflowPlan.items
			.filter((item) => item.action !== 'skip' && item.tagIds?.some((id) => tagIds.includes(id)))
			.map(
				({ sourceWorkflowId }): PackageRequirementConsumer => ({
					kind: 'workflow',
					id: sourceWorkflowId,
				}),
			);
	});

	return { type: 'tag-unresolved', ...failure, usedBy: mergeRequirementConsumers(consumers) };
}

function variableConsumers(
	request: VariableImportRequest,
	name: string,
): PackageRequirementConsumer[] {
	return mergeRequirementConsumers(
		request.requirements?.find((requirement) => requirement.name === name)?.usedBy ?? [],
	);
}
