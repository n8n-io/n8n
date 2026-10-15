import { EvalThreadCredentialAllowlistService } from '../thread-credential-allowlist.service';

/** A bypass is honoured only for a credential the thread is already allowed to
 *  see, so an eval-scoped caller can't reach one outside that set. */
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

	// The harness re-sends the whole list as it appends mid-run credentials.
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

describe('EvalThreadCredentialAllowlistService test targets', () => {
	let service: EvalThreadCredentialAllowlistService;
	const target = {
		credentialType: 'slackApi',
		baseUrl: 'http://stand-in.test:4100',
		urlField: 'url',
	};

	beforeEach(() => {
		service = new EvalThreadCredentialAllowlistService();
	});

	it('returns the target for its credential type only', () => {
		service.setTestTarget('thread-1', target);

		expect(service.getTestTarget('thread-1', 'slackApi')).toEqual(target);
		expect(service.getTestTarget('thread-1', 'openAiApi')).toBeUndefined();
		expect(service.getTestTarget('thread-2', 'slackApi')).toBeUndefined();
	});

	it('keeps a target for each credential type', () => {
		const openAi = {
			credentialType: 'openAiApi',
			baseUrl: 'http://stand-in.test:4200',
			urlField: 'url',
		};
		service.setTestTarget('thread-1', target);
		service.setTestTarget('thread-1', openAi);

		expect(service.getTestTarget('thread-1', 'slackApi')).toEqual(target);
		expect(service.getTestTarget('thread-1', 'openAiApi')).toEqual(openAi);
	});

	it('forgets the target when the thread is cleared', () => {
		service.setTestTarget('thread-1', target);
		service.clearThread('thread-1');

		expect(service.getTestTarget('thread-1', 'slackApi')).toBeUndefined();
	});
});
