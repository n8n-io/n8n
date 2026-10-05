import type {
	WorkflowSuggestionBaseline,
	WorkflowSuggestionContent,
	WorkflowSuggestionGraph,
	WorkflowSuggestionProposalDetail,
} from '@n8n/api-types';
import {
	SharedWorkflowRepository,
	TransactionRunner,
	UserRepository,
	WorkflowRepository,
	WorkflowPublishHistoryRepository,
} from '@n8n/db';
import type { OperationContext, User, WorkflowEntity } from '@n8n/db';
import { Service } from '@n8n/di';
import { ConflictError, ForbiddenError, NotFoundError } from '@n8n/errors';
import isEqual from 'lodash/isEqual';
import pick from 'lodash/pick';
import { calculateWorkflowChecksum, WORKFLOW_CHECKSUM_FIELDS } from 'n8n-workflow';
import { z } from 'zod';

import { validateWorkflowStructure } from '@/workflow-helpers';
import { WorkflowPublicationStatusService } from '@/workflows/publication/workflow-publication-status.service';
import { WorkflowFinderService } from '@/workflows/workflow-finder.service';

import { WorkflowSuggestionRepository } from './database/workflow-suggestion.repository';
import type { WorkflowSuggestion } from './database/workflow-suggestion.entity';

const suggestionInputSchema = z
	.object({
		graph: z.object({ nodes: z.array(z.unknown()), connections: z.record(z.unknown()) }).strict(),
		explanation: z.string().trim().min(1).max(20_000),
		resultKind: z.enum(['fix_ready', 'needs_you']),
		errorContext: z
			.object({
				summary: z.string().max(4000),
				evidenceReference: z.string().max(255).nullable(),
			})
			.strict()
			.nullable()
			.default(null),
	})
	.strict();

export type PreparedWorkflowSuggestion = {
	baseline: WorkflowSuggestionBaseline;
	payload: WorkflowSuggestionContent;
	resultKind: WorkflowSuggestion['resultKind'];
};

type WorkflowSuggestionTarget = {
	workflow: WorkflowEntity | null;
	projectId: string | undefined;
	latestPublishHistoryEventId: number | null;
};

@Service()
export class WorkflowSuggestionService {
	constructor(
		private readonly suggestions: WorkflowSuggestionRepository,
		private readonly users: UserRepository,
		private readonly publication: WorkflowPublicationStatusService,
		private readonly txRunner: TransactionRunner,
		private readonly workflowFinder: WorkflowFinderService,
		private readonly workflowRepository: WorkflowRepository,
		private readonly sharedWorkflowRepository: SharedWorkflowRepository,
		private readonly workflowPublishHistoryRepository: WorkflowPublishHistoryRepository,
	) {}

	async requireEditor(userId: string, workflowId: string, ctx: OperationContext = {}) {
		const { user } = await this.getEditorContext(userId, workflowId, ctx);
		return user;
	}

	private async getEditorContext(userId: string, workflowId: string, ctx: OperationContext = {}) {
		const user = await this.users.findByIdWithRole(userId, ctx);
		if (!user || user.disabled) {
			throw new ForbiddenError('Workflow edit access is required.');
		}
		const workflow = await this.workflowFinder.findWorkflowForUser(
			workflowId,
			user,
			['workflow:read', 'workflow:update'],
			{ ctx },
		);
		if (!workflow) throw new ForbiddenError('Workflow edit access is required.');
		return { user, workflow };
	}

	private async isPublished(workflow: WorkflowEntity, ctx: OperationContext) {
		if (
			workflow.isArchived ||
			!workflow.activeVersionId ||
			workflow.versionId !== workflow.activeVersionId
		)
			return false;
		const status = await this.publication.getStatus(workflow.id, ctx);
		return status.status === 'published' && status.liveVersionId === workflow.activeVersionId;
	}

