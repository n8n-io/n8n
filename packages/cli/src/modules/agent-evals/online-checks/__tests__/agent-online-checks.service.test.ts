import type { Logger } from '@n8n/backend-common';
import type { User } from '@n8n/db';
import { NotFoundError } from '@n8n/errors';
import { mock } from 'vitest-mock-extended';

import type { CredentialsService } from '@/credentials/credentials.service';

import type { AgentContextService } from '../../../agents/agent-context.service';
import type { AgentSessionDetail } from '../../../agents/agent-context.contracts';
import { AgentOnlineChecksService } from '../agent-online-checks.service';

const user = mock<User>({ id: 'user-1' });
const PROJECT_ID = 'project-1';
const AGENT_ID = 'agent-1';

const artifact = {
	config: {
		name: 'Order help desk',
		model: 'anthropic/claude-sonnet-5-5',
		credential: 'cred-1',
		instructions: 'Never promise a delivery date.',
		tools: [],
	},
	skills: {},
};

const ideasAnswer = JSON.stringify({
	ideas: [{ kind: 'everyday', prompt: 'Where is my latest order?', why: 'Common request.' }],
});

function setup() {
	const context = mock<AgentContextService>();
	context.readArtifact.mockResolvedValue(artifact as never);
	const service = new AgentOnlineChecksService(context, mock<CredentialsService>(), mock<Logger>());
	const ask = vi.fn().mockResolvedValue(ideasAnswer);
	vi.spyOn(
		service as never as { modelFor: () => Promise<typeof ask> },
		'modelFor',
	).mockResolvedValue(ask);
	return { service, context, ask };
}

describe('AgentOnlineChecksService.promptIdeas', () => {
	it('returns the parsed ideas', async () => {
		const { service } = setup();

		await expect(service.promptIdeas(user, PROJECT_ID, AGENT_ID)).resolves.toEqual({
			ideas: [{ kind: 'everyday', prompt: 'Where is my latest order?', why: 'Common request.' }],
		});
	});

	it('asks the model once for the same agent setup', async () => {
		const { service, ask } = setup();

		await service.promptIdeas(user, PROJECT_ID, AGENT_ID);
		await service.promptIdeas(user, PROJECT_ID, AGENT_ID);

		expect(ask).toHaveBeenCalledTimes(1);
	});

	it('asks again after the instructions change', async () => {
		const { service, context, ask } = setup();

		await service.promptIdeas(user, PROJECT_ID, AGENT_ID);
		context.readArtifact.mockResolvedValue({
			...artifact,
			config: { ...artifact.config, instructions: 'Always give a delivery date.' },
		} as never);
		await service.promptIdeas(user, PROJECT_ID, AGENT_ID);

		expect(ask).toHaveBeenCalledTimes(2);
	});

	it('does not keep an answer it could not read, so the next click tries again', async () => {
		const { service, ask } = setup();
		ask.mockResolvedValueOnce('not json');

		await expect(service.promptIdeas(user, PROJECT_ID, AGENT_ID)).resolves.toEqual({ ideas: [] });
		await service.promptIdeas(user, PROJECT_ID, AGENT_ID);

		expect(ask).toHaveBeenCalledTimes(2);
	});

	it('404s for an agent the caller cannot read', async () => {
		const { service, context } = setup();
		context.readArtifact.mockResolvedValue(null as never);

		await expect(service.promptIdeas(user, PROJECT_ID, AGENT_ID)).rejects.toThrow(NotFoundError);
	});
});

describe('AgentOnlineChecksService.replyChecks', () => {
	const session = (status: 'success' | 'error', text: string): AgentSessionDetail =>
		({
			thread: {},
			executions: [
				{
					id: 'exec-1',
					status,
					userMessage: 'Where is my order?',
					timeline: text ? [{ type: 'text', content: text, timestamp: 1 }] : [],
				},
			],
		}) as never;

	it('returns no issues for a reply that passed every check', async () => {
		const { service, context } = setup();
		context.readSession.mockResolvedValue(session('success', 'It ships today.'));

		await expect(
			service.replyChecks(user, PROJECT_ID, AGENT_ID, 'thread-1', 'exec-1'),
		).resolves.toEqual({ issues: [] });
	});

	it('returns the failed run as an issue', async () => {
		const { service, context } = setup();
		context.readSession.mockResolvedValue(session('error', ''));

		await expect(
			service.replyChecks(user, PROJECT_ID, AGENT_ID, 'thread-1', 'exec-1'),
		).resolves.toEqual({
			issues: [
				{ checkId: 'tool:empty_reply', reason: 'The run failed and the person got no reply.' },
			],
		});
	});

	it('404s for an execution that is not in the session', async () => {
		const { service, context } = setup();
		context.readSession.mockResolvedValue(session('success', 'Hi'));

		await expect(
			service.replyChecks(user, PROJECT_ID, AGENT_ID, 'thread-1', 'other'),
		).rejects.toThrow(NotFoundError);
	});
});
