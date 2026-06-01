import { buildAskQuestionTool } from '../ask-question.tool';

interface TestCtx {
	resumeData?: unknown;
	suspend: jest.Mock;
}

function makeCtx(overrides?: { resumeData?: unknown }): TestCtx {
	return {
		resumeData: overrides?.resumeData,
		suspend: jest.fn(async (x: unknown) => x),
	};
}

describe('ask_question tool', () => {
	const tool = buildAskQuestionTool();

	it('auto-resolves to the only option when options.length === 1', async () => {
		const ctx = makeCtx();
		const result = await tool.handler!(
			{ question: 'Pick one', options: [{ label: 'Slack', value: 'slack' }] },
			ctx as never,
		);
		expect(ctx.suspend).not.toHaveBeenCalled();
		expect(result).toEqual({ values: ['slack'] });
	});

	it('suspends when there are multiple options', async () => {
		const ctx = makeCtx();
		await tool.handler!(
			{
				question: 'Pick one',
				options: [
					{ label: 'Slack', value: 'slack' },
					{ label: 'Discord', value: 'discord' },
				],
			},
			ctx as never,
		);
		expect(ctx.suspend).toHaveBeenCalledTimes(1);
	});

	it('returns resumeData verbatim after resume', async () => {
		const ctx = makeCtx({ resumeData: { values: ['discord'] } });
		const result = await tool.handler!(
			{
				question: 'Pick',
				options: [
					{ label: 'Slack', value: 'slack' },
					{ label: 'Discord', value: 'discord' },
				],
			},
			ctx as never,
		);
		expect(ctx.suspend).not.toHaveBeenCalled();
		expect(result).toEqual({ values: ['discord'] });
	});
});
