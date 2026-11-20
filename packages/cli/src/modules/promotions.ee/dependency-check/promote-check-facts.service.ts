import { GlobalConfig } from '@n8n/config';
import { FolderRepository, WorkflowRepository, type User } from '@n8n/db';
import { Service } from '@n8n/di';
import { hasGlobalScope } from '@n8n/permissions';
import { UnexpectedError } from '@n8n/errors';

import { BranchFactsReader, type BranchPackageInput } from './branch-facts.reader';
import {
	targetKey,
	type ExpressionReferenceFact,
	type FactProject,
	type OpenReviewFact,
	type PlanFact,
	type PromoteCheckInput,
	type ReferenceFact,
	type SourceTargetFact,
	type TargetKey,
} from './dependency-check.types';
import { OpenReviewFactsService } from './open-review-facts.service';
import { TargetLookupService } from './target-lookup.service';
import { callerPolicyVerdict, extractReferences } from './workflow-references';
import type { PromotionOperationInput } from '../promotions.types';

/** What a Promote or an Apply writes for one project. */
export type CheckSelection = {
	projectId: string;
	workflowIds?: string[];
	/** Every workflow in these folders and in the folders below them is written. */
	folderIds?: string[];
	/** Credentials of the project that the user included. */
	credentialIds?: string[];
	/** Workflows of the project that the operation deletes. */
	deletedWorkflowIds?: string[];
};

export type PromoteCheckFactsArgs = {
	user: User;
	/** The promote environment. */
	input: PromotionOperationInput;
	/** One entry for each project of the Promote, in the order of the changes view. */
	selection: CheckSelection[];
	/** The branch before the Promote. */
	branch: BranchPackageInput;
	/** The caller can give the open reviews. Otherwise the gatherer reads them. */
	openReviews?: OpenReviewFact[];
};

/** Builds the facts of a Promote check from the source instance and the branch. */
@Service()
export class PromoteCheckFactsService {
	constructor(
		private readonly workflowRepository: WorkflowRepository,
		private readonly folderRepository: FolderRepository,
		private readonly lookup: TargetLookupService,
		private readonly branchReader: BranchFactsReader,
		private readonly openReviewFacts: OpenReviewFactsService,
		private readonly globalConfig: GlobalConfig,
	) {}

