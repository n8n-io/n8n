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
});
