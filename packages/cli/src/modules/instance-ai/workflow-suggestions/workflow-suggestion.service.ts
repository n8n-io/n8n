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

const suggestionInputSchema = z
	.object({
		graph: z.object({ nodes: z.array(z.unknown()), connections: z.record(z.unknown()) }).strict(),
		explanation: z.string().trim().min(1).max(20_000),
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
	) {}

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
		},
	): Promise<PreparedWorkflowSuggestion> {
		const { explanation, errorContext } = suggestionInputSchema.parse(input);
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
			const workflow = await this.workflowRepository.findByIdInContext(workflowId, ctx);
			const ownerProject = await this.sharedWorkflowRepository.getWorkflowOwningProject(
				workflowId,
				ctx,
			);
			if (
				!workflow ||
				ownerProject?.id !== projectId ||
				workflow.versionId !== expectedBaseline.savedVersionId ||
				workflow.activeVersionId !== expectedBaseline.publishedVersionId ||
				(await calculateWorkflowChecksum(workflow)) !== expectedBaseline.checksum ||
				!(await this.isPublished(workflow, ctx))
			) {
				throw new ConflictError('The workflow no longer matches the published baseline.');
			}
			const suggestion = await this.suggestions.createPending(baseline, payload, ctx);
			await this.suggestions.appendSubmittedActivity(suggestion.id, ctx);
			return suggestion;
		});
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
			author: 'assistant',
			payload: {
				...suggestion.payload,
				proposed: { ...suggestion.payload.original, ...suggestion.payload.candidate },
			},
			activity: activity.map(({ id, action, author, createdAt }) => ({
				id,
				action,
				author,
				createdAt: createdAt.toISOString(),
			})),
		};
	}
}
