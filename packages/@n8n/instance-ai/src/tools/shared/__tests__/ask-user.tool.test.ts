import { executeTool } from '../../../__tests__/tool-test-utils';
import type { InstanceAiContext } from '../../../types';
import { createAskUserTool } from '../ask-user.tool';

const QUESTION = {
	id: 'q1',
	question: 'How should we set up the OpenAI credential?',
	type: 'single' as const,
	options: ['automatic', 'manual'],
};

function createContext(): InstanceAiContext {
	return {
		userId: 'user-1',
		threadId: undefined,
		threadMemory: undefined,
		logger: { debug: vi.fn(), warn: vi.fn() },
	} as unknown as InstanceAiContext;
}

describe('createAskUserTool', () => {
	it('suspends on the first call without recording decisions', async () => {
		const context = createContext();
		const suspend = vi.fn().mockResolvedValue({ suspended: true });
		const tool = createAskUserTool(context);

		await executeTool(tool, { questions: [QUESTION] }, { resumeData: undefined, suspend });

		expect(suspend).toHaveBeenCalled();
		expect(context.resolvedUserDecisions).toBeUndefined();
	});

	it('records selected answers on resume', async () => {
		const context = createContext();
		const tool = createAskUserTool(context);

		const result = await executeTool(
			tool,
			{ questions: [QUESTION] },
			{
				resumeData: {
					approved: true,
					answers: [{ questionId: 'q1', selectedOptions: ['automatic'] }],
				},
			},
		);

		expect(result).toMatchObject({ answered: true });
		expect(context.resolvedUserDecisions).toEqual([
			{
				question: 'How should we set up the OpenAI credential?',
				answer: 'automatic',
				skipped: false,
			},
		]);
	});

	it('records each input question as skipped when the user dismisses', async () => {
		const context = createContext();
		const tool = createAskUserTool(context);

		const result = await executeTool(
			tool,
			{
				questions: [
					QUESTION,
					{ id: 'q2', question: 'Which model?', type: 'single', options: ['GPT-5'] },
				],
			},
			{ resumeData: { approved: false } },
		);

		expect(result).toEqual({ answered: false });
		expect(context.resolvedUserDecisions).toEqual([
			{
				question: 'How should we set up the OpenAI credential?',
				answer: '(skipped)',
				skipped: true,
			},
			{ question: 'Which model?', answer: '(skipped)', skipped: true },
		]);
	});

	it('records a skipped row when an answer is marked skipped', async () => {
		const context = createContext();
		const tool = createAskUserTool(context);

		await executeTool(
			tool,
			{ questions: [QUESTION] },
			{
				resumeData: {
					approved: true,
					answers: [{ questionId: 'q1', selectedOptions: [], skipped: true }],
				},
			},
		);

		expect(context.resolvedUserDecisions).toEqual([
			{
				question: 'How should we set up the OpenAI credential?',
				answer: '(skipped)',
				skipped: true,
			},
		]);
	});

	it('does not throw on resume when created without a context', async () => {
		const tool = createAskUserTool();

		await expect(
			executeTool(
				tool,
				{ questions: [QUESTION] },
				{
					resumeData: {
						approved: true,
						answers: [{ questionId: 'q1', selectedOptions: ['automatic'] }],
					},
				},
			),
		).resolves.toMatchObject({ answered: true });
	});
});
