import type { CredentialListItem } from '@n8n/agents';
import type { InstanceAiCredentialService } from '@n8n/instance-ai';
import { TELEMETRY_EVENT } from '@n8n/telemetry';
import type { Mock } from 'vitest';
import { mock } from 'vitest-mock-extended';

import {
	buildAskCredentialTool,
	buildAskEmbeddingCredentialTool,
	type AskCredentialToolDeps,
	type AskEmbeddingCredentialToolDeps,
} from '../ask-credential.tool';

interface TestCtx {
	resumeData?: unknown;
	suspend: Mock;
}

function makeCtx(overrides?: { resumeData?: unknown }): TestCtx {
	return { resumeData: overrides?.resumeData, suspend: vi.fn(async (x: unknown) => x) };
}

function makeCredentialService(creds: CredentialListItem[]): InstanceAiCredentialService {
	const credentialService = mock<InstanceAiCredentialService>();
	credentialService.list.mockImplementation(async (options) =>
		options?.type ? creds.filter((c) => c.type === options.type) : creds,
	);
	return credentialService;
}

function expectListed(credentialService: InstanceAiCredentialService, credentialType: string) {
	expect(credentialService.list).toHaveBeenCalledWith({
		type: credentialType,
		projectId: 'project-1',
	});
}

let track: Mock;

function askCredentialTool(deps: Omit<AskCredentialToolDeps, 'track' | 'projectId'>) {
	const merged: AskCredentialToolDeps = { projectId: 'project-1', ...deps, track };
	return buildAskCredentialTool(merged);
}

function askEmbeddingCredentialTool(
	deps: Omit<AskEmbeddingCredentialToolDeps, 'track' | 'projectId'>,
) {
	const merged: AskEmbeddingCredentialToolDeps = { projectId: 'project-1', ...deps, track };
	return buildAskEmbeddingCredentialTool(merged);
}

beforeEach(() => {
	track = vi.fn();
});

