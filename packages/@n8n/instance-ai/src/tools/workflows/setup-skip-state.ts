/**
 * Thread-scoped memory of the setup cards the user passed on.
 *
 * Skipping is a user decision, so it has to outlive the panel that collected it: the
 * blocking setup card is opened both by the agent and by the deterministic
 * `<workflow-setup-required>` routing, and the latter re-arms on every build. Without a
 * record, a skipped credential is indistinguishable from one that is merely still
 * unconfigured, and the next build re-opens the card the user just dismissed.
 *
 * Records live on the same per-thread, per-user store as the "always allow" grants, so they
 * survive reload and are visible across mains.
 */
import { buildSetupSkipGrantKey, parseSetupSkipGrants } from '@n8n/api-types';

import type { SetupRequest } from './setup-workflow.schema';
import type { InstanceAiContext } from '../../types';

/**
 * A skip is remembered per credential type, so every node needing that credential stays
 * quiet — the user declined the service, not one particular node. Cards with no credential
 * type (parameter-only or trigger-only) can't be generalised that way, so they fall back to
 * the node name.
 */
export function setupSkipSubject(request: SetupRequest): string {
	return request.credentialType ?? request.node.name;
}

/** Credential types / node names the user skipped earlier in this thread. */
export function getSkippedSetupSubjects(context: InstanceAiContext): ReadonlySet<string> {
	return parseSetupSkipGrants(context.sessionApprovedToolKeys ?? new Set<string>());
}

export function isSetupRequestSkipped(
	request: SetupRequest,
	skipped: ReadonlySet<string>,
): boolean {
	return skipped.has(setupSkipSubject(request));
}

/** Remember the given requests as skipped for the rest of the thread. */
export async function rememberSkippedSetup(
	context: InstanceAiContext,
	requests: readonly SetupRequest[],
): Promise<void> {
	const subjects = new Set(requests.map(setupSkipSubject));
	for (const subject of subjects) {
		await context.grantSessionToolApproval?.(buildSetupSkipGrantKey(subject));
	}
}

/**
 * Forget skips for the given subjects — a credential that just got configured, or one the
 * user explicitly asked to come back to, is no longer a declined decision.
 */
export async function forgetSkippedSetup(
	context: InstanceAiContext,
	subjects: Iterable<string>,
): Promise<void> {
	for (const subject of new Set(subjects)) {
		await context.revokeSessionToolApproval?.(buildSetupSkipGrantKey(subject));
	}
}

export interface PartitionedSetupRequests {
	/** Requests to put in front of the user. */
	pending: SetupRequest[];
	/** Requests suppressed because the user already skipped that credential type. */
	skippedByUser: SetupRequest[];
}

export function partitionSkippedSetupRequests(
	requests: readonly SetupRequest[],
	skipped: ReadonlySet<string>,
): PartitionedSetupRequests {
	const pending: SetupRequest[] = [];
	const skippedByUser: SetupRequest[] = [];
	for (const request of requests) {
		if (isSetupRequestSkipped(request, skipped)) skippedByUser.push(request);
		else pending.push(request);
	}
	return { pending, skippedByUser };
}

/** What the agent is told about cards it must not re-open. */
export function describeSkippedSetup(
	requests: readonly SetupRequest[],
): Array<{ nodeName: string; credentialType?: string }> {
	return requests.map((request) => ({
		nodeName: request.node.name,
		...(request.credentialType ? { credentialType: request.credentialType } : {}),
	}));
}

export const SKIPPED_SETUP_GUIDANCE =
	'The user skipped these earlier in this conversation. Do not re-open the setup card for them: ' +
	'mention in your message what stays unconfigured and what that means at runtime, and offer to ' +
	'set it up when they want. Only after the user asks for a specific one, call setup again with ' +
	'`reopenSkipped: ["<that credential type>"]`.';
