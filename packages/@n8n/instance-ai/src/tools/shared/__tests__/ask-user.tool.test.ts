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

	it('defaults missing question ids to the first free qN', async () => {
		const suspend = vi.fn().mockResolvedValue({ suspended: true });
		const tool = createAskUserTool();

		await executeTool(
			tool,
			{
				questions: [
					{ question: 'First?', type: 'text' },
					{ id: 'q2', question: 'Second?', type: 'text' },
					{ question: 'Third?', type: 'text' },
				],
			},
			{ resumeData: undefined, suspend },
		);

		const payload = suspend.mock.calls[0][0] as { questions: Array<{ id: string }> };
		expect(payload.questions.map((q) => q.id)).toEqual(['q1', 'q2', 'q3']);
	});

	it('rejects duplicate explicit question ids', async () => {
		const tool = createAskUserTool();

		await expect(
			executeTool(
				tool,
				{
					questions: [
						{ id: 'dup', question: 'First?', type: 'text' },
						{ id: 'dup', question: 'Second?', type: 'text' },
					],
				},
				{ resumeData: undefined, suspend: vi.fn() },
			),
		).rejects.toThrow('question ids must be unique');
	});

	it('returns answered false when every answer is skipped', async () => {
		const tool = createAskUserTool();

		const result = await executeTool(
			tool,
			{ questions: [QUESTION] },
			{
				resumeData: {
					approved: true,
					answers: [{ questionId: 'q1', selectedOptions: [], skipped: true }],
				},
			},
		);

		expect(result).toEqual({ answered: false });
	});

	it('accepts a resume without approved from a former agent_builder_ask_questions call', async () => {
		const tool = createAskUserTool();

		const result = await executeTool(
			tool,
			{ questions: [{ question: 'Which region?', type: 'single', options: ['us', 'eu'] }] },
			{ resumeData: { answers: [{ questionId: 'q1', selectedOptions: ['us'] }] } },
		);

		expect(result).toEqual({
			answered: true,
			answers: [{ questionId: 'q1', question: 'Which region?', selectedOptions: ['us'] }],
		});
	});
});
