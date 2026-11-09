import { encodeThreadId as encodeTeamsThreadId } from '@chat-adapter/teams';
import { AgentIntegrationSchema } from '@n8n/api-types';
import { createTeamProject, testDb, testModules } from '@n8n/backend-test-utils';
import { Container } from '@n8n/di';

import { AgentChatSubscriptionRepository } from '../../repositories/agent-chat-subscription.repository';
import { AgentRepository } from '../../repositories/agent.repository';

/**
 * `agent_chat_subscriptions.integrationType` is guarded by a CHECK constraint
 * that each new channel has to widen with its own migration. Miss it and the
 * channel connects, runs, and then fails on the first subscribed message —
 * which unit tests never see, because they all run on in-memory state.
 *
 * The types come from the schema rather than a list here: the mistake this
 * guards against is forgetting to add a channel, so a hand-written list would
 * be forgotten in the same edit.
 */
const INTEGRATION_TYPES = AgentIntegrationSchema.options.map((option) => option.shape.type.value);

let agentId: string;

beforeAll(async () => {
	await testModules.loadModules(['agents']);
	await testDb.init();

	const project = await createTeamProject();
	const agent = await Container.get(AgentRepository).save(
		Container.get(AgentRepository).create({
			name: 'Subscription constraint agent',
			projectId: project.id,
			integrations: [],
		}),
	);
	agentId = agent.id;
});

afterAll(async () => {
	await testDb.terminate();
});

describe('agent chat subscription integration types', () => {
	it('accepts a subscription for every integration type the schema allows', async () => {
		const repository = Container.get(AgentChatSubscriptionRepository);
		expect(INTEGRATION_TYPES).toContain('teams');

		for (const integrationType of INTEGRATION_TYPES) {
			const scope = { agentId, integrationType, credentialId: `cred-${integrationType}` };
			const threadId = `thread-${integrationType}`;

			await repository.subscribe(scope, threadId, {});

			await expect(repository.isSubscribed(scope, threadId, {})).resolves.toBe(true);
		}
	});

	// Without this the suite would still pass if a migration dropped the check
	// altogether, which would make the test above prove nothing.
	it('rejects a type the constraint does not list', async () => {
		const repository = Container.get(AgentChatSubscriptionRepository);
		const scope = { agentId, integrationType: 'not-a-channel', credentialId: 'cred-x' };

		await expect(repository.subscribe(scope, 'thread-x', {})).rejects.toThrow();
	});

	it('stores a Teams DM thread id from a regional tenant', async () => {
		const repository = Container.get(AgentChatSubscriptionRepository);
		const scope = { agentId, integrationType: 'teams', credentialId: 'cred-teams-regional' };
		const threadId = encodeTeamsThreadId({
			conversationId: `a:1${'Xt9TpfmYq2Lr0kZbN4cVwHs8eUjG7dOaFyM3iRnK6lQxB5gS1vPzWuCo-_h2JmE4'.repeat(2)}`,
			serviceUrl: 'https://smba.trafficmanager.net/au/72f988bf-86f1-41af-91ab-2d7cd011db47/',
		});
		expect(threadId.length).toBeGreaterThan(255);

		await repository.subscribe(scope, threadId, {});

		await expect(repository.isSubscribed(scope, threadId, {})).resolves.toBe(true);
	});
});
