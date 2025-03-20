import { truncate } from './truncate';

describe('truncate', () => {
	it('should truncate text to 30 chars by default', () => {
		expect(truncate('This is a very long text that should be truncated')).toBe(
			'This is a very long text that ...',
		);
	});

	it('should truncate text to given length', () => {
		expect(truncate('This is a very long text that should be truncated', 25)).toBe(
			'This is a very long text ...',
		);
	});
});
