import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockListAgentIntegrations = vi.fn();

vi.mock('../composables/useAgentApi', () => ({
	listAgentIntegrations: mockListAgentIntegrations,
}));

vi.mock('@n8n/stores/useRootStore', () => ({
	useRootStore: () => ({ restApiContext: { baseUrl: 'http://localhost:5678' } }),
}));

describe('useAgentIntegrationsCatalog', () => {
	const projectId = 'p1';
	const fakeIntegrations = [
		{
			type: 'slack',
			label: 'Slack',
			icon: 'slack',
			credentialTypes: ['slackApi'],
		},
	];

	beforeEach(async () => {
		vi.clearAllMocks();
		// Reset module state between tests by re-importing a fresh module.
		vi.resetModules();
	});

	it('fetches integrations on first call and returns them', async () => {
		mockListAgentIntegrations.mockResolvedValue(fakeIntegrations);
		const { useAgentIntegrationsCatalog } = await import(
			'../composables/useAgentIntegrationsCatalog'
		);
		const { ensureLoaded } = useAgentIntegrationsCatalog();

		const result = await ensureLoaded(projectId);

		expect(mockListAgentIntegrations).toHaveBeenCalledTimes(1);
		expect(result).toEqual(fakeIntegrations);
	});

	it('does not re-fetch on second call (cache hit)', async () => {
		mockListAgentIntegrations.mockResolvedValue(fakeIntegrations);
		const { useAgentIntegrationsCatalog } = await import(
			'../composables/useAgentIntegrationsCatalog'
		);
		const { ensureLoaded } = useAgentIntegrationsCatalog();

		await ensureLoaded(projectId);
		const second = await ensureLoaded(projectId);

		expect(mockListAgentIntegrations).toHaveBeenCalledTimes(1);
		expect(second).toEqual(fakeIntegrations);
	});

	it('deduplicates concurrent in-flight requests', async () => {
		let resolve!: (v: typeof fakeIntegrations) => void;
		const deferred = new Promise<typeof fakeIntegrations>((res) => {
			resolve = res;
		});
		mockListAgentIntegrations.mockReturnValue(deferred);

		const { useAgentIntegrationsCatalog } = await import(
			'../composables/useAgentIntegrationsCatalog'
		);
		const { ensureLoaded } = useAgentIntegrationsCatalog();

		const p1 = ensureLoaded(projectId);
		const p2 = ensureLoaded(projectId);
		resolve(fakeIntegrations);

		const [r1, r2] = await Promise.all([p1, p2]);
		expect(mockListAgentIntegrations).toHaveBeenCalledTimes(1);
		expect(r1).toEqual(fakeIntegrations);
		expect(r2).toEqual(fakeIntegrations);
	});

	it('clears inFlight and re-throws on error', async () => {
		mockListAgentIntegrations.mockRejectedValueOnce(new Error('network error'));
		const { useAgentIntegrationsCatalog } = await import(
			'../composables/useAgentIntegrationsCatalog'
		);
		const { ensureLoaded } = useAgentIntegrationsCatalog();

		await expect(ensureLoaded(projectId)).rejects.toThrow('network error');

		// After failure, a subsequent call should try again.
		mockListAgentIntegrations.mockResolvedValue(fakeIntegrations);
		const result = await ensureLoaded(projectId);
		expect(mockListAgentIntegrations).toHaveBeenCalledTimes(2);
		expect(result).toEqual(fakeIntegrations);
	});
});
