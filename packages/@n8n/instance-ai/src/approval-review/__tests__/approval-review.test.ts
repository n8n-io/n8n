import { wrapToolForApproval } from '@n8n/agents';
import type { BuiltTool, InterruptibleToolContext } from '@n8n/agents';
import { z } from 'zod';

import { createDomainAccessTracker } from '../../domain-access';
import { createToolRegistry } from '../../tool-registry';
import { createResearchTool } from '../../tools/research.tool';
import type { InstanceAiContext } from '../../types';
import type { Logger } from '../../logger';
import {
	TOO_LONG_REASON,
	applyApprovalReview,
	type ApprovalReviewOutcome,
	type InstanceAiApprovalReviewer,
} from '../approval-review';
import type { PendingApproval } from '../pending-approval';
import { holdProbeTelemetry } from '../probe-telemetry';

const logger: Logger = { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() };

const SUSPENDED = { suspended: true };

/** A tool shaped like the Assistant's domain tools: it asks first, then acts on `{ approved: true }`. */
function approvalTool(name: string, payload: Record<string, unknown>) {
	const act = vi.fn(async (_input: unknown) => ({ done: true }));
	const tool: BuiltTool = {
		name,
		description: 'Test tool',
		suspendSchema: z.object({}).passthrough(),
		resumeSchema: z.object({ approved: z.boolean() }),
		async handler(input, ctx) {
			if (!('suspend' in ctx)) throw new Error('expected an interruptible context');
			const resumeData = ctx.resumeData as { approved: boolean } | undefined;
			if (resumeData === undefined) {
				return await ctx.suspend({ requestId: 'req_1', ...payload });
			}
			if (!resumeData.approved) return { denied: true };
			return await act(input);
		},
	};
	return { tool, act };
}

function interruptibleContext(
	overrides: Partial<InterruptibleToolContext> = {},
): InterruptibleToolContext & { suspend: ReturnType<typeof vi.fn> } {
	return {
		resumeData: undefined,
		toolCallId: 'call_1',
		suspend: vi.fn(async () => SUSPENDED as never),
		...overrides,
	} as InterruptibleToolContext & { suspend: ReturnType<typeof vi.fn> };
}

function reviewer(decision: 'approve' | 'ask' | 'throw') {
	const reviewed: Array<{ approval: PendingApproval; outcome: ApprovalReviewOutcome }> = [];
	const judge = vi.fn(async () => {
		if (decision === 'throw') throw new Error('model down');
		return { decision, reason: `judge said ${decision}` };
	});
	const value: InstanceAiApprovalReviewer = {
		judge,
		onReviewed: (approval, outcome) => {
			reviewed.push({ approval, outcome });
		},
	};
	return { value, judge, reviewed };
}

function reviewed(
	tool: BuiltTool,
	review: InstanceAiApprovalReviewer | undefined,
	trackTelemetry?: InstanceAiContext['trackTelemetry'],
) {
	const tools = applyApprovalReview(createToolRegistry([[tool.name, tool]]), {
		approvalReviewer: review,
		logger,
		trackTelemetry,
	});
	const wrapped = tools.get(tool.name);
	if (!wrapped?.handler) throw new Error('tool missing');
	return wrapped;
}