	async captureBaseline(
		workflowId: string,
		backgroundUserId: string,
	): Promise<WorkflowSuggestionBaseline> {
		const { workflow } = await this.getEditorContext(backgroundUserId, workflowId);
		const projectId = workflow.shared.find(({ role }) => role === 'workflow:owner')?.projectId;
		if (!projectId || !(await this.isPublished(workflow, {}))) {
			throw new ConflictError('The workflow must be fully published without saved changes.');
		}
		return {
			workflowId,
			projectId,
			backgroundUserId,
			expectedBaseline: {
				savedVersionId: workflow.versionId,
				publishedVersionId: workflow.versionId,
				checksum: await calculateWorkflowChecksum(workflow),
				versionCounter: workflow.versionCounter,
				savedAt: workflow.updatedAt.toISOString(),
				latestPublishHistoryEventId:
					await this.workflowPublishHistoryRepository.getLatestPublishHistoryEventId(workflowId),
			},
			original: structuredClone(pick(workflow, WORKFLOW_CHECKSUM_FIELDS)),
		};
	}

	async prepareSuggestion(
		baseline: WorkflowSuggestionBaseline,
		input: {
			graph: WorkflowSuggestionGraph;
			explanation: string;
			errorContext?: WorkflowSuggestionContent['errorContext'];
			resultKind: 'fix_ready' | 'needs_you';
		},
	): Promise<PreparedWorkflowSuggestion> {
		const { explanation, errorContext, resultKind } = suggestionInputSchema.parse(input);
		baseline = structuredClone(baseline);
		const { workflowId, backgroundUserId, expectedBaseline, original } = baseline;
		await this.requireEditor(backgroundUserId, workflowId);
		if ((await calculateWorkflowChecksum(original)) !== expectedBaseline.checksum) {
			throw new ConflictError('The captured workflow baseline has changed.');
		}
		validateWorkflowStructure(input.graph);
		const graph = structuredClone(input.graph);
		if (isEqual(original.nodes, graph.nodes) && isEqual(original.connections, graph.connections)) {
			throw new ConflictError('The suggestion has no workflow changes.');
		}
		return {
			baseline,
			resultKind,
			payload: {
				original,
				candidate: graph,
				explanation,
				errorContext,
			},
		};
	}

	private async readWorkflowTarget(
		workflowId: string,
		ctx: OperationContext,
	): Promise<WorkflowSuggestionTarget> {
		const workflow = await this.workflowRepository.findByIdInContext(workflowId, ctx);
		const ownerProject = await this.sharedWorkflowRepository.getWorkflowOwningProject(
			workflowId,
			ctx,
		);
		const latestPublishHistoryEventId =
			await this.workflowPublishHistoryRepository.getLatestPublishHistoryEventId(workflowId, ctx);
		return { workflow, projectId: ownerProject?.id, latestPublishHistoryEventId };
	}

	async readWorkflowTargetForApply(
		workflowId: string,
		ctx: OperationContext,
	): Promise<WorkflowSuggestionTarget> {
		const workflow = await this.workflowRepository.findForContentUpdate(workflowId, ctx);
		const ownerProject = await this.sharedWorkflowRepository.getWorkflowOwningProject(
			workflowId,
			ctx,
		);
		const latestPublishHistoryEventId =
			await this.workflowPublishHistoryRepository.getLatestPublishHistoryEventId(workflowId, ctx);
		return { workflow, projectId: ownerProject?.id, latestPublishHistoryEventId };
	}

	// Prepare immediately before the caller opens its completion transaction.
	async createSuggestion(prepared: PreparedWorkflowSuggestion, ctx: OperationContext = {}) {
		const { baseline, payload } = prepared;
		const { workflowId } = baseline;
		return await this.txRunner.run(ctx, async (ctx) => {
			const target = await this.readWorkflowTarget(workflowId, ctx);
			if (
				!target.workflow ||
				!(await this.matchesBaseline(baseline, target)) ||
				!(await this.isPublished(target.workflow, ctx))
			) {
				throw new ConflictError('The workflow no longer matches the published baseline.');
			}
			const previous = await this.suggestions.getPendingForWorkflow(workflowId, ctx);
			if (previous) await this.closeIfOutdated(previous, target, ctx);
			const suggestion = await this.suggestions.createPending(
				baseline,
				payload,
				ctx,
				prepared.resultKind,
			);
			await this.suggestions.appendSubmittedActivity(suggestion.id, ctx);
			return suggestion;
		});
	}

