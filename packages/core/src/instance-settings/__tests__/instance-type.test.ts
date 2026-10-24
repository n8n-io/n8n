import { instanceTypeFromArgv } from '../instance-type';

describe('instanceTypeFromArgv', () => {
	it.each([
		{ argv: ['node', 'n8n', 'worker'], expected: 'worker' },
		{ argv: ['node', 'n8n', 'start'], expected: 'main' },
		{ argv: ['node', 'n8n'], expected: 'main' },
	])('returns $expected for $argv', ({ argv, expected }) => {
		expect(instanceTypeFromArgv(argv)).toBe(expected);
	});
});
