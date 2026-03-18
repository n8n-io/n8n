import { isAllowedDomain } from '@n8n/api-types';

/**
 * Tracks domain-level approvals for the current thread.
 *
 * Two tiers of approval:
 * - **Persistent** (thread-level): `approveDomain(host)` and `approveAllDomains()`.
 *   These survive across runs within the same thread.
 * - **Transient** (run-level): `approveOnce(runId, host)`.
 *   These are scoped to a single run and cleared with `clearRun(runId)`.
 *
 * The check order in `isHostAllowed()` is:
 * 1. `allDomainsApproved` flag (blanket allow)
 * 2. Trusted allowlist (shared `isAllowedDomain()` from @n8n/api-types)
 * 3. Per-host persistent approval set
 * 4. Per-run transient approval set (when `runId` is provided)
 */
export interface DomainAccessTracker {
	/** Check whether a host is allowed. Optionally pass a runId to also check transient approvals. */
	isHostAllowed(host: string, runId?: string): boolean;
	/** Persistently approve an exact hostname for this thread. */
	approveDomain(host: string): void;
	/** Approve all domains for this thread (blanket allow). */
	approveAllDomains(): void;
	/** Whether all domains are approved. */
	isAllDomainsApproved(): boolean;
	/** Grant a one-time transient approval scoped to a specific run. */
	approveOnce(runId: string, host: string): void;
	/** Clear all transient approvals for a run (called when the run finishes). */
	clearRun(runId: string): void;
}

export function createDomainAccessTracker(): DomainAccessTracker {
	const approvedDomains = new Set<string>();
	const transientApprovals = new Map<string, Set<string>>(); // runId → Set<host>
	let allDomainsApproved = false;

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

		approveDomain(host: string): void {
			approvedDomains.add(host);
		},

		approveAllDomains(): void {
			allDomainsApproved = true;
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
		},
	};
}
