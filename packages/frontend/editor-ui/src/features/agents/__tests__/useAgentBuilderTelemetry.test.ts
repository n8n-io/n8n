import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ref } from 'vue';
import { useAgentBuilderTelemetry } from '../composables/useAgentBuilderTelemetry';
import type { AgentJsonConfig, AgentResource } from '../types';

const agentTelemetryMock = vi.hoisted(() => ({
	trackAddedTasks: vi.fn(),
	trackRemovedTasks: vi.fn(),
}));

vi.mock('../composables/useAgentTelemetry', () => ({
	useAgentTelemetry: () => agentTelemetryMock,
}));

function configWithTasks(...taskIds: string[]): AgentJsonConfig {
	return {
		name: 'Agent One',
		model: 'gpt-4',
		instructions: 'Help users.',
		tasks: taskIds.map((id) => ({ type: 'task', id, enabled: true })),
	};
}

function makeAgent(overrides: Partial<AgentResource> = {}): AgentResource {
	return {
		id: 'agent-1',
		name: 'Agent One',
		activeVersionId: null,
		versionId: 'v1',
		...overrides,
	} as AgentResource;
}

function makeTelemetryDeps(savedConfig: AgentJsonConfig) {
	const deps = {
		agentId: ref('agent-1'),
		projectId: ref('project-1'),
		agent: ref(makeAgent()),
		localConfig: ref(savedConfig),
		savedConfig: ref(savedConfig),
		connectedTriggers: ref<string[]>([]),
	};
	return { deps, telemetry: useAgentBuilderTelemetry(deps) };
}

describe('useAgentBuilderTelemetry', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('trackTasksChanged emits once per newly added task', async () => {
		const { deps, telemetry } = makeTelemetryDeps(configWithTasks('task-1'));
		telemetry.captureTasksBaseline();
		deps.savedConfig.value = configWithTasks('task-1', 'task-2');
		deps.localConfig.value = deps.savedConfig.value;

		telemetry.trackTasksChanged();

		await vi.waitFor(() => expect(agentTelemetryMock.trackAddedTasks).toHaveBeenCalledOnce());
		expect(agentTelemetryMock.trackAddedTasks).toHaveBeenCalledWith({
			agentId: 'agent-1',
			taskAdded: 'task-2',
			tasks: ['task-1', 'task-2'],
			configVersion: expect.any(String),
			status: 'draft',
		});
		expect(agentTelemetryMock.trackRemovedTasks).not.toHaveBeenCalled();
	});

	it('trackTasksChanged emits once per removed task', async () => {
		const { deps, telemetry } = makeTelemetryDeps(configWithTasks('task-1', 'task-2'));
		telemetry.captureTasksBaseline();
		deps.savedConfig.value = configWithTasks('task-2');
		deps.localConfig.value = deps.savedConfig.value;

		telemetry.trackTasksChanged();

		await vi.waitFor(() => expect(agentTelemetryMock.trackRemovedTasks).toHaveBeenCalledOnce());
		expect(agentTelemetryMock.trackRemovedTasks).toHaveBeenCalledWith({
			agentId: 'agent-1',
			taskRemoved: 'task-1',
			tasks: ['task-2'],
			configVersion: expect.any(String),
			status: 'draft',
		});
		expect(agentTelemetryMock.trackAddedTasks).not.toHaveBeenCalled();
	});

	it('trackTasksChanged emits added and removed tasks for the same save', async () => {
		const { deps, telemetry } = makeTelemetryDeps(configWithTasks('task-1', 'task-2'));
		telemetry.captureTasksBaseline();
		deps.savedConfig.value = configWithTasks('task-2', 'task-3');
		deps.localConfig.value = deps.savedConfig.value;

		telemetry.trackTasksChanged();

		await vi.waitFor(() => {
			expect(agentTelemetryMock.trackAddedTasks).toHaveBeenCalledOnce();
			expect(agentTelemetryMock.trackRemovedTasks).toHaveBeenCalledOnce();
		});
		expect(agentTelemetryMock.trackAddedTasks).toHaveBeenCalledWith({
			agentId: 'agent-1',
			taskAdded: 'task-3',
			tasks: ['task-2', 'task-3'],
			configVersion: expect.any(String),
			status: 'draft',
		});
		expect(agentTelemetryMock.trackRemovedTasks).toHaveBeenCalledWith({
			agentId: 'agent-1',
			taskRemoved: 'task-1',
			tasks: ['task-2', 'task-3'],
			configVersion: expect.any(String),
			status: 'draft',
		});
	});

	it('trackTasksChanged no-ops when the baseline matches', () => {
		const { telemetry } = makeTelemetryDeps(configWithTasks('task-1'));
		telemetry.captureTasksBaseline();

		telemetry.trackTasksChanged();

		expect(agentTelemetryMock.trackAddedTasks).not.toHaveBeenCalled();
		expect(agentTelemetryMock.trackRemovedTasks).not.toHaveBeenCalled();
	});

	it('resetForAgentSwitch clears the task baseline', async () => {
		const { deps, telemetry } = makeTelemetryDeps(configWithTasks('task-1'));
		telemetry.captureTasksBaseline();
		telemetry.resetForAgentSwitch();
		deps.savedConfig.value = configWithTasks('task-2');
		deps.localConfig.value = deps.savedConfig.value;

		telemetry.trackTasksChanged();

		await vi.waitFor(() => expect(agentTelemetryMock.trackAddedTasks).toHaveBeenCalledOnce());
		expect(agentTelemetryMock.trackAddedTasks).toHaveBeenCalledWith({
			agentId: 'agent-1',
			taskAdded: 'task-2',
			tasks: ['task-2'],
			configVersion: expect.any(String),
			status: 'draft',
		});
		expect(agentTelemetryMock.trackRemovedTasks).not.toHaveBeenCalled();
	});
});
