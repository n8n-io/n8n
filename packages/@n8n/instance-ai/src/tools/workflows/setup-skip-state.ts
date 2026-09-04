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
 * Whether the card is asking for the credential itself rather than for a parameter. A node
 * can need action with a perfectly good credential attached — an unfilled `documentId`, a
 * placeholder left in a parameter — and that card says nothing about the service.
 */
function isCredentialSkip(
	request: SetupRequest,
): request is SetupRequest & { credentialType: string } {
	return request.credentialType !== undefined && request.credentialNeedsAction === true;
}

/**
 * A skip of a *credential* card generalises to its credential type and to the whole thread:
 * declining to connect Slack should quiet every Slack node, in this workflow and the next.
 *
 * A skip of a *parameter* card can't be generalised that way — the user declined to fill one
 * field on one node, not to use the service — so it's keyed by node, scoped to the workflow.
 * Node names are only unique within a workflow, and a thread can build several.
 */
export function setupSkipSubject(request: SetupRequest, workflowId: string): string {
	return isCredentialSkip(request)
		? `cred:${request.credentialType}`
		: nodeSubject(request.node.name, workflowId);
}

/**
 * The string a caller passes to `reopenSkipped` to bring this card back — the credential type
 * for a credential card, the node name for a parameter one. Kept out of the grant key on
 * purpose: the key needs to be unambiguous, this needs to be what the user would say.
 */
export function setupSkipReopenToken(request: SetupRequest): string {
	return isCredentialSkip(request) ? request.credentialType : request.node.name;
}

function nodeSubject(nodeName: string, workflowId: string): string {
	return `node:${workflowId}:${nodeName}`;
}

/** Skip subjects recorded earlier in this thread. */
export function getSkippedSetupSubjects(context: InstanceAiContext): ReadonlySet<string> {
	return parseSetupSkipGrants(context.sessionApprovedToolKeys ?? new Set<string>());
}

export function isSetupRequestSkipped(
	request: SetupRequest,
	workflowId: string,
	skipped: ReadonlySet<string>,
): boolean {
	return skipped.has(setupSkipSubject(request, workflowId));
}

/** Remember the given requests as skipped for the rest of the thread. */
export async function rememberSkippedSetup(
	context: InstanceAiContext,
	requests: readonly SetupRequest[],
	workflowId: string,
): Promise<void> {
	const subjects = new Set(requests.map((request) => setupSkipSubject(request, workflowId)));
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

export interface ResolvedReopenTargets {
	/** Skip subjects to forget. */
	subjects: string[];
	/** Entries that named nothing in this workflow — reported rather than silently dropped. */
	unmatched: string[];
}

/**
 * Map what the caller named (`["slackApi"]`, `["Post to Slack"]`) onto skip subjects.
 * Accepts either spelling and ignores case, because the model is relaying the user's words.
 *
 * Anything that matches nothing comes back in `unmatched`: a near-miss that silently left the
 * card closed would strand the user, who has just asked for it in so many words, behind
 * guidance telling the agent not to re-open it.
 */
export function resolveReopenTargets(
	requests: readonly SetupRequest[],
	workflowId: string,
	requested: readonly string[],
): ResolvedReopenTargets {
	const subjects = new Set<string>();
	const unmatched: string[] = [];
	for (const entry of requested) {
		const wanted = entry.toLowerCase();
		const byCredentialType = requests.filter(
			(request) => request.credentialType?.toLowerCase() === wanted,
		);
		const byNodeName = requests.filter((request) => request.node.name.toLowerCase() === wanted);
		const matches = byCredentialType.length > 0 ? byCredentialType : byNodeName;
		if (matches.length === 0) {
			unmatched.push(entry);
			continue;
		}
		// Clear what the user named, at the granularity they named it. "Connect Slack" also drops
		// the type-wide record — otherwise a card re-keyed since the skip (a credential attached
		// outside the panel) would stay hidden. Naming one node touches only that node, so it
		// can't drag another node's declined credential back into the card.
		//
		// Naming the type deliberately reaches the parameter cards on nodes using it, not just the
		// credential ones: `cred:` is coarse by design (that is what quiets sibling nodes), and the
		// user asking to set up Slack is asking about Slack. Restricting this to credential cards
		// would make "set up Slack" fail outright whenever the only Slack card left is a parameter
		// one, and split one request into two asks.
		if (byCredentialType.length > 0) {
			subjects.add(`cred:${byCredentialType[0].credentialType}`);
		}
		for (const match of matches) subjects.add(setupSkipSubject(match, workflowId));
	}
	return { subjects: [...subjects], unmatched };
}

/**
 * Subjects to clear for the cards the user just finished configuring, keyed off what was
 * actually applied rather than off the node's re-analysed state.
 *
 * `credentialType` is set only when a credential of that type was applied to that node, so
 * that is the one case where a type-wide `cred:` record stops being a declined decision.
 * A node that only completed a *parameter* clears its own record and nothing else — its
 * credential was already connected, so it says nothing about a credential another node is
 * still waiting on. Reading the post-apply state instead would conflate the two, because
 * attaching a credential is exactly what re-keys a card from `cred:` to `node:`.
 */
export function completedSetupSubjects(
	completed: ReadonlyArray<{ nodeName: string; credentialType?: string }>,
	workflowId: string,
): string[] {
	const subjects = new Set<string>();
	for (const entry of completed) {
		subjects.add(nodeSubject(entry.nodeName, workflowId));
		if (entry.credentialType) subjects.add(`cred:${entry.credentialType}`);
	}
	return [...subjects];
}

export interface PartitionedSetupRequests {
	/** Requests to put in front of the user. */
	pending: SetupRequest[];
	/** Requests suppressed because the user already skipped them. */
	skippedByUser: SetupRequest[];
}

export function partitionSkippedSetupRequests(
	requests: readonly SetupRequest[],
	workflowId: string,
	skipped: ReadonlySet<string>,
): PartitionedSetupRequests {
	const pending: SetupRequest[] = [];
	const skippedByUser: SetupRequest[] = [];
	for (const request of requests) {
		if (isSetupRequestSkipped(request, workflowId, skipped)) skippedByUser.push(request);
		else pending.push(request);
	}
	return { pending, skippedByUser };
}

/** What the agent is told about cards it must not re-open. */
export function describeSkippedSetup(
	requests: readonly SetupRequest[],
): Array<{ nodeName: string; credentialType?: string; reopenWith: string }> {
	return requests.map((request) => ({
		nodeName: request.node.name,
		...(request.credentialType ? { credentialType: request.credentialType } : {}),
		reopenWith: setupSkipReopenToken(request),
	}));
}

export const SKIPPED_SETUP_GUIDANCE =
	'The user skipped these earlier in this conversation. Do not re-open the setup card for them: ' +
	'mention in your message what stays unconfigured and what that means at runtime, and offer to ' +
	'set it up when they want. Only after the user asks for a specific one, call setup again with ' +
	'`reopenSkipped: ["<its reopenWith value>"]`.';
