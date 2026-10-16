import { executeTool } from '../../../__tests__/tool-test-utils';
import { createAskUserTool } from '../ask-user.tool';

const QUESTION = {
	id: 'q1',
	question: 'How should we set up the OpenAI credential?',
	type: 'single' as const,
	options: ['automatic', 'manual'],
};

describe('createAskUserTool', () => {
	it('suspends on the first call', async () => {
		const suspend = vi.fn().mockResolvedValue({ suspended: true });
		const tool = createAskUserTool();

		await executeTool(tool, { questions: [QUESTION] }, { resumeData: undefined, suspend });

		expect(suspend).toHaveBeenCalled();
	});

	it('returns the answers with their question text on resume', async () => {
		const tool = createAskUserTool();

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

		expect(result).toEqual({
			answered: true,
			answers: [
				{
					questionId: 'q1',
					question: 'How should we set up the OpenAI credential?',
					selectedOptions: ['automatic'],
				},
			],
		});
	});

	it('returns answered false when the user dismisses', async () => {
		const tool = createAskUserTool();

		const result = await executeTool(
			tool,
			{ questions: [QUESTION] },
			{ resumeData: { approved: false } },
		);

		expect(result).toEqual({ answered: false });
	});

	describe('onEvent', () => {
		it('reports the question count and sorted unique types before it suspends', async () => {
			const onEvent = vi.fn();
			const suspend = vi.fn().mockResolvedValue({ suspended: true });
			const tool = createAskUserTool({ onEvent });

			await executeTool(
				tool,
				{
					questions: [
						QUESTION,
						{ id: 'q2', question: 'Anything else?', type: 'text' as const },
						{ ...QUESTION, id: 'q3' },
					],
				},
				{ resumeData: undefined, suspend },
			);

			expect(onEvent).toHaveBeenCalledWith({
				type: 'asked',
				questionCount: 3,
				questionTypes: ['single', 'text'],
			});
		});

		it.each([
			{
				name: 'answered',
				resumeData: {
					approved: true,
					answers: [
						{ questionId: 'q1', selectedOptions: ['automatic'] },
						{ questionId: 'q2', selectedOptions: [], skipped: true },
					],
				},
				expected: { outcome: 'answered', answeredCount: 1, skippedCount: 1 },
			},
			{
				name: 'skipped',
				resumeData: {
					approved: true,
					answers: [{ questionId: 'q1', selectedOptions: [], skipped: true }],
				},
				expected: { outcome: 'skipped', answeredCount: 0, skippedCount: 1 },
			},
			{
				name: 'dismissed',
				resumeData: { approved: false },
				expected: { outcome: 'dismissed', answeredCount: 0, skippedCount: 0 },
			},
		])('reports the $name outcome on resume', async ({ resumeData, expected }) => {
			const onEvent = vi.fn();
			const tool = createAskUserTool({ onEvent });

			await executeTool(tool, { questions: [QUESTION] }, { resumeData });

			expect(onEvent).toHaveBeenCalledWith({ type: 'answered', ...expected });
		});
	});
});
