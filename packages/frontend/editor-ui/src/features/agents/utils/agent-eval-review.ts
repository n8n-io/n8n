import { isRecord } from '@n8n/utils/is-record';
import type { JsonObject } from 'n8n-workflow';

import type { AgentEvalRatingRecord, AgentEvalVote } from '../agentEvals.types';

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

/** The agent's answer for the case. Null when the run recorded none. */
export function readAgentAnswer(output: JsonObject | null | undefined): string | null {
	return readText(output, 'finalText');
}

/** The reviewer's edited answer, stored on the rating — never on the dataset. */
export function readCorrectionText(correction: JsonObject | null | undefined): string | null {
	return readText(correction, 'finalText');
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
