import type { SerializableAgentState } from '@n8n/agents';
import type { InstanceAiThreadInfo } from '@n8n/api-types';
import { getPersonalProject, testDb } from '@n8n/backend-test-utils';
import type { User } from '@n8n/db';
import { Container } from '@n8n/di';
import { randomUUID } from 'node:crypto';

import { AgentCheckpointRepository } from '@/modules/agents/repositories/agent-checkpoint.repository';
import { AgentExecutionRepository } from '@/modules/agents/repositories/agent-execution.repository';
import { AgentExecutionThreadRepository } from '@/modules/agents/repositories/agent-execution-thread.repository';
import { ASSISTANT_AGENT_ID } from '@/modules/instance-ai/assistant-turn-options';
import { InstanceAiMemoryService } from '@/modules/instance-ai/instance-ai-memory.service';

import { createMember } from './shared/db/users';
import type { SuperAgentTest } from './shared/types';
import * as utils from './shared/utils/';

/** GET /instance-ai/threads: each thread says what it needs from its owner. */

const testServer = utils.setupTestServer({
	endpointGroups: ['instance-ai'],
	// The Assistant runs on the Agents runtime, so its module needs the agents module.
	modules: ['agents', 'instance-ai'],
});

const at = (minute: number) => new Date(Date.UTC(2026, 9, 1, 9, minute));

let owner: User;
let ownerAgent: SuperAgentTest;

beforeAll(async () => {
	owner = await createMember();
	ownerAgent = testServer.authAgentFor(owner);
});

afterEach(async () => {
	await Container.get(AgentCheckpointRepository).delete({});
	await Container.get(AgentExecutionRepository).delete({});
	await Container.get(AgentExecutionThreadRepository).delete({});
});

afterAll(async () => await testDb.terminate());

/** Creates an Assistant thread of the owner with a fixed session update time, which sets the list order. */
async function createThread(user: User, updatedAt: Date): Promise<string> {
	const threadId = randomUUID();
	const project = await getPersonalProject(user);
	await Container.get(InstanceAiMemoryService).ensureThread(user.id, threadId, project.id, {
		source: 'assistant_page',
		origin: 'internal',
	});
	await Container.get(AgentExecutionThreadRepository).update({ id: threadId }, { updatedAt });
	return threadId;
}

async function addExecution(
	threadId: string,
	status: 'running' | 'success' | 'error',
	createdAt: Date,
	stoppedAt: Date | null,
) {
	await Container.get(AgentExecutionRepository).insert({
		id: randomUUID(),
		threadId,
		status,
		createdAt,
		startedAt: createdAt,
		stoppedAt,
	});
}

async function addSuspendedCheckpoint(threadId: string) {
	const state: SerializableAgentState = {
		status: 'suspended',
		persistence: { threadId, resourceId: `draft-chat:${owner.id}` },
		messageList: { messages: [], historyIds: [], inputIds: [], responseIds: [] },
		pendingToolCalls: {},
	};
	await Container.get(AgentCheckpointRepository).insert({
		runId: randomUUID(),
		agentId: ASSISTANT_AGENT_ID,
		threadId,
		state: JSON.stringify(state),
		expired: false,
	});
}

describe('GET /instance-ai/threads', () => {
	test('returns the state of each thread and keeps the list order', async () => {
		const idle = await createThread(owner, at(40));
		const failed = await createThread(owner, at(30));
		const working = await createThread(owner, at(20));
		const waiting = await createThread(owner, at(10));
		await addExecution(failed, 'error', at(5), at(6));
		await addExecution(working, 'running', at(7), null);
		await addExecution(waiting, 'success', at(8), at(9));
		await addSuspendedCheckpoint(waiting);

		const response = await ownerAgent.get('/instance-ai/threads').expect(200);
		const threads: InstanceAiThreadInfo[] = response.body.data.threads;

		expect(
			threads.map(({ id, state, needsInput, lastActivityAt }) => ({
				id,
				state,
				needsInput,
				lastActivityAt,
			})),
		).toEqual([
			// A thread without a turn falls back to the session update time.
			{ id: idle, state: 'idle', needsInput: false, lastActivityAt: at(40).toISOString() },
			{ id: failed, state: 'failed', needsInput: false, lastActivityAt: at(6).toISOString() },
			{ id: working, state: 'working', needsInput: false, lastActivityAt: at(7).toISOString() },
			{ id: waiting, state: 'needs-you', needsInput: true, lastActivityAt: at(9).toISOString() },
		]);
		expect(threads[0]).toMatchObject({ resourceId: owner.id, updatedAt: at(40).toISOString() });
	});

	test('does not list the threads of another user', async () => {
		const other = await createMember();
		await createThread(other, at(1));
		const mine = await createThread(owner, at(2));

		const response = await ownerAgent.get('/instance-ai/threads').expect(200);

		expect(response.body.data.threads.map(({ id }: InstanceAiThreadInfo) => id)).toEqual([mine]);
	});
});
