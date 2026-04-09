import { createDomainAccessTracker } from '../domain-access-tracker';
import { checkDomainAccess, applyDomainAccessResume } from '../domain-gating';

describe('checkDomainAccess', () => {
	it('allows when permissionMode is always_allow', () => {
		const result = checkDomainAccess({
			url: 'https://evil.com/page',
			permissionMode: 'always_allow',
		});
		expect(result.allowed).toBe(true);
		expect(result.suspendPayload).toBeUndefined();
	});

	it('allows trusted domains with require_approval', () => {
		const tracker = createDomainAccessTracker();
		const result = checkDomainAccess({
			url: 'https://docs.n8n.io/api/',
			tracker,
			permissionMode: 'require_approval',
		});
		expect(result.allowed).toBe(true);
	});

	it('blocks untrusted domains with require_approval', () => {
		const tracker = createDomainAccessTracker();
		const result = checkDomainAccess({
			url: 'https://example.com/secrets',
			tracker,
			permissionMode: 'require_approval',
		});
		expect(result.allowed).toBe(false);
		expect(result.suspendPayload).toBeDefined();
		expect(result.suspendPayload!.domainAccess.host).toBe('example.com');
		expect(result.suspendPayload!.domainAccess.url).toBe('https://example.com/secrets');
		expect(result.suspendPayload!.severity).toBe('info');
	});

	it('allows previously approved domains', () => {
		const tracker = createDomainAccessTracker();
		tracker.approveDomain('example.com');

		const result = checkDomainAccess({
			url: 'https://example.com/page',
			tracker,
			permissionMode: 'require_approval',
		});
		expect(result.allowed).toBe(true);
	});

	it('allows transient run-scoped approvals', () => {
		const tracker = createDomainAccessTracker();
		tracker.approveOnce('run-1', 'example.com');

		const result = checkDomainAccess({
			url: 'https://example.com/page',
			tracker,
			permissionMode: 'require_approval',
			runId: 'run-1',
		});
		expect(result.allowed).toBe(true);
	});

	it('blocks when no tracker is provided (defaults to require approval)', () => {
		const result = checkDomainAccess({
			url: 'https://example.com/page',
			permissionMode: 'require_approval',
		});
		expect(result.allowed).toBe(false);
		expect(result.suspendPayload).toBeDefined();
	});

	it('allows through for invalid URLs (let fetch handle the error)', () => {
		const tracker = createDomainAccessTracker();
		const result = checkDomainAccess({
			url: 'not-a-url',
			tracker,
			permissionMode: 'require_approval',
		});
		expect(result.allowed).toBe(true);
	});
});

describe('applyDomainAccessResume', () => {
	it('returns proceed: false when denied', () => {
		const result = applyDomainAccessResume({
			resumeData: { approved: false },
			host: 'example.com',
		});
		expect(result.proceed).toBe(false);
	});

	it('returns proceed: true when approved', () => {
		const result = applyDomainAccessResume({
			resumeData: { approved: true },
			host: 'example.com',
		});
		expect(result.proceed).toBe(true);
	});

	it('allow_domain persists exact host in tracker', () => {
		const tracker = createDomainAccessTracker();
		applyDomainAccessResume({
			resumeData: { approved: true, domainAccessAction: 'allow_domain' },
			host: 'example.com',
			tracker,
		});

		expect(tracker.isHostAllowed('example.com')).toBe(true);
		expect(tracker.isHostAllowed('other.example.com')).toBe(false);
	});

	it('allow_all approves all domains', () => {
		const tracker = createDomainAccessTracker();
		applyDomainAccessResume({
			resumeData: { approved: true, domainAccessAction: 'allow_all' },
			host: 'example.com',
			tracker,
		});

		expect(tracker.isAllDomainsApproved()).toBe(true);
		expect(tracker.isHostAllowed('anything.com')).toBe(true);
	});

	it('allow_once sets transient run-scoped approval', () => {
		const tracker = createDomainAccessTracker();
		applyDomainAccessResume({
			resumeData: { approved: true, domainAccessAction: 'allow_once' },
			host: 'example.com',
			tracker,
			runId: 'run-1',
		});

		expect(tracker.isHostAllowed('example.com', 'run-1')).toBe(true);
		expect(tracker.isHostAllowed('example.com', 'run-2')).toBe(false);
		expect(tracker.isHostAllowed('example.com')).toBe(false);
	});

	it('default action (no domainAccessAction) behaves like allow_once', () => {
		const tracker = createDomainAccessTracker();
		applyDomainAccessResume({
			resumeData: { approved: true },
			host: 'example.com',
			tracker,
			runId: 'run-1',
		});

		expect(tracker.isHostAllowed('example.com', 'run-1')).toBe(true);
		expect(tracker.isHostAllowed('example.com')).toBe(false);
	});
});
