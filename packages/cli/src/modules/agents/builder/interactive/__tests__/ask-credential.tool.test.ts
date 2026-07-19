import type { CredentialListItem, CredentialProvider } from '@n8n/agents';
import type { Mock } from 'vitest';

import { buildAskCredentialTool, buildAskEmbeddingCredentialTool } from '../ask-credential.tool';

interface TestCtx {
	resumeData?: unknown;
	suspend: Mock;
}

function makeCtx(overrides?: { resumeData?: unknown }): TestCtx {
	return { resumeData: overrides?.resumeData, suspend: vi.fn(async (x: unknown) => x) };
}

function makeProvider(creds: CredentialListItem[]): CredentialProvider {
	return {
		list: vi.fn(async () => creds),
		resolve: vi.fn(async () => ({})),
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
		expect(result).toEqual({
			credentialId: 'c1',
			credentialName: 'My Slack',
			credentials: {
				slackApi: { id: 'c1', name: 'My Slack' },
			},
		});
	});

	it('returns a node credentials map keyed by the requested credential slot when auto-resolving', async () => {
		const credentialProvider = makeProvider([
			{ id: 'c1', name: 'My Linear', type: 'linearOAuth2Api' },
		]);
		const tool = buildAskCredentialTool({ credentialProvider });
		const ctx = makeCtx();
		const result = await tool.handler!(
			{
				purpose: 'Linear issue creation',
				nodeType: 'n8n-nodes-base.linearTool',
				credentialType: 'linearOAuth2Api',
				credentialSlot: 'linearOAuth2Api',
			},
			ctx as never,
		);

		expect(result).toEqual({
			credentialId: 'c1',
			credentialName: 'My Linear',
			credentials: {
				linearOAuth2Api: { id: 'c1', name: 'My Linear' },
			},
		});
	});

	it('resolves the display name from the credential list when resuming with a selection', async () => {
		const credentialProvider = makeProvider([
			{ id: 'c9', name: 'Picked', type: 'linearOAuth2Api' },
		]);
		const tool = buildAskCredentialTool({ credentialProvider });
		const ctx = makeCtx({ resumeData: { credentials: { linearOAuth2Api: 'c9' } } });

		const result = await tool.handler!(
			{
				purpose: 'Linear issue creation',
				credentialType: 'linearOAuth2Api',
				credentialSlot: 'linearOAuth2Api',
			},
			ctx as never,
		);

		expect(result).toEqual({
			credentialId: 'c9',
			credentialName: 'Picked',
			credentials: {
				linearOAuth2Api: { id: 'c9', name: 'Picked' },
			},
		});
	});

	it('falls back to the id as the name when the selected credential is not in the list', async () => {
		const credentialProvider = makeProvider([]);
		const tool = buildAskCredentialTool({ credentialProvider });
		const ctx = makeCtx({ resumeData: { credentials: { slackApi: 'c9' } } });

		const result = await tool.handler!(
			{ purpose: 'Slack', credentialType: 'slackApi' },
			ctx as never,
		);

		expect(result).toEqual({
			credentialId: 'c9',
			credentialName: 'c9',
			credentials: { slackApi: { id: 'c9', name: 'c9' } },
		});
	});

	it('suspends with a credentialRequests payload including existingCredentials when multiple credentials of the type exist', async () => {
		const credentialProvider = makeProvider([
			{ id: 'c1', name: 'Personal Slack', type: 'slackApi' },
			{ id: 'c2', name: 'Workspace Slack', type: 'slackApi' },
		]);
		const tool = buildAskCredentialTool({ credentialProvider });
		const ctx = makeCtx();
		await tool.handler!({ purpose: 'Connect Slack', credentialType: 'slackApi' }, ctx as never);

		expect(ctx.suspend).toHaveBeenCalledWith(
			expect.objectContaining({
				requestId: expect.any(String),
				message: 'Connect Slack',
				severity: 'info',
				credentialRequests: [
					{
						credentialType: 'slackApi',
						reason: 'Connect Slack',
						existingCredentials: [
							{ id: 'c1', name: 'Personal Slack' },
							{ id: 'c2', name: 'Workspace Slack' },
						],
					},
				],
				credentialFlow: { stage: 'generic' },
			}),
		);
	});

	it('suspends when no credentials of the type exist', async () => {
		const credentialProvider = makeProvider([{ id: 'c2', name: 'OpenAI', type: 'openAiApi' }]);
		const tool = buildAskCredentialTool({ credentialProvider });
		const ctx = makeCtx();
		await tool.handler!({ purpose: 'Slack', credentialType: 'slackApi' }, ctx as never);
		expect(ctx.suspend).toHaveBeenCalledTimes(1);
	});

	it('fails fast when the requested credential type is unknown', async () => {
		const credentialProvider = makeProvider([{ id: 'c2', name: 'OpenAI', type: 'openAiApi' }]);
		const tool = buildAskCredentialTool({
			credentialProvider,
			isCredentialTypeKnown: (credentialType) => credentialType === 'openAiApi',
		});
		const ctx = makeCtx();

		await expect(
			tool.handler!({ purpose: 'Brave search', credentialType: 'braveSearch' }, ctx as never),
		).rejects.toThrow('Unknown credential type "braveSearch"');
		expect(ctx.suspend).not.toHaveBeenCalled();
	});

	it('still suspends when the requested credential type is known but has no credentials', async () => {
		const credentialProvider = makeProvider([{ id: 'c2', name: 'OpenAI', type: 'openAiApi' }]);
		const tool = buildAskCredentialTool({
			credentialProvider,
			isCredentialTypeKnown: (credentialType) => credentialType === 'braveSearchApi',
		});
		const ctx = makeCtx();

		await tool.handler!(
			{ purpose: 'Brave search', credentialType: 'braveSearchApi' },
			ctx as never,
		);
		expect(ctx.suspend).toHaveBeenCalledTimes(1);
	});

	it('returns skipped when the credentials map has no entry for the requested type', async () => {
		const credentialProvider = makeProvider([]);
		const tool = buildAskCredentialTool({ credentialProvider });
		const ctx = makeCtx({ resumeData: { credentials: {} } });
		const result = await tool.handler!(
			{ purpose: 'Slack', credentialType: 'slackApi' },
			ctx as never,
		);
		expect(ctx.suspend).not.toHaveBeenCalled();
		expect(result).toEqual({ skipped: true });
	});

	it('returns skipped when the resume has no credentials map (explicit skip or denial)', async () => {
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

describe('ask_embedding_credential tool', () => {
	it('returns managed credential when assistant proxy is enabled', async () => {
		const credentialProvider = makeProvider([]);
		const tool = buildAskEmbeddingCredentialTool({
			credentialProvider,
			isAssistantProxyEnabled: () => true,
		});
		const ctx = makeCtx();

		const result = await tool.handler!(
			{ purpose: 'Episodic Memory embeddings', credentialType: 'openAiApi' },
			ctx as never,
		);

		expect(ctx.suspend).not.toHaveBeenCalled();
		expect(credentialProvider.list).not.toHaveBeenCalled();
		expect(result).toEqual({
			credentialId: 'managed',
			credentialName: 'Managed by n8n',
			credentials: {
				openAiApi: { id: 'managed', name: 'Managed by n8n' },
			},
		});
	});

	it('suspends with the usual credential selector when assistant proxy is unavailable', async () => {
		const credentialProvider = makeProvider([
			{ id: 'c1', name: 'Personal OpenAI', type: 'openAiApi' },
			{ id: 'c2', name: 'Team OpenAI', type: 'openAiApi' },
		]);
		const tool = buildAskEmbeddingCredentialTool({
			credentialProvider,
			isAssistantProxyEnabled: () => false,
		});
		const ctx = makeCtx();

		await tool.handler!(
			{ purpose: 'Episodic Memory embeddings', credentialType: 'openAiApi' },
			ctx as never,
		);

		expect(ctx.suspend).toHaveBeenCalledWith(
			expect.objectContaining({
				message: 'Episodic Memory embeddings',
				credentialRequests: [expect.objectContaining({ credentialType: 'openAiApi' })],
			}),
		);
	});

	it('resolves the display name from the credential list when resuming, when assistant proxy is unavailable', async () => {
		const credentialProvider = makeProvider([
			{ id: 'c9', name: 'Picked OpenAI', type: 'openAiApi' },
		]);
		const tool = buildAskEmbeddingCredentialTool({
			credentialProvider,
			isAssistantProxyEnabled: () => false,
		});
		const ctx = makeCtx({ resumeData: { credentials: { openAiApi: 'c9' } } });

		const result = await tool.handler!(
			{ purpose: 'Episodic Memory embeddings', credentialType: 'openAiApi' },
			ctx as never,
		);

		expect(ctx.suspend).not.toHaveBeenCalled();
		expect(result).toEqual({
			credentialId: 'c9',
			credentialName: 'Picked OpenAI',
			credentials: {
				openAiApi: { id: 'c9', name: 'Picked OpenAI' },
			},
		});
	});
});
