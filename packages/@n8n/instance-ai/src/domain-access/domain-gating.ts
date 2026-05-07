/**
 * Reusable gating helpers for tools that access external web resources.
 *
 * Two parallel flows share the same suspend/resume infrastructure:
 *  - **fetch-url** — gates per target host via the domain access tracker.
 *  - **web-search** — gates per thread/run via the tracker's web-search flag.
 *
 * Both are governed by `permissions.fetchUrl` (one "web access" capability).
 *
 * Usage in a tool's execute():
 *   1. Call `checkDomainAccess()` / `checkWebSearchAccess()` — returns
 *      `{ allowed }` or a ready-to-use suspend payload.
 *   2. On resume, call `applyDomainAccessResume()` / `applyWebSearchAccessResume()`
 *      — updates tracker state and returns proceed/deny.
 */

import {
	instanceAiConfirmationSeveritySchema,
	domainAccessMetaSchema,
	domainAccessActionSchema,
	webSearchMetaSchema,
} from '@n8n/api-types';
import type { InstanceAiPermissionMode } from '@n8n/api-types';
import { nanoid } from 'nanoid';
import { z } from 'zod';

import type { DomainAccessTracker } from './domain-access-tracker';

// ---------------------------------------------------------------------------
// Shared Zod schemas for tool suspend/resume
// ---------------------------------------------------------------------------

/**
 * Suspend payload for any tool that gates external web access. Carries either
 * `domainAccess` (fetch-url) or `webSearch` (web-search) metadata depending on
 * which action triggered the suspend. The two are disjoint at runtime — exactly
 * one is set — but kept as optional siblings to keep the schema flat and the
 * frontend's "which approval UI?" dispatch driven by field presence.
 */
export const domainGatingSuspendSchema = z.object({
	requestId: z.string(),
	message: z.string(),
	severity: instanceAiConfirmationSeveritySchema,
	domainAccess: domainAccessMetaSchema.optional(),
	webSearch: webSearchMetaSchema.optional(),
});

export const domainGatingResumeSchema = z.object({
	approved: z.boolean(),
	domainAccessAction: domainAccessActionSchema.optional(),
});

// ---------------------------------------------------------------------------
// Check helper — fetch-url
// ---------------------------------------------------------------------------

export interface DomainGatingCheck {
	allowed: boolean;
	/** When true, the action is blocked by admin — no approval prompt, just denied. */
	blocked?: boolean;
	/** When not allowed, the tool should pass this to `suspend()`. */
	suspendPayload?: z.infer<typeof domainGatingSuspendSchema>;
}

/**
 * Check whether a URL's host is allowed. If not, returns a
 * ready-to-use suspend payload. Tools call this, then suspend if needed.
 */
export function checkDomainAccess(options: {
	url: string;
	tracker?: DomainAccessTracker;
	permissionMode?: InstanceAiPermissionMode;
	runId?: string;
}): DomainGatingCheck {
	const { url, tracker, permissionMode, runId } = options;

	// Permission set to blocked → deny immediately, no approval prompt
	if (permissionMode === 'blocked') {
		return { allowed: false, blocked: true };
	}

	// Permission set to always_allow → skip gating entirely
	if (permissionMode === 'always_allow') {
		return { allowed: true };
	}

	let host: string;
	try {
		host = new URL(url).hostname;
	} catch {
		// Invalid URL — let the fetch itself fail with a proper error
		return { allowed: true };
	}

	// Tracker checks: trusted allowlist, persistent approvals, transient approvals
	if (tracker?.isHostAllowed(host, runId)) {
		return { allowed: true };
	}

	// Not allowed — build suspend payload
	return {
		allowed: false,
		suspendPayload: {
			requestId: nanoid(),
			message: `n8n AI wants to fetch content from ${host}`,
			severity: 'info' as const,
			domainAccess: { url, host },
		},
	};
}

// ---------------------------------------------------------------------------
// Check helper — web-search
// ---------------------------------------------------------------------------

/**
 * Check whether web-search is allowed for the current run/thread. If not,
 * returns a ready-to-use suspend payload. Gated by the same `fetchUrl`
 * permission, but with separate tracker state (approving a fetch domain
 * does not approve search and vice versa).
 */
export function checkWebSearchAccess(options: {
	query: string;
	tracker?: DomainAccessTracker;
	permissionMode?: InstanceAiPermissionMode;
	runId?: string;
}): DomainGatingCheck {
	const { query, tracker, permissionMode, runId } = options;

	if (permissionMode === 'blocked') {
		return { allowed: false, blocked: true };
	}

	if (permissionMode === 'always_allow') {
		return { allowed: true };
	}

	if (tracker?.isWebSearchAllowed(runId)) {
		return { allowed: true };
	}

	return {
		allowed: false,
		suspendPayload: {
			requestId: nanoid(),
			message: `n8n AI wants to search the web for: ${query}`,
			severity: 'info' as const,
			webSearch: { query },
		},
	};
}

// ---------------------------------------------------------------------------
// Resume helpers
// ---------------------------------------------------------------------------

/**
 * Process the user's domain-level decision from resume data.
 * Updates the tracker state and returns whether the tool should proceed.
 */
export function applyDomainAccessResume(options: {
	resumeData: { approved: boolean; domainAccessAction?: string };
	host: string;
	tracker?: DomainAccessTracker;
	runId?: string;
}): { proceed: boolean } {
	const { resumeData, host, tracker, runId } = options;

	if (!resumeData.approved) {
		return { proceed: false };
	}

	const action = resumeData.domainAccessAction;

	if (tracker) {
		switch (action) {
			case 'allow_domain':
				tracker.approveDomain(host);
				break;
			case 'allow_all':
				tracker.approveAllDomains();
				break;
			case 'allow_once':
			default:
				// Transient: scoped to this run only
				if (runId) {
					tracker.approveOnce(runId, host);
				}
				break;
		}
	}

	return { proceed: true };
}

/**
 * Process the user's web-search decision from resume data.
 * The same `domainAccessAction` enum drives the scope:
 *   - allow_once  → transient (this run only)
 *   - allow_domain → persistent (this thread)
 *   - allow_all   → persistent (no broader scope makes sense for search)
 */
export function applyWebSearchAccessResume(options: {
	resumeData: { approved: boolean; domainAccessAction?: string };
	tracker?: DomainAccessTracker;
	runId?: string;
}): { proceed: boolean } {
	const { resumeData, tracker, runId } = options;

	if (!resumeData.approved) {
		return { proceed: false };
	}

	const action = resumeData.domainAccessAction;

	if (tracker) {
		switch (action) {
			case 'allow_domain':
			case 'allow_all':
				tracker.approveWebSearch();
				break;
			case 'allow_once':
			default:
				if (runId) {
					tracker.approveWebSearchOnce(runId);
				}
				break;
		}
	}

	return { proceed: true };
}
