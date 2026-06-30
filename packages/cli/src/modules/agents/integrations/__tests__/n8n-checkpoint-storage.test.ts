import type { SerializableAgentState } from '@n8n/agents';
import { mockLogger } from '@n8n/backend-test-utils';
import type { AgentsConfig } from '@n8n/config';
import type { ModuleRegistry } from '@n8n/backend-common';
import type { InstanceSettings } from 'n8n-core';
import { UserError } from 'n8n-workflow';
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
	it('claims a suspended checkpoint before returning it so concurrent resumes cannot both proceed', async () => {
		const { service, repository } = makeService();
		const storedState = JSON.stringify(suspendedState);
		repository.findOneBy.mockResolvedValue({
			runId: 'run-1',
			expired: false,
			state: storedState,
		} as AgentCheckpoint);
		repository.claimForResume.mockResolvedValueOnce(true).mockResolvedValueOnce(false);

		await expect(service.load('run-1')).resolves.toEqual(suspendedState);

		expect(repository.claimForResume).toHaveBeenCalledWith(
			'run-1',
			storedState,
			JSON.stringify({ ...suspendedState, status: 'running' }),
		);
		await expect(service.load('run-1')).rejects.toThrow(UserError);
		await expect(service.load('run-1')).rejects.toThrow('This action has already been handled');
	});
});
