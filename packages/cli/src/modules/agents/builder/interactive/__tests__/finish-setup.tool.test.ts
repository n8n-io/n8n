import type { CredentialListItem, CredentialProvider } from '@n8n/agents';
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

describe('finish_setup tool', () => {
	it('suspends first for questions with chain state and a progress message', async () => {
		const tool = buildFinishSetupTool({
			credentialProvider: makeProvider([]),
		});
		const ctx = makeCtx();

		const payload = (await tool.handler!(
			{ questions: [{ id: 'model', question: 'Which model?', type: 'single', options: ['gpt'] }] },
			ctx as never,
		)) as Record<string, unknown>;

		expect(payload).toMatchObject({
			inputType: 'questions',
			message: 'Finish setup (1/1)',
			questions: [{ id: 'model', question: 'Which model?', type: 'single', options: ['gpt'] }],
		});
		expect(payload.finishSetupChain).toMatchObject({
			currentPhase: { kind: 'questions' },
			remainingPhases: [],
			totalPhases: 1,
		});
	});

	it('auto-resolves single-credential and channel-matching slots, excluding them from the credential phase', async () => {
		const credentialProvider = makeProvider([
			{ id: 'c1', name: 'My Airtable', type: 'airtableApi' },
			{ id: 'c2', name: 'Personal Slack', type: 'slackApi' },
			{ id: 'c3', name: 'Notion A', type: 'notionApi' },
			{ id: 'c4', name: 'Notion B', type: 'notionApi' },
		]);
		const tool = buildFinishSetupTool({
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

	it('chains through questions and credentials to a merged result', async () => {
		const credentialProvider = makeProvider([]);
		const tool = buildFinishSetupTool({
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
		expect(questionsPayload.inputType).toBe('questions');
		expect(questionsPayload.message).toBe('Finish setup (1/2)');

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
	});

	it('marks the credential slot skipped when the credential phase is skipped', async () => {
		const credentialProvider = makeProvider([]);
		const tool = buildFinishSetupTool({
			credentialProvider,
		});
		const input = {
			credentialRequests: [{ credentialType: 'airtableApi', purpose: 'Airtable log' }],
		};

		const credentialsPayload = (await tool.handler!(input, makeCtx() as never)) as Record<
			string,
			unknown
		>;

		const result = await tool.handler!(
			input,
			makeCtx({ resumeData: { skipped: true }, suspendPayload: credentialsPayload }) as never,
		);
		expect(result).toEqual({
			completed: true,
			credentials: { airtableApi: 'skipped' },
		});
	});

	it('throws for an unknown credential type', async () => {
		const tool = buildFinishSetupTool({
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
			credentialProvider: makeProvider([]),
		});

		expect((tool.inputSchema as unknown as z.ZodTypeAny).safeParse({}).success).toBe(false);
	});
});
