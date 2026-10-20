import type { ModuleRegistry } from '@n8n/backend-common';
import { mockInstance } from '@n8n/backend-test-utils';
import type { User } from '@n8n/db';
import { ForbiddenError, NotFoundError } from '@n8n/errors';
import { mock } from 'vitest-mock-extended';

import { AgentDraftService } from '@/modules/agents/agent-draft.service';
import type { AgentDraftState } from '@/modules/agents/agent-draft.contracts';

import type { InstanceAiMemoryService } from '../instance-ai-memory.service';
import { InstanceAiPendingAgentService } from '../instance-ai-pending-agent.service';

vi.mock('@/modules/agents/agent-draft.service', () => ({
	AgentDraftService: class AgentDraftService {},
}));

const user = mock<User>({ id: 'user-1' });
const payload = { projectId: 'project-1', agentId: 'agent-1', name: 'Draft name' };
const pendingMetadata = {
	instanceAiPendingAgentTarget: { projectId: 'project-1', agentId: 'agent-1' },
};
const boundMetadata = {
	instanceAiAgentBuilderTarget: { projectId: 'project-1', agentId: 'agent-1', name: 'Saved name' },
};

function setup() {
	const memory = mock<InstanceAiMemoryService>();
	const agents = mockInstance(AgentDraftService);
	const moduleRegistry = mock<ModuleRegistry>();
	Object.defineProperty(moduleRegistry, 'settings', { value: new Map() });
	moduleRegistry.isActive.mockReturnValue(true);
	memory.getThreadProjectId.mockResolvedValue('project-1');
	memory.getThreadMetadata.mockResolvedValue(pendingMetadata);
	memory.bindAgentBuilderTarget.mockResolvedValue({
		id: 'thread-1',
		metadata: boundMetadata,
	} as never);
	const getState = vi
		.fn()
		.mockResolvedValue(
			mock<AgentDraftState>({ id: 'agent-1', name: 'Saved name', isRunnable: true }),
		);
	agents.persistDraft.mockResolvedValue({ id: 'agent-1', name: 'Saved name', getState });
	return {
		service: new InstanceAiPendingAgentService(memory, moduleRegistry),
		memory,
		agents,
		moduleRegistry,
		getState,
	};
}

describe('InstanceAiPendingAgentService', () => {
	beforeEach(() => vi.clearAllMocks());

	it.each([pendingMetadata, boundMetadata])(
		'attests adoption from the thread and binds the persisted name',
		async (metadata) => {
			const { service, memory, agents } = setup();
			memory.getThreadMetadata.mockResolvedValue(metadata);
			const result = await service.persistAndBind(user, 'thread-1', payload);
			expect(agents.persistDraft).toHaveBeenCalledWith(user, 'project-1', {
				id: 'agent-1',
				name: 'Draft name',
				adoptOnCollision: true,
			});
			expect(memory.bindAgentBuilderTarget).toHaveBeenCalledWith(user.id, 'thread-1', {
				agentId: 'agent-1',
				projectId: 'project-1',
				name: 'Saved name',
			});
			expect(result.agent).toMatchObject({ id: 'agent-1', isRunnable: true });
			expect(result.thread.metadata).toEqual(boundMetadata);
		},
	);

	const unattestedMetadata = [
		{},
		undefined,
		{ instanceAiPendingAgentTarget: { projectId: 'project-1', agentId: 'other-agent' } },
		{ instanceAiPendingAgentTarget: { projectId: 'other-project', agentId: 'agent-1' } },
		{ instanceAiAgentBuilderTarget: { projectId: 'other-project', agentId: 'agent-1' } },
	];

	it.each(unattestedMetadata)(
		'permits a strict create but refuses adoption without attestation: %j',
		async (metadata) => {
			const { service, memory, agents } = setup();
			memory.getThreadMetadata.mockResolvedValue(metadata);
			await service.persistAndBind(user, 'thread-1', payload);
			expect(agents.persistDraft).toHaveBeenCalledWith(
				user,
				'project-1',
				expect.objectContaining({ adoptOnCollision: false }),
			);
			agents.persistDraft.mockResolvedValue(null);
			memory.bindAgentBuilderTarget.mockClear();
			await expect(service.persistAndBind(user, 'thread-1', payload)).rejects.toThrow(
				ForbiddenError,
			);
			expect(memory.bindAgentBuilderTarget).not.toHaveBeenCalled();
		},
	);

	it('propagates a bind failure and retries against the saved draft', async () => {
		const { service, memory, agents, getState } = setup();
		memory.bindAgentBuilderTarget.mockRejectedValueOnce(new Error('Thread write failed'));
		await expect(service.persistAndBind(user, 'thread-1', payload)).rejects.toThrow(
			'Thread write failed',
		);
		expect(getState).not.toHaveBeenCalled();
		await expect(service.persistAndBind(user, 'thread-1', payload)).resolves.toBeDefined();
		expect(agents.persistDraft).toHaveBeenCalledTimes(2);
		expect(memory.bindAgentBuilderTarget).toHaveBeenCalledTimes(2);
	});

	it('refuses cross-project binding before it writes a draft', async () => {
		const { service, memory, agents } = setup();
		memory.getThreadProjectId.mockResolvedValue('other-project');
		await expect(service.persistAndBind(user, 'thread-1', payload)).rejects.toThrow(ForbiddenError);
		expect(agents.persistDraft).not.toHaveBeenCalled();
	});

	it('accepts a legacy thread with no persisted project', async () => {
		const { service, memory } = setup();
		memory.getThreadProjectId.mockResolvedValue(undefined);
		await expect(service.persistAndBind(user, 'thread-1', payload)).resolves.toBeDefined();
	});

	it.each(['module', 'settings'])(
		'reports disabled Agents before it reads thread metadata: %s',
		async (disabled) => {
			const { service, memory, moduleRegistry } = setup();
			if (disabled === 'module') moduleRegistry.isActive.mockReturnValue(false);
			else moduleRegistry.settings.set('agents', { enabled: false });
			await expect(service.persistAndBind(user, 'thread-1', payload)).rejects.toThrow(
				NotFoundError,
			);
			expect(memory.getThreadMetadata).not.toHaveBeenCalled();
		},
	);
});
