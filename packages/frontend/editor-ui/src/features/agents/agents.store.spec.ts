import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { makeRestApiRequest } from '@n8n/rest-api-client';
import { useAgentsStore } from './agents.store';

vi.mock('@n8n/rest-api-client', () => ({ makeRestApiRequest: vi.fn() }));
vi.mock('@n8n/stores/useRootStore', () => ({
	useRootStore: () => ({ restApiContext: { baseUrl: 'http://localhost:5678/rest' } }),
}));
vi.mock('@/app/stores/pushConnection.store', () => ({
	usePushConnectionStore: () => ({
		pushConnect: vi.fn(),
		pushDisconnect: vi.fn(),
		addEventListener: vi.fn(() => vi.fn()),
	}),
}));

const mockedMakeRequest = vi.mocked(makeRestApiRequest);

describe('agents.store – fetchAgents', () => {
	beforeEach(() => {
		setActivePinia(createPinia());
		vi.clearAllMocks();
	});

	it('should call GET /agents (not /users)', async () => {
		mockedMakeRequest.mockResolvedValueOnce([]);

		const store = useAgentsStore();
		await store.fetchAgents();

		expect(mockedMakeRequest).toHaveBeenCalledWith(expect.anything(), 'GET', '/agents');
	});

	it('should NOT call GET /users', async () => {
		mockedMakeRequest.mockResolvedValueOnce([]);

		const store = useAgentsStore();
		await store.fetchAgents();

		const calls = mockedMakeRequest.mock.calls;
		const usersCalls = calls.filter((c) => c[2] === '/users');
		expect(usersCalls).toHaveLength(0);
	});

	it('should populate agents from the response', async () => {
		mockedMakeRequest.mockResolvedValueOnce([
			{
				id: 'agent-1',
				firstName: 'TestBot',
				lastName: '',
				email: 'agent@n8n.local',
				avatar: null,
				description: 'Test Agent',
				agentAccessLevel: 'external',
			},
		]);

		const store = useAgentsStore();
		await store.fetchAgents();

		expect(store.agents).toHaveLength(1);
		expect(store.agents[0].firstName).toBe('TestBot');
		expect(store.agents[0].agentAccessLevel).toBe('external');
	});

	it('should handle empty agent list', async () => {
		mockedMakeRequest.mockResolvedValueOnce([]);

		const store = useAgentsStore();
		await store.fetchAgents();

		expect(store.agents).toHaveLength(0);
	});
});