describe('ask_credential tool', () => {
	it('auto-resolves when exactly one credential of the requested type exists, without tracking a request', async () => {
		const credentialService = makeCredentialService([
			{ id: 'c1', name: 'My Slack', type: 'slackApi' },
			{ id: 'c2', name: 'OpenAI', type: 'openAiApi' },
		]);
		const tool = askCredentialTool({ credentialService });
		const ctx = makeCtx();
		const result = await tool.handler!(
			{ purpose: 'Slack', credentialType: 'slackApi' },
			ctx as never,
		);
		expect(ctx.suspend).not.toHaveBeenCalled();
		expect(track).not.toHaveBeenCalled();
		expectListed(credentialService, 'slackApi');
		expect(result).toEqual({
			credentialId: 'c1',
			credentialName: 'My Slack',
			credentials: {
				slackApi: { id: 'c1', name: 'My Slack' },
			},
		});
	});

	it('suspends instead of auto-resolving when the sole credential is a generic auth type', async () => {
		// One credential type serves every service, so the user must pick it —
		// otherwise their only bearer token is attached to an arbitrary endpoint.
		const credentialService = makeCredentialService([
			{ id: 'c1', name: 'Bearer Auth account', type: 'httpBearerAuth' },
		]);
		const tool = askCredentialTool({ credentialService });
		const ctx = makeCtx();

		await tool.handler!(
			{ purpose: 'Authenticate the MCP server', credentialType: 'httpBearerAuth' },
			ctx as never,
		);

		expect(ctx.suspend).toHaveBeenCalledWith(
			expect.objectContaining({
				credentialRequests: [
					expect.objectContaining({
						credentialType: 'httpBearerAuth',
						existingCredentials: [{ id: 'c1', name: 'Bearer Auth account' }],
					}),
				],
			}),
		);
		expect(track).toHaveBeenCalledWith(TELEMETRY_EVENT.AGENTS.BUILDER_REQUESTED_CREDENTIAL, {
			credential_type: 'httpBearerAuth',
		});
		expectListed(credentialService, 'httpBearerAuth');
	});

	it('returns a node credentials map keyed by the requested credential slot when auto-resolving', async () => {
		const credentialService = makeCredentialService([
			{ id: 'c1', name: 'My Linear', type: 'linearOAuth2Api' },
		]);
		const tool = askCredentialTool({ credentialService });
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

		expectListed(credentialService, 'linearOAuth2Api');
		expect(result).toEqual({
			credentialId: 'c1',
			credentialName: 'My Linear',
			credentials: {
				linearOAuth2Api: { id: 'c1', name: 'My Linear' },
			},
		});
	});

	it('resolves the display name from the credential list when resuming with a selection', async () => {
		const credentialService = makeCredentialService([
			{ id: 'c9', name: 'Picked', type: 'linearOAuth2Api' },
		]);
		const tool = askCredentialTool({ credentialService });
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
		expect(track).toHaveBeenCalledWith(TELEMETRY_EVENT.AGENTS.USER_PROVIDED_CREDENTIAL, {
			credential_type: 'linearOAuth2Api',
			outcome: 'provided',
		});
		expectListed(credentialService, 'linearOAuth2Api');
	});

	it('falls back to the id as the name when the selected credential is not in the list', async () => {
		const credentialService = makeCredentialService([]);
		const tool = askCredentialTool({ credentialService });
		const ctx = makeCtx({ resumeData: { credentials: { slackApi: 'c9' } } });

		const result = await tool.handler!(
			{ purpose: 'Slack', credentialType: 'slackApi' },
			ctx as never,
		);

		expectListed(credentialService, 'slackApi');
		expect(result).toEqual({
			credentialId: 'c9',
			credentialName: 'c9',
			credentials: { slackApi: { id: 'c9', name: 'c9' } },
		});
	});

	it('suspends with a credentialRequests payload including existingCredentials when multiple credentials of the type exist', async () => {
		const credentialService = makeCredentialService([
			{ id: 'c1', name: 'Personal Slack', type: 'slackApi' },
			{ id: 'c2', name: 'Workspace Slack', type: 'slackApi' },
		]);
		const tool = askCredentialTool({ credentialService });
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
				projectId: 'project-1',
			}),
		);
		expect(track).toHaveBeenCalledWith(TELEMETRY_EVENT.AGENTS.BUILDER_REQUESTED_CREDENTIAL, {
			credential_type: 'slackApi',
		});
		expectListed(credentialService, 'slackApi');
	});

	it('suspends when no credentials of the type exist', async () => {
		const credentialService = makeCredentialService([
			{ id: 'c2', name: 'OpenAI', type: 'openAiApi' },
		]);
		const tool = askCredentialTool({ credentialService });
		const ctx = makeCtx();
		await tool.handler!({ purpose: 'Slack', credentialType: 'slackApi' }, ctx as never);
		expect(ctx.suspend).toHaveBeenCalledTimes(1);
		expect(track).toHaveBeenCalledWith(TELEMETRY_EVENT.AGENTS.BUILDER_REQUESTED_CREDENTIAL, {
			credential_type: 'slackApi',
		});
		expectListed(credentialService, 'slackApi');
	});

	it('fails fast when the requested credential type is unknown', async () => {
		const credentialService = makeCredentialService([
			{ id: 'c2', name: 'OpenAI', type: 'openAiApi' },
		]);
		const tool = askCredentialTool({
			credentialService,
			isCredentialTypeKnown: (credentialType) => credentialType === 'openAiApi',
		});
		const ctx = makeCtx();

		await expect(
			tool.handler!({ purpose: 'Brave search', credentialType: 'braveSearch' }, ctx as never),
		).rejects.toThrow('Unknown credential type "braveSearch"');
		expect(ctx.suspend).not.toHaveBeenCalled();
	});

	it('still suspends when the requested credential type is known but has no credentials', async () => {
		const credentialService = makeCredentialService([
			{ id: 'c2', name: 'OpenAI', type: 'openAiApi' },
		]);
		const tool = askCredentialTool({
			credentialService,
			isCredentialTypeKnown: (credentialType) => credentialType === 'braveSearchApi',
		});
		const ctx = makeCtx();

		await tool.handler!(
			{ purpose: 'Brave search', credentialType: 'braveSearchApi' },
			ctx as never,
		);
		expect(ctx.suspend).toHaveBeenCalledTimes(1);
		expectListed(credentialService, 'braveSearchApi');
	});

	it('returns skipped when the credentials map has no entry for the requested type', async () => {
		const credentialService = makeCredentialService([]);
		const tool = askCredentialTool({ credentialService });
		const ctx = makeCtx({ resumeData: { credentials: {} } });
		const result = await tool.handler!(
			{ purpose: 'Slack', credentialType: 'slackApi' },
			ctx as never,
		);
		expect(ctx.suspend).not.toHaveBeenCalled();
		expect(result).toEqual({ skipped: true });
		expect(track).toHaveBeenCalledWith(TELEMETRY_EVENT.AGENTS.USER_PROVIDED_CREDENTIAL, {
			credential_type: 'slackApi',
			outcome: 'skipped',
		});
	});

	it('reuses the configured channel integration credential when it matches the requested type', async () => {
		const credentialService = makeCredentialService([
			{ id: 'c1', name: 'Personal Slack', type: 'slackApi' },
			{ id: 'c2', name: 'Workspace Slack', type: 'slackApi' },
		]);
		const tool = askCredentialTool({
			credentialService,
			listIntegrationCredentialIds: async () => ['c2'],
		});
		const ctx = makeCtx();

		const result = await tool.handler!(
			{ purpose: 'Slack', credentialType: 'slackApi' },
			ctx as never,
		);

		expect(ctx.suspend).not.toHaveBeenCalled();
		expectListed(credentialService, 'slackApi');
		expect(result).toEqual({
			credentialId: 'c2',
			credentialName: 'Workspace Slack',
			credentials: { slackApi: { id: 'c2', name: 'Workspace Slack' } },
		});
	});

	it('ignores channel integration credentials of a different type', async () => {
		const credentialService = makeCredentialService([
			{ id: 'c1', name: 'Personal Slack', type: 'slackApi' },
			{ id: 'c2', name: 'Workspace Slack', type: 'slackApi' },
			{ id: 'c3', name: 'Telegram Bot', type: 'telegramApi' },
		]);
		const tool = askCredentialTool({
			credentialService,
			listIntegrationCredentialIds: async () => ['c3'],
		});
		const ctx = makeCtx();

		await tool.handler!({ purpose: 'Slack', credentialType: 'slackApi' }, ctx as never);

		expect(ctx.suspend).toHaveBeenCalledTimes(1);
		expectListed(credentialService, 'slackApi');
	});

	it('lets an explicit resume selection win over the channel integration credential', async () => {
		const credentialService = makeCredentialService([
			{ id: 'c1', name: 'Personal Slack', type: 'slackApi' },
			{ id: 'c2', name: 'Workspace Slack', type: 'slackApi' },
		]);
		const tool = askCredentialTool({
			credentialService,
			listIntegrationCredentialIds: async () => ['c2'],
		});
		const ctx = makeCtx({ resumeData: { credentials: { slackApi: 'c1' } } });

		const result = await tool.handler!(
			{ purpose: 'Slack', credentialType: 'slackApi' },
			ctx as never,
		);

		expect(ctx.suspend).not.toHaveBeenCalled();
		expectListed(credentialService, 'slackApi');
		expect(result).toEqual({
			credentialId: 'c1',
			credentialName: 'Personal Slack',
			credentials: { slackApi: { id: 'c1', name: 'Personal Slack' } },
		});
	});

	it('returns skipped when the resume has no credentials map (explicit skip or denial)', async () => {
		const credentialService = makeCredentialService([]);
		const tool = askCredentialTool({ credentialService });
		const ctx = makeCtx({ resumeData: { skipped: true } });
		const result = await tool.handler!(
			{ purpose: 'Slack', credentialType: 'slackApi' },
			ctx as never,
		);
		expect(ctx.suspend).not.toHaveBeenCalled();
		expect(credentialService.list).not.toHaveBeenCalled();
		expect(result).toEqual({ skipped: true });
		expect(track).toHaveBeenCalledWith(TELEMETRY_EVENT.AGENTS.USER_PROVIDED_CREDENTIAL, {
			credential_type: 'slackApi',
			outcome: 'skipped',
		});
	});
});

