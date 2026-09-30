import type {
	WorkflowSuggestionBaseline,
	WorkflowSuggestionContent,
	WorkflowSuggestionGraph,
	WorkflowSuggestionProposalDetail,
} from '@n8n/api-types';
import { TransactionRunner, UserRepository } from '@n8n/db';
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
import { WorkflowSuggestionPublicationService } from './workflow-suggestion-publication.service';

const suggestionInputSchema = z
	.object({
		graph: z.object({ nodes: z.array(z.unknown()), connections: z.record(z.unknown()) }).strict(),
		explanation: z.string().trim().min(1).max(20_000),
		resultKind: z.enum(['fix_ready', 'needs_you']).optional(),
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
	resultKind?: WorkflowSuggestion['resultKind'];
};

@Service()
export class WorkflowSuggestionService {
	constructor(
		private readonly suggestions: WorkflowSuggestionRepository,
		private readonly users: UserRepository,
		private readonly publication: WorkflowPublicationStatusService,
		private readonly txRunner: TransactionRunner,
		private readonly workflowFinder: WorkflowFinderService,
		private readonly suggestionPublication: WorkflowSuggestionPublicationService,
	) {}

	async requireEditor(userId: string, workflowId: string, ctx: OperationContext = {}) {
		const user = await this.suggestions.findEditor(userId, workflowId, ctx);
		if (!user) {
			throw new ForbiddenError('Workflow edit access is required.');
		}
		return user;
	}

	private async getWorkflowForEditor(userId: string, workflowId: string) {
		const user = await this.users.findByIdWithRole(userId);
		if (!user || user.disabled) {
			throw new ForbiddenError('Workflow edit access is required.');
		}
		const workflow = await this.workflowFinder.findWorkflowForUser(workflowId, user, [
			'workflow:read',
			'workflow:update',
		]);
		if (!workflow) throw new ForbiddenError('Workflow edit access is required.');
		return workflow;
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
		const workflow = await this.getWorkflowForEditor(backgroundUserId, workflowId);
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
				savedAt: workflow.updatedAt?.toISOString(),
				publicationId: await this.suggestions.getLatestPublicationId(workflowId),
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
			resultKind?: 'fix_ready' | 'needs_you';
		},
	): Promise<PreparedWorkflowSuggestion> {
		const { explanation, errorContext, resultKind } = suggestionInputSchema.parse(input);
		baseline = structuredClone(baseline);
		const { workflowId, backgroundUserId, expectedBaseline, original } = baseline;
		await this.getWorkflowForEditor(backgroundUserId, workflowId);
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

	// Prepare immediately before the caller opens its completion transaction.
	async createSuggestion(prepared: PreparedWorkflowSuggestion, ctx: OperationContext = {}) {
		const { baseline, payload } = prepared;
		const { workflowId, projectId, expectedBaseline } = baseline;
		return await this.txRunner.run(ctx, async (ctx) => {
			const target = await this.suggestions.readWorkflowTarget(workflowId, ctx);
			if (
				!target.workflow ||
				target.projectId !== projectId ||
				target.workflow.versionId !== expectedBaseline.savedVersionId ||
				target.workflow.activeVersionId !== expectedBaseline.publishedVersionId ||
				(expectedBaseline.publicationId !== undefined &&
					expectedBaseline.publicationId !== target.publicationId) ||
				(expectedBaseline.versionCounter !== undefined &&
					target.workflow.versionCounter !== expectedBaseline.versionCounter) ||
				(expectedBaseline.savedAt !== undefined &&
					target.workflow.updatedAt.toISOString() !== expectedBaseline.savedAt) ||
				(await calculateWorkflowChecksum(target.workflow)) !== expectedBaseline.checksum ||
				!(await this.isPublished(target.workflow, ctx))
			) {
				throw new ConflictError('The workflow no longer matches the published baseline.');
			}
			const previous = await this.suggestions.getPendingForWorkflow(workflowId, ctx);
			if (
				previous &&
				!(await this.matchesBaseline(
					previous,
					target.workflow,
					target.projectId,
					target.publicationId,
				))
			) {
				await this.suggestions.closePending(previous, 'outdated', null, ctx);
			}
			const suggestion = await this.suggestions.createPending(
				baseline,
				payload,
				ctx,
				prepared.resultKind ?? null,
			);
			await this.suggestions.appendSubmittedActivity(suggestion.id, ctx);
			return suggestion;
		});
	}

	async matchesBaseline(
		suggestion: WorkflowSuggestion,
		workflow: WorkflowEntity,
		projectId?: string,
		publicationId?: number | null,
	) {
		const baseline = suggestion.expectedBaseline;
		return (
			projectId === suggestion.projectId &&
			!workflow.isArchived &&
			workflow.versionId === baseline.savedVersionId &&
			workflow.activeVersionId === baseline.publishedVersionId &&
			(baseline.publicationId === undefined || baseline.publicationId === publicationId) &&
			(baseline.versionCounter === undefined ||
				workflow.versionCounter === baseline.versionCounter) &&
			(baseline.savedAt === undefined || workflow.updatedAt.toISOString() === baseline.savedAt) &&
			(await calculateWorkflowChecksum(workflow)) === baseline.checksum
		);
	}

	async reconcilePending(
		suggestionId: string,
		scope: { workflowId: string; projectId: string },
		ctx: OperationContext = {},
	) {
		return await this.txRunner.run(ctx, async (ctx) => {
			const target = await this.suggestions.readWorkflowTarget(scope.workflowId, ctx);
			let suggestion = await this.suggestions.getSuggestion(suggestionId, scope, ctx);
			if (
				suggestion.state === 'pending' &&
				(!target.workflow ||
					!(await this.matchesBaseline(
						suggestion,
						target.workflow,
						target.projectId,
						target.publicationId,
					)))
			) {
				await this.suggestions.closePending(suggestion, 'outdated', null, ctx);
				suggestion = await this.suggestions.getSuggestion(suggestionId, scope, ctx);
			}
			return { suggestion, target };
		});
	}

	async reconcileWorkflow(workflowId: string) {
		const pending = await this.suggestions.getPendingForWorkflow(workflowId);
		if (pending)
			await this.reconcilePending(pending.id, { workflowId, projectId: pending.projectId });
	}

	async getProposal(
		viewer: User,
		projectId: string,
		workflowId: string,
		suggestionId: string,
	): Promise<WorkflowSuggestionProposalDetail> {
		const workflow = await this.getWorkflowForEditor(viewer.id, workflowId);
		if (workflow.shared.find(({ role }) => role === 'workflow:owner')?.projectId !== projectId) {
			throw new NotFoundError('Proposal not found.');
		}
		const { suggestion, target: current } = await this.reconcilePending(suggestionId, {
			workflowId,
			projectId,
		});
		if (!current.workflow || current.projectId !== projectId) {
			throw new NotFoundError('Proposal not found.');
		}
		if (suggestion.appliedVersion && suggestion.publication?.status !== 'published') {
			const observed = await this.suggestionPublication.reconcile(
				workflowId,
				suggestion.appliedVersion,
			);
			suggestion.publication = await this.txRunner.run(
				{},
				async (ctx) => await this.suggestions.recordPublication(suggestion.id, observed, null, ctx),
			);
		}
		const activity = await this.suggestions.getActivity(suggestionId);
		return {
			suggestionId,
			workflowId: suggestion.workflowId,
			projectId,
			backgroundUserId: suggestion.backgroundUserId,
			expectedBaseline: suggestion.expectedBaseline,
			state: suggestion.state,
			closedReason: suggestion.closedReason,
			resultKind: suggestion.resultKind ?? null,
			appliedVersion: suggestion.appliedVersion ?? null,
			publication: suggestion.publication ?? null,
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
