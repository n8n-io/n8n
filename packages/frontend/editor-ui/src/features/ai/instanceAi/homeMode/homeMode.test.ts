import { afterEach, describe, expect, it } from 'vitest';

import { readHomeMode, writeHomeMode } from './homeMode';

describe('assistant home mode', () => {
	afterEach(() => {
		localStorage.clear();
	});

	it('starts in the streamlined user mode', () => {
		expect(readHomeMode()).toBe('user');
	});

	it('remembers power mode', () => {
		writeHomeMode('power');
		expect(readHomeMode()).toBe('power');
	});
});
