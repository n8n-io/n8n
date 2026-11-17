import { LicenseState } from '@n8n/backend-common';
import { GlobalConfig } from '@n8n/config';
import {
	ProjectRepository,
	SharedWorkflowRepository,
	WorkflowDependencyRepository,
	WorkflowHistoryRepository,
	type User,
} from '@n8n/db';
import { Service } from '@n8n/di';
import { UnexpectedError } from '@n8n/errors';

import type {
	InventoryWorkflow,
	PackageDirectoryInventory,
} from '@/modules/n8n-packages/io/directory/package-directory-inventory-reader';

import { BranchFactsReader, type BranchPackageInput } from './branch-facts.reader';
import { gapId } from './dependency-check.shared';
import {
	targetKey,
	type AccessFact,
	type ApplyCheckInput,
	type DestinationCallerFact,
	type DestinationTargetFact,
	type ExpressionReferenceFact,
	type FactProject,
	type PlanFact,
	type ReferenceFact,
	type TargetKey,
	type Verdict,
} from './dependency-check.types';
import type { CheckSelection } from './promote-check-facts.service';
import { TargetLookupService } from './target-lookup.service';
import { callerPolicyVerdict, extractReferences } from './workflow-references';
import { PromotionAccessService } from '../promotion-access.service';
import type { PromotionOperationInput } from '../promotions.types';

export type ApplyCheckFactsArgs = {
	user: User;
	/** The apply environment. */
	input: PromotionOperationInput;
	/** The branch at the commit that the Apply reads. */
	branch: Exclude<BranchPackageInput, null>;
	/**
	 * What the Apply writes and deletes: one entry for each project, in the order of the changes
	 * view. Use `'instance'` for an instance Apply: every project of the branch that the user can
	 * apply, with the deletions of reconciliation.
	 */
	selection: CheckSelection[] | 'instance';
	/** The home that the user selected for a credential without an owner, by credential id. */
	credentialHomes?: Record<string, string>;
};

/** Builds the facts of an Apply check from the branch and the destination instance. */
@Service()
export class ApplyCheckFactsService {
	constructor(
		private readonly lookup: TargetLookupService,
		private readonly branchReader: BranchFactsReader,
		private readonly access: PromotionAccessService,
		private readonly projectRepository: ProjectRepository,
		private readonly sharedWorkflowRepository: SharedWorkflowRepository,
		private readonly workflowHistoryRepository: WorkflowHistoryRepository,
		private readonly workflowDependencyRepository: WorkflowDependencyRepository,
		private readonly licenseState: LicenseState,
		private readonly globalConfig: GlobalConfig,
	) {}

