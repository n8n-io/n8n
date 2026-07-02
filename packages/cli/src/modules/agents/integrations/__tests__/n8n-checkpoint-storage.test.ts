import type { SerializableAgentState } from '@n8n/agents';
import { mockLogger } from '@n8n/backend-test-utils';
import type { AgentsConfig } from '@n8n/config';
import type { ModuleRegistry } from '@n8n/backend-common';
import type { InstanceSettings } from 'n8n-core';
import { mock } from 'vitest-mock-extended';

import type { AgentCheckpoint } from '../../entities/agent-checkpoint.entity';
import type { AgentCheckpointRepository } from '../../repositories/agent-checkpoint.repository';
import { N8NCheckpointStorage } from '../n8n-checkpoint-storage';

const suspendedState: SerializableAgentState = {
	status: 'suspended',
	persistence: { threadId: 'thread-1', resourceId: 'resource-1' },
	messageList: { messages: [], historyIds: [], inputIds: [], responseIds: [] },
	pendingToolCalls: {
		'tc-1': {
			toolCallId: 'tc-1',
			toolName: 'approve_action',
			input: { id: 'item-1' },
			suspended: false,
		},
	},
};

function makeService() {
	const repository = mock<AgentCheckpointRepository>();
	const service = new N8NCheckpointStorage(
		mock<InstanceSettings>({ isLeader: false, instanceRole: 'follower' }),
		repository,
		mockLogger(),
		mock<AgentsConfig>({ checkpointTtlSeconds: 60 }),
		mock<ModuleRegistry>({ isActive: vi.fn().mockReturnValue(true) }),
	);

	return { service, repository };
}

describe('N8NCheckpointStorage', () => {
	it('loads a suspended checkpoint without claiming it', async () => {
		const { service, repository } = makeService();
		const storedState = JSON.stringify(suspendedState);
		repository.findOneBy.mockResolvedValue({
			runId: 'run-1',
			expired: false,
			state: storedState,
		} as AgentCheckpoint);

		await expect(service.load('run-1')).resolves.toEqual(suspendedState);

		expect(repository.claimForResume).not.toHaveBeenCalled();
	});

	it('claims a checkpoint for resume with the original suspended state', async () => {
		const { service, repository } = makeService();
		repository.claimForResume.mockResolvedValueOnce(true).mockResolvedValueOnce(false);

		await expect(service.claimForResume('run-1', suspendedState)).resolves.toBe(true);
		expect(repository.claimForResume).toHaveBeenCalledWith(
			'run-1',
			JSON.stringify(suspendedState),
			JSON.stringify({ ...suspendedState, status: 'running' }),
		);
		await expect(service.claimForResume('run-1', suspendedState)).resolves.toBe(false);
	});
});