describe('ask_embedding_credential tool', () => {
	it('returns managed credential when assistant proxy is enabled', async () => {
		const credentialService = makeCredentialService([]);
		const tool = askEmbeddingCredentialTool({
			credentialService,
			isAssistantProxyEnabled: () => true,
		});
		const ctx = makeCtx();

		const result = await tool.handler!(
			{ purpose: 'Episodic Memory embeddings', credentialType: 'openAiApi' },
			ctx as never,
		);

		expect(ctx.suspend).not.toHaveBeenCalled();
		expect(credentialService.list).not.toHaveBeenCalled();
		expect(result).toEqual({
			credentialId: 'managed',
			credentialName: 'Managed by n8n',
			credentials: {
				openAiApi: { id: 'managed', name: 'Managed by n8n' },
			},
		});
	});

	it('suspends with the usual credential selector when assistant proxy is unavailable', async () => {
		const credentialService = makeCredentialService([
			{ id: 'c1', name: 'Personal OpenAI', type: 'openAiApi' },
			{ id: 'c2', name: 'Team OpenAI', type: 'openAiApi' },
		]);
		const tool = askEmbeddingCredentialTool({
			credentialService,
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
		expectListed(credentialService, 'openAiApi');
	});

	it('resolves the display name from the credential list when resuming, when assistant proxy is unavailable', async () => {
		const credentialService = makeCredentialService([
			{ id: 'c9', name: 'Picked OpenAI', type: 'openAiApi' },
		]);
		const tool = askEmbeddingCredentialTool({
			credentialService,
			isAssistantProxyEnabled: () => false,
		});
		const ctx = makeCtx({ resumeData: { credentials: { openAiApi: 'c9' } } });

		const result = await tool.handler!(
			{ purpose: 'Episodic Memory embeddings', credentialType: 'openAiApi' },
			ctx as never,
		);

		expect(ctx.suspend).not.toHaveBeenCalled();
		expectListed(credentialService, 'openAiApi');
		expect(result).toEqual({
			credentialId: 'c9',
			credentialName: 'Picked OpenAI',
			credentials: {
				openAiApi: { id: 'c9', name: 'Picked OpenAI' },
			},
		});
	});
});