	async gather(args: ApplyCheckFactsArgs): Promise<ApplyCheckInput> {
		const { user, input } = args;
		if (input.config.direction !== 'apply') {
			throw new UnexpectedError('The Apply check needs an apply environment');
		}
		const { fact: branch, inventory } = await this.branchReader.read(args.branch);
		const branchWorkflows = new Map(inventory.workflows.map((workflow) => [workflow.id, workflow]));

		const plan =
			args.selection === 'instance'
				? await this.instancePlan(user, input, inventory)
				: await this.selectionPlan(args.selection, inventory);

		// --- The static references of the incoming version of each written workflow.
		const references: ReferenceFact[] = [];
		const expressionReferences: ExpressionReferenceFact[] = [];
		for (const [id, projectId] of Object.entries(plan.writtenWorkflows)) {
			const workflow = branchWorkflows.get(id);
			if (!workflow) continue;
			const extracted = extractReferences({ id, name: workflow.name, projectId }, workflow.content);
			references.push(...extracted.references);
			expressionReferences.push(...extracted.expressionReferences);
		}
		// The exporter removes the credential name from the node. The requirement row of the
		// consumer keeps it, so the report can still show what the workflow shows on the source.
		for (const { target } of references) {
			const row = branch.requirements[targetKey(target.kind, target.id)];
			// The branch keeps a row only while it does not hold the target. The file of a credential
			// on the branch has the same name as the row had.
			const name =
				row?.name ??
				(target.kind === 'credential' ? branch.credentials[target.id]?.name : undefined);
			if (target.name === undefined && name !== undefined) target.name = name;
		}

		// --- The destination now. The written workflows are read for their published version.
		const idsOf = (kind: 'credential' | 'workflow', list: ReferenceFact[]) =>
			list.filter(({ target }) => target.kind === kind).map(({ target }) => target.id);
		const writtenWorkflowIds = Object.keys(plan.writtenWorkflows);
		const destinationWritten = await this.lookup.workflows(writtenWorkflowIds);
		const published = await this.publishedOnlyReferences(plan, destinationWritten, references);
		references.push(...published);

		const credentialIds = [
			...new Set([...idsOf('credential', references), ...Object.keys(plan.writtenCredentials)]),
		];
		const targetWorkflowIds = [...new Set(idsOf('workflow', references))];
		const [credentials, workflows, readableCredentials, readableWorkflows] = await Promise.all([
			this.lookup.credentials(credentialIds),
			this.lookup.workflows(targetWorkflowIds),
			this.lookup.idsWithScope(user, 'credential', credentialIds, 'credential:read'),
			this.lookup.idsWithScope(user, 'workflow', targetWorkflowIds, 'workflow:read'),
		]);

		const destinationTargets: Partial<Record<TargetKey, DestinationTargetFact>> = {};
		for (const [id, credential] of credentials) {
			destinationTargets[targetKey('credential', id)] = {
				name: credential.name,
				credentialType: credential.type,
				...(credential.owner ? { project: credential.owner } : {}),
				usageScope: credential.usageScope,
				isPlaceholder: credential.isPlaceholder,
				isManaged: credential.isManaged,
				isResolvable: credential.isResolvable,
				canRead: readableCredentials.has(id),
				usableByAllProjects: credential.isGlobal,
				usableByProjectIds: credential.projectIds,
			};
		}
		for (const [id, workflow] of workflows) {
			destinationTargets[targetKey('workflow', id)] = {
				name: workflow.name,
				archived: workflow.isArchived,
				...(workflow.owner ? { project: workflow.owner } : {}),
				canRead: readableWorkflows.has(id),
			};
		}

		// --- The caller policy for the state after the Apply: a written sub-workflow has the
		// settings and the project of the branch.
		const defaultPolicy = this.globalConfig.workflows.callerPolicyDefaultOption;
		const callerVerdicts: Record<string, Record<string, Verdict>> = {};
		for (const { consumer, target, publishedOnly } of references) {
			if (target.kind !== 'workflow' || publishedOnly) continue;
			const incoming =
				target.id in plan.writtenWorkflows ? branchWorkflows.get(target.id) : undefined;
			const current = workflows.get(target.id);
			if (!incoming && !current) continue;
			(callerVerdicts[target.id] ??= {})[consumer.id] = callerPolicyVerdict({
				subworkflowSettings: incoming ? incoming.content.settings : current?.settings,
				defaultPolicy,
				callerWorkflowId: consumer.id,
				callerProjectId: consumer.projectId,
				subworkflowProjectId: incoming ? plan.writtenWorkflows[target.id] : current?.owner?.id,
			});
		}

		const destinationCallers = await this.destinationCallers(plan);

		// --- Access.
		const [createProjects, shareable, movable] = await Promise.all([
			this.lookup.createCredentialProjects(user),
			this.lookup.idsWithScope(user, 'credential', [...credentials.keys()], 'credential:share'),
			this.lookup.idsWithScope(user, 'credential', [...credentials.keys()], 'credential:move'),
		]);
		const knownProjects: FactProject[] = [
			...createProjects,
			...[...credentials.values()].flatMap(({ owner }) => owner ?? []),
			...[...workflows.values()].flatMap(({ owner }) => owner ?? []),
			...[...destinationWritten.values()].flatMap(({ owner }) => owner ?? []),
		];
		const accessFacts = await this.lookup.accessFacts({
			user,
			input,
			direction: 'apply',
			projectIds: [
				...plan.projectOrder,
				...Object.keys(branch.projects),
				...knownProjects.map(({ id }) => id),
				...destinationCallers.map(({ caller }) => caller.projectId),
				...(plan.reconcileDeletedWorkflows ?? []).map(({ projectId }) => projectId),
			],
			knownProjects,
			assumedProjects: Object.entries(branch.projects).map(([id, { name }]) => ({ id, name })),
		});
		// The Apply creates a project that the destination lacks, and the user becomes its admin.
		const existingBranchProjects = new Set(
			await this.projectRepository.findExistingIds(Object.keys(branch.projects)),
		);
		const createdProjectIds = accessFacts.operableProjectIds.filter(
			(id) => id in branch.projects && !existingBranchProjects.has(id),
		);
		const credentialRights: AccessFact['credentials'] = {};
		for (const id of credentials.keys()) {
			credentialRights[id] = { canShare: shareable.has(id), canMove: movable.has(id) };
		}

		return {
			allowIncomplete: input.config.settings.allowIncomplete,
			references,
			expressionReferences,
			branch,
			destinationTargets,
			callerVerdicts,
			destinationCallers,
			plan,
			access: {
				...accessFacts,
				credentials: credentialRights,
				createCredentialProjectIds: [...createProjects.map(({ id }) => id), ...createdProjectIds],
				sharingLicensed: this.licenseState.isSharingLicensed(),
				// An Apply shows no review.
				canReadReviews: false,
			},
			...(args.credentialHomes ? { credentialHomes: args.credentialHomes } : {}),
		};
	}

