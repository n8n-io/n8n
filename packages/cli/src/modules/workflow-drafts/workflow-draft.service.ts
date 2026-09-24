import type {
	WorkflowDraftContent,
	WorkflowDraftGraph,
	WorkflowDraftProposalDetail,
	WorkflowDraftSource,
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

import { WorkflowDraftRepository } from './database/workflow-draft.repository';
import { WorkflowDraftCandidateService } from './workflow-draft-candidate.service';
import {
	assertSameSource,
	draftSourceSchema,
	lifecycleResult,
	preparingContent,
	requireSubmittable,
} from './workflow-draft.contracts';

const reviseSchema = z
	.object({
		draftId: z.string().min(1),
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
export class WorkflowDraftService {
	constructor(
		private readonly drafts: WorkflowDraftRepository,
		private readonly candidates: WorkflowDraftCandidateService,
		private readonly users: UserRepository,
		private readonly publication: WorkflowPublicationStatusService,
		private readonly txRunner: TransactionRunner,
		private readonly modules: ModuleRegistry,
	) {}

	private requireEnabled() {
		if (!this.modules.isActive('workflow-drafts'))
			throw new NotFoundError('Workflow drafts are not enabled.');
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
		source: WorkflowDraftSource,
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

	async createDraft(
		source: WorkflowDraftSource,
		errorContext: WorkflowDraftContent['errorContext'] = null,
	) {
		this.requireEnabled();
		source = draftSourceSchema.parse(source);
		errorContext = errorContextSchema.parse(errorContext);
		await this.requireEditor(source.backgroundUserId, source.workflowId);
		const existing = await this.drafts.findBySourceKey(source.sourceKey);
		if (existing) {
			assertSameSource(existing, source);
			return existing;
		}

		const baseline = await this.txRunner.run({}, async (ctx) => {
			const target = await this.drafts.readWorkflowTarget(source.workflowId, ctx);
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
		return await this.drafts.createOnce(source, baseline.projectId, {
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

	async readDraft(source: WorkflowDraftSource, draftId: string) {
		this.requireEnabled();
		draftSourceSchema.parse(source);
		await this.requireEditor(source.backgroundUserId, source.workflowId);
		const draft = await this.drafts.getDraft(draftId);
		assertSameSource(draft, source);
		return draft;
	}

	async reviseDraft(
		source: WorkflowDraftSource,
		input: {
			draftId: string;
			expectedRevision: number;
			graph: WorkflowDraftGraph;
			explanation: string;
		},
	) {
		reviseSchema.parse(input);
		const draft = await this.readDraft(source, input.draftId);
		const content = preparingContent(draft, input.expectedRevision);
		const user = await this.requireEditor(source.backgroundUserId, source.workflowId);
		const graph = await this.candidates.prepare(
			user,
			draft.workflowId,
			draft.projectId,
			content.original,
			input.graph,
		);
		return await this.drafts.reviseIfCurrent(draft.id, input.expectedRevision, {
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

	async submitDraft(source: WorkflowDraftSource, draftId: string, revision: number) {
		z.number().int().positive().parse(revision);
		const checked = await this.readDraft(source, draftId);
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
			const { draft, workflow, projectId } = await this.drafts.loadForSubmission(
				draftId,
				source.workflowId,
				ctx,
			);
			assertSameSource(draft, source);
			if (draft.state !== 'preparing') return lifecycleResult(draft);
			requireSubmittable(draft, revision);
			if (projectId !== draft.projectId || !(await this.baselineMatches(source, workflow, ctx))) {
				return lifecycleResult(await this.drafts.closeAsOutdated(draft.id, ctx));
			}
			const proposal = await this.drafts.markPendingIfCurrent(draft.id, revision, ctx);
			await this.drafts.appendSubmittedActivity(proposal.id, revision, ctx);
			return lifecycleResult(proposal);
		});
	}

	async getProposal(
		viewer: User,
		projectId: string,
		draftId: string,
	): Promise<WorkflowDraftProposalDetail> {
		this.requireEnabled();
		const draft = await this.drafts.getDraft(draftId);
		if (draft.projectId !== projectId) throw new NotFoundError('Proposal not found.');
		await this.requireEditor(viewer.id, draft.workflowId);
		const current = await this.drafts.readWorkflowTarget(draft.workflowId, {});
		if (!current.workflow || current.projectId !== projectId || draft.submittedRevision === null) {
			throw new NotFoundError('Proposal not found.');
		}
		const activity = await this.drafts.getActivity(draftId);
		return {
			...lifecycleResult(draft),
			projectId,
			revision: draft.revision,
			author: 'assistant',
			payload: draft.payload
				? { ...draft.payload, proposed: { ...draft.payload.original, ...draft.payload.candidate } }
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
	async getLifecycleResult(source: WorkflowDraftSource) {
		this.requireEnabled();
		const parsed = draftSourceSchema.safeParse(source);
		if (!parsed.success) throw new BadRequestError('Invalid draft source.');
		const draft = await this.drafts.findBySourceKey(source.sourceKey);
		if (!draft) return null;
		assertSameSource(draft, source);
		return lifecycleResult(draft);
	}
}
