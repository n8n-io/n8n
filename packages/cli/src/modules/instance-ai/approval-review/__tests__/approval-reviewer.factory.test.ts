import type { Logger } from '@n8n/backend-common';
import type { User } from '@n8n/db';
import type { InstanceAiEventBus, PendingApproval } from '@n8n/instance-ai';
import { TELEMETRY_EVENT } from '@n8n/telemetry';
import { mock } from 'vitest-mock-extended';

const { judgeApproval } = vi.hoisted(() => ({ judgeApproval: vi.fn() }));
vi.mock('@n8n/instance-ai', async (importOriginal) => ({
	...(await importOriginal<typeof import('@n8n/instance-ai')>()),
	judgeApproval,
}));

import type { Telemetry } from '@/telemetry';

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
	const telemetry = mock<Telemetry>();
	const factory = new InstanceAiApprovalReviewerFactory(logger, creditService, telemetry);

	const eventBus = mock<InstanceAiEventBus>();
	const getMessages = vi.fn();
	const resolveJudgeModel = vi.fn(async () => 'anthropic/claude-haiku');

	function createReviewer(overrides: { reviewTimeoutMs?: number; abortSignal?: AbortSignal } = {}) {
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
			expect(getMessages).toHaveBeenCalledWith('thread-1', { limit: 30, resourceId: 'user-1' });
			expect(judgeApproval).toHaveBeenCalledWith(
				{ conversation: [{ role: 'user', text: 'Publish Lead router' }], approval },
				expect.objectContaining({ model: 'anthropic/claude-haiku' }),
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

			await createReviewer().judge(approval);

			expect(judgeApproval).toHaveBeenCalledWith(
				{ conversation: [{ role: 'user', text: 'Publish Lead router' }], approval },
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

		it('asks without calling a model when no judge model is available', async () => {
			resolveJudgeModel.mockResolvedValueOnce(undefined as never);

			await expect(createReviewer().judge(approval)).resolves.toMatchObject({
				decision: 'ask',
				failed: true,
			});
			expect(judgeApproval).not.toHaveBeenCalled();
		});

		it('asks when the thread does not load before the deadline', async () => {
			getMessages.mockReturnValue(new Promise(() => {}));

			await expect(createReviewer({ reviewTimeoutMs: 20 }).judge(approval)).resolves.toEqual({
				decision: 'ask',
				reason: 'The approval review timed out',
				failed: true,
			});
			expect(judgeApproval).not.toHaveBeenCalled();
		});

		it('asks when the judge model does not resolve before the deadline', async () => {
			resolveJudgeModel.mockReturnValueOnce(new Promise(() => {}));

			await expect(createReviewer({ reviewTimeoutMs: 20 }).judge(approval)).resolves.toMatchObject({
				decision: 'ask',
				failed: true,
			});
			expect(getMessages).not.toHaveBeenCalled();
		});

		it('passes one signal to the judge that also ends with the run', async () => {
			judgeApproval.mockResolvedValue({ ok: false, error: 'aborted', durationMs: 1 });
			const run = new AbortController();

			await createReviewer({ abortSignal: run.signal }).judge(approval);
			const [, options] = judgeApproval.mock.calls[0] as [unknown, { abortSignal: AbortSignal }];
			run.abort();

			expect(options.abortSignal.aborted).toBe(true);
		});

		it('asks when the judge fails', async () => {
			judgeApproval.mockResolvedValue({ ok: false, error: 'timeout', durationMs: 10_000 });

			await expect(createReviewer().judge(approval)).resolves.toMatchObject({
				decision: 'ask',
				failed: true,
			});
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
					tool_name: 'publish_workflow',
					is_mcp_tool: false,
					severity: 'warning',
					route: 'judge',
					decision: 'approve',
					decided_by: 'judge',
					judge_failed: false,
					judge_duration_ms: 420,
					judge_model: 'claude-haiku',
				},
			);
		});
	});
});
