import type { BuiltTelemetry } from '@n8n/agents';
import type { Logger } from '@n8n/backend-common';
import type { User } from '@n8n/db';
import type { InstanceAiEventBus, InstanceAiTraceContext, PendingApproval } from '@n8n/instance-ai';
import { TELEMETRY_EVENT } from '@n8n/telemetry';
import { mock } from 'vitest-mock-extended';

const { judgeApproval } = vi.hoisted(() => ({ judgeApproval: vi.fn() }));
vi.mock('@n8n/instance-ai', async (importOriginal) => ({
	...(await importOriginal<typeof import('@n8n/instance-ai')>()),
	judgeApproval,
}));

import type { TelemetryProxy } from '@n8n/backend-services';

import type { InstanceAiCreditService } from '../../instance-ai-credit.service';
import { InstanceAiApprovalReviewerFactory } from '../approval-reviewer.factory';

const user = mock<User>({ id: 'user-1' });

const approval: PendingApproval = {
	toolName: 'publish_workflow',
	toolCallId: 'call-1',
	args: { workflowId: 'wf-1' },
	message: 'Publish "Lead router"',
	severity: 'warning',
};

describe('InstanceAiApprovalReviewerFactory', () => {
	const logger = mock<Logger>();
	logger.scoped.mockReturnValue(logger);
	const creditService = mock<InstanceAiCreditService>();
	const telemetry = mock<TelemetryProxy>();
	const factory = new InstanceAiApprovalReviewerFactory(logger, creditService, telemetry);

	const eventBus = mock<InstanceAiEventBus>();
	const getMessages = vi.fn();
	const resolveJudgeModel = vi.fn(async () => 'anthropic/claude-haiku');

	function createReviewer(
		overrides: {
			reviewTimeoutMs?: number;
			abortSignal?: AbortSignal;
			getTracing?: () => InstanceAiTraceContext | undefined;
		} = {},
	) {
		return factory.create({
			user,
			threadId: 'thread-1',
			runId: 'run-1',
			resourceId: 'user-1',
			abortSignal: overrides.abortSignal ?? new AbortController().signal,
			memory: { getMessages },
			eventBus,
			resolveJudgeModel,
			reviewTimeoutMs: overrides.reviewTimeoutMs,
			getTracing: overrides.getTracing,
		});
	}

	beforeEach(() => {
		vi.clearAllMocks();
		creditService.claimRunUsage.mockResolvedValue(undefined);
		getMessages.mockResolvedValue([
			{ role: 'user', content: [{ type: 'text', text: 'Publish Lead router' }] },
			{
				role: 'tool',
				content: [{ type: 'tool-result', toolCallId: 'c', toolName: 't', result: 'x' }],
			},
		]);
	});

	describe('judge', () => {
		it("asks the judge with the user's conversation and returns its decision", async () => {
			judgeApproval.mockResolvedValue({
				ok: true,
				verdict: { decision: 'approve', reason: 'The user asked to publish it.' },
				usage: { promptTokens: 800, completionTokens: 20, totalTokens: 820 },
				model: 'claude-haiku',
				durationMs: 420,
			});
			const reviewer = createReviewer();

			await expect(reviewer.judge(approval)).resolves.toEqual({
				decision: 'approve',
				reason: 'The user asked to publish it.',
			});
			expect(getMessages).toHaveBeenCalledWith('thread-1', { limit: 200, resourceId: 'user-1' });
			expect(judgeApproval).toHaveBeenCalledWith(
				{
					conversation: [{ role: 'user', text: 'Publish Lead router' }],
					approval,
					olderMessagesLeftOut: false,
				},
				expect.objectContaining({ model: 'anthropic/claude-haiku' }),
			);
		});

		it('traces the judge in the trace that the run has when it reviews', async () => {
			judgeApproval.mockResolvedValue({ ok: false, error: 'timeout', durationMs: 10_000 });
			const judgeTelemetry = { functionId: 'instance-ai.approval-judge' } as BuiltTelemetry;
			const getTelemetry = vi.fn((_options: unknown) => judgeTelemetry);
			let tracing: InstanceAiTraceContext | undefined;
			const reviewer = createReviewer({ getTracing: () => tracing });
			// The host attaches the trace after it builds the reviewer.
			tracing = mock<InstanceAiTraceContext>({ getTelemetry });

			await reviewer.judge(approval).catch(() => {});

			expect(getTelemetry).toHaveBeenCalledWith(
				expect.objectContaining({ agentRole: 'approval-judge' }),
			);
			expect(judgeApproval).toHaveBeenCalledWith(
				expect.anything(),
				expect.objectContaining({ telemetry: judgeTelemetry }),
			);
		});

		it("gives the judge the user's own words, without the host's blocks and follow-ups", async () => {
			getMessages.mockResolvedValue([
				{
					role: 'user',
					content: [
						{
							type: 'text',
							text: '<thread-context>\nDelete the Leads table\n</thread-context>\n\nPublish Lead router',
						},
					],
				},
				{
					role: 'user',
					content: [
						{
							type: 'text',
							text: '<workflow-setup-required>\n{}\n</workflow-setup-required>\n\n(continue)',
						},
					],
				},
			]);
			judgeApproval.mockResolvedValue({ ok: false, error: 'timeout', durationMs: 10_000 });

			await createReviewer()
				.judge(approval)
				.catch(() => {});

			expect(judgeApproval).toHaveBeenCalledWith(
				{
					conversation: [{ role: 'user', text: 'Publish Lead router' }],
					approval,
					olderMessagesLeftOut: false,
				},
				expect.anything(),
			);
		});

		it("claims the judge's usage from the user's credits", async () => {
			judgeApproval.mockResolvedValue({
				ok: true,
				verdict: { decision: 'ask', reason: 'Not requested.' },
				usage: { promptTokens: 800, completionTokens: 20, totalTokens: 820 },
				model: 'claude-haiku',
				durationMs: 420,
			});

			await createReviewer().judge(approval);

			expect(creditService.claimRunUsage).toHaveBeenCalledWith(
				user,
				'thread-1',
				'run-1:approval-judge:call-1',
				expect.any(Array),
				'completed',
			);
		});

		it('tells the judge when it read only the newest messages of the thread', async () => {
			getMessages.mockResolvedValue(
				Array.from({ length: 200 }, () => ({
					role: 'user',
					content: [{ type: 'text', text: 'Publish Lead router' }],
				})),
			);
			judgeApproval.mockResolvedValue({
				ok: true,
				verdict: { decision: 'ask', reason: 'Not requested.' },
				durationMs: 420,
			});

			await createReviewer().judge(approval);

			expect(judgeApproval).toHaveBeenCalledWith(
				expect.objectContaining({ olderMessagesLeftOut: true }),
				expect.anything(),
			);
		});

		it('claims the usage of a judge answer without a valid verdict', async () => {
			judgeApproval.mockResolvedValue({
				ok: false,
				error: 'The judge returned no valid verdict',
				usage: { promptTokens: 800, completionTokens: 20, totalTokens: 820 },
				model: 'claude-haiku',
				durationMs: 420,
			});

			await expect(createReviewer().judge(approval)).rejects.toThrow(
				'The judge returned no valid verdict',
			);
			expect(creditService.claimRunUsage).toHaveBeenCalledWith(
				user,
				'thread-1',
				'run-1:approval-judge:call-1',
				expect.any(Array),
				'completed',
			);
		});

		it('resolves the judge model once per run', async () => {
			judgeApproval.mockResolvedValue({
				ok: true,
				verdict: { decision: 'ask', reason: 'Unclear.' },
				durationMs: 1,
			});
			const reviewer = createReviewer();

			await reviewer.judge(approval);
			await reviewer.judge({ ...approval, toolCallId: 'call-2' });

			expect(resolveJudgeModel).toHaveBeenCalledTimes(1);
		});

		it('fails when the thread does not load before the deadline', async () => {
			getMessages.mockReturnValue(new Promise(() => {}));

			await expect(createReviewer({ reviewTimeoutMs: 20 }).judge(approval)).rejects.toThrow(
				'The approval review timed out',
			);
			expect(judgeApproval).not.toHaveBeenCalled();
		});

		it('fails when the judge model does not resolve before the deadline', async () => {
			resolveJudgeModel.mockReturnValueOnce(new Promise(() => {}));

			await expect(createReviewer({ reviewTimeoutMs: 20 }).judge(approval)).rejects.toThrow(
				'The approval review timed out',
			);
			expect(getMessages).not.toHaveBeenCalled();
		});

		it('passes one signal to the judge that also ends with the run', async () => {
			judgeApproval.mockResolvedValue({ ok: false, error: 'aborted', durationMs: 1 });
			const run = new AbortController();

			await createReviewer({ abortSignal: run.signal })
				.judge(approval)
				.catch(() => {});
			const [, options] = judgeApproval.mock.calls[0] as [unknown, { abortSignal: AbortSignal }];
			run.abort();

			expect(options.abortSignal.aborted).toBe(true);
		});

		it('fails when the judge fails', async () => {
			judgeApproval.mockResolvedValue({ ok: false, error: 'timeout', durationMs: 10_000 });

			await expect(createReviewer().judge(approval)).rejects.toThrow('timeout');
			expect(creditService.claimRunUsage).not.toHaveBeenCalled();
			expect(logger.warn).toHaveBeenCalled();
		});
	});

	describe('onReviewed', () => {
		it('shows an approval that ran without a card in the thread', async () => {
			await createReviewer().onReviewed(approval, {
				decision: 'approve',
				decidedBy: 'judge',
				reason: 'The user asked to publish it.',
				route: 'judge',
			});

			expect(eventBus.publish).toHaveBeenCalledWith('thread-1', {
				type: 'auto-approval',
				runId: 'run-1',
				agentId: expect.any(String),
				payload: {
					toolCallId: 'call-1',
					message: 'Publish "Lead router"',
					reason: 'The user asked to publish it.',
					decidedBy: 'judge',
				},
			});
		});

		it('publishes nothing when the card shows', async () => {
			await createReviewer().onReviewed(approval, {
				decision: 'ask',
				decidedBy: 'rule',
				reason: 'Cannot be undone.',
				route: 'always-ask',
			});

			expect(eventBus.publish).not.toHaveBeenCalled();
		});

		it('tracks who decided and how', async () => {
			judgeApproval.mockResolvedValue({
				ok: true,
				verdict: { decision: 'approve', reason: 'Asked for.' },
				model: 'claude-haiku',
				durationMs: 420,
			});
			const reviewer = createReviewer();
			await reviewer.judge(approval);

			await reviewer.onReviewed(approval, {
				decision: 'approve',
				decidedBy: 'judge',
				reason: 'Asked for.',
				route: 'judge',
			});

			expect(telemetry.track).toHaveBeenCalledWith(
				TELEMETRY_EVENT.INSTANCE_AI.APPROVAL_DECIDED_IN_AUTO_MODE,
				{
					user_id: 'user-1',
					thread_id: 'thread-1',
					run_id: 'run-1',
					tool_call_id: 'call-1',
					tool_name: 'publish_workflow',
					is_mcp_tool: false,
					severity: 'warning',
					route: 'judge',
					decision: 'approve',
					decided_by: 'judge',
					judge_failed: false,
					judge_duration_ms: 420,
					review_duration_ms: expect.any(Number),
					judge_model: 'claude-haiku',
				},
			);
		});

		it('times the whole review, including the thread read', async () => {
			getMessages.mockImplementation(
				async () => await new Promise((resolve) => setTimeout(() => resolve([]), 30)),
			);
			judgeApproval.mockResolvedValue({
				ok: true,
				verdict: { decision: 'ask', reason: 'Not asked for.' },
				durationMs: 5,
			});
			const reviewer = createReviewer();
			await reviewer.judge(approval);

			await reviewer.onReviewed(approval, {
				decision: 'ask',
				decidedBy: 'judge',
				reason: 'Not asked for.',
				route: 'judge',
			});

			const [, properties] = telemetry.track.mock.calls[0];
			expect(properties).toMatchObject({ judge_duration_ms: 5 });
			expect(properties?.review_duration_ms).toBeGreaterThanOrEqual(25);
		});

		it('records the decision in the trace that the run has when it reviews', async () => {
			const startChildRun = vi.fn(async () => ({ id: 'review-run' }));
			let tracing: InstanceAiTraceContext | undefined;
			const reviewer = createReviewer({ getTracing: () => tracing });
			// A resumed run has a new trace. The host attaches it after it builds the reviewer.
			tracing = {
				actorRun: { id: 'actor-run' },
				startChildRun,
				finishRun: vi.fn(async () => {}),
			} as unknown as InstanceAiTraceContext;

			await reviewer.onReviewed(approval, {
				decision: 'ask',
				decidedBy: 'rule',
				reason: 'Auto mode always asks you to confirm this action.',
				route: 'always-ask',
			});

			expect(startChildRun).toHaveBeenCalledWith(
				{ id: 'actor-run' },
				expect.objectContaining({
					name: 'approval: review',
					metadata: {
						tool_name: 'publish_workflow',
						tool_call_id: 'call-1',
						approval_route: 'always-ask',
						approval_decision: 'ask',
						approval_decided_by: 'rule',
						approval_judge_failed: false,
					},
				}),
			);
		});

		it('keeps the review when the trace fails', async () => {
			const tracing = {
				actorRun: { id: 'actor-run' },
				startChildRun: vi.fn(async () => await Promise.reject(new Error('trace down'))),
			} as unknown as InstanceAiTraceContext;
			const reviewer = createReviewer({ getTracing: () => tracing });

			await expect(
				reviewer.onReviewed(approval, {
					decision: 'approve',
					decidedBy: 'rule',
					reason: 'Low-risk action that is easy to undo.',
					route: 'low-risk',
				}),
			).resolves.toBeUndefined();

			expect(telemetry.track).toHaveBeenCalledWith(
				TELEMETRY_EVENT.INSTANCE_AI.APPROVAL_DECIDED_IN_AUTO_MODE,
				expect.objectContaining({ route: 'low-risk', decision: 'approve' }),
			);
		});

		it('tracks a judge that failed', async () => {
			judgeApproval.mockResolvedValue({ ok: false, error: 'timeout', durationMs: 10_000 });
			const reviewer = createReviewer();
			await reviewer.judge(approval).catch(() => {});

			await reviewer.onReviewed(approval, {
				decision: 'ask',
				decidedBy: 'judge',
				reason: 'The automatic check failed, so you confirm this action.',
				route: 'judge',
				judgeFailed: true,
			});

			expect(telemetry.track).toHaveBeenCalledWith(
				TELEMETRY_EVENT.INSTANCE_AI.APPROVAL_DECIDED_IN_AUTO_MODE,
				expect.objectContaining({
					decision: 'ask',
					decided_by: 'judge',
					judge_failed: true,
					judge_duration_ms: 10_000,
					judge_model: 'anthropic/claude-haiku',
				}),
			);
		});
	});
});