	/** The plan of a selection: the workflows and the credentials of the branch that it names. */
	private async selectionPlan(
		selection: CheckSelection[],
		inventory: PackageDirectoryInventory,
	): Promise<PlanFact> {
		const plan: PlanFact = {
			writtenWorkflows: {},
			writtenCredentials: {},
			deletedWorkflows: [],
			projectOrder: selection.map(({ projectId }) => projectId),
		};
		const deletedIds: Array<{ id: string; projectId: string }> = [];
		for (const item of selection) {
			const selected = new Set(item.workflowIds ?? []);
			const folderPaths = inventory.folders
				.filter(({ folder }) => (item.folderIds ?? []).includes(folder.id))
				.map(({ path }) => directoryOf(path));
			const written: InventoryWorkflow[] = inventory.workflows.filter(
				(workflow) =>
					workflow.projectId === item.projectId &&
					(selected.has(workflow.id) ||
						folderPaths.some((folder) => workflow.path.startsWith(`${folder}/`))),
			);
			for (const workflow of written) plan.writtenWorkflows[workflow.id] = item.projectId;

			// A credential comes with a written workflow of its own project, or the user included it.
			const used = new Set(item.credentialIds ?? []);
			for (const workflow of written) {
				const consumer = { id: workflow.id, name: workflow.name, projectId: item.projectId };
				for (const { target } of extractReferences(consumer, workflow.content).references) {
					if (target.kind === 'credential') used.add(target.id);
				}
			}
			for (const { projectId, credential } of inventory.credentials) {
				if (projectId === item.projectId && used.has(credential.id)) {
					plan.writtenCredentials[credential.id] = item.projectId;
				}
			}
			for (const id of item.deletedWorkflowIds ?? []) {
				deletedIds.push({ id, projectId: item.projectId });
			}
		}
		const names = await this.lookup.workflows(deletedIds.map(({ id }) => id));
		plan.deletedWorkflows = deletedIds.map(({ id, projectId }) => ({
			id,
			name: names.get(id)?.name ?? id,
			projectId: names.get(id)?.owner?.id ?? projectId,
		}));
		return plan;
	}

	/**
	 * The plan of an instance Apply: every project of the branch that the user can apply. The
	 * destination workflows of those projects that the branch lacks are the deletions of
	 * reconciliation, and the team projects that the branch lacks are the deleted projects.
	 */
	private async instancePlan(
		user: User,
		input: PromotionOperationInput,
		inventory: PackageDirectoryInventory,
	): Promise<PlanFact> {
		const branchProjectIds = inventory.projects.map(({ id }) => id);
		const existing = new Set(await this.projectRepository.findExistingIds(branchProjectIds));
		const operable = await this.access.operableProjectIds(user, 'apply', branchProjectIds);
		const covered = await this.access.coveredProjectIds(input, branchProjectIds);
		const global = this.access.hasGlobalRight(user, 'apply') && input.scope === 'instance';
		// The Apply creates a project that the destination lacks, for a user with the global right.
		const applied = branchProjectIds.filter((id) =>
			existing.has(id) ? operable.has(id) && covered.has(id) : global,
		);

		const plan: PlanFact = {
			writtenWorkflows: {},
			writtenCredentials: {},
			deletedWorkflows: [],
			projectOrder: applied,
		};
		const appliedSet = new Set(applied);
		for (const { id, projectId } of inventory.workflows) {
			if (appliedSet.has(projectId)) plan.writtenWorkflows[id] = projectId;
		}
		for (const { projectId, credential } of inventory.credentials) {
			if (projectId !== null && appliedSet.has(projectId)) {
				plan.writtenCredentials[credential.id] = projectId;
			}
		}

		// A workflow that the branch holds in another project moves. It is not deleted.
		const onBranch = new Set(inventory.workflows.map(({ id }) => id));
		const owned = await this.sharedWorkflowRepository.findOwnedWorkflowIdsByProjects(
			applied.filter((id) => existing.has(id)),
		);
		const lacking = await this.lookup.workflows(owned.filter((id) => !onBranch.has(id)));
		plan.reconcileDeletedWorkflows = [...lacking.values()].flatMap(({ id, name, owner }) =>
			owner ? [{ id, name, projectId: owner.id }] : [],
		);

		if (global) {
			const branchProjects = new Set(branchProjectIds);
			const teamProjectIds = await this.projectRepository.findTeamProjectIds();
			plan.deletedProjectIds = teamProjectIds.filter((id) => !branchProjects.has(id));
		}
		return plan;
	}

