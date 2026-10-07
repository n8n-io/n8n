import type { SchedulePhrase } from './schedule-phrase';
import { parseSchedulePhrase } from './schedule-phrase';

export type WorkSignal =
	| { kind: 'user-message'; text: string }
	/** For example "nodes:execute:n8n-nodes-base.slack:message:post". */
	| { kind: 'tool-call'; signature: string; ok: boolean }
	| { kind: 'one-off-success'; workflowId: string };

export type RepeatableReason =
	/** The user asked for a schedule. */
	| 'schedule-phrase'
	/** The user said "automate", "every time", "whenever", "from now on", "again next" or "keep doing". */
	| 'intent-phrase'
	/** The same successful tool-call signature occurs at least twice. */
	| 'repeated-tool-call'
	/** A one-off run finished successfully. */
	| 'one-off-success';

export type RepeatableWorkAssessment = {
	/** From 0 to 1, rounded to 2 decimals. */
	score: number;
	/** Unique, in the order of `RepeatableReason`. */
	reasons: RepeatableReason[];
	/** From the last user message that has a schedule phrase. */
	suggestedTrigger?: SchedulePhrase;
	/** Signatures that count as repeated, sorted. */
	repeatedSignatures: string[];
};

export const REPEATABLE_WORK_THRESHOLD = 0.6;

/** Each reason counts once. The key order is the order of `reasons`. */
const REASON_WEIGHTS: Readonly<Record<RepeatableReason, number>> = {
	'schedule-phrase': 0.6,
	'intent-phrase': 0.3,
	'repeated-tool-call': 0.4,
	'one-off-success': 0.2,
};

const REASON_ORDER: readonly RepeatableReason[] = [
	'schedule-phrase',
	'intent-phrase',
	'repeated-tool-call',
	'one-off-success',
];

// Lookarounds instead of `\b`, so that letters with accents also block a match ("réautomate").
const INTENT_PHRASE =
	/(?<![\p{L}\p{N}_])(?:automate|every\s+time|whenever|from\s+now\s+on|again\s+next|keep\s+doing)(?![\p{L}\p{N}_])/iu;

type MessageFindings = { hasIntent: boolean; lastSchedule?: SchedulePhrase };

function scanUserMessages(signals: readonly WorkSignal[]): MessageFindings {
	const findings: MessageFindings = { hasIntent: false };
	for (const signal of signals) {
		if (signal.kind !== 'user-message') continue;
		findings.hasIntent ||= INTENT_PHRASE.test(signal.text);
		findings.lastSchedule = parseSchedulePhrase(signal.text) ?? findings.lastSchedule;
	}
	return findings;
}

/** A blank signature does not identify a tool call, so it never counts as a repeat. */
function findRepeatedSignatures(signals: readonly WorkSignal[]): string[] {
	const counts = new Map<string, number>();
	for (const signal of signals) {
		if (signal.kind !== 'tool-call' || !signal.ok || signal.signature.trim() === '') continue;
		counts.set(signal.signature, (counts.get(signal.signature) ?? 0) + 1);
	}
	return [...counts]
		.filter(([, count]) => count >= 2)
		.map(([signature]) => signature)
		.toSorted();
}

function toScore(reasons: readonly RepeatableReason[]): number {
	const sum = reasons.reduce((total, reason) => total + REASON_WEIGHTS[reason], 0);
	// Round so that 0.6 + 0.3 gives 0.9 and not 0.8999999999999999.
	return Math.min(1, Math.round(sum * 100) / 100);
}

/**
 * Scores how likely the work in a conversation is to repeat, so the Assistant
 * can offer to make it automatic. The score uses only which reasons are present,
 * so the order of tool calls and one-off runs has no effect. Never throws.
 */
export function assessRepeatableWork(signals: readonly WorkSignal[]): RepeatableWorkAssessment {
	const { hasIntent, lastSchedule } = scanUserMessages(signals);
	const repeatedSignatures = findRepeatedSignatures(signals);
	const present: Record<RepeatableReason, boolean> = {
		'schedule-phrase': lastSchedule !== undefined,
		'intent-phrase': hasIntent,
		'repeated-tool-call': repeatedSignatures.length > 0,
		'one-off-success': signals.some((signal) => signal.kind === 'one-off-success'),
	};
	const reasons = REASON_ORDER.filter((reason) => present[reason]);

	return {
		score: toScore(reasons),
		reasons,
		...(lastSchedule ? { suggestedTrigger: lastSchedule } : {}),
		repeatedSignatures,
	};
}

export function isRepeatableEnough(assessment: RepeatableWorkAssessment): boolean {
	return assessment.score >= REPEATABLE_WORK_THRESHOLD;
}
