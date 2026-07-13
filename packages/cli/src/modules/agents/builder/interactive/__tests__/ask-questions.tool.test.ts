import type { InterruptibleToolContext } from '@n8n/agents';
import type { Mock } from 'vitest';

import { buildAskQuestionsTool } from '../ask-questions.tool';

interface TestCtx {
	resumeData?: unknown;
	suspend: Mock;
}

function makeCtx(overrides?: { resumeData?: unknown }): TestCtx {
	return {
		resumeData: overrides?.resumeData,
		suspend: vi.fn(async (x: unknown) => x),
	};
}

describe('ask_questions tool', () => {
	const tool = buildAskQuestionsTool();

	it('auto-resolves a single single-select question with exactly one option', async () => {
		const ctx = makeCtx();
		const result = await tool.handler!(
			{ questions: [{ question: 'Pick one', type: 'single', options: ['slack'] }] },
			ctx as unknown as InterruptibleToolContext,
		);

		expect(ctx.suspend).not.toHaveBeenCalled();
		expect(result).toEqual({
			answered: true,
			answers: [{ questionId: 'q1', selectedOptions: ['slack'], question: 'Pick one' }],
		});
	});

	it('suspends a multi-select question with one option', async () => {
		const ctx = makeCtx();
		await tool.handler!(
			{ questions: [{ question: 'Pick subagents', type: 'multi', options: ['agent-research'] }] },
			ctx as unknown as InterruptibleToolContext,
		);

		expect(ctx.suspend).toHaveBeenCalledTimes(1);
	});

	it('suspends with all questions batched into a single inputType: questions card', async () => {
		const ctx = makeCtx();

		await tool.handler!(
			{
				questions: [
					{ question: 'Which region?', type: 'single', options: ['us', 'eu'] },
					{ question: 'Any notes?', type: 'text' },
				],
			},
			ctx as unknown as InterruptibleToolContext,
		);

		expect(ctx.suspend).toHaveBeenCalledTimes(1);
		const payload = ctx.suspend.mock.calls[0][0] as Record<string, unknown>;
		expect(payload).toEqual(
			expect.objectContaining({
				requestId: expect.any(String),
				message: 'The agent builder has questions',
				severity: 'info',
				inputType: 'questions',
				questions: [
					{ id: 'q1', question: 'Which region?', type: 'single', options: ['us', 'eu'] },
					{ id: 'q2', question: 'Any notes?', type: 'text' },
				],
			}),
		);
	});

	it('defaults missing question ids to q1..qN while preserving explicit ids', async () => {
		const ctx = makeCtx();

		await tool.handler!(
			{
				questions: [
					{ id: 'custom-id', question: 'First?', type: 'text' },
					{ question: 'Second?', type: 'text' },
				],
			},
			ctx as unknown as InterruptibleToolContext,
		);

		const payload = ctx.suspend.mock.calls[0][0] as { questions: Array<{ id: string }> };
		expect(payload.questions.map((q) => q.id)).toEqual(['custom-id', 'q2']);
	});

	it('skips a default id already claimed by an explicit id, keeping ids unique', async () => {
		const ctx = makeCtx();

		await tool.handler!(
			{
				questions: [
					{ question: 'First?', type: 'text' },
					{ id: 'q2', question: 'Second?', type: 'text' },
					{ question: 'Third?', type: 'text' },
				],
			},
			ctx as unknown as InterruptibleToolContext,
		);

		const payload = ctx.suspend.mock.calls[0][0] as { questions: Array<{ id: string }> };
		const ids = payload.questions.map((q) => q.id);
		expect(ids).toEqual(['q1', 'q2', 'q3']);
		expect(new Set(ids).size).toBe(ids.length);
	});

	it('rejects duplicate explicit question ids', async () => {
		const ctx = makeCtx();

		await expect(
			tool.handler!(
				{
					questions: [
						{ id: 'dup', question: 'First?', type: 'text' },
						{ id: 'dup', question: 'Second?', type: 'text' },
					],
				},
				ctx as unknown as InterruptibleToolContext,
			),
		).rejects.toThrow('question ids must be unique');
	});

	it('uses introMessage as the suspend message and passes it through when provided', async () => {
		const ctx = makeCtx();

		await tool.handler!(
			{
				questions: [{ question: 'Which region?', type: 'single', options: ['us', 'eu'] }],
				introMessage: 'A couple of quick questions',
			},
			ctx as unknown as InterruptibleToolContext,
		);

		const payload = ctx.suspend.mock.calls[0][0] as Record<string, unknown>;
		expect(payload.message).toBe('A couple of quick questions');
		expect(payload.introMessage).toBe('A couple of quick questions');
	});

	it('generates a fresh requestId on every suspend call', async () => {
		const ctx1 = makeCtx();
		const ctx2 = makeCtx();

		await tool.handler!(
			{ questions: [{ question: 'Q', type: 'text' }] },
			ctx1 as unknown as InterruptibleToolContext,
		);
		await tool.handler!(
			{ questions: [{ question: 'Q', type: 'text' }] },
			ctx2 as unknown as InterruptibleToolContext,
		);

		const requestId1 = (ctx1.suspend.mock.calls[0][0] as Record<string, unknown>).requestId;
		const requestId2 = (ctx2.suspend.mock.calls[0][0] as Record<string, unknown>).requestId;
		expect(requestId1).not.toBe(requestId2);
	});

	it('returns answered: false when the resume is a dismissal', async () => {
		const ctx = makeCtx({ resumeData: { approved: false } });

		const result = await tool.handler!(
			{ questions: [{ question: 'Which region?', type: 'text' }] },
			ctx as unknown as InterruptibleToolContext,
		);

		expect(result).toEqual({ answered: false });
	});

	it('returns answered: false when resume has no answers', async () => {
		const ctx = makeCtx({ resumeData: { approved: true } });

		const result = await tool.handler!(
			{ questions: [{ question: 'Which region?', type: 'text' }] },
			ctx as unknown as InterruptibleToolContext,
		);

		expect(result).toEqual({ answered: false });
	});

	it('returns answered: false when every answer is explicitly skipped', async () => {
		const ctx = makeCtx({
			resumeData: { answers: [{ questionId: 'q1', selectedOptions: [], skipped: true }] },
		});

		const result = await tool.handler!(
			{ questions: [{ question: 'Which region?', type: 'text' }] },
			ctx as unknown as InterruptibleToolContext,
		);

		expect(result).toEqual({ answered: false });
	});

	it('returns answered: true with question text merged into each answer on resume', async () => {
		const ctx = makeCtx({
			resumeData: {
				answers: [
					{ questionId: 'q1', selectedOptions: ['us'] },
					{ questionId: 'q2', selectedOptions: [], customText: 'no notes' },
				],
			},
		});

		const result = await tool.handler!(
			{
				questions: [
					{ question: 'Which region?', type: 'single', options: ['us', 'eu'] },
					{ question: 'Any notes?', type: 'text' },
				],
			},
			ctx as unknown as InterruptibleToolContext,
		);

		expect(result).toEqual({
			answered: true,
			answers: [
				{ questionId: 'q1', selectedOptions: ['us'], question: 'Which region?' },
				{
					questionId: 'q2',
					selectedOptions: [],
					customText: 'no notes',
					question: 'Any notes?',
				},
			],
		});
	});
});
