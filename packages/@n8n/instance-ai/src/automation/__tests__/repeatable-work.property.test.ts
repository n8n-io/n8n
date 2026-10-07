import fc from 'fast-check';

import type { RepeatableReason, WorkSignal } from '../repeatable-work';
import { assessRepeatableWork } from '../repeatable-work';

// The weights from the spec, kept apart from the implementation on purpose.
const SPEC_WEIGHTS: Record<RepeatableReason, number> = {
	'schedule-phrase': 0.6,
	'intent-phrase': 0.3,
	'repeated-tool-call': 0.4,
	'one-off-success': 0.2,
};
const SPEC_ORDER: RepeatableReason[] = [
	'schedule-phrase',
	'intent-phrase',
	'repeated-tool-call',
	'one-off-success',
];

// Fragments that often hit the intent and schedule rules, so that random messages cover them.
const FRAGMENTS = [
	'automate this',
	'every time',
	'Whenever',
	'from now on',
	'again next week',
	'keep doing it',
	'every day at 8',
	'each Monday morning',
	'hourly',
	'every 15 minutes',
	'automated',
	'thanks',
	'the daily standup',
	'please',
];

const textArb: fc.Arbitrary<string> = fc.oneof(
	fc.string({ maxLength: 40 }),
	fc.string({ unit: 'grapheme', maxLength: 40 }),
	fc.array(fc.constantFrom(...FRAGMENTS), { maxLength: 4 }).map((parts) => parts.join(' ')),
);

// A small pool makes duplicate signatures likely.
const signatureArb: fc.Arbitrary<string> = fc.oneof(
	fc.constantFrom('nodes:execute:slack', 'workflows:run:wf-1', 'credentials:list', '', ' '),
	fc.string({ maxLength: 12 }),
);

const userMessageArb: fc.Arbitrary<WorkSignal> = textArb.map((text) => ({
	kind: 'user-message',
	text,
}));
const toolCallArb: fc.Arbitrary<WorkSignal> = fc
	.record({ signature: signatureArb, ok: fc.boolean() })
	.map(({ signature, ok }) => ({ kind: 'tool-call', signature, ok }));
const oneOffArb: fc.Arbitrary<WorkSignal> = fc
	.string({ maxLength: 8 })
	.map((workflowId) => ({ kind: 'one-off-success', workflowId }));

const signalArb = fc.oneof(userMessageArb, toolCallArb, oneOffArb);
const signalsArb = fc.array(signalArb, { maxLength: 50 });

/** A random permutation of the signals. */
const shuffledArb = signalsArb.chain((signals) =>
	fc
		.shuffledSubarray(signals, { minLength: signals.length, maxLength: signals.length })
		.map((shuffled) => ({ signals, shuffled })),
);

const isUserMessage = (signal: WorkSignal) => signal.kind === 'user-message';

/** Puts the shuffled non-message signals back into the slots that non-message signals had. */
function shuffleNonMessages(signals: WorkSignal[], shuffled: WorkSignal[]): WorkSignal[] {
	const others = shuffled.filter((signal) => !isUserMessage(signal));
	return signals.map((signal) => (isUserMessage(signal) ? signal : (others.shift() ?? signal)));
}

/** Keeps only the first successful call for each signature. */
function withoutSuccessfulDuplicates(signals: WorkSignal[]): WorkSignal[] {
	const seen = new Set<string>();
	return signals.filter((signal) => {
		if (signal.kind !== 'tool-call' || !signal.ok) return true;
		if (seen.has(signal.signature)) return false;
		seen.add(signal.signature);
		return true;
	});
}

function successfulCallCount(signals: WorkSignal[], signature: string): number {
	return signals.filter(
		(signal) => signal.kind === 'tool-call' && signal.ok && signal.signature === signature,
	).length;
}

describe('assessRepeatableWork properties', () => {
	it('keeps the score in [0, 1], equal to the capped, rounded sum of the reason weights', () => {
		fc.assert(
			fc.property(signalsArb, (signals) => {
				const { score, reasons } = assessRepeatableWork(signals);
				const sum = reasons.reduce((total, reason) => total + SPEC_WEIGHTS[reason], 0);

				expect(score).toBeGreaterThanOrEqual(0);
				expect(score).toBeLessThanOrEqual(1);
				expect(score).toBe(Math.min(1, Math.round(sum * 100) / 100));
				expect(reasons).toEqual(SPEC_ORDER.filter((reason) => reasons.includes(reason)));
			}),
		);
	});

	it('gives the same score, reasons and repeated signatures in any order', () => {
		fc.assert(
			fc.property(shuffledArb, ({ signals, shuffled }) => {
				const before = assessRepeatableWork(signals);
				const after = assessRepeatableWork(shuffled);

				expect(after.score).toBe(before.score);
				expect(after.reasons).toEqual(before.reasons);
				expect(after.repeatedSignatures).toEqual(before.repeatedSignatures);
			}),
		);
	});

	it('gives the same assessment when only tool calls and one-off runs change order', () => {
		fc.assert(
			fc.property(shuffledArb, ({ signals, shuffled }) => {
				const reordered = shuffleNonMessages(signals, shuffled);

				expect(assessRepeatableWork(reordered)).toStrictEqual(assessRepeatableWork(signals));
			}),
		);
	});

	it('never lowers the score or loses a reason when a signal is appended', () => {
		fc.assert(
			fc.property(signalsArb, signalArb, (signals, extra) => {
				const before = assessRepeatableWork(signals);
				const after = assessRepeatableWork([...signals, extra]);

				expect(after.score).toBeGreaterThanOrEqual(before.score);
				expect(after.reasons).toEqual(expect.arrayContaining(before.reasons));
			}),
		);
	});

	it('removes "repeated-tool-call" when no successful signature occurs twice', () => {
		fc.assert(
			fc.property(signalsArb, (signals) => {
				const assessment = assessRepeatableWork(withoutSuccessfulDuplicates(signals));

				expect(assessment.reasons).not.toContain('repeated-tool-call');
				expect(assessment.repeatedSignatures).toEqual([]);
			}),
		);
	});

	it('lists only signatures that succeed at least twice, sorted and unique', () => {
		fc.assert(
			fc.property(signalsArb, (signals) => {
				const { reasons, repeatedSignatures } = assessRepeatableWork(signals);

				expect(repeatedSignatures).toEqual([...new Set(repeatedSignatures)].sort());
				for (const signature of repeatedSignatures) {
					expect(successfulCallCount(signals, signature)).toBeGreaterThanOrEqual(2);
				}
				expect(reasons.includes('repeated-tool-call')).toBe(repeatedSignatures.length > 0);
			}),
		);
	});

	it('ignores failed tool calls', () => {
		fc.assert(
			fc.property(signalsArb, fc.array(signatureArb, { maxLength: 10 }), (signals, failed) => {
				const failedCalls = failed.map(
					(signature): WorkSignal => ({ kind: 'tool-call', signature, ok: false }),
				);

				expect(assessRepeatableWork([...signals, ...failedCalls])).toStrictEqual(
					assessRepeatableWork(signals),
				);
			}),
		);
	});

	it('never throws', () => {
		fc.assert(
			fc.property(signalsArb, (signals) => {
				expect(() => assessRepeatableWork(signals)).not.toThrow();
			}),
		);
	});
});
