import {
	buildFetchUrlGrantKey,
	FETCH_URL_ALLOW_ALL_GRANT_KEY,
	isAllowedDomain,
	parseDomainAccessGrants,
	WEB_SEARCH_GRANT_KEY,
} from '@n8n/api-types';

/**
 * Tracks domain-level approvals for the current thread.
 *
 * Two tiers of approval:
 * - **Persistent** (thread-level): `approveDomain(host)`, `approveAllDomains()` and
 *   `approveWebSearch()`. These are written through to the caller's `persistGrant`
 *   callback (backed by `instance_ai_thread_grants`) so they survive restart and are
 *   visible across mains. The tracker is seeded from the persisted grant keys at
 *   construction via `grantedKeys`.
 * - **Transient** (run-level): `approveOnce(runId, host)`.
 *   These are scoped to a single run and cleared with `clearRun(runId)`.
 *
 * The check order in `isHostAllowed()` is:
 * 1. `allDomainsApproved` flag (blanket allow)
 * 2. Trusted allowlist (shared `isAllowedDomain()` from @n8n/api-types)
 * 3. Per-host persistent approval set
 * 4. Per-run transient approval set (when `runId` is provided)
 *
 * Web-search approval is tracked separately because the action has no target
 * host: approving "fetch from example.com" does not imply approval to query a
 * search provider (and vice versa).
 */
export interface DomainAccessTracker {
	/** Check whether a host is allowed. Optionally pass a runId to also check transient approvals. */
	isHostAllowed(host: string, runId?: string): boolean;
	/** Persistently approve an exact hostname for this thread. */
	approveDomain(host: string): Promise<void>;
	/** Approve all domains for this thread (blanket allow). */
	approveAllDomains(): Promise<void>;
	/** Whether all domains are approved. */
	isAllDomainsApproved(): boolean;
	/** Grant a one-time transient approval scoped to a specific run. */
	approveOnce(runId: string, host: string): void;
	/** Clear all transient approvals for a run (called when the run finishes). */
	clearRun(runId: string): void;

	/** Check whether web-search is allowed. Optionally pass a runId for transient approvals. */
	isWebSearchAllowed(runId?: string): boolean;
	/** Persistently approve web-search for this thread. */
	approveWebSearch(): Promise<void>;
	/** Grant a one-time transient web-search approval scoped to a specific run. */
	approveWebSearchOnce(runId: string): void;
}

export interface DomainAccessTrackerOptions {
	/** Persisted grant keys to seed persistent approvals from (e.g. loaded per run). */
	grantedKeys?: ReadonlySet<string>;
	/** Write-through callback invoked when a persistent approval is granted. */
	persistGrant?: (key: string) => Promise<void>;
}

export function createDomainAccessTracker(
	options: DomainAccessTrackerOptions = {},
): DomainAccessTracker {
	const { persistGrant } = options;
	const seed = parseDomainAccessGrants(options.grantedKeys ?? new Set());

	const approvedDomains = seed.approvedDomains;
	const transientApprovals = new Map<string, Set<string>>(); // runId → Set<host>
	let allDomainsApproved = seed.allDomainsApproved;

	let webSearchApproved = seed.webSearchApproved;
	const transientWebSearchApprovals = new Set<string>(); // Set<runId>

	return {
		isHostAllowed(host: string, runId?: string): boolean {
			if (allDomainsApproved) return true;
			if (isAllowedDomain(host)) return true;
			if (approvedDomains.has(host)) return true;
			if (runId) {
				const runHosts = transientApprovals.get(runId);
				if (runHosts?.has(host)) return true;
			}
			return false;
		},

		async approveDomain(host: string): Promise<void> {
			approvedDomains.add(host);
			await persistGrant?.(buildFetchUrlGrantKey(host));
		},

		async approveAllDomains(): Promise<void> {
			allDomainsApproved = true;
			await persistGrant?.(FETCH_URL_ALLOW_ALL_GRANT_KEY);
		},

		isAllDomainsApproved(): boolean {
			return allDomainsApproved;
		},

		approveOnce(runId: string, host: string): void {
			let runHosts = transientApprovals.get(runId);
			if (!runHosts) {
				runHosts = new Set();
				transientApprovals.set(runId, runHosts);
			}
			runHosts.add(host);
		},

		clearRun(runId: string): void {
			transientApprovals.delete(runId);
			transientWebSearchApprovals.delete(runId);
		},

		isWebSearchAllowed(runId?: string): boolean {
			if (webSearchApproved) return true;
			if (runId && transientWebSearchApprovals.has(runId)) return true;
			return false;
		},

		async approveWebSearch(): Promise<void> {
			webSearchApproved = true;
			await persistGrant?.(WEB_SEARCH_GRANT_KEY);
		},

		approveWebSearchOnce(runId: string): void {
			transientWebSearchApprovals.add(runId);
		},
	};
}
