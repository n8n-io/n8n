import {
	consumeSsoLoginRedirectSuppression,
	suppressNextSsoLoginRedirect,
} from './ssoLoginRedirectSuppression';

describe('ssoLoginRedirectSuppression', () => {
	beforeEach(() => {
		sessionStorage.clear();
	});

	it('is not suppressed by default', () => {
		expect(consumeSsoLoginRedirectSuppression()).toBe(false);
	});

	it('suppresses the next redirect once, then clears', () => {
		suppressNextSsoLoginRedirect();

		expect(consumeSsoLoginRedirectSuppression()).toBe(true);
		// One-shot: a second read no longer suppresses.
		expect(consumeSsoLoginRedirectSuppression()).toBe(false);
	});
});
