import type {
	WorkflowSuggestionContent,
	WorkflowSuggestionGraph,
	WorkflowSuggestionProposalDetail,
	WorkflowSuggestionSource,
} from '@n8n/api-types';
import { ModuleRegistry } from '@n8n/backend-common';
import { TransactionRunner, UserRepository } from '@n8n/db';
import type { OperationContext, User, WorkflowEntity } from '@n8n/db';
import { Service } from '@n8n/di';
import pick from 'lodash/pick';
import { calculateWorkflowChecksum, WORKFLOW_CHECKSUM_FIELDS } from 'n8n-workflow';
import { z } from 'zod';

import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { ConflictError } from '@/errors/response-errors/conflict.error';
import { ForbiddenError } from '@/errors/response-errors/forbidden.error';
import { NotFoundError } from '@/errors/response-errors/not-found.error';
import { userHasScopes } from '@/permissions.ee/check-access';
import { WorkflowPublicationStatusService } from '@/workflows/publication/workflow-publication-status.service';

import { WorkflowSuggestionRepository } from './database/workflow-suggestion.repository';
import { WorkflowSuggestionCandidateService } from './workflow-suggestion-candidate.service';
import {
	assertSameSource,
	suggestionSourceSchema,
	lifecycleResult,
	preparingContent,
	requireSubmittable,
} from './workflow-suggestion.contracts';

const reviseSchema = z
	.object({
		suggestionId: z.string().min(1),
		expectedRevision: z.number().int().positive(),
		graph: z.object({ nodes: z.array(z.unknown()), connections: z.record(z.unknown()) }).strict(),
		explanation: z.string().trim().min(1).max(20_000),
	})
	.strict();
