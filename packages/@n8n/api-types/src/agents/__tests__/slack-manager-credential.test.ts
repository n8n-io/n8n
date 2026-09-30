import { describe, expect, it } from 'vitest';

import { isSlackManagerCredentialReady } from '../slack/manager-credential';

describe('isSlackManagerCredentialReady', () => {
	it.each([
		[{ connected: true, reconnectRequired: false }, true],
		[{ connected: true, reconnectRequired: true }, false],
		[{ connected: false, reconnectRequired: false }, false],
	])('returns the readiness of %o', (credential, expected) => {
		expect(isSlackManagerCredentialReady(credential)).toBe(expected);
	});
});
