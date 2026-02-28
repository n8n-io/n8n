import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import type { PushMessage } from '@n8n/api-types';
import { useAgentPanelStore } from './agentPanel.store';
import { useAgentsStore } from './agents.store';
import type { AgentNode } from './agents.types';

// Capture push event handlers so tests can simulate push messages
let pushEventHandler: ((event: PushMessage) => void) | null = null;
const mockPushStore = {
	pushConnect: vi.fn(),
	pushDisconnect: vi.fn(),
	addEventListener: vi.fn((handler: (event: PushMessage) => void) => {
		pushEventHandler = handler;
		return vi.fn(() => {
			pushEventHandler = null;
		});
	}),
};

// Mock dependencies the store imports
vi.mock('@n8n/constants', () => ({ BROWSER_ID_STORAGE_KEY: 'browser-id' }));
vi.mock('@n8n/rest-api-client', () => ({ makeRestApiRequest: vi.fn() }));
vi.mock('@n8n/stores/useRootStore', () => ({
	useRootStore: () => ({ restApiContext: { baseUrl: 'http://localhost:5678/rest' } }),
}));
vi.mock('@/app/stores/pushConnection.store', () => ({
	usePushConnectionStore: () => mockPushStore,
}));

/** Build an SSE text chunk from a sequence of events */
function sseChunk(events: object[]): Uint8Array {
	const text = events.map((e) => `data: ${JSON.stringify(e)}\n\n`).join('');
	return new TextEncoder().encode(text);
}

/** Create a mock ReadableStream that yields one chunk then closes */
function mockSSEResponse(events: object[]): Response {
	const chunk = sseChunk(events);
	let read = false;

	const body = {
		getReader: () => ({
			read: async () => {
				if (!read) {
					read = true;
					return { done: false, value: chunk };
				}
				return { done: true, value: undefined };
			},
		}),
	} as unknown as ReadableStream<Uint8Array>;

	return {
		headers: new Headers({ 'content-type': 'text/event-stream' }),
		body,
	} as unknown as Response;
}

function makeAgent(overrides: Partial<AgentNode> & { id: string; firstName: string }): AgentNode {
	return {
		lastName: '',
		email: `${overrides.firstName.toLowerCase()}@n8n.local`,
		role: overrides.firstName,
		avatar: { type: 'initials', value: overrides.firstName.slice(0, 2).toUpperCase() },
		status: 'idle',
		position: { x: 0, y: 0 },
		zoneId: null,
		workflowCount: 0,
		tasksCompleted: 0,
		lastActive: '',
		resourceUsage: 0,
		...overrides,
	};
}

describe('agentPanel.store', () => {
	let agentsStore: ReturnType<typeof useAgentsStore>;
	let panelStore: ReturnType<typeof useAgentPanelStore>;

	beforeEach(() => {
		setActivePinia(createPinia());
		vi.stubGlobal('fetch', vi.fn());
		agentsStore = useAgentsStore();
		panelStore = useAgentPanelStore();

		agentsStore.agents = [
			makeAgent({ id: 'qa-1', firstName: 'QA' }),
			makeAgent({ id: 'comms-1', firstName: 'Comms', position: { x: 100, y: 0 } }),
		];

		panelStore.panelAgentId = 'qa-1';
		panelStore.panelOpen = true;
	});

	describe('handleCompletionEvent – resets all agents', () => {
		it('should reset delegated agent to idle when completion fires without observation', async () => {
			vi.mocked(fetch).mockResolvedValueOnce(
				mockSSEResponse([
					{ type: 'task.action', action: 'delegate', targetUserName: 'Comms' },
					// No observation — simulates error path or race
					{ type: 'task.completion', summary: 'Task complete' },
				]),
			);

			await panelStore.dispatchTask('What agents can you see?');

			expect(agentsStore.agents.find((a) => a.id === 'qa-1')?.status).toBe('idle');
			expect(agentsStore.agents.find((a) => a.id === 'comms-1')?.status).toBe('idle');
			expect(panelStore.activeConnections.size).toBe(0);
		});
	});

	describe('handleObservationEvent – interleaved delegation', () => {
		it('should reset delegated agent via observation targetUserName when steps are interleaved', async () => {
			// Simulate: QA delegates to Comms → Comms runs workflow → Comms returns
			// The observation for the delegation has targetUserName, but the lastStep is the
			// nested execute_workflow (no targetUserName). Without the fix, Comms stays busy.
			vi.mocked(fetch).mockResolvedValueOnce(
				mockSSEResponse([
					{ type: 'task.action', action: 'delegate', targetUserName: 'Comms' },
					{ type: 'task.action', action: 'execute_workflow', workflowName: 'Message' },
					{ type: 'task.observation', result: 'success', workflowName: 'Message' },
					{
						type: 'task.observation',
						result: 'success',
						targetUserName: 'Comms',
						summary: 'Responded',
					},
					{ type: 'task.completion', summary: 'All done' },
				]),
			);

			await panelStore.dispatchTask('Run reports');

			expect(agentsStore.agents.find((a) => a.id === 'comms-1')?.status).toBe('idle');
			expect(panelStore.activeConnections.size).toBe(0);
		});

		it('should update the delegation step when observation has targetUserName', async () => {
			// The observation with targetUserName should update the delegate step,
			// not the interleaved execute_workflow step
			vi.mocked(fetch).mockResolvedValueOnce(
				mockSSEResponse([
					{ type: 'task.action', action: 'delegate', targetUserName: 'Comms' },
					{ type: 'task.action', action: 'execute_workflow', workflowName: 'Message' },
					{ type: 'task.observation', result: 'success', workflowName: 'Message' },
					{
						type: 'task.observation',
						result: 'success',
						targetUserName: 'Comms',
						summary: 'Responded',
					},
					{ type: 'task.completion', summary: 'All done' },
				]),
			);

			await panelStore.dispatchTask('Run reports');

			const delegationStep = panelStore.streamingSteps.find((s) => s.targetUserName === 'Comms');
			expect(delegationStep?.result).toBe('success');
			expect(delegationStep?.status).toBe('success');
		});
	});
});

