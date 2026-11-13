import { describe, it, expect } from 'vitest';

describe('guest toAscii', () => {
	it('should fail to load when the host function is missing', async () => {
		await expect(import('../to-ascii')).rejects.toThrow(
			'A host function is missing from the guest global object',
		);
	});
});
