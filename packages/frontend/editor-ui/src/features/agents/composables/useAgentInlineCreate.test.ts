import { describe, it, expect, vi, beforeEach } from 'vitest';

import { useAgentInlineCreate } from './useAgentInlineCreate';
import type { AgentResource } from '../types';

const { createAgent } = vi.hoisted(() => ({ createAgent: vi.fn() }));
const { upsertProjectAgentsListCache } = vi.hoisted(() => ({
	upsertProjectAgentsListCache: vi.fn(),
}));
const { openBuilder } = vi.hoisted(() => ({ openBuilder: vi.fn() }));
const { showError } = vi.hoisted(() => ({ showError: vi.fn() }));
const { track } = vi.hoisted(() => ({ track: vi.fn() }));
const { saveCurrentWorkflow } = vi.hoisted(() => ({ saveCurrentWorkflow: vi.fn() }));

vi.mock('./useAgentApi', () => ({ createAgent }));
vi.mock('./useProjectAgentsList', () => ({ upsertProjectAgentsListCache }));
vi.mock('./useAgentNavigation', () => ({
	useAgentNavigation: () => ({ openBuilder, openAgent: vi.fn(), rememberOrigin: vi.fn() }),
}));
vi.mock('@/app/composables/useToast', () => ({ useToast: () => ({ showError }) }));
vi.mock('@/app/composables/useTelemetry', () => ({ useTelemetry: () => ({ track }) }));
vi.mock('@/app/composables/useWorkflowSaving', () => ({
	useWorkflowSaving: () => ({ saveCurrentWorkflow }),
}));
vi.mock('@n8n/stores/useRootStore', () => ({
	useRootStore: () => ({ restApiContext: { baseUrl: '', pushRef: '' } }),
}));
vi.mock('vue-router', () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock('@n8n/i18n', () => ({
	useI18n: () => ({ baseText: (key: string) => key }),
}));

const agent = { id: 'agent-1', name: 'New agent' } as AgentResource;

describe('useAgentInlineCreate', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		createAgent.mockResolvedValue(agent);
		saveCurrentWorkflow.mockResolvedValue(true);
	});

	it('creates a draft agent, references it, saves the workflow and opens the builder', async () => {
		const setReference = vi.fn();
		const onCreated = vi.fn();
		const { createAndOpen } = useAgentInlineCreate({
			projectId: 'project-1',
			telemetrySource: 'ndv_banner',
			getOriginNodeId: () => 'node-1',
			setReference,
			onCreated,
		});

		await createAndOpen();

		expect(createAgent).toHaveBeenCalledWith(
			expect.anything(),
			'project-1',
			'agents.new.defaultName',
		);
		expect(upsertProjectAgentsListCache).toHaveBeenCalledWith('project-1', agent);
		expect(setReference).toHaveBeenCalledWith(agent);
		expect(onCreated).toHaveBeenCalledWith(agent);
		expect(track).toHaveBeenCalledWith('User created agent', {
			agent_id: 'agent-1',
			source: 'ndv_banner',
		});
		expect(saveCurrentWorkflow).toHaveBeenCalledWith({}, false);
		expect(openBuilder).toHaveBeenCalledWith('project-1', 'agent-1', 'node-1');
		expect(showError).not.toHaveBeenCalled();
	});

	it('shows an error and does not create when no project is resolved', async () => {
		const setReference = vi.fn();
		const { createAndOpen } = useAgentInlineCreate({
			projectId: '',
			telemetrySource: 'node_picker',
			setReference,
		});

		await createAndOpen();

		expect(showError).toHaveBeenCalled();
		expect(createAgent).not.toHaveBeenCalled();
		expect(setReference).not.toHaveBeenCalled();
	});

	it('shows an error and does not navigate when the create call fails', async () => {
		createAgent.mockRejectedValue(new Error('boom'));
		const setReference = vi.fn();
		const { createAndOpen, isCreating } = useAgentInlineCreate({
			projectId: 'project-1',
			telemetrySource: 'node_picker',
			setReference,
		});

		await createAndOpen();

		expect(showError).toHaveBeenCalled();
		expect(setReference).not.toHaveBeenCalled();
		expect(openBuilder).not.toHaveBeenCalled();
		expect(isCreating.value).toBe(false);
	});

	it('keeps the reference but skips navigation when the workflow save fails', async () => {
		saveCurrentWorkflow.mockResolvedValue(false);
		const setReference = vi.fn();
		const { createAndOpen } = useAgentInlineCreate({
			projectId: 'project-1',
			telemetrySource: 'node_picker',
			setReference,
		});

		await createAndOpen();

		expect(setReference).toHaveBeenCalledWith(agent);
		expect(openBuilder).not.toHaveBeenCalled();
	});

	it('guards against concurrent create calls', async () => {
		let resolveCreate: (value: AgentResource) => void = () => {};
		createAgent.mockImplementation(
			async () => await new Promise<AgentResource>((resolve) => (resolveCreate = resolve)),
		);
		const { createAndOpen } = useAgentInlineCreate({
			projectId: 'project-1',
			telemetrySource: 'node_picker',
			setReference: vi.fn(),
		});

		const first = createAndOpen();
		const second = createAndOpen();
		resolveCreate(agent);
		await Promise.all([first, second]);

		expect(createAgent).toHaveBeenCalledTimes(1);
	});
});
