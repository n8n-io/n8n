import { LicenseState } from '@n8n/backend-common';
import { Container, Service } from '@n8n/di';

import { NodeTypes } from '@/node-types';
import type { PolicyActor } from '@/policy/policy-enforcement-backend';

import type { AgentImporter } from '../entities/agent/agent-importer';
import {
	credentialConflicts,
	forbiddenCredentialUpdates,
	plannedCredentialUpdates,
} from '../entities/credential/credential-conflict-policy';
import {
	requiredAgentScopes,
	type AgentImportOutcome,
	type AgentImportPlan,
	type PreparedAgent,
	type PersistedAgentOutcome,
} from '../entities/agent/agent-import.types';
import { CredentialImporter } from '../entities/credential/credential-importer';
import {
	consumersBlockedByCredentials,
	credentialMissingModeUsesPackageData,
} from '../entities/credential/credential-missing-mode';
import type {
	CredentialApplyResult,
	CredentialBindResult,
	CredentialBindingRequest,
	CredentialImportPlan,
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
import { FolderImporter, toFolderSummaries } from '../entities/folder/folder-importer';
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
	consumersWithMissingNodeTypes,
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
import {
	WorkflowPublisher,
	type PackagePublishingRequest,
	type PackagePublishingResults,
} from '../entities/workflow/workflow-publisher';
import type { PublishingBlockedReason } from '../entities/publishing';
import { createBindings } from '../n8n-packages.types';
import type {
	BlockingIssue,
	ImportBindingMap,
	ImportContext,
	ImportedFolderSummary,
	ImportWorkflowProperties,
	PackageImportBindings,
	PackageImportSource,
	RemovedFolderSummary,
	RemovedWorkflowSummary,
	ResolvedImportFolderProperties,
} from '../n8n-packages.types';
import { mergeRequirementConsumers } from '../spec/requirement-consumers';
import type {
	PackageRequirementConsumer,
	PackageAgentRequirement,
	PackageWorkflowRequirement,
} from '../spec/requirements.schema';
import { ContentImportPolicyGate, contentImportTransport } from './content-import-policy';
import { CredentialSavePolicyGate } from './credential-save-policy';
import { toImportBlockedError } from './import-blocked.error';
import {
	assertArchiveTransitionsAllowed,
	assertCredentialUpdatesAllowed,
	assertDataTableWritesAllowed,
	assertTagWritesAllowed,
	assertVariableWritesAllowed,
	assertPackageImportApiKeyScopes,
} from './import-gates';
import { identifyRequirements } from './import-result';

export interface ImportOrchestrationInput {
	context: ImportContext;
	folders: PreparedFolder[];
	workflows: PreparedWorkflow[];
	agents?: PreparedAgent[];
	agentRequirements?: PackageAgentRequirement[];
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
	/** Treat the project root as a workflow location (project packages, which set the layout). */
	checkRootPlacement: boolean;
	/**
	 * Under `layoutConflictPolicy=follow-package`, the folders a move may touch. A selection moves only the
	 * folders that hold a selected workflow, so unselected content stays where it is. Omitted means all.
	 */
	movableFolderIds?: ReadonlySet<string>;
}

/**
 * Everything one scope's {@link ImportOrchestrator.apply} wrote, before the package-wide publish
 * sweep runs. Telemetry consumes this shape directly — it only reads statuses and ids.
 */
export interface ImportContentResult {
	workflowOutcomes: PersistedWorkflowOutcome[];
	agentOutcomes: PersistedAgentOutcome[];
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
	credentialPlan: CredentialImportPlan;
	workflowPlan: WorkflowImportPlan;
	agentPlan?: AgentImportPlan;
	folderPlan: FolderImportPlan;
	dataTablePlan: DataTableImportPlan;
	variablePlan: VariableImportPlan;
	tagPlan: TagImportPlan;
	removalPlan: WorkflowRemovalPlan;
	folderRemovalPlan: FolderRemovalPlan;
	missingNodeTypes: MissingNodeTypeRequirement[];
	blockingIssues: BlockingIssue[];
}

/** Coordinates entity planning and import across destination projects. */
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
		private readonly credentialSavePolicyGate: CredentialSavePolicyGate,
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
		assertTagWritesAllowed(
			options.apiKeyScopes,
			plans.map((plan) => plan.tagPlan),
		);
		assertArchiveTransitionsAllowed(
			options.apiKeyScopes,
			plans.map((plan) => plan.workflowPlan),
		);
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
		if (
			plans.some(
				({ input, credentialPlan, agentPlan }) =>
					credentialPlan.stubIds.size > 0 &&
					(agentPlan !== undefined ||
						credentialMissingModeUsesPackageData(input.credentialRequest.missingMode)),
			)
		) {
			assertPackageImportApiKeyScopes(options.apiKeyScopes, ['credential:create']);
		}
		if (plans.length > 0) {
			assertCredentialUpdatesAllowed(
				options.apiKeyScopes,
				plans[0].input.credentialRequest.conflictPolicy,
				plans.map((plan) => plan.credentialPlan),
			);
		}

		for (const { input, variablePlan, credentialPlan } of plans) {
			await this.credentialImporter.assertCanCreate(
				input.context,
				input.credentialRequest,
				credentialPlan,
				input.projectPendingCreation ?? false,
			);
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
		for (const plan of plans) {
			if (!plan.agentPlan) continue;
			assertPackageImportApiKeyScopes(options.apiKeyScopes, requiredAgentScopes(plan.agentPlan));
		}

		const issues = await this.collectPackageBlockingIssues(plans);
		if (issues.length > 0) throw toImportBlockedError(issues);

		// Last: an import with blocking issues reports them instead of a dry-run error, and a
		// divergent update never reaches the dry run.
		for (const { input, credentialPlan } of plans) {
			await this.credentialImporter.assertCanUpdate(
				input.context,
				input.credentialRequest,
				credentialPlan,
			);
		}
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

		// Across scopes: one destination credential can be reached from several projects.
		if (plans.length > 0) {
			const { context, credentialRequest, importSource } = plans[0].input;
			const credentialPlans = plans.map((plan) => plan.credentialPlan);
			for (const forbidden of forbiddenCredentialUpdates(credentialPlans)) {
				issues.push({ type: 'credential-update-forbidden', ...forbidden });
			}
			const conflicts = credentialConflicts(credentialRequest.conflictPolicy, credentialPlans);
			for (const conflict of conflicts) {
				issues.push({ type: 'credential-conflict', ...conflict });
			}
			issues.push(
				...(await this.credentialSavePolicyGate.refusedUpdates(
					plannedCredentialUpdates(credentialRequest.conflictPolicy, credentialPlans),
					contentImportTransport(importSource),
					{ kind: 'user', user: context.user },
				)),
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
		return (await this.planPackage([input]))[0];
	}

	async planPackage(inputs: ImportOrchestrationInput[]): Promise<ImportPlan[]> {
		const plans: ImportPlan[] = [];
		for (const input of inputs) plans.push(await this.planScope(input));
		if (!plans.some((plan) => plan.agentPlan)) return plans;

		const agentImporter = await this.getAgentImporter();
		const { AgentImportBindings } = await import('../entities/agent/agent-import-bindings.js');
		const boundAgentPlans = await Container.get(AgentImportBindings).resolve(plans);
		for (const [scope, agentPlan] of boundAgentPlans) {
			scope.agentPlan = await agentImporter.validate(agentPlan, scope.input.context.projectId);
			scope.blockingIssues.push(...scope.agentPlan.issues);
		}
		return plans;
	}

	private async getAgentImporter(): Promise<AgentImporter> {
		const { AgentImporter } = await import('../entities/agent/agent-importer.js');
		return Container.get(AgentImporter);
	}

	private async planScope(input: ImportOrchestrationInput): Promise<ImportPlan> {
		let agentPlan: AgentImportPlan | undefined;
		if (input.agents?.length) {
			const agentImporter = await this.getAgentImporter();
			agentPlan = await agentImporter.plan(
				{ ...input.context, projectPendingCreation: input.projectPendingCreation },
				input.agents,
				input.options,
			);
			input = scopeAgentRequirements(input, agentPlan);
		}
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

		if (workflows.length > 0 || !agentPlan)
			await this.workflowPublisher.assertCanPublish(
				context.user,
				context.projectId,
				options.publishingPolicy,
				input.projectPendingCreation,
			);

		const credentialPlan = await this.credentialImporter.plan(context, credentialRequest);
		const dataTablePlan = await this.dataTableImporter.plan(context, dataTableRequest);
		const variablePlan = await this.variableImporter.plan(context, variableRequest);
		const workflowPlan = await this.workflowImporter.plan(context, workflows, options, {
			checkRootPlacement: input.checkRootPlacement,
			layoutConflictPolicy: options.layoutConflictPolicy,
		});
		// Tags plan after workflows: only tags referenced by non-skipped workflows gate or create.
		const activeWorkflows = workflowPlan.items.filter((item) => item.action !== 'skip');
		const tagPlan = await this.tagImporter.plan(context, tagRequest, activeWorkflows);
		const folderContext = {
			...context,
			folderConflictPolicy: options.folderConflictPolicy,
			layoutConflictPolicy: options.layoutConflictPolicy,
			movableFolderIds: input.movableFolderIds,
		};
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

		// Which folders end up empty depends on which workflows survive and where the planned moves put
		// workflows and folders, so this follows both plans above.
		const folderRemovalPlan =
			removesUnpackagedWorkflows(options.folderConflictPolicy) && !input.projectPendingCreation
				? await this.folderRemover.plan(context, {
						packageFolderIds,
						occupiedFolderIds: removalPlan.occupiedFolderIds,
						folderItems: folderPlan.items,
					})
				: { removals: [], failures: [] };

		// Skipped workflows are never written, so their node types don't gate the import.
		const missingNodeTypes = collectMissingNodeTypes(
			activeWorkflows,
			(nodeType) => this.nodeTypes.getSupportedVersions(nodeType),
			(agentPlan?.items ?? [])
				.filter(({ action }) => action !== 'skip')
				.map((item) => ({
					agentId: item.sourceAgentId,
					projectId: context.projectId,
					nodes: (item.config?.tools ?? [])
						.filter((tool) => tool.type === 'node')
						.map(({ node }) => ({ type: node.nodeType, typeVersion: node.nodeTypeVersion })),
				})),
		);

		const actor: PolicyActor = { kind: 'user', user: context.user };
		const refusedByPolicy = await this.contentImportPolicyGate.refusedWorkflows(
			workflowPlan.items,
			context.projectId,
			contentImportTransport(input.importSource),
			actor,
		);
		const refusedStubs = await this.credentialSavePolicyGate.refusedStubs(
			credentialRequest,
			credentialPlan,
			context.projectId,
			actor,
		);

		const plan = {
			input,
			agentPlan,
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
		};
		return {
			...plan,
			blockingIssues: [...this.collectBlockingIssues(plan), ...refusedByPolicy, ...refusedStubs],
		};
	}

	/** Writes one scope's definitions. Call {@link publishPackage} after all scopes are applied. */
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

		await this.folderImporter.apply(folderContext, folderPlan);

		const credentialBindResult = await this.credentialImporter.apply(
			context,
			credentialRequest,
			credentialPlan,
		);

		await this.dataTableImporter.apply(context, dataTablePlan);

		const workflowBlockers = publishingBlockers(plan, credentialBindResult, 'workflow');
		const agentBlockers = publishingBlockers(plan, credentialBindResult, 'agent');

		const { outcomes, bindings } = await this.workflowImporter.apply(
			{ ...context, droppedTagIds: droppedTagIds(tagPlan) },
			workflowPlan,
			createBindings({
				credentials: credentialBindResult.bindings,
				// Seeds cross-scope workflow ids so a project package can resolve
				// sub-workflow references that point into another project.
				...(seedWorkflowBindings ? { workflows: seedWorkflowBindings } : {}),
			}),
		);

		let agentOutcomes: PersistedAgentOutcome[] = [];
		if (plan.agentPlan) {
			const agentImporter = await this.getAgentImporter();
			agentOutcomes = await agentImporter.apply(context, plan.agentPlan);
		}
		for (const { sourceAgentId, agent } of agentOutcomes) {
			bindings.agents.set(sourceAgentId, agent.id);
		}

		// Last of the writes: an overwrite is the only step that rewrites pre-existing data, and no
		// step above reads a variable, since `$vars` resolves by name at runtime. Still ahead of the
		// publish sweep, which evaluates trigger parameters against variable values.
		const variableResult = await this.variableImporter.apply(context, variablePlan);

		// After the variables: a credential update is the only write that reaches outside the
		// package. Before the publish sweep, so that a published workflow uses the new values.
		const credentialsUpdated = await this.credentialImporter.applyUpdates(
			context,
			credentialRequest,
			credentialPlan,
		);

		// After the workflow writes: a failed write then leaves the existing folders as they were.
		// Before the removals, which plan with the folders in their new places.
		await this.folderImporter.applyUpdates(folderContext, folderPlan);

		// Removal trails every write: the package's own content is in place first, so a failure
		// earlier leaves the target with more than the package asked for rather than less. It sits
		// after the variables above only because nothing here reads them.
		const removedWorkflows = await this.workflowRemover.apply(context, plan.removalPlan);
		// After the workflows: a folder is only removed once nothing is left inside it.
		const removedFolders = await this.folderRemover.apply(context, plan.folderRemovalPlan);

		return {
			agentOutcomes: agentOutcomes.map((outcome) =>
				withBlockedFromPublish(outcome, agentBlockers.get(outcome.sourceAgentId)),
			),
			workflowOutcomes: outcomes.map((outcome) =>
				withBlockedFromPublish(outcome, workflowBlockers.get(outcome.sourceWorkflowId)),
			),
			removedWorkflows,
			removedFolders,
			folderSummaries: toFolderSummaries(folderPlan),
			bindings,
			credentialResult: { ...credentialBindResult, updated: credentialsUpdated },
			dataTablePlan,
			variablePlan,
			variableResult,
			tagPlan,
		};
	}

	async publishPackage({
		content,
		...request
	}: Omit<PackagePublishingRequest, 'persisted'> & { content: ImportContentResult[] }): Promise<{
		workflows: PackagePublishingResults;
		agentOutcomes: AgentImportOutcome[];
	}> {
		const workflows = await this.workflowPublisher.applyToPackage({
			...request,
			persisted: content.flatMap((scope) => scope.workflowOutcomes),
		});
		const persisted = content.flatMap((scope) => scope.agentOutcomes);
		if (persisted.length === 0) return { workflows, agentOutcomes: [] };

		// Workflow tools require published workflows. Subagents only require saved definitions.
		const { AgentPublisher } = await import('../entities/agent/agent-publisher.js');
		const agentOutcomes = await Container.get(AgentPublisher).applyToPackage(
			request.user,
			persisted,
		);
		return { workflows, agentOutcomes };
	}

	private collectBlockingIssues({
		input: {
			credentialRequest,
			dataTableRequest,
			variableRequest,
			options: { missingNodeTypeMode },
		},
		workflowPlan,
		credentialPlan,
		folderPlan,
		dataTablePlan,
		variablePlan,
		tagPlan,
		removalPlan,
		folderRemovalPlan,
		missingNodeTypes,
	}: Omit<ImportPlan, 'blockingIssues'>): BlockingIssue[] {
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

function scopeAgentRequirements(
	input: ImportOrchestrationInput,
	agentPlan: AgentImportPlan,
): ImportOrchestrationInput {
	const active = agentPlan.items.filter(({ action }) => action !== 'skip');
	const filter = <T extends { usedBy: PackageRequirementConsumer[] }>(
		requirements: T[] | undefined,
	) => identifyRequirements(requirements, input.workflows, active);
	const requirements = filter(input.credentialRequest.requirements);
	const originalIds = new Set(input.credentialRequest.requirements?.map(({ id }) => id));
	const activeIds = new Set(requirements?.map(({ id }) => id));
	const bindings = input.credentialRequest.credentialBindings;
	return {
		...input,
		agentRequirements: filter(input.agentRequirements),
		subWorkflowRequirements: filter(input.subWorkflowRequirements),
		credentialRequest: {
			...input.credentialRequest,
			requirements,
			credentialBindings:
				bindings &&
				new Map([...bindings].filter(([id]) => !originalIds.has(id) || activeIds.has(id))),
		},
		dataTableRequest: {
			...input.dataTableRequest,
			requirements: filter(input.dataTableRequest.requirements),
		},
		variableRequest: {
			...input.variableRequest,
			requirements: filter(input.variableRequest.requirements),
		},
	};
}

function publishingBlockers(
	plan: ImportPlan,
	credentials: CredentialBindResult,
	kind: PackageRequirementConsumer['kind'],
): Map<string, PublishingBlockedReason> {
	const blocked = new Map<string, PublishingBlockedReason>();
	const credentialBlockers = [
		['incomplete-credential', credentials.incomplete],
		['stub-credential', credentials.stubbed],
	] as const;
	for (const [reason, sourceIds] of credentialBlockers) {
		for (const id of consumersBlockedByCredentials(
			plan.input.credentialRequest.requirements,
			new Set(sourceIds),
			kind,
		)) {
			blocked.set(id, reason);
		}
	}
	// Missing node types take precedence because the definition cannot run.
	for (const id of consumersWithMissingNodeTypes(plan.missingNodeTypes, kind)) {
		blocked.set(id, 'missing-node-type');
	}
	return blocked;
}

function withBlockedFromPublish<T extends PersistedWorkflowOutcome | PersistedAgentOutcome>(
	outcome: T,
	blockedFromPublish: PublishingBlockedReason | undefined,
): T {
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
				: [
						...plan.updates.map(({ table }) => table.id),
						...plan.columnAlignments.map(({ id }) => id),
					],
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
