import { vi } from 'vitest';

// Agent.build() looks up model cost on models.dev. Unit tests must not reach the network.
vi.mock('../sdk/catalog', async (importOriginal) => {
	const actual = await importOriginal<typeof import('../sdk/catalog')>();
	return { ...actual, getModelCost: async () => undefined };
});
