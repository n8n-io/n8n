/**
 * Reusable domain-gating helpers for any tool that accesses external URLs.
 *
 * Usage in a tool's execute():
 *   1. Call `checkDomainAccess()` — returns `{ allowed }` or a ready-to-use suspend payload
 *   2. On resume, call `applyDomainAccessResume()` — updates tracker state and returns proceed/deny
 */

import {
	instanceAiConfirmationSeveritySchema,
	domainAccessMetaSchema,
	domainAccessActionSchema,
} from '@n8n/api-types';
import type { InstanceAiPermissionMode } from '@n8n/api-types';
import { nanoid } from 'nanoid';
import { z } from 'zod';

import type { DomainAccessTracker } from './domain-access-tracker';

// ---------------------------------------------------------------------------
// Shared Zod schemas for tool suspend/resume
// ---------------------------------------------------------------------------

export const domainGatingSuspendSchema = z.object({
	requestId: z.string(),
	message: z.string(),
	severity: instanceAiConfirmationSeveritySchema,
	domainAccess: domainAccessMetaSchema,
});

export const domainGatingResumeSchema = z.object({
	approved: z.boolean(),
	domainAccessAction: domainAccessActionSchema.optional(),
});

// ---------------------------------------------------------------------------
// Check helper
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
// Resume helper
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
