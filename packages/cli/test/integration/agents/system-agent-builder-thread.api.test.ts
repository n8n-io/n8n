import { randomUUID } from 'node:crypto';

import { createTeamProject, testModules } from '@n8n/backend-test-utils';
import type { User } from '@n8n/db';
import { Container } from '@n8n/di';

import { AgentExecutionThreadRepository } from '@/modules/agents/repositories/agent-execution-thread.repository';
import { SystemAgentExecutionService } from '@/modules/agents/system-agents/system-agent-execution.service';

import { createMember } from '../shared/db/users';
import { setupTestServer } from '../shared/utils';

const INSTANCE_AGENT_ID = 'test-instance-assistant';

beforeAll(async () => {
	await testModules.loadModules(['agents']);
});

const server = setupTestServer({ endpointGroups: ['ai'] });

// An Agent builder session has the agent and owner of its parent Assistant
// session. The system agent routes must still treat it as unknown.
describe('System agent routes with an Agent builder session id', () => {
	let user: User;
	let parentThreadId: string;
	let builderThreadId: string;

	beforeAll(async () => {
		await Container.get(SystemAgentExecutionService).register({
			agentId: INSTANCE_AGENT_ID,
			name: 'Assistant',
			authorize: async () => true,
			prepareTurn: vi.fn(),
		});
		user = await createMember();
		const projectId = (await createTeamProject(undefined, user)).id;
		const threadRepository = Container.get(AgentExecutionThreadRepository);
		const session = {
			agentId: INSTANCE_AGENT_ID,
			projectId,
			accessScope: 'user' as const,
			ownerId: user.id,
		};
		parentThreadId = randomUUID();
		builderThreadId = `ia-builder:${parentThreadId}:${randomUUID()}`;
		await threadRepository.save(
			threadRepository.create({ ...session, id: parentThreadId, agentName: 'Assistant' }),
		);
		await threadRepository.save(
			threadRepository.create({
				...session,
				id: builderThreadId,
				agentName: 'agent-builder',
				parentThreadId,
				parentAgentId: INSTANCE_AGENT_ID,
			}),
		);
	});

	it('returns the usage of the parent session', async () => {
		await server
			.authAgentFor(user)
			.get(`/agents/system/${INSTANCE_AGENT_ID}/chat/${parentThreadId}/usage`)
			.expect(200);
	});

	it.each(['usage', 'background-tasks'])(
		'returns 404 for the %s of the builder session',
		async (route) => {
			await server
				.authAgentFor(user)
				.get(
					`/agents/system/${INSTANCE_AGENT_ID}/chat/${encodeURIComponent(builderThreadId)}/${route}`,
				)
				.expect(404);
		},
	);
});
