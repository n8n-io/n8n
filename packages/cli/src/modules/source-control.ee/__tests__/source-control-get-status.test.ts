"""SourceControlGetStatus must honor an explicit preferLocalVersion=false."""

import { SourceControlGetStatus } from '../types/source-control-get-status';

function make(values: Partial<{ preferLocalVersion: string | boolean }> = {}) {
	return new SourceControlGetStatus({
		direction: 'pull',
		preferLocalVersion: values.preferLocalVersion as string | boolean,
		verbose: false,
	});
}

describe('SourceControlGetStatus', () => {
	it('defaults to true when the parameter is missing', () => {
		expect(make().preferLocalVersion).toBe(true);
	});

	it('honors an explicit false', () => {
		expect(make({ preferLocalVersion: false }).preferLocalVersion).toBe(false);
		expect(make({ preferLocalVersion: 'false' }).preferLocalVersion).toBe(false);
	});
});