	async matchesBaseline(
		baseline: Pick<WorkflowSuggestionBaseline, 'projectId' | 'expectedBaseline'>,
		{ workflow, projectId, latestPublishHistoryEventId }: WorkflowSuggestionTarget,
	) {
		const expected = baseline.expectedBaseline;
		return (
			!!workflow &&
			projectId === baseline.projectId &&
			!workflow.isArchived &&
			workflow.versionId === expected.savedVersionId &&
			workflow.activeVersionId === expected.publishedVersionId &&
			expected.latestPublishHistoryEventId === latestPublishHistoryEventId &&
			workflow.versionCounter === expected.versionCounter &&
			workflow.updatedAt.toISOString() === expected.savedAt &&
			(await calculateWorkflowChecksum(workflow)) === expected.checksum
		);
	}

	async reconcilePending(
		suggestionId: string,
		scope: { workflowId: string; projectId: string },
		ctx: OperationContext = {},
	) {
		return await this.txRunner.run(ctx, async (ctx) => {
			const target = await this.readWorkflowTarget(scope.workflowId, ctx);
			const suggestion = await this.suggestions.getSuggestion(suggestionId, scope, ctx);
			return { suggestion: await this.closeIfOutdated(suggestion, target, ctx), target };
		});
	}

	private async closeIfOutdated(
		suggestion: WorkflowSuggestion,
		target: WorkflowSuggestionTarget,
		ctx: OperationContext,
	) {
		if (suggestion.state !== 'pending' || (await this.matchesBaseline(suggestion, target))) {
			return suggestion;
		}
		await this.suggestions.closePending(
			suggestion,
			'outdated',
			{ author: 'system', actorId: null },
			ctx,
		);
		return await this.suggestions.getSuggestion(suggestion.id, suggestion, ctx);
	}

	async reconcileWorkflow(workflowId: string) {
		const pending = await this.suggestions.getPendingForWorkflow(workflowId);
		if (pending)
			await this.reconcilePending(pending.id, { workflowId, projectId: pending.projectId });
	}

	private async requireProposalAccess(viewer: User, projectId: string, workflowId: string) {
		const { workflow } = await this.getEditorContext(viewer.id, workflowId);
		if (workflow.shared.find(({ role }) => role === 'workflow:owner')?.projectId !== projectId) {
			throw new NotFoundError('Proposal not found.');
		}
	}

	async refreshProposal(
		viewer: User,
		projectId: string,
		workflowId: string,
		suggestionId: string,
	): Promise<WorkflowSuggestionProposalDetail> {
		await this.requireProposalAccess(viewer, projectId, workflowId);
		await this.reconcilePending(suggestionId, { workflowId, projectId });
		return await this.getProposal(viewer, projectId, workflowId, suggestionId);
	}

	async getProposal(
		viewer: User,
		projectId: string,
		workflowId: string,
		suggestionId: string,
	): Promise<WorkflowSuggestionProposalDetail> {
		await this.requireProposalAccess(viewer, projectId, workflowId);
		const suggestion = await this.suggestions.getSuggestion(suggestionId, {
			workflowId,
			projectId,
		});
		const activity = await this.suggestions.getActivity(suggestionId);
		return {
			suggestionId,
			workflowId: suggestion.workflowId,
			projectId,
			backgroundUserId: suggestion.backgroundUserId,
			expectedBaseline: suggestion.expectedBaseline,
			state: suggestion.state,
			closedReason: suggestion.closedReason,
			resultKind: suggestion.resultKind,
			appliedVersion: suggestion.appliedVersion ?? null,
			author: 'assistant',
			payload: {
				...suggestion.payload,
				proposed: { ...suggestion.payload.original, ...suggestion.payload.candidate },
			},
			activity: activity.map(({ id, action, author, actorId, createdAt }) => ({
				id,
				action,
				author,
				actorId: actorId ?? null,
				createdAt: createdAt.toISOString(),
			})),
		};
	}
}
