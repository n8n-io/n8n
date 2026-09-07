import { executeTool } from '../../../__tests__/tool-test-utils';
import { askUserInputSchema, createAskUserTool } from '../ask-user.tool';

const question = {
	id: 'delivery',
	question: 'Where should the digest go?',
	type: 'single',
	recommendedOption: 'Email',
	options: ['Slack', 'Telegram'],
};

describe('ask-user', () => {
	it.each([
		{ type: 'single', options: ['Email', 'Slack', 'Telegram'], count: 1 },
		{ type: 'text', options: undefined, count: 1 },
		{ type: 'multi', options: ['Email', 'Slack', 'Telegram', 'Data Table'], count: 4 },
	])('resumes legacy $type questions after input validation', async ({ type, options, count }) => {
		const suspend = vi.fn();
		const input = askUserInputSchema.parse({
			questions: Array.from({ length: count }, (_, index) => ({
				id: String(index),
				question: question.question,
				type,
				options,
			})),
		});
		const answer = { questionId: '0', selectedOptions: ['Email'] };

		const result = await executeTool(createAskUserTool(), input, {
			suspend,
			resumeData: { approved: true, answers: [answer] },
		});

		expect(result).toEqual({
			answered: true,
			answers: [{ ...answer, question: question.question }],
		});
		expect(suspend).not.toHaveBeenCalled();
	});

	it('uses the first legacy option as the recommended answer', async () => {
		const suspend = vi.fn().mockResolvedValue(undefined);
		const input = askUserInputSchema.parse({
			questions: [
				{ ...question, recommendedOption: undefined, options: ['Email', 'Slack', 'Telegram'] },
			],
		});

		await executeTool(createAskUserTool(), input, { suspend });

		expect(suspend).toHaveBeenCalledWith(
			expect.objectContaining({
				questions: [
					{ ...question, recommendedOption: 'Email', options: ['Email', 'Slack', 'Telegram'] },
				],
			}),
		);
	});

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
