import type {
	WorkflowSuggestionBaseline,
	WorkflowSuggestionContent,
	WorkflowSuggestionGraph,
	WorkflowSuggestionProposalDetail,
} from '@n8n/api-types';
import { ModuleRegistry } from '@n8n/backend-common';
import { TransactionRunner, UserRepository } from '@n8n/db';
import type { OperationContext, User, WorkflowEntity } from '@n8n/db';
import { Service } from '@n8n/di';
import isEqual from 'lodash/isEqual';
import pick from 'lodash/pick';
import { calculateWorkflowChecksum, WORKFLOW_CHECKSUM_FIELDS } from 'n8n-workflow';
import { z } from 'zod';

import { ConflictError } from '@/errors/response-errors/conflict.error';
import { ForbiddenError } from '@/errors/response-errors/forbidden.error';
import { NotFoundError } from '@/errors/response-errors/not-found.error';
import { userHasScopes } from '@/permissions.ee/check-access';
import { WorkflowPublicationStatusService } from '@/workflows/publication/workflow-publication-status.service';

import { WorkflowSuggestionRepository } from './database/workflow-suggestion.repository';
import { WorkflowSuggestionCandidateService } from './workflow-suggestion-candidate.service';

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
		private readonly candidates: WorkflowSuggestionCandidateService,
		private readonly users: UserRepository,
		private readonly publication: WorkflowPublicationStatusService,
		private readonly txRunner: TransactionRunner,
		private readonly modules: ModuleRegistry,
	) {}

	private requireEnabled() {
		if (!this.modules.isActive('workflow-suggestions'))
			throw new NotFoundError('Workflow suggestions are not enabled.');
	}

	private async requireEditor(userId: string, workflowId: string) {
		const user = await this.users.findByIdWithRole(userId);
		if (
			!user ||
			user.disabled ||
			!(await userHasScopes(user, ['workflow:read', 'workflow:update'], false, { workflowId }))
		) {
			throw new ForbiddenError('Workflow edit access is required.');
		}
		return user;
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
		this.requireEnabled();
		await this.requireEditor(backgroundUserId, workflowId);
		return await this.txRunner.run({}, async (ctx) => {
			const { workflow, projectId } = await this.suggestions.readWorkflowTarget(workflowId, ctx);
			if (!workflow || !projectId || !(await this.isPublished(workflow, ctx))) {
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
		});
	}

	async prepareSuggestion(
		baseline: WorkflowSuggestionBaseline,
		input: {
			graph: WorkflowSuggestionGraph;
			explanation: string;
			errorContext?: WorkflowSuggestionContent['errorContext'];
		},
	): Promise<PreparedWorkflowSuggestion> {
		this.requireEnabled();
		const { explanation, errorContext } = suggestionInputSchema.parse(input);
		baseline = structuredClone(baseline);
		const { workflowId, projectId, backgroundUserId, expectedBaseline, original } = baseline;
		const user = await this.requireEditor(backgroundUserId, workflowId);
		if ((await calculateWorkflowChecksum(original)) !== expectedBaseline.checksum) {
			throw new ConflictError('The captured workflow baseline has changed.');
		}
		const graph = await this.candidates.prepare(user, workflowId, projectId, original, input.graph);
		if (isEqual(original.nodes, graph.nodes) && isEqual(original.connections, graph.connections)) {
			throw new ConflictError('The suggestion has no workflow changes.');
		}
		return {
			baseline,
			payload: {
				original,
				candidate: graph,
				explanation,
				validation: {
					requiredChecks: 'passed',
					configuration: { status: 'not_run' },
					execution: { status: 'not_run' },
				},
				errorContext,
			},
		};
	}

	// Prepare immediately before the caller opens its completion transaction.
	async createSuggestion(prepared: PreparedWorkflowSuggestion, ctx: OperationContext = {}) {
		this.requireEnabled();
		const { baseline, payload } = prepared;
		const { workflowId, projectId, expectedBaseline } = baseline;
		return await this.txRunner.run(ctx, async (ctx) => {
			const target = await this.suggestions.readWorkflowTarget(workflowId, ctx);
			if (
				!target.workflow ||
				target.projectId !== projectId ||
				target.workflow.versionId !== expectedBaseline.savedVersionId ||
				target.workflow.activeVersionId !== expectedBaseline.publishedVersionId ||
				(await calculateWorkflowChecksum(target.workflow)) !== expectedBaseline.checksum ||
				!(await this.isPublished(target.workflow, ctx))
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
		suggestionId: string,
	): Promise<WorkflowSuggestionProposalDetail> {
		this.requireEnabled();
		const suggestion = await this.suggestions.getSuggestion(suggestionId);
		if (suggestion.projectId !== projectId) throw new NotFoundError('Proposal not found.');
		await this.requireEditor(viewer.id, suggestion.workflowId);
		const current = await this.suggestions.readWorkflowTarget(suggestion.workflowId, {});
		if (!current.workflow || current.projectId !== projectId) {
			throw new NotFoundError('Proposal not found.');
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
