/**
 * Shared HITL confirmation helpers for generic Approve / Always allow / Deny gates.
 *
 * Tools should prefer these over hand-rolled suspend/resume/grant logic so Always
 * allow (`scope: 'session'`) always persists a thread grant that matches the
 * frontend key from `resolveInstanceAiSessionGrantKey`.
 */
import {
	instanceAiConfirmationResumeSchema,
	instanceAiConfirmationSuspendSchema,
	type InstanceAiConfirmationResume,
	type InstanceAiConfirmationSuspend,
	type InstanceAiPermissionMode,
} from '@n8n/api-types';
import { nanoid } from 'nanoid';

import type { InstanceAiContext } from '../../types';

export {
	instanceAiConfirmationResumeSchema,
	instanceAiConfirmationSuspendSchema,
	type InstanceAiConfirmationResume,
	type InstanceAiConfirmationSuspend,
};

export type ConfirmationGateResult = 'proceed' | 'blocked' | 'denied';

export function hasSessionGrant(context: InstanceAiContext, grantKey: string): boolean {
	return context.sessionApprovedToolKeys?.has(grantKey) === true;
}

export async function persistSessionGrantIfRequested(
	context: InstanceAiContext,
	grantKey: string,
	resumeData: InstanceAiConfirmationResume | undefined | null,
): Promise<void> {
	if (resumeData?.approved === true && resumeData.scope === 'session') {
		await context.grantSessionToolApproval?.(grantKey);
	}
}

type SuspendFn = (payload: InstanceAiConfirmationSuspend) => Promise<never>;

export type ResolveConfirmationGateOptions = {
	context: InstanceAiContext;
	/** Admin permission for this action. `undefined` is treated as require_approval. */
	permission: InstanceAiPermissionMode | undefined;
	/**
	 * Session grant key to check / persist. Omit for destructive actions that must
	 * never mint an Always-allow grant (UI already hides Always allow).
	 */
	grantKey?: string;
	resumeData: InstanceAiConfirmationResume | undefined | null;
	suspend: SuspendFn;
	/** Suspend payload without `requestId` (generated when missing). */
	message: string;
	severity: InstanceAiConfirmationSuspend['severity'];
	/** Extra fields merged into the suspend payload (e.g. `workflowId`). */
	suspendExtras?: Record<string, string>;
};

/**
 * Runs the standard confirmation state machine:
 * blocked → session grant / always_allow → suspend → deny → persist session grant → proceed.
 *
 * Callers map `'blocked' | 'denied'` onto their tool-specific denied response shapes.
 */
export async function resolveConfirmationGate(
	options: ResolveConfirmationGateOptions,
): Promise<ConfirmationGateResult> {
	const { context, permission, grantKey, resumeData, suspend, message, severity, suspendExtras } =
		options;

	if (permission === 'blocked') {
		return 'blocked';
	}

	const allowedByAdmin = permission === 'always_allow';
	const allowedBySessionGrant = grantKey !== undefined && hasSessionGrant(context, grantKey);
	const needsApproval = !allowedByAdmin && !allowedBySessionGrant;

	if (needsApproval && (resumeData === undefined || resumeData === null)) {
		return await suspend({
			requestId: nanoid(),
			message,
			severity,
			...suspendExtras,
		});
	}

	if (resumeData !== undefined && resumeData !== null && !resumeData.approved) {
		return 'denied';
	}

	if (grantKey !== undefined) {
		await persistSessionGrantIfRequested(context, grantKey, resumeData);
	}

	return 'proceed';
}