describe('agents.store – push listener', () => {
	let agentsStore: ReturnType<typeof useAgentsStore>;

	beforeEach(() => {
		setActivePinia(createPinia());
		pushEventHandler = null;
		mockPushStore.addEventListener.mockClear();
		mockPushStore.pushConnect.mockClear();
		mockPushStore.pushDisconnect.mockClear();

		agentsStore = useAgentsStore();
		agentsStore.agents = [
			makeAgent({ id: 'qa-1', firstName: 'QA' }),
			makeAgent({ id: 'comms-1', firstName: 'Comms' }),
		];

		agentsStore.initializePushListener();
	});

	function simulatePush(event: PushMessage) {
		expect(pushEventHandler).not.toBeNull();
		pushEventHandler!(event);
	}

	it('should connect push and register listener on initialize', () => {
		expect(mockPushStore.pushConnect).toHaveBeenCalled();
		expect(mockPushStore.addEventListener).toHaveBeenCalled();
	});

	it('should set agent to active on action event', () => {
		simulatePush({
			type: 'agentTaskStep',
			data: {
				agentId: 'qa-1',
				event: { type: 'task.action', action: 'execute_workflow', workflowName: 'Report' },
			},
		});

		expect(agentsStore.agents.find((a) => a.id === 'qa-1')?.status).toBe('active');
		expect(agentsStore.agents.find((a) => a.id === 'comms-1')?.status).toBe('idle');
	});

	it('should activate target agent on delegate step', () => {
		simulatePush({
			type: 'agentTaskStep',
			data: {
				agentId: 'qa-1',
				event: { type: 'task.action', action: 'delegate', targetUserName: 'Comms' },
			},
		});

		expect(agentsStore.agents.find((a) => a.id === 'qa-1')?.status).toBe('active');
		expect(agentsStore.agents.find((a) => a.id === 'comms-1')?.status).toBe('active');
	});

	it('should NOT re-activate target agent on observation events (regression)', () => {
		// Step 1: delegation activates both agents
		simulatePush({
			type: 'agentTaskStep',
			data: {
				agentId: 'qa-1',
				event: { type: 'task.action', action: 'delegate', targetUserName: 'Comms' },
			},
		});
		expect(agentsStore.agents.find((a) => a.id === 'comms-1')?.status).toBe('active');

		// Step 2: sub-agent completes, resets all to idle
		simulatePush({
			type: 'agentTaskDone',
			data: { agentId: 'comms-1', status: 'completed' },
		});
		expect(agentsStore.agents.find((a) => a.id === 'comms-1')?.status).toBe('idle');

		// Step 3: parent's observation fires with targetUserName — must NOT re-activate
		simulatePush({
			type: 'agentTaskStep',
			data: {
				agentId: 'qa-1',
				event: {
					type: 'task.observation',
					action: 'delegate',
					targetUserName: 'Comms',
					result: 'success',
				},
			},
		});
		expect(agentsStore.agents.find((a) => a.id === 'comms-1')?.status).toBe('idle');
	});

	it('should reset ALL agents to idle on agentTaskDone', () => {
		// Both agents active
		agentsStore.setAgentStatus('qa-1', 'active');
		agentsStore.setAgentStatus('comms-1', 'active');

		// Only QA finishes, but all should reset
		simulatePush({
			type: 'agentTaskDone',
			data: { agentId: 'qa-1', status: 'completed', summary: 'Done' },
		});

		expect(agentsStore.agents.find((a) => a.id === 'qa-1')?.status).toBe('idle');
		expect(agentsStore.agents.find((a) => a.id === 'comms-1')?.status).toBe('idle');
	});

	it('should ignore observation events entirely (no status change)', () => {
		simulatePush({
			type: 'agentTaskStep',
			data: {
				agentId: 'qa-1',
				event: { type: 'task.observation', action: 'execute_workflow', result: 'success' },
			},
		});

		// Agent should remain idle — observations don't activate
		expect(agentsStore.agents.find((a) => a.id === 'qa-1')?.status).toBe('idle');
	});
});
