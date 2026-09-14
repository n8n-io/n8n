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
 * So this asserts the constraint from the channel side: every type the registry
 * can produce must be insertable.
 */
const REGISTERED_INTEGRATION_TYPES = ['telegram', 'slack', 'linear', 'discord', 'teams'] as const;

beforeAll(async () => {
	await testModules.loadModules(['agents']);
	await testDb.init();
});

let agentId: string;

beforeEach(async () => {
	// The agents module owns these tables, so they are not in testDb's entity
	// list — clear them through their own repositories.
	await Container.get(AgentChatSubscriptionRepository).delete({});
	await Container.get(AgentRepository).delete({});
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
	it.each(REGISTERED_INTEGRATION_TYPES)('accepts a %s subscription', async (integrationType) => {
		const repository = Container.get(AgentChatSubscriptionRepository);
		const scope = {
			agentId,
			integrationType,
			credentialId: `cred-${integrationType}`,
		};

		await repository.subscribe(scope, `thread-${integrationType}`);

		await expect(repository.isSubscribed(scope, `thread-${integrationType}`)).resolves.toBe(true);
	});
});
