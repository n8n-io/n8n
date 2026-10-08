import {
	sharedCardRule,
	type AgentMessageAuthor,
	type InstanceAiConfirmRequest,
	type InstanceAiThreadOwner,
	type InstanceAiThreadSharedWith,
	type SharedCard,
} from '@n8n/api-types';
import { hasScope, type Scope } from '@n8n/permissions';
import { isRecord } from '@n8n/utils/is-record';
import { TOOL_CALL_STATE } from '@/features/ai/shared/agentsChat/constants';
import type { ToolCall } from '@/features/ai/shared/agentsChat/types';

/**
 * View rules for shared Assistant chats. They mirror the server rules
 * (cli `instance-ai/sharing`), so that the UI offers only what the server accepts.
 * The server still decides: it also checks the teammate's access to the card's
 * resource, so an answer that these rules allow can still be refused.
 */

/** A member reads the shared chats of a project with these scopes. The owner needs them to share. */
const READ_SCOPES: readonly Scope[] = ['instanceAi:message', 'project:read'];

/**
 * The card rules need an answer. These are the answers that need the fewest scopes: a teammate
 * who cannot give them cannot give any answer that the rules allow.
 */
const PROBE_ANSWERS: readonly InstanceAiConfirmRequest[] = [
	{ kind: 'approval', approved: true },
	{ kind: 'capabilityDecision', approved: false },
];

/** The thread's project as the viewer's project list shows it. */
export interface SharingProject {
	type: string;
	name: string | null;
	scopes?: readonly Scope[];
}

export interface SharingFacts {
	viewerId?: string;
	/** The project of the thread. */
	projectId?: string;
	owner?: InstanceAiThreadOwner;
	sharedWith?: InstanceAiThreadSharedWith;
	/** Undefined when the viewer's project list does not hold the thread's project. */
	project?: SharingProject;
}

export interface ThreadSharingView {
	/** Only the owner sends messages. A teammate reads the chat and answers some cards. */
	role: 'owner' | 'teammate';
	/** Set when the chat is shared. */
	isShared: boolean;
	/** The display name of the owner of a shared chat. Empty when unknown. */
	ownerName: string;
	projectId?: string;
	/** Empty when unknown. */
	projectName: string;
	/** Undefined when the viewer's project list does not hold the project. */
	projectType?: string;
	/** The viewer's scopes in the thread's project. */
	scopes: readonly Scope[];
}

/** What a teammate can do with a card. */
export type CardAccess = 'answer' | 'needs-role' | 'owner-only';

/** How a card was answered: a yes, a no, or the input that the card asked for. */
export type AnswerDecision = 'approved' | 'declined' | 'answered';

/** Who answered a card, as the tool-step row shows it. */
export interface AnswerAuthorship {
	decision: AnswerDecision;
	/** Undefined when the viewer gave the answer. */
	name?: string;
}

/** The fields of a tool call that tell who answered its card, and how. */
export type AnsweredCall = Partial<
	Pick<ToolCall, 'approvedBy' | 'declinedBy' | 'canceled' | 'state' | 'suspendPayload'>
>;

/** A card answer that did not go through. */
export interface ResumeFailureFacts {
	/** Set when the server refused the answer with an HTTP error. */
	status?: number;
	message?: string;
	/** The name that the server sent with a 409. */
	answeredBy?: string;
}

/** What the chat knows about the card after the history was read again. */
export interface ResumeFailureContext {
	/** Who the history now says answered the card. */
	answerer?: AgentMessageAuthor;
	viewerId?: string;
	isShared: boolean;
}

export type ResumeFailureNotice =
	| { kind: 'answered-by-you' }
	| { kind: 'already-answered'; name?: string }
	| { kind: 'refused'; message?: string };

export type SharedRowLabel = { kind: 'shared-by' | 'shared-with'; name: string };

function holdsAll(required: readonly Scope[], held: readonly Scope[]): boolean {
	return hasScope([...required], { global: [], project: [...held] }, undefined, { mode: 'allOf' });
}

/**
 * Only a shared chat has an owner field, so a chat without it belongs to the viewer. An
 * unknown viewer is not the owner: the server lets only the owner send.
 */
export function isTeammate(viewerId: string | undefined, owner?: InstanceAiThreadOwner): boolean {
	return owner !== undefined && owner.id !== viewerId;
}

/** The server sends an empty project name when it cannot find the project. */
function projectNameOf({ sharedWith, project }: SharingFacts): string {
	return sharedWith?.projectName || (project?.name ?? '');
}

/** How the viewer sees a chat: as its owner or as a teammate in a shared chat. */
export function threadSharingView(facts: SharingFacts): ThreadSharingView {
	return {
		role: isTeammate(facts.viewerId, facts.owner) ? 'teammate' : 'owner',
		isShared: facts.sharedWith !== undefined,
		ownerName: facts.owner?.name ?? '',
		projectId: facts.sharedWith?.projectId ?? facts.projectId,
		projectName: projectNameOf(facts),
		projectType: facts.project?.type,
		scopes: facts.project?.scopes ?? [],
	};
}