const errorContextSchema = z
	.object({
		summary: z.string().max(4000),
		evidenceReference: z.string().max(255).nullable(),
	})
	.strict()
	.nullable();

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

	private async baselineMatches(
		source: WorkflowSuggestionSource,
		workflow: WorkflowEntity | null,
		ctx: OperationContext,
	) {
		const expected = source.expectedBaseline;
		if (
			!workflow ||
			workflow.isArchived ||
			workflow.versionId !== expected.savedVersionId ||
			workflow.activeVersionId !== expected.publishedVersionId ||
			workflow.versionId !== workflow.activeVersionId
		)
			return false;
		if ((await calculateWorkflowChecksum(workflow)) !== expected.checksum) return false;
		const status = await this.publication.getStatus(workflow.id, ctx);
		return status.status === 'published' && status.liveVersionId === expected.publishedVersionId;
	}

	async createSuggestion(
		source: WorkflowSuggestionSource,
		errorContext: WorkflowSuggestionContent['errorContext'] = null,
	) {
		this.requireEnabled();
		source = suggestionSourceSchema.parse(source);
		errorContext = errorContextSchema.parse(errorContext);
		await this.requireEditor(source.backgroundUserId, source.workflowId);
		const existing = await this.suggestions.findBySourceKey(source.sourceKey);
		if (existing) {
			assertSameSource(existing, source);
			return existing;
		}

		const baseline = await this.txRunner.run({}, async (ctx) => {
			const target = await this.suggestions.readWorkflowTarget(source.workflowId, ctx);
			if (
				!target.workflow ||
				!target.projectId ||
				!(await this.baselineMatches(source, target.workflow, ctx))
			) {
				throw new ConflictError('The workflow no longer matches the published baseline.');
			}
			return {
				projectId: target.projectId,
				snapshot: structuredClone(pick(target.workflow, WORKFLOW_CHECKSUM_FIELDS)),
			};
		});
		return await this.suggestions.createOnce(source, baseline.projectId, {
			original: baseline.snapshot,
			candidate: structuredClone({
				nodes: baseline.snapshot.nodes,
				connections: baseline.snapshot.connections,
			}),
			explanation: '',
			validation: null,
			errorContext,
		});
	}

	async readSuggestion(source: WorkflowSuggestionSource, suggestionId: string) {
		this.requireEnabled();
		suggestionSourceSchema.parse(source);
		await this.requireEditor(source.backgroundUserId, source.workflowId);
		const suggestion = await this.suggestions.getSuggestion(suggestionId);
		assertSameSource(suggestion, source);
		return suggestion;
	}

	async reviseSuggestion(
		source: WorkflowSuggestionSource,
		input: {
			suggestionId: string;
			expectedRevision: number;
			graph: WorkflowSuggestionGraph;
			explanation: string;
		},
	) {
		reviseSchema.parse(input);
		const suggestion = await this.readSuggestion(source, input.suggestionId);
		const content = preparingContent(suggestion, input.expectedRevision);
		const user = await this.requireEditor(source.backgroundUserId, source.workflowId);
		const graph = await this.candidates.prepare(
			user,
			suggestion.workflowId,
			suggestion.projectId,
			content.original,
			input.graph,
		);
		return await this.suggestions.reviseIfCurrent(suggestion.id, input.expectedRevision, {
			...content,
			candidate: graph,
			explanation: input.explanation,
			validation: {
				revision: input.expectedRevision + 1,
				requiredChecks: 'passed',
				configuration: { status: 'not_run' },
				execution: { status: 'not_run' },
			},
		});
	}

	async submitSuggestion(source: WorkflowSuggestionSource, suggestionId: string, revision: number) {
		z.number().int().positive().parse(revision);
		const checked = await this.readSuggestion(source, suggestionId);
		if (checked.state === 'preparing') {
			const content = requireSubmittable(checked, revision);
			const user = await this.requireEditor(source.backgroundUserId, source.workflowId);
			await this.candidates.assertStillAllowed(
				user,
				checked.workflowId,
				checked.projectId,
				content.original,
				content.candidate,
			);
		}
		return await this.txRunner.run({}, async (ctx) => {
			const { suggestion, workflow, projectId } = await this.suggestions.loadForSubmission(
				suggestionId,
				source.workflowId,
				ctx,
			);
			assertSameSource(suggestion, source);
			if (suggestion.state !== 'preparing') return lifecycleResult(suggestion);
			requireSubmittable(suggestion, revision);
			if (
				projectId !== suggestion.projectId ||
				!(await this.baselineMatches(source, workflow, ctx))
			) {
				return lifecycleResult(await this.suggestions.closeAsOutdated(suggestion.id, ctx));
			}
			const proposal = await this.suggestions.markPendingIfCurrent(suggestion.id, revision, ctx);
			await this.suggestions.appendSubmittedActivity(proposal.id, revision, ctx);
			return lifecycleResult(proposal);
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
		if (
			!current.workflow ||
			current.projectId !== projectId ||
			suggestion.submittedRevision === null
		) {
			throw new NotFoundError('Proposal not found.');
		}
		const activity = await this.suggestions.getActivity(suggestionId);
		return {
			...lifecycleResult(suggestion),
			projectId,
			revision: suggestion.revision,
			author: 'assistant',
			payload: suggestion.payload
				? {
						...suggestion.payload,
						proposed: { ...suggestion.payload.original, ...suggestion.payload.candidate },
					}
				: null,
			activity: activity.map(({ id, action, author, revision, createdAt }) => ({
				id,
				action,
				author,
				revision,
				createdAt: createdAt.toISOString(),
			})),
		};
	}

	// Trusted backend consumers can recover the receipt after background access is lost.
	async getLifecycleResult(source: WorkflowSuggestionSource) {
		this.requireEnabled();
		const parsed = suggestionSourceSchema.safeParse(source);
		if (!parsed.success) throw new BadRequestError('Invalid suggestion source.');
		const suggestion = await this.suggestions.findBySourceKey(source.sourceKey);
		if (!suggestion) return null;
		assertSameSource(suggestion, source);
		return lifecycleResult(suggestion);
	}
}
