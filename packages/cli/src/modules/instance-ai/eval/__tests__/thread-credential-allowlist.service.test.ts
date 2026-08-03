import { EvalThreadCredentialAllowlistService } from '../thread-credential-allowlist.service';

/**
 * The allowlist ONLY NARROWS — that is what makes it safe for an
 * `instanceAi:eval` caller to set. The test bypass has to inherit that
 * property: synthesizing a successful connection test for a credential the
 * thread cannot even see would let an eval-scoped caller assert something about
 * a credential outside its reach. A bypass id is therefore only honoured when
 * it is also in the thread's allowlist.
 */
describe('EvalThreadCredentialAllowlistService', () => {
	let service: EvalThreadCredentialAllowlistService;

	beforeEach(() => {
		service = new EvalThreadCredentialAllowlistService();
	});

	it('bypasses the test for an allowlisted credential', () => {
		service.set('thread-1', ['cred-a', 'cred-b'], ['cred-a']);

		expect(service.shouldBypassTest('thread-1', 'cred-a')).toBe(true);
	});

	it('does not bypass a credential the case never declared', () => {
		service.set('thread-1', ['cred-a'], ['cred-a']);

		expect(service.shouldBypassTest('thread-1', 'cred-b')).toBe(false);
	});

	// The gap: a bypass id outside the allowlist was honoured verbatim, so an
	// eval-scoped caller could name ANY credential id — including one belonging
	// to someone else — and have its connection test report success.
	it('ignores a bypass id that is not in the thread allowlist', () => {
		service.set('thread-1', ['cred-a'], ['someone-elses-cred']);

		expect(service.shouldBypassTest('thread-1', 'someone-elses-cred')).toBe(false);
	});

	it('keeps only the allowlisted subset when the two lists overlap partially', () => {
		service.set('thread-1', ['cred-a'], ['cred-a', 'someone-elses-cred']);

		expect(service.shouldBypassTest('thread-1', 'cred-a')).toBe(true);
		expect(service.shouldBypassTest('thread-1', 'someone-elses-cred')).toBe(false);
	});

	it('bypasses nothing for a thread that was never set', () => {
		expect(service.shouldBypassTest('unknown-thread', 'cred-a')).toBe(false);
	});

	// The harness re-sends the whole list when it appends a mid-run credential,
	// so a bypass dropped from a later call must not survive.
	it('overwrites rather than merges across calls', () => {
		service.set('thread-1', ['cred-a', 'cred-b'], ['cred-a', 'cred-b']);
		service.set('thread-1', ['cred-a', 'cred-b'], ['cred-b']);

		expect(service.shouldBypassTest('thread-1', 'cred-a')).toBe(false);
		expect(service.shouldBypassTest('thread-1', 'cred-b')).toBe(true);
	});

	it('forgets the bypass when the thread is cleared', () => {
		service.set('thread-1', ['cred-a'], ['cred-a']);
		service.clearThread('thread-1');

		expect(service.shouldBypassTest('thread-1', 'cred-a')).toBe(false);
		expect(service.get('thread-1')).toBeUndefined();
	});
});
