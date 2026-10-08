import { createTeamProject, linkUserToProject } from '@n8n/backend-test-utils';
import type { Project, User } from '@n8n/db';
import { Container } from '@n8n/di';
import { randomUUID } from 'node:crypto';

import type { AgentExecutionThread } from '@/modules/agents/entities/agent-execution-thread.entity';
import { AgentExecutionThreadRepository } from '@/modules/agents/repositories/agent-execution-thread.repository';
import { AgentRepository } from '@/modules/agents/repositories/agent.repository';

import { createAdmin, createChatUser, createUser } from '../shared/db/users';
import type { SuperAgentTest } from '../shared/types';
import { setupTestServer } from '../shared/utils';

/**
 * The Agents module runs without the module that registers the Assistant provider (for
 * example `N8N_DISABLED_MODULES=instance-ai`). The Assistant rows stay in the database.
 * Without the provider no sharing rules exist, so the Agents read routes show no Assistant
 * thread to anyone.
 */

const ASSISTANT_ID = 'n8n-assistant';

const server = setupTestServer({ endpointGroups: ['ai'], modules: ['agents'] });

let owner: User;
let teammate: User;
let chatUser: User;
let admin: User;
let project: Project;
let sharedThreadId: string;
let privateThreadId: string;

async function createThread(access: Pick<AgentExecutionThread, 'accessScope' | 'ownerId'>) {
	const threads = Container.get(AgentExecutionThreadRepository);
	const id = randomUUID();
	await threads.save(
		threads.create({
			id,
			agentId: ASSISTANT_ID,
			agentName: 'n8n Assistant',
			projectId: project.id,
			parentThreadId: null,
			title: 'Invoices',
			...access,
		}),
	);
	return id;
}

beforeAll(async () => {
	owner = await createUser({ firstName: 'Olivia', lastName: 'Owner' });
	teammate = await createUser({ firstName: 'Tom', lastName: 'Teammate' });
	// A project member without the Assistant scope.
	chatUser = await createChatUser();
	// A global admin who is not a member of the project.
	admin = await createAdmin();
	project = await createTeamProject('Finance', owner);
	await linkUserToProject(teammate, project, 'project:editor');
	await linkUserToProject(chatUser, project, 'project:viewer');
	// The instance agent row stays when its module is off.
	await Container.get(AgentRepository).ensureInstanceAgent(ASSISTANT_ID, 'n8n Assistant');
	sharedThreadId = await createThread({ accessScope: 'project', ownerId: owner.id });
	privateThreadId = await createThread({ accessScope: 'user', ownerId: owner.id });
});

const agentUrl = () => `/projects/${project.id}/agents/v2/${ASSISTANT_ID}`;

describe('Assistant threads on the Agents read routes without a registered provider', () => {
	let agents: Record<'teammate' | 'chatUser' | 'admin' | 'owner', SuperAgentTest>;

	beforeAll(() => {
		agents = {
			teammate: server.authAgentFor(teammate),
			chatUser: server.authAgentFor(chatUser),
			admin: server.authAgentFor(admin),
			owner: server.authAgentFor(owner),
		};
	});

	test.each(['teammate', 'chatUser', 'admin', 'owner'] as const)(
		'answers 404 to the %s on the session list and on each session',
		async (who) => {
			const agent = agents[who];

			await agent.get(`${agentUrl()}/threads`).expect(404);
			await agent.get(`${agentUrl()}/threads/${sharedThreadId}`).expect(404);
			await agent.get(`${agentUrl()}/threads/${privateThreadId}`).expect(404);
		},
	);

	test.each(['teammate', 'chatUser', 'admin'] as const)(
		'answers 404 to the %s on the chat read routes of the shared thread',
		async (who) => {
			const agent = agents[who];

			for (const path of ['messages', 'queue', 'background-tasks']) {
				await agent.get(`${agentUrl()}/chat/${sharedThreadId}/${path}`).expect(404);
			}
		},
	);
});
