import type { Logger } from 'n8n-workflow';

/**
 * Creates a mock Logger for testing
 */
export function createMockLogger(): jest.Mocked<Logger> {
	return {
		debug: jest.fn(),
		info: jest.fn(),
		warn: jest.fn(),
		error: jest.fn(),
		trace: jest.fn(),
		log: jest.fn(),
		verbose: jest.fn(),
		scoped: jest.fn().mockReturnThis(),
	} as unknown as jest.Mocked<Logger>;
}
