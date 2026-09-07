import { randomUUID } from 'node:crypto';

import { createTeamProject, testDb, testModules } from '@n8n/backend-test-utils';
import type { Project } from '@n8n/db';
import { Container } from '@n8n/di';
import type { SerializableAgentState } from '@n8n/instance-ai';

import { InstanceAiCheckpointRepository } from '../instance-ai-checkpoint.repository';
import { InstanceAiThreadRepository } from '../instance-ai-thread.repository';

function makeState(toolCallId: string): SerializableAgentState {
	return {
		status: 'suspended',
		messageList: {
			messages: [],
			historyIds: [],
			inputIds: [],
			responseIds: [],
		},
		pendingToolCalls: {
			[toolCallId]: {
				toolCallId,
				toolName: 'ask-user',
				input: {},
				suspended: true,
				suspendPayload: {},
				resumeSchema: {},
				runId: 'run-1',
			},
		},
		persistence: {
			threadId: 'thread-placeholder',
			resourceId: 'user-1',
		},
	};
}

function forThread(state: SerializableAgentState, threadId: string): SerializableAgentState {
	return {
		...state,
		persistence: {
			...state.persistence,
			threadId,
			resourceId: state.persistence?.resourceId ?? 'user-1',
		},
	};
}

describe('InstanceAiCheckpointRepository.claimSuspendedForResume', () => {
	let checkpointRepository: InstanceAiCheckpointRepository;
	let threadRepository: InstanceAiThreadRepository;
	let project: Project;
	let threadId: string;

	beforeAll(async () => {
		await testModules.loadModules(['instance-ai']);
		await testDb.init();
		checkpointRepository = Container.get(InstanceAiCheckpointRepository);
		threadRepository = Container.get(InstanceAiThreadRepository);
		project = await createTeamProject();
	});

	beforeEach(async () => {
		await checkpointRepository.delete({});
		await threadRepository.delete({});
		threadId = randomUUID();
		await threadRepository.save(
			threadRepository.create({
				id: threadId,
				resourceId: 'user-1',
				projectId: project.id,
				title: '',
				metadata: null,
			}),
		);
	});

	afterAll(async () => {
		await testDb.terminate();
	});

	async function saveCheckpoint(state: SerializableAgentState) {
		await checkpointRepository.save(
			checkpointRepository.create({
				key: 'checkpoint:run-1',
				runId: 'run-1',
				hostRunId: 'host-run-1',
				threadId,
				resourceId: 'user-1',
				state: forThread(state, threadId),
				expiredAt: null,
			}),
		);
	}

	it('allows only one caller to claim the same suspended snapshot', async () => {
		const state = makeState('tool-call-a');
		await saveCheckpoint(state);
		const expectedState = forThread(state, threadId);

		const outcomes = await Promise.all([
			checkpointRepository.claimSuspendedForResume('checkpoint:run-1', expectedState),
			checkpointRepository.claimSuspendedForResume('checkpoint:run-1', expectedState),
		]);

		expect(outcomes.sort()).toEqual([false, true]);
		await expect(
			checkpointRepository.findOneByOrFail({ key: 'checkpoint:run-1' }),
		).resolves.toEqual(
			expect.objectContaining({ state: expect.objectContaining({ status: 'running' }) }),
		);
	});

	it('does not let a delayed claim for snapshot A consume a newer suspension B', async () => {
		const stateA = makeState('tool-call-a');
		await saveCheckpoint(stateA);
		const expectedStateA = forThread(stateA, threadId);
		await expect(
			checkpointRepository.claimSuspendedForResume('checkpoint:run-1', expectedStateA),
		).resolves.toBe(true);

		const stateB = forThread(makeState('tool-call-b'), threadId);
		const row = await checkpointRepository.findOneByOrFail({ key: 'checkpoint:run-1' });
		row.state = stateB;
		await checkpointRepository.save(row);

		await expect(
			checkpointRepository.claimSuspendedForResume('checkpoint:run-1', expectedStateA),
		).resolves.toBe(false);
		await expect(
			checkpointRepository.findOneByOrFail({ key: 'checkpoint:run-1' }),
		).resolves.toEqual(expect.objectContaining({ state: stateB }));
	});
});
