/**
 * Global test setup file.
 *
 * Provides default mocks for DI infrastructure so test files that call
 * `Container.get(AiConfig)` at module level don't need to set up their own
 * DI mocks unless they need custom behaviour.
 */

// jest-mock-extended (used by NodeTestHarness) requires `jest` as a global.
// Vitest does not set this alias automatically.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(globalThis as any).jest = vi;

vi.mock('@n8n/di', () => ({
	Container: {
		get: vi.fn().mockImplementation(() => ({
			openAiDefaultHeaders: {},
		})),
		getOrDefault: vi.fn().mockReturnValue(undefined),
		set: vi.fn(),
		has: vi.fn().mockReturnValue(false),
	},
	Service: () => () => {},
}));

vi.mock('@n8n/config', async () => {
	const actual = await vi.importActual<typeof import('@n8n/config')>('@n8n/config');

	class AiConfig {
		openAiDefaultHeaders: Record<string, string> = {};
	}

	return {
		...actual,
		AiConfig,
	};
});
