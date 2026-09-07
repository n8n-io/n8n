import { executeTool } from '../../../__tests__/tool-test-utils';
import { createAskUserTool } from '../ask-user.tool';

const question = {
	id: 'delivery',
	question: 'Where should the digest go?',
	type: 'single',
	recommendedOption: 'Email',
	options: ['Slack', 'Telegram'],
};

describe('ask-user', () => {
	it('shows up to three questions with the recommended answer first', async () => {
		const suspend = vi.fn().mockResolvedValue(undefined);

		await executeTool(
			createAskUserTool(),
			{
				questions: [
					question,
					{
						...question,
						id: 'multi',
						type: 'multi',
						options: [question.recommendedOption, 'Slack'],
					},
					{ ...question, id: 'text', type: 'text', options: undefined },
				],
			},
			{ suspend },
		);

		expect(suspend).toHaveBeenCalledWith(
			expect.objectContaining({
				inputType: 'questions',
				questions: [
					{
						id: 'delivery',
						question: question.question,
						type: 'single',
						recommendedOption: 'Email',
						options: ['Email', 'Slack', 'Telegram'],
					},
					{
						id: 'multi',
						question: question.question,
						type: 'multi',
						recommendedOption: 'Email',
						options: ['Email', 'Slack'],
					},
					{
						id: 'text',
						question: question.question,
						type: 'single',
						recommendedOption: 'Email',
						options: ['Email'],
					},
				],
			}),
		);
	});

	it.each([
		{ selectedOptions: ['Email'], expected: ['Email'] },
		{
			selectedOptions: ['Email', 'Slack', 'Custom (Recommended)'],
			expected: ['Email', 'Slack', 'Custom (Recommended)'],
		},
	])('returns plain answer values for $selectedOptions', async ({ selectedOptions, expected }) => {
		const suspend = vi.fn();
		const answer = {
			questionId: question.id,
			selectedOptions,
			customText: 'Custom (Recommended)',
		};

		const result = await executeTool(
			createAskUserTool(),
			{
				questions: [{ ...question, type: 'multi', options: ['Slack', 'Custom (Recommended)'] }],
			},
			{ suspend, resumeData: { approved: true, answers: [answer] } },
		);

		expect(result).toEqual({
			answered: true,
			answers: [{ ...answer, selectedOptions: expected, question: question.question }],
		});
		expect(suspend).not.toHaveBeenCalled();
	});

	it.each([
		{
			name: 'too many questions',
			questions: Array.from({ length: 4 }, (_, index) => ({ ...question, id: String(index) })),
			message: 'Retry ask-user with 1 to 3 entries in questions',
		},
		{
			name: 'too many alternatives',
			questions: [{ ...question, options: ['Slack', 'Telegram', 'Data Table'] }],
			message: 'Retry ask-user with at most 2 entries in this options array',
		},
	])('rejects $name with retry instructions before showing questions', async (testCase) => {
		const suspend = vi.fn();

		await expect(
			executeTool(createAskUserTool(), { questions: testCase.questions }, { suspend }),
		).rejects.toThrow(testCase.message);
		expect(suspend).not.toHaveBeenCalled();
	});
});
