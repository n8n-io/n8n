import { buildAskLlmTool } from '../ask-llm.tool';

interface TestCtx {
	resumeData?: unknown;
	suspend: jest.Mock;
}

function makeCtx(overrides?: { resumeData?: unknown }): TestCtx {
	return { resumeData: overrides?.resumeData, suspend: jest.fn(async (x: unknown) => x) };
}

describe('ask_llm tool', () => {
	it('suspends on first invocation so the user can choose', async () => {
		const tool = buildAskLlmTool();
		const ctx = makeCtx();
		await tool.handler!({ purpose: 'Main LLM' }, ctx as never);
		expect(ctx.suspend).toHaveBeenCalledWith({ purpose: 'Main LLM' });
	});

	it('returns resumeData verbatim after resume', async () => {
		const tool = buildAskLlmTool();
		const ctx = makeCtx({
			resumeData: {
				provider: 'anthropic',
				model: 'claude-sonnet-4-6',
				credentialId: 'cX',
				credentialName: 'Picked',
			},
		});
		const result = await tool.handler!({ purpose: 'Main LLM' }, ctx as never);
		expect(ctx.suspend).not.toHaveBeenCalled();
		expect(result).toEqual({
			provider: 'anthropic',
			model: 'claude-sonnet-4-6',
			credentialId: 'cX',
			credentialName: 'Picked',
		});
	});
});
