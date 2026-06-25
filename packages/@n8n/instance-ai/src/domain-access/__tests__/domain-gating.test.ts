import { createDomainAccessTracker } from '../domain-access-tracker';
import {
	checkDomainAccess,
	checkWebSearchAccess,
	applyDomainAccessResume,
	applyWebSearchAccessResume,
} from '../domain-gating';

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
		const payload = result.suspendPayload!;
		expect(payload.domainAccess?.host).toBe('example.com');
		expect(payload.domainAccess?.url).toBe('https://example.com/secrets');
		expect(payload.webSearch).toBeUndefined();
		expect(payload.severity).toBe('info');
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

describe('checkWebSearchAccess', () => {
	it('allows when permissionMode is always_allow', () => {
		const result = checkWebSearchAccess({
			query: 'sensitive query',
			permissionMode: 'always_allow',
		});
		expect(result.allowed).toBe(true);
		expect(result.suspendPayload).toBeUndefined();
	});

	it('blocks immediately when permissionMode is blocked', () => {
		const result = checkWebSearchAccess({
			query: 'q',
			permissionMode: 'blocked',
		});
		expect(result.allowed).toBe(false);
		expect(result.blocked).toBe(true);
		expect(result.suspendPayload).toBeUndefined();
	});

	it('returns a web-search suspend payload when not yet approved', () => {
		const tracker = createDomainAccessTracker();
		const result = checkWebSearchAccess({
			query: 'how to deploy n8n',
			tracker,
			permissionMode: 'require_approval',
		});
		expect(result.allowed).toBe(false);
		expect(result.suspendPayload).toBeDefined();
		const payload = result.suspendPayload!;
		expect(payload.webSearch?.query).toBe('how to deploy n8n');
		expect(payload.domainAccess).toBeUndefined();
		expect(payload.severity).toBe('info');
		expect(payload.message).toContain('how to deploy n8n');
	});

	it('allows when tracker has persistent web-search approval', () => {
		const tracker = createDomainAccessTracker();
		tracker.approveWebSearch();
		const result = checkWebSearchAccess({
			query: 'q',
			tracker,
			permissionMode: 'require_approval',
		});
		expect(result.allowed).toBe(true);
	});

	it('allows when tracker has transient web-search approval for the run', () => {
		const tracker = createDomainAccessTracker();
		tracker.approveWebSearchOnce('run-1');
		const result = checkWebSearchAccess({
			query: 'q',
			tracker,
			permissionMode: 'require_approval',
			runId: 'run-1',
		});
		expect(result.allowed).toBe(true);
	});

	it('does not leak transient approval across runs', () => {
		const tracker = createDomainAccessTracker();
		tracker.approveWebSearchOnce('run-1');
		const result = checkWebSearchAccess({
			query: 'q',
			tracker,
			permissionMode: 'require_approval',
			runId: 'run-2',
		});
		expect(result.allowed).toBe(false);
	});

	it('clearRun removes transient web-search approval', () => {
		const tracker = createDomainAccessTracker();
		tracker.approveWebSearchOnce('run-1');
		tracker.clearRun('run-1');
		const result = checkWebSearchAccess({
			query: 'q',
			tracker,
			permissionMode: 'require_approval',
			runId: 'run-1',
		});
		expect(result.allowed).toBe(false);
	});

	it('does not leak fetch-url tracker approvals into web-search', () => {
		const tracker = createDomainAccessTracker();
		tracker.approveDomain('example.com');
		tracker.approveAllDomains();
		const result = checkWebSearchAccess({
			query: 'q',
			tracker,
			permissionMode: 'require_approval',
		});
		// approveAllDomains is for fetch-url; web-search remains gated
		expect(result.allowed).toBe(false);
	});
});

describe('applyWebSearchAccessResume', () => {
	it('returns proceed: false when denied', () => {
		const result = applyWebSearchAccessResume({
			resumeData: { approved: false },
		});
		expect(result.proceed).toBe(false);
	});

	it('allow_once sets transient run-scoped approval', () => {
		const tracker = createDomainAccessTracker();
		applyWebSearchAccessResume({
			resumeData: { approved: true, domainAccessAction: 'allow_once' },
			tracker,
			runId: 'run-1',
		});
		expect(tracker.isWebSearchAllowed('run-1')).toBe(true);
		expect(tracker.isWebSearchAllowed('run-2')).toBe(false);
		expect(tracker.isWebSearchAllowed()).toBe(false);
	});

	it('default action behaves like allow_once', () => {
		const tracker = createDomainAccessTracker();
		applyWebSearchAccessResume({
			resumeData: { approved: true },
			tracker,
			runId: 'run-1',
		});
		expect(tracker.isWebSearchAllowed('run-1')).toBe(true);
		expect(tracker.isWebSearchAllowed()).toBe(false);
	});

	it('allow_domain grants persistent (thread-level) approval', () => {
		const tracker = createDomainAccessTracker();
		applyWebSearchAccessResume({
			resumeData: { approved: true, domainAccessAction: 'allow_domain' },
			tracker,
			runId: 'run-1',
		});
		expect(tracker.isWebSearchAllowed()).toBe(true);
		expect(tracker.isWebSearchAllowed('any-other-run')).toBe(true);
	});

	it('allow_all also grants persistent approval (no broader scope for search)', () => {
		const tracker = createDomainAccessTracker();
		applyWebSearchAccessResume({
			resumeData: { approved: true, domainAccessAction: 'allow_all' },
			tracker,
		});
		expect(tracker.isWebSearchAllowed()).toBe(true);
	});
});
