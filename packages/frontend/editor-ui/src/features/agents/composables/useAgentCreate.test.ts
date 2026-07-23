import { describe, it, expect, vi, beforeEach } from 'vitest';

import { useAgentCreate } from './useAgentCreate';
import type { AgentResource } from '../types';

const { createAgent } = vi.hoisted(() => ({ createAgent: vi.fn() }));
const { upsertProjectAgentsListCache } = vi.hoisted(() => ({
	upsertProjectAgentsListCache: vi.fn(),
}));
const { showError } = vi.hoisted(() => ({ showError: vi.fn() }));
const { track } = vi.hoisted(() => ({ track: vi.fn() }));
const { openBuilder } = vi.hoisted(() => ({ openBuilder: vi.fn() }));
const { saveCurrentWorkflow } = vi.hoisted(() => ({ saveCurrentWorkflow: vi.fn() }));

vi.mock('./useAgentApi', () => ({ createAgent }));
vi.mock('./useProjectAgentsList', () => ({ upsertProjectAgentsListCache }));
vi.mock('./useAgentNavigation', () => ({
	useAgentNavigation: () => ({ openBuilder }),
}));
vi.mock('@/app/composables/useToast', () => ({ useToast: () => ({ showError }) }));
vi.mock('@/app/composables/useTelemetry', () => ({ useTelemetry: () => ({ track }) }));
vi.mock('@/app/composables/useWorkflowSaving', () => ({
	useWorkflowSaving: () => ({ saveCurrentWorkflow }),
}));
vi.mock('vue-router', () => ({ useRouter: () => ({}) }));
vi.mock('@n8n/stores/useRootStore', () => ({
	useRootStore: () => ({ restApiContext: { baseUrl: '', pushRef: '' } }),
}));
vi.mock('@n8n/i18n', () => ({
	useI18n: () => ({ baseText: (key: string) => key }),
}));

const agent = { id: 'agent-1', name: 'New agent' } as AgentResource;

describe('useAgentCreate', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		createAgent.mockResolvedValue(agent);
		saveCurrentWorkflow.mockResolvedValue(true);
	});

	it('creates a draft agent and references it, staying in the current flow', async () => {
		const setReference = vi.fn();
		const onCreated = vi.fn();
		const { createAndSelect } = useAgentCreate({
			projectId: 'project-1',
			telemetrySource: 'ndv_banner',
			setReference,
			onCreated,
		});

		await createAndSelect();

		expect(createAgent).toHaveBeenCalledWith(
			expect.anything(),
			'project-1',
			'agents.new.defaultName',
		);
		expect(upsertProjectAgentsListCache).toHaveBeenCalledWith('project-1', agent);
		expect(setReference).toHaveBeenCalledWith(agent);
		expect(onCreated).toHaveBeenCalledWith(agent);
		// Ordering is a contract: the canvas card opens the NDV on the created
		// signal assuming the agent reference has already been written.
		expect(setReference.mock.invocationCallOrder[0]).toBeLessThan(
			onCreated.mock.invocationCallOrder[0],
		);
		expect(track).toHaveBeenCalledWith('User created agent', {
			agent_id: 'agent-1',
			source: 'ndv_banner',
		});
		expect(showError).not.toHaveBeenCalled();
		// Staying in flow: no workflow save, no builder navigation.
		expect(saveCurrentWorkflow).not.toHaveBeenCalled();
		expect(openBuilder).not.toHaveBeenCalled();
	});

	it('createAndOpenBuilder saves the workflow, then opens the builder with the origin node', async () => {
		const setReference = vi.fn();
		const { createAndOpenBuilder } = useAgentCreate({
			projectId: 'project-1',
			telemetrySource: 'ndv_banner',
			getOriginNodeId: () => 'node-7',
			setReference,
		});

		await createAndOpenBuilder();

		expect(setReference).toHaveBeenCalledWith(agent);
		// The reference must be persisted before leaving the workflow, and the
		// save must precede navigation (an unsaved reference would be dropped
		// by the route-leave discard, orphaning the draft).
		expect(saveCurrentWorkflow).toHaveBeenCalled();
		expect(openBuilder).toHaveBeenCalledWith('project-1', 'agent-1', 'node-7');
		expect(saveCurrentWorkflow.mock.invocationCallOrder[0]).toBeLessThan(
			openBuilder.mock.invocationCallOrder[0],
		);
	});

	it('createAndOpenBuilder keeps the reference but skips navigation when the save fails', async () => {
		saveCurrentWorkflow.mockResolvedValue(false);
		const setReference = vi.fn();
		const { createAndOpenBuilder, isCreating } = useAgentCreate({
			projectId: 'project-1',
			telemetrySource: 'ndv_banner',
			setReference,
		});

		await createAndOpenBuilder();

		expect(setReference).toHaveBeenCalledWith(agent);
		expect(openBuilder).not.toHaveBeenCalled();
		expect(isCreating.value).toBe(false);
	});

	it('shows an error and does not create when no project is resolved', async () => {
		const setReference = vi.fn();
		const { createAndSelect } = useAgentCreate({
			projectId: '',
			telemetrySource: 'node_picker',
			setReference,
		});

		await createAndSelect();

		expect(showError).toHaveBeenCalled();
		expect(createAgent).not.toHaveBeenCalled();
		expect(setReference).not.toHaveBeenCalled();
	});

	it('shows an error and references nothing when the create call fails', async () => {
		createAgent.mockRejectedValue(new Error('boom'));
		const setReference = vi.fn();
		const { createAndSelect, isCreating } = useAgentCreate({
			projectId: 'project-1',
			telemetrySource: 'node_picker',
			setReference,
		});

		await createAndSelect();

		expect(showError).toHaveBeenCalled();
		expect(setReference).not.toHaveBeenCalled();
		expect(isCreating.value).toBe(false);
	});

	it('guards against concurrent create calls', async () => {
		let resolveCreate: (value: AgentResource) => void = () => {};
		createAgent.mockImplementation(
			async () => await new Promise<AgentResource>((resolve) => (resolveCreate = resolve)),
		);
		const { createAndSelect } = useAgentCreate({
			projectId: 'project-1',
			telemetrySource: 'node_picker',
			setReference: vi.fn(),
		});

		const first = createAndSelect();
		const second = createAndSelect();
		resolveCreate(agent);
		await Promise.all([first, second]);

		expect(createAgent).toHaveBeenCalledTimes(1);
	});
});