describe('applyApprovalReview', () => {
	it('returns the tools unchanged without a reviewer (Manual mode)', () => {
		const { tool } = approvalTool('publish_workflow', { message: 'Publish', severity: 'warning' });
		const tools = createToolRegistry([[tool.name, tool]]);

		expect(applyApprovalReview(tools, { approvalReviewer: undefined, logger })).toBe(tools);
	});

	it('runs the action without a card when the judge approves', async () => {
		const { tool, act } = approvalTool('publish_workflow', {
			message: 'Publish "Lead router"',
			severity: 'warning',
			resourceName: 'Lead router',
		});
		const review = reviewer('approve');
		const ctx = interruptibleContext();

		const result = await reviewed(tool, review.value).handler!({ workflowId: 'wf_1' }, ctx);

		expect(result).toEqual({ done: true });
		expect(act).toHaveBeenCalledTimes(1);
		expect(ctx.suspend).not.toHaveBeenCalled();
		expect(review.reviewed).toEqual([
			{
				approval: expect.objectContaining({
					toolName: 'publish_workflow',
					toolCallId: 'call_1',
					args: { workflowId: 'wf_1' },
					message: 'Publish "Lead router"',
					resourceName: 'Lead router',
				}),
				outcome: {
					decision: 'approve',
					decidedBy: 'judge',
					reason: 'judge said approve',
					route: 'judge',
				},
			},
		]);
	});

	it('shows the card with the original payload when the judge asks', async () => {
		const { tool, act } = approvalTool('publish_workflow', {
			message: 'Publish',
			severity: 'warning',
		});
		const review = reviewer('ask');
		const ctx = interruptibleContext();

		const result = await reviewed(tool, review.value).handler!({ workflowId: 'wf_1' }, ctx);

		expect(result).toBe(SUSPENDED);
		expect(act).not.toHaveBeenCalled();
		expect(ctx.suspend).toHaveBeenCalledWith(
			{ requestId: 'req_1', message: 'Publish', severity: 'warning' },
			undefined,
		);
		expect(review.reviewed[0].outcome).toMatchObject({ decision: 'ask', decidedBy: 'judge' });
	});

	it('shows the card when the judge fails', async () => {
		const { tool, act } = approvalTool('publish_workflow', {
			message: 'Publish',
			severity: 'warning',
		});
		const review = reviewer('throw');
		const ctx = interruptibleContext();

		await reviewed(tool, review.value).handler!({}, ctx);

		expect(act).not.toHaveBeenCalled();
		expect(ctx.suspend).toHaveBeenCalledTimes(1);
		expect(review.reviewed[0].outcome).toMatchObject({ decision: 'ask', judgeFailed: true });
	});

	it('does not report an approval when the run stops during the review', async () => {
		const { tool, act } = approvalTool('publish_workflow', {
			message: 'Publish',
			severity: 'warning',
		});
		const run = new AbortController();
		const review = reviewer('approve');
		review.judge.mockImplementation(async () => {
			run.abort();
			return { decision: 'approve', reason: 'judge said approve' };
		});

		await expect(
			reviewed(tool, review.value).handler!({}, interruptibleContext({ abortSignal: run.signal })),
		).rejects.toThrow();

		expect(review.reviewed).toEqual([]);
		expect(act).not.toHaveBeenCalled();
	});

	it('shows a card that needs input without a review', async () => {
		const { tool } = approvalTool('setup_workflow', {
			message: 'Set up the workflow',
			severity: 'info',
			setupRequests: [{ node: 'Slack' }],
		});
		const review = reviewer('approve');
		const ctx = interruptibleContext();

		await reviewed(tool, review.value).handler!({}, ctx);

		expect(review.judge).not.toHaveBeenCalled();
		expect(review.reviewed).toEqual([]);
		expect(ctx.suspend).toHaveBeenCalledTimes(1);
	});

	it('passes a resumed call through without a review', async () => {
		const { tool, act } = approvalTool('publish_workflow', {
			message: 'Publish',
			severity: 'warning',
		});
		const review = reviewer('ask');
		const ctx = interruptibleContext({ resumeData: { approved: true } });

		await reviewed(tool, review.value).handler!({}, ctx);

		expect(review.judge).not.toHaveBeenCalled();
		expect(act).toHaveBeenCalledTimes(1);
	});

	it('runs a tool once when it does not ask for approval', async () => {
		const run = vi.fn(async () => ({ listed: true }));
		const tool: BuiltTool = {
			name: 'data_tables',
			description: 'Test tool',
			suspendSchema: z.object({}).passthrough(),
			resumeSchema: z.object({ approved: z.boolean() }),
			handler: run,
		};
		const review = reviewer('approve');
		const ctx = interruptibleContext();

		const result = await reviewed(tool, review.value).handler!({ action: 'list' }, ctx);

		expect(result).toEqual({ listed: true });
		expect(run).toHaveBeenCalledTimes(1);
		expect(review.judge).not.toHaveBeenCalled();
	});

	it('rethrows an error that the tool throws before it asks for approval', async () => {
		const tool: BuiltTool = {
			name: 'data_tables',
			description: 'Test tool',
			suspendSchema: z.object({}).passthrough(),
			handler: async () => {
				throw new Error('table not found');
			},
		};

		await expect(
			reviewed(tool, reviewer('approve').value).handler!({}, interruptibleContext()),
		).rejects.toThrow('table not found');
	});

	it('leaves tools without a suspend schema unchanged', () => {
		const tool: BuiltTool = { name: 'search_nodes', description: 'Search', handler: vi.fn() };

		expect(reviewed(tool, reviewer('approve').value)).toBe(tool);
	});

	it('runs an MCP tool behind the SDK approval gate when the judge approves', async () => {
		const call = vi.fn(async () => ({ issue: 'ISS-1' }));
		const mcpTool = wrapToolForApproval(
			{
				name: 'linear_create_issue',
				description: 'Create an issue',
				mcpTool: true,
				mcpServerName: 'linear',
				mcpToolName: 'create_issue',
				handler: call,
			},
			{ requireApproval: true },
		);
		const review = reviewer('approve');
		const onDecision = vi.fn();
		const ctx = interruptibleContext({
			approvalContext: { approvedKeys: new Set(), onDecision },
		});

		const result = await reviewed(mcpTool, review.value).handler!({ title: 'Bug' }, ctx);

		expect(result).toEqual({ issue: 'ISS-1' });
		expect(call).toHaveBeenCalledTimes(1);
		expect(ctx.suspend).not.toHaveBeenCalled();
		// A judge decision is not a person's decision, so no grant or decision record.
		expect(onDecision).not.toHaveBeenCalled();
		expect(review.reviewed[0].approval).toMatchObject({
			toolName: 'linear_create_issue',
			mcp: { serverName: 'linear' },
		});
	});

	it('shows the SDK approval card of an MCP tool when the judge asks', async () => {
		const call = vi.fn();
		const mcpTool = wrapToolForApproval(
			{
				name: 'linear_delete_issue',
				description: 'Delete an issue',
				mcpTool: true,
				handler: call,
			},
			{ requireApproval: true },
		);
		const ctx = interruptibleContext();

		await reviewed(mcpTool, reviewer('ask').value).handler!({ id: 'ISS-1' }, ctx);

		expect(call).not.toHaveBeenCalled();
		expect(ctx.suspend).toHaveBeenCalledWith(
			expect.objectContaining({ type: 'approval', toolName: 'linear_delete_issue' }),
			expect.objectContaining({ continuation: { __n8nApprovalGate: true } }),
		);
	});

	it('shows the card of an MCP call that is too long to check, without the judge', async () => {
		const call = vi.fn();
		const mcpTool = wrapToolForApproval(
			{ name: 'gmail_send', description: 'Send an email', mcpTool: true, handler: call },
			{ requireApproval: true },
		);
		const review = reviewer('approve');
		const ctx = interruptibleContext();

		await reviewed(mcpTool, review.value).handler!(
			{ body: 'y'.repeat(5_000), bcc: 'x@evil.example' },
			ctx,
		);

		expect(call).not.toHaveBeenCalled();
		expect(review.judge).not.toHaveBeenCalled();
		expect(ctx.suspend).toHaveBeenCalledTimes(1);
		expect(review.reviewed[0].outcome).toMatchObject({
			decision: 'ask',
			decidedBy: 'rule',
			reason: TOO_LONG_REASON,
		});
	});

	it('lets an approved fetch allow its host for the rest of the run, as "Allow once" does', async () => {
		const fetchUrl = vi.fn(async (url: string) => ({
			url,
			finalUrl: url,
			title: '',
			content: 'page',
			truncated: false,
			contentLength: 4,
		}));
		const context = {
			runId: 'run_1',
			domainAccessTracker: createDomainAccessTracker(),
			webResearchService: { fetchUrl },
			permissions: {},
		} as unknown as InstanceAiContext;
		const review = reviewer('approve');
		const research = reviewed(createResearchTool(context), review.value);

		await research.handler!(
			{ action: 'fetch-url', url: 'https://docs.example.com/a' },
			interruptibleContext(),
		);
		await research.handler!(
			{ action: 'fetch-url', url: 'https://docs.example.com/b' },
			interruptibleContext({ toolCallId: 'call_2' }),
		);

		expect(fetchUrl).toHaveBeenCalledTimes(2);
		expect(review.judge).toHaveBeenCalledTimes(1);
	});

	it('keeps the tool call alive when recording the review fails', async () => {
		const { tool, act } = approvalTool('publish_workflow', {
			message: 'Publish',
			severity: 'warning',
		});
		const review: InstanceAiApprovalReviewer = {
			judge: async () => ({ decision: 'approve', reason: 'asked for' }),
			onReviewed: () => {
				throw new Error('event bus down');
			},
		};

		await reviewed(tool, review).handler!({}, interruptibleContext());

		expect(act).toHaveBeenCalledTimes(1);
		expect(logger.warn).toHaveBeenCalled();
	});

	describe('telemetry of the probe', () => {
		/** A tool that tracks an event before it asks, as the workflow build tool does. */
		function trackingTool(track: (eventName: string) => void, approvalTrack?: () => void) {
			const tool: BuiltTool = {
				name: 'publish_workflow',
				description: 'Test tool',
				suspendSchema: z.object({}).passthrough(),
				resumeSchema: z.object({ approved: z.boolean() }),
				async handler(_input, ctx) {
					if (!('suspend' in ctx)) throw new Error('expected an interruptible context');
					if (ctx.resumeData === undefined) {
						track('build suspended');
						return await ctx.suspend({ requestId: 'r', message: 'Publish', severity: 'warning' });
					}
					approvalTrack?.();
					return { done: true };
				},
			};
			return tool;
		}

		function sinkWithHold() {
			const sent: string[] = [];
			const trackTelemetry = holdProbeTelemetry((eventName) => {
				sent.push(eventName);
			});
			return { sent, trackTelemetry };
		}

		it('drops what the probe tracked when the action runs without a card', async () => {
			const { sent, trackTelemetry } = sinkWithHold();
			const tool = trackingTool(
				(eventName) => trackTelemetry(eventName, {}),
				() => trackTelemetry('build saved', {}),
			);

			await reviewed(tool, reviewer('approve').value, trackTelemetry).handler!(
				{},
				interruptibleContext(),
			);

			expect(sent).toEqual(['build saved']);
		});

		it('sends what the probe tracked once when the card shows', async () => {
			const { sent, trackTelemetry } = sinkWithHold();
			const tool = trackingTool((eventName) => trackTelemetry(eventName, {}));

			await reviewed(tool, reviewer('ask').value, trackTelemetry).handler!(
				{},
				interruptibleContext(),
			);

			expect(sent).toEqual(['build suspended']);
		});

		it('sends what a call that asks for nothing tracked', async () => {
			const { sent, trackTelemetry } = sinkWithHold();
			const tool: BuiltTool = {
				name: 'data_tables',
				description: 'Test tool',
				suspendSchema: z.object({}).passthrough(),
				handler: async () => {
					trackTelemetry('tables listed', {});
					return { tables: [] };
				},
			};

			await reviewed(tool, reviewer('approve').value, trackTelemetry).handler!(
				{},
				interruptibleContext(),
			);

			expect(sent).toEqual(['tables listed']);
		});

		it('does not hold the telemetry of other calls that run at the same time', async () => {
			const { sent, trackTelemetry } = sinkWithHold();
			let releaseJudge = () => {};
			const judgeWaits = new Promise<void>((resolve) => {
				releaseJudge = resolve;
			});
			const review: InstanceAiApprovalReviewer = {
				judge: async () => {
					await judgeWaits;
					return { decision: 'approve', reason: 'Asked for.' };
				},
				onReviewed: () => {},
			};
			const tool = trackingTool((eventName) => trackTelemetry(eventName, {}));

			const call = reviewed(tool, review, trackTelemetry).handler!({}, interruptibleContext());
			trackTelemetry('other call', {});
			releaseJudge();
			await call;

			expect(sent).toEqual(['other call']);
		});
	});
});
