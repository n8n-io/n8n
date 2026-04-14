/**
 * Global test setup file.
 *
 * Provides default mocks for DI infrastructure so test files that call
 * `Container.get(AiConfig)` at module level don't need to set up their own
 * DI mocks unless they need custom behaviour.
 */

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

vi.mock('@n8n/config', () => {
	class AiConfig {
		openAiDefaultHeaders: Record<string, string> = {};
	}
	return { AiConfig };
});
