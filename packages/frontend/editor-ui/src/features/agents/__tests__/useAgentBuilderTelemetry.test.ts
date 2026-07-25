import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ref } from 'vue';
import { useAgentBuilderTelemetry } from '../composables/useAgentBuilderTelemetry';
import type { AgentJsonConfig, AgentResource } from '../types';

const agentTelemetryMock = vi.hoisted(() => ({
	trackEditedConfig: vi.fn(),
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

function configWithSubAgents(...agentIds: string[]): AgentJsonConfig {
	return {
		name: 'Agent One',
		model: 'gpt-4',
		instructions: 'Help users.',
		subAgents: {
			agents: agentIds.map((agentId) => ({
				agentId,
				useWhen: `Use for ${agentId} work.`,
			})),
		},
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

	it('flushConfigEdits emits subAgents config edits', async () => {
		const { deps, telemetry } = makeTelemetryDeps(configWithSubAgents('agent-2'));
		const nextConfig = configWithSubAgents('agent-2', 'agent-3');

		telemetry.recordConfigEdit({ subAgents: nextConfig.subAgents });
		deps.savedConfig.value = nextConfig;
		deps.localConfig.value = nextConfig;
		telemetry.flushConfigEdits();

		await vi.waitFor(() => expect(agentTelemetryMock.trackEditedConfig).toHaveBeenCalledOnce());
		expect(agentTelemetryMock.trackEditedConfig).toHaveBeenCalledWith({
			agentId: 'agent-1',
			part: 'subAgents',
			configVersion: expect.any(String),
			status: 'draft',
		});
	});

	it('flushConfigEdits emits vectorStores config edits', async () => {
		const initialConfig: AgentJsonConfig = {
			name: 'Agent One',
			model: 'gpt-4',
			instructions: 'Help users.',
			vectorStores: [],
		};
		const nextConfig: AgentJsonConfig = {
			...initialConfig,
			vectorStores: [
				{
					provider: 'qdrant',
					name: 'product_docs',
					credential: 'qdrant-cred',
					useWhen: 'Search product docs',
					embedding: { model: 'openai/text-embedding-3-small', credential: 'embed-cred' },
					collectionName: 'docs',
				},
			],
		};
		const { deps, telemetry } = makeTelemetryDeps(initialConfig);

		telemetry.recordConfigEdit({ vectorStores: nextConfig.vectorStores });
		deps.savedConfig.value = nextConfig;
		deps.localConfig.value = nextConfig;
		telemetry.flushConfigEdits();

		await vi.waitFor(() => expect(agentTelemetryMock.trackEditedConfig).toHaveBeenCalledOnce());
		expect(agentTelemetryMock.trackEditedConfig).toHaveBeenCalledWith({
			agentId: 'agent-1',
			part: 'vectorStores',
			configVersion: expect.any(String),
			status: 'draft',
		});
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
