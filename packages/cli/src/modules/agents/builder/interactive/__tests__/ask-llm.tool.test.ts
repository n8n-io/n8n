import type { CredentialListItem, CredentialProvider } from '@n8n/agents';
import { buildAskLlmTool } from '../ask-llm.tool';

interface TestCtx {
	resumeData?: unknown;
	suspend: jest.Mock;
}

function makeCtx(overrides?: { resumeData?: unknown }): TestCtx {
	return { resumeData: overrides?.resumeData, suspend: jest.fn(async (x: unknown) => x) };
}

function makeProvider(creds: CredentialListItem[]): CredentialProvider {
	return {
		list: jest.fn(async () => creds),
		resolve: jest.fn(async () => ({})),
	};
}

describe('ask_llm tool', () => {
	it('auto-resolves when exactly one LLM-provider credential exists', async () => {
		const credentialProvider = makeProvider([
			{ id: 'c1', name: 'My Anthropic', type: 'anthropicApi' },
			// Non-LLM credential — must be ignored.
			{ id: 'c2', name: 'My Slack', type: 'slackApi' },
		]);
		const tool = buildAskLlmTool({ credentialProvider });
		const ctx = makeCtx();
		const result = await tool.handler!({ purpose: 'Main LLM' }, ctx as never);
		expect(ctx.suspend).not.toHaveBeenCalled();
		expect(result).toEqual({
			provider: 'anthropic',
			model: 'claude-sonnet-4-6',
			credentialId: 'c1',
			credentialName: 'My Anthropic',
		});
	});

	it('suspends when multiple LLM-provider credentials exist (different providers)', async () => {
		const credentialProvider = makeProvider([
			{ id: 'c1', name: 'My Anthropic', type: 'anthropicApi' },
			{ id: 'c2', name: 'My OpenAI', type: 'openAiApi' },
		]);
		const tool = buildAskLlmTool({ credentialProvider });
		const ctx = makeCtx();
		await tool.handler!({ purpose: 'Main LLM' }, ctx as never);
		expect(ctx.suspend).toHaveBeenCalledTimes(1);
	});

	it('suspends when two creds of the same provider type exist', async () => {
		const credentialProvider = makeProvider([
			{ id: 'c1', name: 'Personal Anthropic', type: 'anthropicApi' },
			{ id: 'c2', name: 'Work Anthropic', type: 'anthropicApi' },
		]);
		const tool = buildAskLlmTool({ credentialProvider });
		const ctx = makeCtx();
		await tool.handler!({ purpose: 'Main LLM' }, ctx as never);
		expect(ctx.suspend).toHaveBeenCalledTimes(1);
	});

	it('suspends when no LLM-provider credentials exist', async () => {
		const credentialProvider = makeProvider([{ id: 'c1', name: 'Slack', type: 'slackApi' }]);
		const tool = buildAskLlmTool({ credentialProvider });
		const ctx = makeCtx();
		await tool.handler!({ purpose: 'Main LLM' }, ctx as never);
		expect(ctx.suspend).toHaveBeenCalledTimes(1);
	});

	it('returns resumeData verbatim after resume without consulting the provider', async () => {
		const credentialProvider = makeProvider([]);
		const tool = buildAskLlmTool({ credentialProvider });
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
		expect(credentialProvider.list).not.toHaveBeenCalled();
		expect(result).toEqual({
			provider: 'anthropic',
			model: 'claude-sonnet-4-6',
			credentialId: 'cX',
			credentialName: 'Picked',
		});
	});
});
