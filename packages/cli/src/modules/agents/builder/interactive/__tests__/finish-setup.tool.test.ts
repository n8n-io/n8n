import type { CredentialListItem, CredentialProvider } from '@n8n/agents';
import { TELEMETRY_EVENT } from '@n8n/telemetry';
import type { Mock } from 'vitest';
import type { z } from 'zod';

import { buildFinishSetupTool } from '../finish-setup.tool';

interface TestCtx {
	resumeData?: unknown;
	suspendPayload?: unknown;
	suspend: Mock;
}

function makeCtx(overrides?: { resumeData?: unknown; suspendPayload?: unknown }): TestCtx {
	return {
		resumeData: overrides?.resumeData,
		suspendPayload: overrides?.suspendPayload,
		suspend: vi.fn(async (payload: unknown) => payload),
	};
}

function makeProvider(creds: CredentialListItem[]): CredentialProvider {
	return {
		list: vi.fn(async () => creds),
		resolve: vi.fn(async () => ({})),
	};
}

const BASE_DEPS = {
	agentId: 'agent-1',
	projectId: 'project-1',
	listChatIntegrationTypes: () => ['slack', 'telegram', 'linear'],
	track: vi.fn(),
};

describe('finish_setup tool', () => {
	afterEach(() => {
		(BASE_DEPS.track as Mock).mockClear();
	});

	it('auto-resolves single-credential and channel-matching slots, excluding them from the credential phase', async () => {
		const credentialProvider = makeProvider([
			{ id: 'c1', name: 'My Airtable', type: 'airtableApi' },
			{ id: 'c2', name: 'Personal Slack', type: 'slackApi' },
			{ id: 'c3', name: 'Notion A', type: 'notionApi' },
			{ id: 'c4', name: 'Notion B', type: 'notionApi' },
		]);
		const tool = buildFinishSetupTool({
			...BASE_DEPS,
			credentialProvider,
			listIntegrationCredentialIds: async () => ['c2'],
		});
		const ctx = makeCtx();

		const payload = (await tool.handler!(
			{
				credentialRequests: [
					{ credentialType: 'airtableApi', purpose: 'Airtable log' },
					{ credentialType: 'slackApi', purpose: 'Slack tool' },
					{ credentialType: 'notionApi', purpose: 'Notion search' },
				],
			},
			ctx as never,
		)) as Record<string, unknown>;

		expect(payload.credentialRequests).toEqual([
			{
				credentialType: 'notionApi',
				reason: 'Notion search',
				existingCredentials: [
					{ id: 'c3', name: 'Notion A' },
					{ id: 'c4', name: 'Notion B' },
				],
			},
		]);
		expect(
			(payload.finishSetupChain as { collected: { credentials: unknown } }).collected.credentials,
		).toEqual({
			airtableApi: { id: 'c1', name: 'My Airtable' },
			slackApi: { id: 'c2', name: 'Personal Slack' },
		});
	});

	it('returns completed without suspending when every credential slot auto-resolves and there is nothing else pending', async () => {
		const credentialProvider = makeProvider([
			{ id: 'c1', name: 'My Airtable', type: 'airtableApi' },
		]);
		const tool = buildFinishSetupTool({
			...BASE_DEPS,
			credentialProvider,
		});
		const ctx = makeCtx();

		const result = await tool.handler!(
			{ credentialRequests: [{ credentialType: 'airtableApi', purpose: 'Airtable log' }] },
			ctx as never,
		);

		expect(ctx.suspend).not.toHaveBeenCalled();
		expect(result).toEqual({
			completed: true,
			credentials: { airtableApi: { id: 'c1', name: 'My Airtable' } },
		});
	});

	it('drops credential slots already covered by an n8n Connect managed credential', async () => {
		const credentialProvider = makeProvider([]);
		const tool = buildFinishSetupTool({
			...BASE_DEPS,
			credentialProvider,
			// The agent's node tools already run pdfcoApi on n8n credits.
			listAiGatewayManagedCredentialTypes: async () => ['pdfcoApi'],
		});
		const ctx = makeCtx();

		const result = await tool.handler!(
			{ credentialRequests: [{ credentialType: 'pdfcoApi', purpose: 'PDF.co tools' }] },
			ctx as never,
		);

		// No card, nothing pending — the managed slot needs no user setup.
		expect(ctx.suspend).not.toHaveBeenCalled();
		expect(result).toEqual({ completed: true });
	});

	it('still shows a card for an uncovered slot when another slot is managed-covered', async () => {
		const credentialProvider = makeProvider([]);
		const tool = buildFinishSetupTool({
			...BASE_DEPS,
			credentialProvider,
			listAiGatewayManagedCredentialTypes: async () => ['pdfcoApi'],
		});
		const ctx = makeCtx();

		const payload = (await tool.handler!(
			{
				credentialRequests: [
					{ credentialType: 'pdfcoApi', purpose: 'PDF.co tools' },
					{ credentialType: 'airtableApi', purpose: 'Airtable log' },
				],
			},
			ctx as never,
		)) as Record<string, unknown>;

		// Only the uncovered airtable slot survives into the credential card.
		expect(payload.credentialRequests).toEqual([
			{ credentialType: 'airtableApi', reason: 'Airtable log', existingCredentials: [] },
		]);
	});

	it('chains through questions and credentials to a merged result', async () => {
		const credentialProvider = makeProvider([]);
		const tool = buildFinishSetupTool({
			...BASE_DEPS,
			credentialProvider,
		});
		const input = {
			questions: [
				{ id: 'model', question: 'Which model?', type: 'single' as const, options: ['gpt'] },
			],
			credentialRequests: [{ credentialType: 'airtableApi', purpose: 'Airtable log' }],
		};

		const questionsPayload = (await tool.handler!(input, makeCtx() as never)) as Record<
			string,
			unknown
		>;
		expect(questionsPayload).toMatchObject({
			inputType: 'questions',
			message: 'Finish setup (1/2)',
			questions: [{ id: 'model', question: 'Which model?', type: 'single', options: ['gpt'] }],
		});
		expect(questionsPayload.finishSetupChain).toMatchObject({
			currentPhase: { kind: 'questions' },
			remainingPhases: [{ kind: 'credentials' }],
			totalPhases: 2,
		});
		expect(BASE_DEPS.track).toHaveBeenCalledWith(TELEMETRY_EVENT.AGENTS.BUILDER_ASKED_QUESTIONS, {
			question_count: 1,
			question_types: ['single'],
		});

		const credentialsPayload = (await tool.handler!(
			input,
			makeCtx({
				resumeData: {
					approved: true,
					answers: [{ questionId: 'model', selectedOptions: ['gpt'] }],
				},
				suspendPayload: questionsPayload,
			}) as never,
		)) as Record<string, unknown>;
		expect(credentialsPayload.credentialRequests).toEqual([
			{ credentialType: 'airtableApi', reason: 'Airtable log', existingCredentials: [] },
		]);
		expect(credentialsPayload.message).toBe('Finish setup (2/2)');
		expect(BASE_DEPS.track).toHaveBeenCalledWith(
			TELEMETRY_EVENT.AGENTS.USER_ANSWERED_BUILDER_QUESTIONS,
			{ outcome: 'answered', answered_count: 1, skipped_count: 0 },
		);
		expect(BASE_DEPS.track).toHaveBeenCalledWith(
			TELEMETRY_EVENT.AGENTS.BUILDER_REQUESTED_CREDENTIAL,
			{ credential_type: 'airtableApi' },
		);

		const result = await tool.handler!(
			input,
			makeCtx({
				resumeData: { credentials: { airtableApi: 'new-cred' } },
				suspendPayload: credentialsPayload,
			}) as never,
		);
		expect(result).toEqual({
			completed: true,
			answers: [{ questionId: 'model', selectedOptions: ['gpt'] }],
			credentials: { airtableApi: { id: 'new-cred', name: 'new-cred' } },
		});
		expect(BASE_DEPS.track).toHaveBeenCalledWith(TELEMETRY_EVENT.AGENTS.USER_PROVIDED_CREDENTIAL, {
			credential_type: 'airtableApi',
			outcome: 'provided',
		});
	});

	it('marks the credential slot skipped when the credential phase is skipped', async () => {
		const credentialProvider = makeProvider([]);
		const tool = buildFinishSetupTool({
			...BASE_DEPS,
			credentialProvider,
		});
		const input = {
			credentialRequests: [{ credentialType: 'airtableApi', purpose: 'Airtable log' }],
			channels: [{ integrationType: 'slack' }],
		};

		const credentialsPayload = (await tool.handler!(input, makeCtx() as never)) as Record<
			string,
			unknown
		>;

		const channelPayload = (await tool.handler!(
			input,
			makeCtx({ resumeData: { skipped: true }, suspendPayload: credentialsPayload }) as never,
		)) as Record<string, unknown>;
		expect(channelPayload).toMatchObject({
			message: 'Set up the slack channel',
			finishSetupChain: { collected: { credentials: { airtableApi: 'skipped' } } },
		});

		const result = await tool.handler!(
			input,
			makeCtx({ resumeData: { approved: false }, suspendPayload: channelPayload }) as never,
		);
		expect(result).toEqual({
			completed: true,
			credentials: { airtableApi: 'skipped' },
			channels: { slack: 'skipped' },
		});
		expect(BASE_DEPS.track).toHaveBeenCalledWith(TELEMETRY_EVENT.AGENTS.USER_PROVIDED_CREDENTIAL, {
			credential_type: 'airtableApi',
			outcome: 'skipped',
		});
	});

	it('throws for an unknown credential type', async () => {
		const tool = buildFinishSetupTool({
			...BASE_DEPS,
			credentialProvider: makeProvider([]),
			isCredentialTypeKnown: (credentialType) => credentialType === 'airtableApi',
		});
		const ctx = makeCtx();

		await expect(
			tool.handler!(
				{ credentialRequests: [{ credentialType: 'unknownApi', purpose: 'x' }] },
				ctx as never,
			),
		).rejects.toThrow('Unknown credential type "unknownApi"');
		expect(ctx.suspend).not.toHaveBeenCalled();
	});

	it('rejects an input with no pending setup items', () => {
		const tool = buildFinishSetupTool({
			...BASE_DEPS,
			credentialProvider: makeProvider([]),
		});

		expect((tool.inputSchema as unknown as z.ZodTypeAny).safeParse({}).success).toBe(false);
	});

	it('chains through questions, credentials, and multiple channels to a merged result', async () => {
		const tool = buildFinishSetupTool({
			...BASE_DEPS,
			credentialProvider: makeProvider([]),
		});
		const input = {
			questions: [
				{ id: 'model', question: 'Which model?', type: 'single' as const, options: ['gpt'] },
			],
			credentialRequests: [{ credentialType: 'airtableApi', purpose: 'Airtable log' }],
			channels: [
				{ integrationType: 'slack' },
				{ integrationType: 'telegram' },
				{ integrationType: 'linear' },
			],
		};

		const questionsPayload = (await tool.handler!(input, makeCtx() as never)) as Record<
			string,
			unknown
		>;
		expect(questionsPayload.message).toBe('Finish setup (1/5)');

		const credentialsPayload = (await tool.handler!(
			input,
			makeCtx({
				resumeData: { answers: [{ questionId: 'model', selectedOptions: ['gpt'] }] },
				suspendPayload: questionsPayload,
			}) as never,
		)) as Record<string, unknown>;
		expect(credentialsPayload.message).toBe('Finish setup (2/5)');

		const slackPayload = (await tool.handler!(
			input,
			makeCtx({
				resumeData: { credentials: { airtableApi: 'new-cred' } },
				suspendPayload: credentialsPayload,
			}) as never,
		)) as Record<string, unknown>;
		expect(slackPayload).toMatchObject({
			message: 'Set up the slack channel',
			channelConfig: { integrationType: 'slack', agentId: 'agent-1' },
			projectId: 'project-1',
		});

		const telegramPayload = (await tool.handler!(
			input,
			makeCtx({ resumeData: { approved: false }, suspendPayload: slackPayload }) as never,
		)) as Record<string, unknown>;
		expect(telegramPayload.message).toBe('Set up the telegram channel');
		expect(BASE_DEPS.track).not.toHaveBeenCalledWith(TELEMETRY_EVENT.AGENTS.BUILDER_ADDED_TRIGGER, {
			trigger_type: 'slack',
		});

		const linearPayload = (await tool.handler!(
			input,
			makeCtx({ resumeData: { approved: true }, suspendPayload: telegramPayload }) as never,
		)) as Record<string, unknown>;
		expect(linearPayload).toMatchObject({
			message: 'Set up the linear channel',
			channelConfig: { integrationType: 'linear', agentId: 'agent-1' },
		});
		const legacyPayload = linearPayload as {
			finishSetupChain: { collected: { channels: Record<string, string> } };
		};
		legacyPayload.finishSetupChain.collected.channels.telegram = 'connected';
		expect((tool.suspendSchema as z.ZodTypeAny).safeParse(legacyPayload).success).toBe(true);

		const result = await tool.handler!(
			input,
			makeCtx({ resumeData: { approved: true }, suspendPayload: legacyPayload }) as never,
		);
		expect(result).toEqual({
			completed: true,
			answers: [{ questionId: 'model', selectedOptions: ['gpt'] }],
			credentials: { airtableApi: { id: 'new-cred', name: 'new-cred' } },
			channels: { slack: 'skipped', telegram: 'configured', linear: 'configured' },
		});
		expect(BASE_DEPS.track).toHaveBeenCalledWith(TELEMETRY_EVENT.AGENTS.BUILDER_ADDED_TRIGGER, {
			trigger_type: 'telegram',
		});
	});

	it('throws for an unsupported channel type', async () => {
		const tool = buildFinishSetupTool({
			...BASE_DEPS,
			credentialProvider: makeProvider([]),
		});
		const ctx = makeCtx();

		await expect(
			tool.handler!({ channels: [{ integrationType: 'carrier-pigeon' }] }, ctx as never),
		).rejects.toThrow('Unsupported chat channel "carrier-pigeon"');
		expect(ctx.suspend).not.toHaveBeenCalled();
	});
});