/**
 * Whether the owner can share the chat now: a chat that is not shared yet, in a team project
 * where the owner can read shared chats, with the team-project licence. The licence is read
 * last, and only when the rest allows a share.
 */
export function canShareThread(
	view: ThreadSharingView,
	teamProjectsEnabled: () => boolean,
): boolean {
	if (view.role !== 'owner' || view.isShared || view.projectType !== 'team') return false;
	return holdsAll(READ_SCOPES, view.scopes) && teamProjectsEnabled();
}

function findCardRule(call: SharedCard, projectId: string) {
	for (const answer of PROBE_ANSWERS) {
		const rule = sharedCardRule(call, answer, projectId);
		if (rule) return rule;
	}
	return undefined;
}

/**
 * What a teammate can do with the card of `call` in a chat of `projectId`, with `scopes` in
 * that project. A card without a rule is for the owner only.
 */
export function teammateCardAccess(
	call: SharedCard | undefined,
	projectId: string | undefined,
	scopes: readonly Scope[],
): CardAccess {
	if (!call || !projectId) return 'owner-only';
	const rule = findCardRule(call, projectId);
	if (!rule) return 'owner-only';
	return holdsAll(rule.scopes, scopes) ? 'answer' : 'needs-role';
}

const hasItems = (value: unknown) => Array.isArray(value) && value.length > 0;

/**
 * Whether a card asks for input (answers, text or a setup), not for a yes or a no. The server
 * records every answer that is not a no as an approval, so the card type tells them apart.
 */
export function asksForInput(suspendPayload: unknown): boolean {
	if (!isRecord(suspendPayload)) return false;
	const { inputType, setupRequests, credentialRequests } = suspendPayload;
	return (
		inputType === 'questions' ||
		inputType === 'text' ||
		hasItems(setupRequests) ||
		hasItems(credentialRequests)
	);
}

/**
 * A message from the owner cancels a waiting card. The server records the cancellation like an
 * answer, but nobody approved the card and it did not run.
 */
const isCancelled = (call: AnsweredCall) =>
	call.canceled === true || call.state === TOOL_CALL_STATE.CANCELLED;

function decisionOf(call: AnsweredCall): AnswerDecision {
	if (call.declinedBy) return 'declined';
	return asksForInput(call.suspendPayload) ? 'answered' : 'approved';
}

/**
 * Who answered a card. A private chat has one person, so its answers need no name. A shared
 * chat names every answer, and calls the viewer's own answers "you". A cancelled card names
 * nobody.
 */
export function answerAuthorship(
	call: AnsweredCall,
	viewerId: string | undefined,
	isShared: boolean,
): AnswerAuthorship | undefined {
	const author = call.declinedBy ?? call.approvedBy;
	if (!author || isCancelled(call)) return undefined;
	const decision = decisionOf(call);
	if (author.id === viewerId) return isShared ? { decision } : undefined;
	return author.name ? { decision, name: author.name } : undefined;
}

const alreadyAnswered = (name: string | undefined): ResumeFailureNotice => ({
	kind: 'already-answered',
	...(name && { name }),
});

/** The answerer in the history, when that is not the viewer. */
const otherAnswerer = ({ answerer, viewerId }: ResumeFailureContext) =>
	answerer && answerer.id !== viewerId ? answerer : undefined;

/**
 * Whether the viewer answered the card before, when the history names no other user. Only
 * the owner answers in a private chat, so the user that a 409 names there is the viewer.
 */
const viewerAnswered = (serverName: string | undefined, context: ResumeFailureContext) =>
	context.answerer !== undefined || (!context.isShared && serverName !== undefined);

/**
 * The message for an answer that did not go through. The history has the id of the answerer,
 * so it decides before the name in the 409. Undefined when there is nothing to add to the
 * transcript, which already shows the server state again.
 */
export function resumeFailureNotice(
	failure: ResumeFailureFacts,
	context: ResumeFailureContext,
): ResumeFailureNotice | undefined {
	const serverName = failure.answeredBy || undefined;
	const other = otherAnswerer(context);
	if (other) return alreadyAnswered(other.name || serverName);
	if (failure.status === 409 || serverName) {
		return viewerAnswered(serverName, context)
			? { kind: 'answered-by-you' }
			: alreadyAnswered(serverName);
	}
	// A stream error that names nobody else: the transcript already shows the error.
	if (failure.status === undefined) return undefined;
	return { kind: 'refused', ...(failure.message && { message: failure.message }) };
}

/** The sidebar label of a shared chat: who shared it, or for its owner, where it is shared. */
export function sharedRowLabel(
	thread: { sharedWith?: InstanceAiThreadSharedWith; owner?: InstanceAiThreadOwner },
	viewerId: string | undefined,
): SharedRowLabel | undefined {
	if (!thread.sharedWith) return undefined;
	if (isTeammate(viewerId, thread.owner)) {
		return { kind: 'shared-by', name: thread.owner?.name ?? '' };
	}
	return { kind: 'shared-with', name: thread.sharedWith.projectName };
}
