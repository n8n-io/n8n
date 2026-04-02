/**
 * Verifies that registerWithMastra() creates a storage-only Mastra singleton
 * WITHOUT passing agents to the constructor, preventing:
 *
 * 1. Unbounded #agents dict growth from unique per-request sub-agent IDs
 * 2. Cross-user agent retention in the shared singleton
 */

export {};

// ── Realistic Mastra mock that mirrors the real addAgent / #agents behavior ──

const agentsDict: Record<string, unknown> = {};

const mockMastraInstance = {
	addAgent: jest.fn((agent: { id: string }, key?: string) => {
		const agentKey = key ?? agent.id;
		if (agentsDict[agentKey]) return;
		agentsDict[agentKey] = agent;
	}),
	listAgents: () => agentsDict,
	getStorage: jest.fn(),
	getLogger: jest.fn(),
};

const MockMastra = jest.fn().mockImplementation((config: { agents?: Record<string, unknown> }) => {
	if (config?.agents) {
		for (const [key, agent] of Object.entries(config.agents)) {
			mockMastraInstance.addAgent(agent as { id: string }, key);
		}
	}
	return mockMastraInstance;
});

jest.mock('@mastra/core/mastra', () => ({ Mastra: MockMastra }));

const { registerWithMastra } =
	// eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/consistent-type-imports
	require('../register-with-mastra') as typeof import('../register-with-mastra');

// ── Tests ──

describe('registerWithMastra — no agent accumulation', () => {
	beforeEach(() => {
		for (const key of Object.keys(agentsDict)) delete agentsDict[key];
		jest.clearAllMocks();
	});

	it('does not add agents to Mastra #agents dict', () => {
		const storage = { id: 'storage-no-leak' } as never;

		for (let i = 0; i < 20; i++) {
			const agent = { id: `agent-delegate-${i}`, __registerMastra: jest.fn() } as never;
			registerWithMastra(`agent-delegate-${i}`, agent, storage);
		}

		expect(MockMastra).toHaveBeenCalledTimes(1);
		// Constructor was called WITHOUT agents — #agents stays empty
		const constructorArg = (MockMastra.mock.calls[0] as unknown[])[0] as Record<string, unknown>;
		expect(constructorArg).not.toHaveProperty('agents');
		expect(Object.keys(agentsDict)).toHaveLength(0);
	});

	it('all agents get the same Mastra back-reference', () => {
		const storage = { id: 'storage-back-ref' } as never;
		const agents = Array.from({ length: 5 }, (_, i) => ({
			id: `agent-${i}`,
			__registerMastra: jest.fn(),
		}));

		for (const agent of agents) {
			registerWithMastra(agent.id, agent as never, storage);
		}

		// Every agent receives the same Mastra instance
		for (const agent of agents) {
			expect(agent.__registerMastra).toHaveBeenCalledWith(mockMastraInstance);
		}
	});

	it('creates new Mastra when storage key changes', () => {
		const storageA = { id: 'storage-A' } as never;
		const storageB = { id: 'storage-B' } as never;
		const agent1 = { id: 'a1', __registerMastra: jest.fn() } as never;
		const agent2 = { id: 'a2', __registerMastra: jest.fn() } as never;

		registerWithMastra('a1', agent1, storageA);
		registerWithMastra('a2', agent2, storageB);

		expect(MockMastra).toHaveBeenCalledTimes(2);
		expect(MockMastra).toHaveBeenNthCalledWith(1, expect.objectContaining({ storage: storageA }));
		expect(MockMastra).toHaveBeenNthCalledWith(2, expect.objectContaining({ storage: storageB }));
	});
});