	/**
	 * References that only the published version of a written workflow holds (open decision 8).
	 * A call to a workflow matters for the deletion check. A credential matters only when the
	 * Apply moves the workflow to another project, where the live version then needs access.
	 */
	private async publishedOnlyReferences(
		plan: PlanFact,
		destinationWritten: Awaited<ReturnType<TargetLookupService['workflows']>>,
		incoming: ReferenceFact[],
	): Promise<ReferenceFact[]> {
		const publishedVersions = [...destinationWritten.values()].flatMap((workflow) =>
			workflow.activeVersionId ? [{ workflow, versionId: workflow.activeVersionId }] : [],
		);
		if (publishedVersions.length === 0) return [];
		const versions = await this.workflowHistoryRepository.findNodesByVersionIds(
			publishedVersions.map(({ versionId }) => versionId),
		);
		const nodesByVersion = new Map(versions.map(({ versionId, nodes }) => [versionId, nodes]));
		const incomingKeys = new Set(incoming.map(gapId));

		const result: ReferenceFact[] = [];
		for (const { workflow, versionId } of publishedVersions) {
			const projectId = plan.writtenWorkflows[workflow.id];
			const moves = workflow.owner !== undefined && workflow.owner.id !== projectId;
			const consumer = { id: workflow.id, name: workflow.name, projectId };
			// The history holds the nodes only, so the error workflow of the live version is the
			// one of the current settings.
			const { references } = extractReferences(consumer, {
				nodes: nodesByVersion.get(versionId) ?? [],
				settings: workflow.settings,
			});
			for (const reference of references) {
				if (incomingKeys.has(gapId(reference))) continue;
				if (reference.target.kind === 'credential' && !moves) continue;
				result.push({ ...reference, publishedOnly: true });
			}
		}
		return result;
	}

	/**
	 * The destination workflows that call a workflow that the Apply can delete, and that the
	 * Apply does not write. The workflow index gives them, for the draft and the published version.
	 */
	private async destinationCallers(plan: PlanFact): Promise<DestinationCallerFact[]> {
		const deletedIds = [
			...plan.deletedWorkflows.map(({ id }) => id),
			...(plan.reconcileDeletedWorkflows ?? []).map(({ id }) => id),
		];
		if (deletedIds.length === 0) return [];
		const rows = await this.workflowDependencyRepository.findDependenciesForResources(
			deletedIds,
			['workflowCall', 'errorWorkflow'],
			false,
		);
		const pairs = new Map<string, { callerId: string; targetId: string }>();
		for (const { workflowId, dependencyKey } of rows) {
			if (workflowId in plan.writtenWorkflows || workflowId === dependencyKey) continue;
			pairs.set(`${workflowId}|${dependencyKey}`, {
				callerId: workflowId,
				targetId: dependencyKey,
			});
		}
		const callers = await this.lookup.workflows([
			...new Set([...pairs.values()].map(({ callerId }) => callerId)),
		]);
		return [...pairs.values()].flatMap(({ callerId, targetId }) => {
			const caller = callers.get(callerId);
			if (!caller?.owner) return [];
			return [
				{ targetId, caller: { id: caller.id, name: caller.name, projectId: caller.owner.id } },
			];
		});
	}
}

function directoryOf(path: string): string {
	return path.slice(0, path.lastIndexOf('/'));
}
