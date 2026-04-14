import type { Logger } from 'n8n-workflow';

/**
 * Creates a mock Logger for testing
 */
export function createMockLogger(): vi.Mocked<Logger> {
	return {
		debug: vi.fn(),
		info: vi.fn(),
		warn: vi.fn(),
		error: vi.fn(),
		trace: vi.fn(),
		log: vi.fn(),
		verbose: vi.fn(),
		scoped: vi.fn().mockReturnThis(),
	} as unknown as vi.Mocked<Logger>;
}
