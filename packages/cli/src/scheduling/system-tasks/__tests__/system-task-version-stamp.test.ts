import { inc } from 'semver';

import { N8N_VERSION } from '@/constants';

import { stampedByNewerVersion, versionStamp } from '../system-task-version-stamp';

describe('versionStamp', () => {
	it("carries this instance's version", () => {
		expect(versionStamp()).toEqual({ n8nVersion: N8N_VERSION });
	});
});

describe('stampedByNewerVersion', () => {
	it('is true for a stamp newer than this version', () => {
		expect(stampedByNewerVersion({ n8nVersion: inc(N8N_VERSION, 'minor') })).toBe(true);
	});

	it.each([N8N_VERSION, '0.0.1'])(
		'is false for version %s, not newer than this one',
		(n8nVersion) => {
			expect(stampedByNewerVersion({ n8nVersion })).toBe(false);
		},
	);

	it.each(['not-a-version', 42, null, undefined])(
		'is false for a stamp of %s, which no version compares to',
		(n8nVersion) => {
			expect(stampedByNewerVersion({ n8nVersion })).toBe(false);
		},
	);
});
