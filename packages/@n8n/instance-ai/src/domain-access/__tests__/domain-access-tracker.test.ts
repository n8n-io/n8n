import { createDomainAccessTracker } from '../domain-access-tracker';

describe('DomainAccessTracker', () => {
	describe('trusted allowlist', () => {
		it('allows known trusted domains without approval', () => {
			const tracker = createDomainAccessTracker();
			expect(tracker.isHostAllowed('docs.n8n.io')).toBe(true);
			expect(tracker.isHostAllowed('platform.openai.com')).toBe(true);
		});

		it('allows subdomains of trusted domains', () => {
			const tracker = createDomainAccessTracker();
			// redis.io is in the allowlist, so docs.redis.io should match
			expect(tracker.isHostAllowed('docs.redis.io')).toBe(true);
		});

		it('rejects unknown domains', () => {
			const tracker = createDomainAccessTracker();
			expect(tracker.isHostAllowed('evil-site.com')).toBe(false);
			expect(tracker.isHostAllowed('example.com')).toBe(false);
		});
	});

	describe('persistent approvals', () => {
		it('remembers approved domains', () => {
			const tracker = createDomainAccessTracker();
			expect(tracker.isHostAllowed('example.com')).toBe(false);

			tracker.approveDomain('example.com');
			expect(tracker.isHostAllowed('example.com')).toBe(true);
		});

		it('approvals are exact-host only', () => {
			const tracker = createDomainAccessTracker();
			tracker.approveDomain('api.example.com');

			expect(tracker.isHostAllowed('api.example.com')).toBe(true);
			expect(tracker.isHostAllowed('example.com')).toBe(false);
			expect(tracker.isHostAllowed('other.example.com')).toBe(false);
		});

		it('persists across calls without runId', () => {
			const tracker = createDomainAccessTracker();
			tracker.approveDomain('example.com');

			// No runId — still allowed via persistent set
			expect(tracker.isHostAllowed('example.com')).toBe(true);
		});
	});

	describe('approveAllDomains', () => {
		it('allows all domains after blanket approval', () => {
			const tracker = createDomainAccessTracker();
			expect(tracker.isHostAllowed('anything.example.com')).toBe(false);

			tracker.approveAllDomains();
			expect(tracker.isHostAllowed('anything.example.com')).toBe(true);
			expect(tracker.isHostAllowed('evil.site')).toBe(true);
			expect(tracker.isAllDomainsApproved()).toBe(true);
		});
	});

	describe('transient (per-run) approvals', () => {
		it('approveOnce is visible within the same run', () => {
			const tracker = createDomainAccessTracker();
			tracker.approveOnce('run-1', 'example.com');

			expect(tracker.isHostAllowed('example.com', 'run-1')).toBe(true);
		});

		it('approveOnce is not visible to a different run', () => {
			const tracker = createDomainAccessTracker();
			tracker.approveOnce('run-1', 'example.com');

			expect(tracker.isHostAllowed('example.com', 'run-2')).toBe(false);
		});

		it('approveOnce is not visible without a runId', () => {
			const tracker = createDomainAccessTracker();
			tracker.approveOnce('run-1', 'example.com');

			expect(tracker.isHostAllowed('example.com')).toBe(false);
		});

		it('clearRun removes transient approvals only', () => {
			const tracker = createDomainAccessTracker();
			tracker.approveDomain('persistent.com');
			tracker.approveOnce('run-1', 'transient.com');

			tracker.clearRun('run-1');

			expect(tracker.isHostAllowed('persistent.com')).toBe(true);
			expect(tracker.isHostAllowed('transient.com', 'run-1')).toBe(false);
		});

		it('clearRun does not affect other runs', () => {
			const tracker = createDomainAccessTracker();
			tracker.approveOnce('run-1', 'site-a.com');
			tracker.approveOnce('run-2', 'site-b.com');

			tracker.clearRun('run-1');

			expect(tracker.isHostAllowed('site-a.com', 'run-1')).toBe(false);
			expect(tracker.isHostAllowed('site-b.com', 'run-2')).toBe(true);
		});
	});
});
