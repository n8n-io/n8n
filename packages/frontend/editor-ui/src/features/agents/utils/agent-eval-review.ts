import { isRecord } from '@n8n/utils/is-record';
import type { IDataObject, JsonObject } from 'n8n-workflow';

import type {
	AgentEvalVerdict,
	AgentEvalRatingRecord,
	AgentEvalResultStatus,
	AgentEvalVote,
} from '../agentEvals.types';
import type { AgentAvatarKind } from '../components/AgentAvatar.vue';

/**
 * Readers for an eval result's JSON columns, and the state machine deciding what
 * a review row renders.
 *
 * Kept free of pinia so the rules that matter — above all "a thumbs-down needs a
 * reason" — are testable without mounting anything.
 */

/** Unsaved per-row edits. Present only while a row is being reviewed. */
export type ReviewDraft = {
	vote: AgentEvalVote | null;
	/** Only ever sent with a `down` vote. */
	comment: string;
	/** The edited answer; empty means no correction. */
	correction: string;
	/** Which sub-panels the row has open. */
	panel: 'reason' | 'answer' | 'both';
};

/**
 * A vote the server hasn't acknowledged yet. Separate from a persisted rating so
 * nothing has to invent a record id or timestamps to render optimistically.
 */
export type PendingReview = {
	vote: AgentEvalVote;
	comment: string | null;
	correction: string | null;
};

export type ReviewRowView =
	| { kind: 'unrated' }
	| {
			kind: 'editing';
			vote: AgentEvalVote | null;
			comment: string;
			correction: string;
			showReason: boolean;
			showAnswerEditor: boolean;
			canSave: boolean;
	  }
	| {
			kind: 'settled';
			vote: AgentEvalVote;
			comment: string | null;
			correction: string | null;
			saving: boolean;
	  };

/** A non-empty string, or null — the shape both `finalText` readers want. */
function readText(source: JsonObject | null | undefined, key: string): string | null {
	if (!isRecord(source)) return null;
	const value = source[key];
	return typeof value === 'string' && value.length > 0 ? value : null;
}

/**
 * The case's request text. A result's `input` is the whole case snapshot, not a
 * string, and its `input` cell comes from a Data Table so it can be any scalar.
 * Objects have no sensible one-line rendering, so they read as absent.
 */
export function readCaseRequest(input: JsonObject | null | undefined): string {
	if (!isRecord(input)) return '';
	const value = input.input;
	if (typeof value === 'string') return value;
	if (typeof value === 'number' || typeof value === 'boolean') return String(value);
	return '';
}

/** The case's "what to check" criteria, written into the snapshot under `criteria`.
 *  Null when the dataset maps no criteria column — a valid dataset, just one with
 *  no per-case rule. */
export function readCaseWhatToCheck(input: JsonObject | null | undefined): string | null {
	if (!isRecord(input)) return null;
	const value = input.criteria;
	if (typeof value === 'string' && value.length > 0) return value;
	return null;
}

/** The agent's answer for the case. Null when the run recorded none. */
export function readAgentAnswer(output: JsonObject | null | undefined): string | null {
	return readText(output, 'finalText');
}

/**
 * A short, human-readable reason a result errored. The shape of `errorDetails`
 * depends on which failure path in `agent-eval-runner.service.ts` wrote it —
 * most failures carry `{ message }`, a failed-but-ran execution carries
 * `{ errors, finalText }` instead. Read as plain strings only; nothing nested
 * deeper than that is ever persisted.
 */
export function readErrorMessage(errorDetails: IDataObject | null | undefined): string | null {
	if (!isRecord(errorDetails)) return null;

	const message = errorDetails.message;
	if (typeof message === 'string' && message.length > 0) return message;

	const errors = errorDetails.errors;
	if (!Array.isArray(errors)) return null;

	const joined = errors.filter((error): error is string => typeof error === 'string').join('; ');
	return joined.length > 0 ? joined : null;
}

/** The reviewer's edited answer, stored on the rating — never on the dataset. */
export function readCorrectionText(correction: JsonObject | null | undefined): string | null {
	return readText(correction, 'finalText');
}

/**
 * The judge's explanation, whichever way it ruled — or its error message when
 * the judge call itself failed. Null when judging never ran (`null`,
 * `'skipped'`), so a row with nothing graded shows nothing here.
 */
export function readVerdictReasoning(verdict: AgentEvalVerdict | null | undefined): string | null {
	if (!verdict || verdict.status === 'skipped') return null;
	return verdict.reasoning;
}

/**
 * Maps a result's execution status plus its (optional) judge verdict onto the
 * avatar vocabulary shared across every agent-eval view. Execution statuses
 * other than `success` are unaffected by judging — there is nothing to grade
 * until a case actually finishes.
 *
 * A graded fail reads as `work` ("needs a look"), not `fail` — `fail` already
 * means "couldn't finish" (an execution error) elsewhere in this vocabulary,
 * and conflating "ran fine but broke the rule" with that would cost a reviewer
 * the at-a-glance distinction between the two. `work` already carries this
 * "ran, but needs a look" meaning for a cancelled case; this extends its
 * population, not its meaning.
 */
export function toAvatarKind(
	status: AgentEvalResultStatus,
	verdict: AgentEvalVerdict | null | undefined,
): AgentAvatarKind {
	if (status === 'new') return 'idle';
	if (status === 'running') return 'waiting';
	if (status === 'error') return 'fail';
	if (status === 'cancelled') return 'work';
	// status === 'success':
	if (!verdict || verdict.status !== 'completed') return 'pass'; // ungraded — old behavior
	return verdict.outcome === 'pass' ? 'pass' : 'work';
}

/**
 * Whether a draft can be persisted. A thumbs-down without a reason cannot: the
 * reason is the only thing that says *why* the answer was wrong, and asking for
 * it on disagreement alone is what keeps the review from becoming a rubber stamp.
 */
export function canSaveDraft(draft: ReviewDraft): boolean {
	if (draft.vote === null) return false;
	if (draft.vote === 'up') return true;
	return draft.comment.trim().length > 0;
}

/**
 * Precedence is draft → pending → persisted rating → unrated: what the reviewer
 * is typing outranks what is in flight, which outranks what is stored.
 */
export function resolveReviewRowView(input: {
	rating?: AgentEvalRatingRecord;
	pending?: PendingReview;
	draft?: ReviewDraft;
}): ReviewRowView {
	const { rating, pending, draft } = input;

	if (draft) {
		return {
			kind: 'editing',
			vote: draft.vote,
			comment: draft.comment,
			correction: draft.correction,
			showReason: draft.vote === 'down' && draft.panel !== 'answer',
			showAnswerEditor: draft.panel === 'answer' || draft.panel === 'both',
			canSave: canSaveDraft(draft),
		};
	}

	if (pending) {
		return {
			kind: 'settled',
			vote: pending.vote,
			comment: pending.comment,
			correction: pending.correction,
			saving: true,
		};
	}

	if (rating) {
		return {
			kind: 'settled',
			vote: rating.vote,
			comment: rating.comment,
			correction: readCorrectionText(rating.correction),
			saving: false,
		};
	}

	return { kind: 'unrated' };
}
