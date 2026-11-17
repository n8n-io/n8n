import {
	buildFetchUrlGrantKey,
	buildFetchUrlOnceGrantKey,
	buildWebSearchOnceGrantKey,
	FETCH_URL_ALLOW_ALL_GRANT_KEY,
	WEB_SEARCH_GRANT_KEY,
} from '@n8n/api-types';

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
		it('remembers approved domains', async () => {
			const tracker = createDomainAccessTracker();
			expect(tracker.isHostAllowed('example.com')).toBe(false);

			await tracker.approveDomain('example.com');
			expect(tracker.isHostAllowed('example.com')).toBe(true);
		});

		it('approvals are exact-host only', async () => {
			const tracker = createDomainAccessTracker();
			await tracker.approveDomain('api.example.com');

			expect(tracker.isHostAllowed('api.example.com')).toBe(true);
			expect(tracker.isHostAllowed('example.com')).toBe(false);
			expect(tracker.isHostAllowed('other.example.com')).toBe(false);
		});

		it('persists across calls without runId', async () => {
			const tracker = createDomainAccessTracker();
			await tracker.approveDomain('example.com');

			// No runId — still allowed via persistent set
			expect(tracker.isHostAllowed('example.com')).toBe(true);
		});
	});

	describe('approveAllDomains', () => {
		it('allows all domains after blanket approval', async () => {
			const tracker = createDomainAccessTracker();
			expect(tracker.isHostAllowed('anything.example.com')).toBe(false);

			await tracker.approveAllDomains();
			expect(tracker.isHostAllowed('anything.example.com')).toBe(true);
			expect(tracker.isHostAllowed('evil.site')).toBe(true);
			expect(tracker.isAllDomainsApproved()).toBe(true);
		});
	});

	describe('transient (per-run) approvals', () => {
		it('approveOnce is visible within the same run', async () => {
			const tracker = createDomainAccessTracker();
			await tracker.approveOnce('run-1', 'example.com');

			expect(tracker.isHostAllowed('example.com', 'run-1')).toBe(true);
		});

		it('approveOnce is not visible to a different run', async () => {
			const tracker = createDomainAccessTracker();
			await tracker.approveOnce('run-1', 'example.com');

			expect(tracker.isHostAllowed('example.com', 'run-2')).toBe(false);
		});

		it('approveOnce is not visible without a runId', async () => {
			const tracker = createDomainAccessTracker();
			await tracker.approveOnce('run-1', 'example.com');

			expect(tracker.isHostAllowed('example.com')).toBe(false);
		});

		it('clearRun removes transient approvals only', async () => {
			const tracker = createDomainAccessTracker();
			await tracker.approveDomain('persistent.com');
			await tracker.approveOnce('run-1', 'transient.com');

			tracker.clearRun('run-1');

			expect(tracker.isHostAllowed('persistent.com')).toBe(true);
			expect(tracker.isHostAllowed('transient.com', 'run-1')).toBe(false);
		});

		it('clearRun does not affect other runs', async () => {
			const tracker = createDomainAccessTracker();
			await tracker.approveOnce('run-1', 'site-a.com');
			await tracker.approveOnce('run-2', 'site-b.com');

			tracker.clearRun('run-1');

			expect(tracker.isHostAllowed('site-a.com', 'run-1')).toBe(false);
			expect(tracker.isHostAllowed('site-b.com', 'run-2')).toBe(true);
		});
	});

	describe('web-search approvals', () => {
		it('isWebSearchAllowed defaults to false', () => {
			const tracker = createDomainAccessTracker();
			expect(tracker.isWebSearchAllowed()).toBe(false);
			expect(tracker.isWebSearchAllowed('any-run')).toBe(false);
		});

		it('approveWebSearch grants persistent thread-level approval', async () => {
			const tracker = createDomainAccessTracker();
			await tracker.approveWebSearch();
			expect(tracker.isWebSearchAllowed()).toBe(true);
			expect(tracker.isWebSearchAllowed('run-1')).toBe(true);
		});

		it('approveWebSearchOnce grants transient run-scoped approval', async () => {
			const tracker = createDomainAccessTracker();
			await tracker.approveWebSearchOnce('run-1');
			expect(tracker.isWebSearchAllowed('run-1')).toBe(true);
			expect(tracker.isWebSearchAllowed('run-2')).toBe(false);
			expect(tracker.isWebSearchAllowed()).toBe(false);
		});

		it('clearRun removes transient web-search approval', async () => {
			const tracker = createDomainAccessTracker();
			await tracker.approveWebSearchOnce('run-1');
			tracker.clearRun('run-1');
			expect(tracker.isWebSearchAllowed('run-1')).toBe(false);
		});

		it('clearRun does not affect persistent web-search approval', async () => {
			const tracker = createDomainAccessTracker();
			await tracker.approveWebSearch();
			await tracker.approveWebSearchOnce('run-1');
			tracker.clearRun('run-1');
			expect(tracker.isWebSearchAllowed()).toBe(true);
		});

		it('approveAllDomains does not implicitly grant web-search', async () => {
			const tracker = createDomainAccessTracker();
			await tracker.approveAllDomains();
			expect(tracker.isWebSearchAllowed()).toBe(false);
		});
	});

	describe('seeding from persisted grant keys', () => {
		it('seeds per-host, blanket, and web-search approvals from grantedKeys', () => {
			const tracker = createDomainAccessTracker({
				grantedKeys: new Set([buildFetchUrlGrantKey('example.com'), WEB_SEARCH_GRANT_KEY]),
			});

			expect(tracker.isHostAllowed('example.com')).toBe(true);
			expect(tracker.isHostAllowed('other.com')).toBe(false);
			expect(tracker.isWebSearchAllowed()).toBe(true);
			expect(tracker.isAllDomainsApproved()).toBe(false);
		});

		it('seeds blanket approval from the allow-all grant key', () => {
			const tracker = createDomainAccessTracker({
				grantedKeys: new Set([FETCH_URL_ALLOW_ALL_GRANT_KEY]),
			});

			expect(tracker.isAllDomainsApproved()).toBe(true);
			expect(tracker.isHostAllowed('anything.com')).toBe(true);
		});

		it('ignores unrelated grant keys', () => {
			const tracker = createDomainAccessTracker({
				grantedKeys: new Set(['executions:run:abc123']),
			});

			expect(tracker.isAllDomainsApproved()).toBe(false);
			expect(tracker.isWebSearchAllowed()).toBe(false);
			expect(tracker.isHostAllowed('example.com')).toBe(false);
		});
	});

	describe('write-through persistence', () => {
		it('persists the fetch-url grant key on approveDomain', async () => {
			const persistGrant = vi.fn().mockResolvedValue(undefined);
			const tracker = createDomainAccessTracker({ persistGrant });

			await tracker.approveDomain('example.com');

			expect(persistGrant).toHaveBeenCalledWith(buildFetchUrlGrantKey('example.com'));
		});

		it('persists the allow-all grant key on approveAllDomains', async () => {
			const persistGrant = vi.fn().mockResolvedValue(undefined);
			const tracker = createDomainAccessTracker({ persistGrant });

			await tracker.approveAllDomains();

			expect(persistGrant).toHaveBeenCalledWith(FETCH_URL_ALLOW_ALL_GRANT_KEY);
		});

		it('persists the web-search grant key on approveWebSearch', async () => {
			const persistGrant = vi.fn().mockResolvedValue(undefined);
			const tracker = createDomainAccessTracker({ persistGrant });

			await tracker.approveWebSearch();

			expect(persistGrant).toHaveBeenCalledWith(WEB_SEARCH_GRANT_KEY);
		});

		it('does not persist transient (allow_once) approvals as thread grants', async () => {
			const persistGrant = vi.fn().mockResolvedValue(undefined);
			const tracker = createDomainAccessTracker({ persistGrant });

			await tracker.approveOnce('run-1', 'example.com');
			await tracker.approveWebSearchOnce('run-1');

			expect(persistGrant).not.toHaveBeenCalled();
		});

		it('persists transient approvals as run-scoped keys when persistRunGrant is set', async () => {
			const persistGrant = vi.fn().mockResolvedValue(undefined);
			const persistRunGrant = vi.fn().mockResolvedValue(undefined);
			const tracker = createDomainAccessTracker({ persistGrant, persistRunGrant });

			await tracker.approveOnce('run-1', 'example.com');
			await tracker.approveWebSearchOnce('run-1');

			expect(persistGrant).not.toHaveBeenCalled();
			expect(persistRunGrant).toHaveBeenCalledWith(
				buildFetchUrlOnceGrantKey('run-1', 'example.com'),
			);
			expect(persistRunGrant).toHaveBeenCalledWith(buildWebSearchOnceGrantKey('run-1'));
		});
	});

	describe('run-scoped approvals across tracker instances', () => {
		it('keeps an allow-once approval for the same run in a tracker seeded from the stored keys', async () => {
			const stored = new Set<string>();
			const persistRunGrant = async (key: string) => {
				stored.add(key);
			};
			const first = createDomainAccessTracker({ grantedKeys: new Set(stored), persistRunGrant });
			await first.approveOnce('run-1', 'example.com');
			await first.approveWebSearchOnce('run-1');

			// A resume creates the tracker again from the stored keys.
			const resumed = createDomainAccessTracker({ grantedKeys: new Set(stored), persistRunGrant });

			expect(resumed.isHostAllowed('example.com', 'run-1')).toBe(true);
			expect(resumed.isWebSearchAllowed('run-1')).toBe(true);
			expect(resumed.isHostAllowed('example.com', 'run-2')).toBe(false);
			expect(resumed.isHostAllowed('example.com')).toBe(false);
			expect(resumed.isWebSearchAllowed('run-2')).toBe(false);
			expect(resumed.isWebSearchAllowed()).toBe(false);
		});
	});
});