	async gather(args: PromoteCheckFactsArgs): Promise<PromoteCheckInput> {
		const { user, input, selection } = args;
		if (input.config.direction !== 'promote') {
			throw new UnexpectedError('The Promote check needs a promote environment');
		}
		const { settings } = input.config;
		const { fact: branch } = await this.branchReader.read(args.branch);

		// --- The items that the Promote writes, and their static references.
		const plan: PlanFact = {
			writtenWorkflows: {},
			writtenCredentials: {},
			deletedWorkflows: [],
			projectOrder: selection.map(({ projectId }) => projectId),
		};
		const references: ReferenceFact[] = [];
		const expressionReferences: ExpressionReferenceFact[] = [];

		for (const item of selection) {
			const workflowIds = await this.workflowIdsOf(item);
			const rows = await this.workflowRepository.findByIds(workflowIds, {
				fields: ['name', 'nodes', 'settings'],
			});
			const found = new Set(rows.map(({ id }) => id));
			for (const workflow of rows) {
				plan.writtenWorkflows[workflow.id] = item.projectId;
				const extracted = extractReferences(
					{ id: workflow.id, name: workflow.name, projectId: item.projectId },
					workflow,
				);
				references.push(...extracted.references);
				expressionReferences.push(...extracted.expressionReferences);
			}
			// A selected workflow that the source no longer holds leaves the branch.
			const deletedIds = [
				...(item.deletedWorkflowIds ?? []),
				...workflowIds.filter((id) => !found.has(id)),
			];
			for (const id of new Set(deletedIds)) {
				plan.deletedWorkflows.push({
					id,
					name: branch.workflows[id]?.name ?? id,
					projectId: item.projectId,
				});
			}
		}

		// --- The targets on the source.
		const explicitCredentialIds = selection.flatMap(({ credentialIds }) => credentialIds ?? []);
		const idsOf = (kind: 'credential' | 'workflow') => [
			...new Set(references.filter(({ target }) => target.kind === kind).map((r) => r.target.id)),
		];
		const credentialIds = [...new Set([...idsOf('credential'), ...explicitCredentialIds])];
		const workflowIds = idsOf('workflow');
		const [credentials, workflows, readableCredentials, readableWorkflows] = await Promise.all([
			this.lookup.credentials(credentialIds),
			this.lookup.workflows(workflowIds),
			this.lookup.idsWithScope(user, 'credential', credentialIds, 'credential:read'),
			this.lookup.idsWithScope(user, 'workflow', workflowIds, 'workflow:read'),
		]);

		const sourceTargets: Partial<Record<TargetKey, SourceTargetFact>> = {};
		const consumersOf = (kind: 'credential' | 'workflow', id: string) =>
			references.filter(({ target }) => target.kind === kind && target.id === id);

		for (const id of credentialIds) {
			const credential = credentials.get(id);
			if (!credential) {
				sourceTargets[targetKey('credential', id)] = {
					exists: false,
					canRead: false,
					usableBy: {},
				};
				continue;
			}
			const usableBy: SourceTargetFact['usableBy'] = {};
			for (const { consumer } of consumersOf('credential', id)) {
				const shared = credential.isGlobal || credential.projectIds.includes(consumer.projectId);
				// A member can use a credential of the own personal project in a team project without
				// a share, so "not shared" does not prove that the reference is broken.
				const cannotTell =
					credential.usageScope === 'instance' || credential.owner?.kind === 'personal';
				usableBy[consumer.id] = shared || (cannotTell ? 'unknown' : false);
			}
			sourceTargets[targetKey('credential', id)] = {
				exists: true,
				name: credential.name,
				credentialType: credential.type,
				...(credential.owner ? { project: credential.owner } : {}),
				usageScope: credential.usageScope,
				isEmpty: credential.isEmpty,
				canRead: readableCredentials.has(id),
				usableBy,
			};
		}

		const defaultPolicy = this.globalConfig.workflows.callerPolicyDefaultOption;
		for (const id of workflowIds) {
			const workflow = workflows.get(id);
			if (!workflow) {
				sourceTargets[targetKey('workflow', id)] = { exists: false, canRead: false, usableBy: {} };
				continue;
			}
			const usableBy: SourceTargetFact['usableBy'] = {};
			for (const { consumer } of consumersOf('workflow', id)) {
				usableBy[consumer.id] = callerPolicyVerdict({
					subworkflowSettings: workflow.settings,
					defaultPolicy,
					callerWorkflowId: consumer.id,
					callerProjectId: consumer.projectId,
					subworkflowProjectId: workflow.owner?.id,
				});
			}
			sourceTargets[targetKey('workflow', id)] = {
				exists: true,
				name: workflow.name,
				archived: workflow.isArchived,
				...(workflow.owner ? { project: workflow.owner } : {}),
				canRead: readableWorkflows.has(id),
				usableBy,
			};
		}

		// --- The credentials that the Promote writes. A credential comes with a selected
		// workflow of its own project that uses it, or the user included it. The exporter writes a
		// file only for a credential that the user can read.
		for (const item of selection) {
			const used = references
				.filter(
					({ consumer, target }) =>
						target.kind === 'credential' && consumer.projectId === item.projectId,
				)
				.map(({ target }) => target.id);
			for (const id of new Set([...used, ...(item.credentialIds ?? [])])) {
				const credential = credentials.get(id);
				if (
					credential?.usageScope === 'project' &&
					credential.owner?.id === item.projectId &&
					readableCredentials.has(id)
				) {
					plan.writtenCredentials[id] = item.projectId;
				}
			}
		}

		// --- Access.
		const ownerProjects: FactProject[] = [
			...[...credentials.values()].flatMap(({ owner }) => owner ?? []),
			...[...workflows.values()].flatMap(({ owner }) => owner ?? []),
		];
		const access = await this.lookup.accessFacts({
			user,
			input,
			direction: 'promote',
			projectIds: [
				...plan.projectOrder,
				...ownerProjects.map(({ id }) => id),
				...Object.values(branch.credentialFolders).flat(),
			],
			knownProjects: ownerProjects,
		});

		// A review exists only when the environment opens one for each Promote.
		const openReviews =
			args.openReviews ??
			(settings.createBranchOnPromotion
				? await this.openReviewFacts.gather(input.environmentId)
				: []);

		return {
			references,
			expressionReferences,
			sourceTargets,
			branch,
			plan,
			access: {
				...access,
				credentials: {},
				createCredentialProjectIds: [],
				canReadReviews: hasGlobalScope(user, 'promotions:readReviews'),
			},
			openReviews,
		};
	}

	private async workflowIdsOf(item: CheckSelection): Promise<string[]> {
		const ids = new Set(item.workflowIds ?? []);
		const folderIds = item.folderIds ?? [];
		if (folderIds.length > 0) {
			const below = await this.folderRepository.getAllFolderIdsInSubtrees(folderIds);
			const inFolders = await this.workflowRepository.findIdsInFolders([...folderIds, ...below]);
			for (const id of inFolders) ids.add(id);
		}
		return [...ids];
	}
}
