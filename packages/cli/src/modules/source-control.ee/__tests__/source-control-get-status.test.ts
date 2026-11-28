import { SourceControlGetStatus } from '../types/source-control-get-status';

describe('SourceControlGetStatus', () => {
	it.each([
		[undefined, true],
		['', true],
		['1', true],
		[false, false],
		['false', false],
		[true, true],
		['true', true],
	])('parses preferLocalVersion %j as %s', (preferLocalVersion, expected) => {
		const status = new SourceControlGetStatus({
			direction: 'pull',
			preferLocalVersion,
			verbose: undefined,
		});

		expect(status.preferLocalVersion).toBe(expected);
	});

	it.each([
		[undefined, false],
		['', false],
		['1', false],
		['true', true],
	])('parses verbose %j as %s', (verbose, expected) => {
		const status = new SourceControlGetStatus({
			direction: 'push',
			preferLocalVersion: undefined,
			verbose,
		});

		expect(status.verbose).toBe(expected);
	});
});
