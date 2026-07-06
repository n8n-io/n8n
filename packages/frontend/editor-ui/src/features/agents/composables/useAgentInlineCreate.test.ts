import { describe, it, expect, vi, beforeEach } from 'vitest';

import { useAgentInlineCreate } from './useAgentInlineCreate';
import type { AgentResource } from '../types';

const { createAgent } = vi.hoisted(() => ({ createAgent: vi.fn() }));
const { upsertProjectAgentsListCache } = vi.hoisted(() => ({
	upsertProjectAgentsListCache: vi.fn(),
}));
const { showError } = vi.hoisted(() => ({ showError: vi.fn() }));
const { track } = vi.hoisted(() => ({ track: vi.fn() }));

vi.mock('./useAgentApi', () => ({ createAgent }));
vi.mock('./useProjectAgentsList', () => ({ upsertProjectAgentsListCache }));
vi.mock('@/app/composables/useToast', () => ({ useToast: () => ({ showError }) }));
vi.mock('@/app/composables/useTelemetry', () => ({ useTelemetry: () => ({ track }) }));
vi.mock('@n8n/stores/useRootStore', () => ({
	useRootStore: () => ({ restApiContext: { baseUrl: '', pushRef: '' } }),
}));
vi.mock('@n8n/i18n', () => ({
	useI18n: () => ({ baseText: (key: string) => key }),
}));

const agent = { id: 'agent-1', name: 'New agent' } as AgentResource;

describe('useAgentInlineCreate', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		createAgent.mockResolvedValue(agent);
	});

	it('creates a draft agent and references it, staying in the current flow', async () => {
		const setReference = vi.fn();
		const onCreated = vi.fn();
		const { createAndSelect } = useAgentInlineCreate({
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
	});

	it('shows an error and does not create when no project is resolved', async () => {
		const setReference = vi.fn();
		const { createAndSelect } = useAgentInlineCreate({
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
		const { createAndSelect, isCreating } = useAgentInlineCreate({
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
		const { createAndSelect } = useAgentInlineCreate({
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
