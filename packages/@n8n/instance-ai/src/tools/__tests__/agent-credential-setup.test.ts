import { MANAGED_CREDENTIAL_TOKEN } from '@n8n/api-types';

import type { InstanceAiContext } from '../../types';
import { setupAgentCredentials, type AgentCredentialRequest } from '../agent-credential-setup';
import type { CredentialToolContext, CredentialsResumeData } from '../credential-card';

vi.mock('../credential-verification', async (importOriginal) => ({
	...(await importOriginal<typeof import('../credential-verification')>()),
	verifySelectedCredential: vi.fn(
		async (_context: unknown, credentialType: string, credentialId: string) => ({
			credentialType,
			credentialId,
			connection: 'passed',
		}),
	),
}));

const target = { agentId: 'agent-1', projectId: 'project-1' };

function createContext(
	credentialsByType: Record<string, Array<{ id: string; name: string }>>,
	defaults = { channelCredentialIds: [] as string[], managedCredentialAvailable: false },
) {
	const delegate = {
		getCredentialDefaults: vi.fn(async () => defaults),
		trackCredentialRequest: vi.fn(),
	};
	const context = {
		agentBuilderTarget: target,
		threadId: 'thread-1',
		runId: 'run-1',
		builderDelegate: delegate,
		credentialService: {
			list: vi.fn(async ({ type }: { type: string }) => credentialsByType[type] ?? []),
		},
	} as unknown as InstanceAiContext;
	return { context, delegate };
}

function createToolContext(resumeData?: CredentialsResumeData) {
	const suspend = vi.fn(async (payload: unknown) => ({ suspended: payload }));
	return { ctx: { resumeData, suspend } as unknown as CredentialToolContext, suspend };
}

describe('setupAgentCredentials', () => {
	it('returns an error when no Agent is selected', async () => {
		const { context } = createContext({});
		context.agentBuilderTarget = undefined;
		context.threadId = undefined;

		const result = await setupAgentCredentials(
			context,
			[{ credentialType: 'slackApi' }],
			createToolContext().ctx,
		);

		expect(result).toMatchObject({ error: 'no_agent_target' });
	});

	it('selects the managed credential when the request allows it', async () => {
		const { context } = createContext(
			{ openAiApi: [{ id: 'cred-1', name: 'OpenAI' }] },
			{ channelCredentialIds: [], managedCredentialAvailable: true },
		);
		const { ctx, suspend } = createToolContext();

		const result = await setupAgentCredentials(
			context,
			[{ credentialType: 'openAiApi', allowManaged: true }],
			ctx,
		);

		expect(suspend).not.toHaveBeenCalled();
		expect(result).toMatchObject({
			success: true,
			verified: true,
			credentials: { openAiApi: { id: MANAGED_CREDENTIAL_TOKEN } },
		});
	});

	it('does not select the managed credential for a type n8n cannot supply', async () => {
		const { context } = createContext(
			{ slackApi: [] },
			{ channelCredentialIds: [], managedCredentialAvailable: true },
		);
		const { ctx, suspend } = createToolContext();

		await setupAgentCredentials(context, [{ credentialType: 'slackApi', allowManaged: true }], ctx);

		expect(suspend).toHaveBeenCalledTimes(1);
	});

	it('shows the card with nothing selected when the request sets preferNew', async () => {
		const { context } = createContext(
			{ slackApi: [{ id: 'cred-1', name: 'Channel Slack' }] },
			{ channelCredentialIds: ['cred-1'], managedCredentialAvailable: false },
		);
		const { ctx, suspend } = createToolContext();

		await setupAgentCredentials(context, [{ credentialType: 'slackApi', preferNew: true }], ctx);

		expect(suspend.mock.calls[0][0]).toMatchObject({
			credentialRequests: [{ credentialType: 'slackApi', preferNew: true }],
		});
	});

	it('passes the setup hint to the card', async () => {
		const { context } = createContext({});
		const { ctx, suspend } = createToolContext();
		const setupHint = { recipe: 'header' } as unknown as AgentCredentialRequest['setupHint'];

		await setupAgentCredentials(context, [{ credentialType: 'httpCustomAuth', setupHint }], ctx);

		expect(suspend.mock.calls[0][0]).toMatchObject({
			credentialRequests: [{ credentialType: 'httpCustomAuth', setupHint }],
		});
	});

	it('prefers the channel credential over other credentials of the type', async () => {
		const { context } = createContext(
			{
				slackApi: [
					{ id: 'cred-1', name: 'Other Slack' },
					{ id: 'cred-2', name: 'Channel Slack' },
				],
			},
			{ channelCredentialIds: ['cred-2'], managedCredentialAvailable: false },
		);

		const result = await setupAgentCredentials(
			context,
			[{ credentialType: 'slackApi' }],
			createToolContext().ctx,
		);

		expect(result).toMatchObject({
			credentials: { slackApi: { id: 'cred-2', name: 'Channel Slack' } },
		});
	});

	it('selects the only credential of a service type', async () => {
		const { context } = createContext({ notionApi: [{ id: 'cred-1', name: 'Notion' }] });

		const result = await setupAgentCredentials(
			context,
			[{ credentialType: 'notionApi' }],
			createToolContext().ctx,
		);

		expect(result).toMatchObject({ credentials: { notionApi: { id: 'cred-1', name: 'Notion' } } });
	});

	it('shows one card for every request that needs a pick', async () => {
		const { context, delegate } = createContext({
			httpBearerAuth: [{ id: 'cred-1', name: 'Bearer' }],
			notionApi: [{ id: 'cred-2', name: 'Notion' }],
			slackApi: [],
		});
		const { ctx, suspend } = createToolContext();

		await setupAgentCredentials(
			context,
			[
				{ credentialType: 'httpBearerAuth', reason: 'Call the API' },
				{ credentialType: 'notionApi' },
				{ credentialType: 'slackApi' },
			],
			ctx,
		);

		expect(suspend).toHaveBeenCalledTimes(1);
		expect(suspend.mock.calls[0][0]).toMatchObject({
			projectId: 'project-1',
			credentialRequests: [
				{
					credentialType: 'httpBearerAuth',
					reason: 'Call the API',
					existingCredentials: [{ id: 'cred-1', name: 'Bearer' }],
				},
				{ credentialType: 'slackApi', existingCredentials: [] },
			],
		});
		expect(delegate.trackCredentialRequest).toHaveBeenCalledWith(
			'agent-1',
			{ threadId: 'thread-1', runId: 'run-1' },
			{ credentialType: 'httpBearerAuth', outcome: 'requested' },
		);
	});

	it('maps the card selection and reports skipped types', async () => {
		const { context, delegate } = createContext({
			httpBearerAuth: [{ id: 'cred-1', name: 'Bearer' }],
			slackApi: [],
		});
		const { ctx } = createToolContext({
			approved: true,
			credentials: { httpBearerAuth: 'cred-1' },
		});

		const result = await setupAgentCredentials(
			context,
			[{ credentialType: 'httpBearerAuth' }, { credentialType: 'slackApi' }],
			ctx,
		);

		expect(result).toMatchObject({
			success: true,
			verified: false,
			credentials: { httpBearerAuth: { id: 'cred-1', name: 'Bearer' } },
			skipped: ['slackApi'],
		});
		expect(delegate.trackCredentialRequest).toHaveBeenCalledWith('agent-1', expect.anything(), {
			credentialType: 'slackApi',
			outcome: 'skipped',
		});
	});
});
