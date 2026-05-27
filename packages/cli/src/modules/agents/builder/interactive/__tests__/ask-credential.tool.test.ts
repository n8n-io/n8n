import type { CredentialListItem, CredentialProvider } from '@n8n/agents';
import { buildAskCredentialTool } from '../ask-credential.tool';

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

describe('ask_credential tool', () => {
	it('auto-resolves when exactly one credential of the requested type exists', async () => {
		const credentialProvider = makeProvider([
			{ id: 'c1', name: 'My Slack', type: 'slackApi' },
			{ id: 'c2', name: 'OpenAI', type: 'openAiApi' },
		]);
		const tool = buildAskCredentialTool({ credentialProvider });
		const ctx = makeCtx();
		const result = await tool.handler!(
			{ purpose: 'Slack', credentialType: 'slackApi' },
			ctx as never,
		);
		expect(ctx.suspend).not.toHaveBeenCalled();
		expect(result).toEqual({ credentialId: 'c1', credentialName: 'My Slack' });
	});

	it('suspends when multiple credentials of the type exist', async () => {
		const credentialProvider = makeProvider([
			{ id: 'c1', name: 'Personal Slack', type: 'slackApi' },
			{ id: 'c2', name: 'Workspace Slack', type: 'slackApi' },
		]);
		const tool = buildAskCredentialTool({ credentialProvider });
		const ctx = makeCtx();
		await tool.handler!({ purpose: 'Slack', credentialType: 'slackApi' }, ctx as never);
		expect(ctx.suspend).toHaveBeenCalledTimes(1);
	});

	it('suspends when no credentials of the type exist', async () => {
		const credentialProvider = makeProvider([{ id: 'c2', name: 'OpenAI', type: 'openAiApi' }]);
		const tool = buildAskCredentialTool({ credentialProvider });
		const ctx = makeCtx();
		await tool.handler!({ purpose: 'Slack', credentialType: 'slackApi' }, ctx as never);
		expect(ctx.suspend).toHaveBeenCalledTimes(1);
	});

	it('returns resumeData verbatim after resume without consulting the provider', async () => {
		const credentialProvider = makeProvider([]);
		const tool = buildAskCredentialTool({ credentialProvider });
		const ctx = makeCtx({ resumeData: { credentialId: 'c9', credentialName: 'Picked' } });
		const result = await tool.handler!(
			{ purpose: 'Slack', credentialType: 'slackApi' },
			ctx as never,
		);
		expect(ctx.suspend).not.toHaveBeenCalled();
		expect(credentialProvider.list).not.toHaveBeenCalled();
		expect(result).toEqual({ credentialId: 'c9', credentialName: 'Picked' });
	});

	it('returns skipped resumeData so the builder can continue without credentials', async () => {
		const credentialProvider = makeProvider([]);
		const tool = buildAskCredentialTool({ credentialProvider });
		const ctx = makeCtx({ resumeData: { skipped: true } });
		const result = await tool.handler!(
			{ purpose: 'Slack', credentialType: 'slackApi' },
			ctx as never,
		);
		expect(ctx.suspend).not.toHaveBeenCalled();
		expect(credentialProvider.list).not.toHaveBeenCalled();
		expect(result).toEqual({ skipped: true });
	});
});
