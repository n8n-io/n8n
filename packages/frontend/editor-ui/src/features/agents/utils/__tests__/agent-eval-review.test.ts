import type { JsonObject } from 'n8n-workflow';

import type { AgentEvalRatingRecord } from '../../agentEvals.types';
import type { ReviewDraft } from '../agent-eval-review';
import {
	canSaveDraft,
	readAgentAnswer,
	readCaseRequest,
	readCorrectionText,
	resolveReviewRowView,
} from '../agent-eval-review';

const draft = (overrides: Partial<ReviewDraft> = {}): ReviewDraft => ({
	vote: 'down',
	comment: '',
	correction: '',
	panel: 'reason',
	...overrides,
});

const rating = (overrides: Partial<AgentEvalRatingRecord> = {}): AgentEvalRatingRecord => ({
	id: 'rating-1',
	resultId: 'result-1',
	vote: 'up',
	comment: null,
	correction: null,
	ratedById: 'user-1',
	createdAt: '2026-08-05T00:00:00.000Z',
	updatedAt: '2026-08-05T00:00:00.000Z',
	...overrides,
});

describe('readCaseRequest', () => {
	// A result's `input` is the case snapshot, and its `input` cell comes from a
	// Data Table, so every scalar it can hold has to read back sensibly.
	test.each([
		['a string', { input: 'Find me a hotel in Tokyo.' }, 'Find me a hotel in Tokyo.'],
		['a number', { input: 42 }, '42'],
		['a boolean', { input: true }, 'true'],
		['a null cell', { input: null }, ''],
		['a missing key', {}, ''],
		['an object cell', { input: { nested: 1 } }, ''],
	])('reads %s', (_label, input, expected) => {
		expect(readCaseRequest(input as JsonObject)).toBe(expected);
	});

	test.each([
		['null', null],
		['undefined', undefined],
	])('returns an empty string for %s', (_label, input) => {
		expect(readCaseRequest(input)).toBe('');
	});
});

describe.each([
	['readAgentAnswer', readAgentAnswer],
	['readCorrectionText', readCorrectionText],
])('%s', (_label, read) => {
	it('reads a non-empty finalText', () => {
		expect(read({ finalText: 'It is 30°C in Bali.' } as JsonObject)).toBe('It is 30°C in Bali.');
	});

	test.each([
		['an empty finalText', { finalText: '' }],
		['a non-string finalText', { finalText: 3 }],
		['a missing finalText', {}],
	])('returns null for %s', (_case, input) => {
		expect(read(input as JsonObject)).toBeNull();
	});

	test.each([
		['null', null],
		['undefined', undefined],
	])('returns null for %s', (_case, input) => {
		expect(read(input)).toBeNull();
	});
});

describe('canSaveDraft', () => {
	it('cannot save without a vote', () => {
		expect(canSaveDraft(draft({ vote: null, comment: 'anything' }))).toBe(false);
	});

	// The anti-rubber-stamp rule: disagreement has to say why.
	test.each([
		['an empty reason', ''],
		['a whitespace-only reason', '   '],
	])('cannot save a thumbs-down with %s', (_label, comment) => {
		expect(canSaveDraft(draft({ vote: 'down', comment }))).toBe(false);
	});

	it('can save a thumbs-down with a reason', () => {
		expect(canSaveDraft(draft({ vote: 'down', comment: 'It answered off-task.' }))).toBe(true);
	});

	// Friction on agreement is what causes rubber-stamping, so 👍 never asks.
	it('can save a thumbs-up with no reason', () => {
		expect(canSaveDraft(draft({ vote: 'up', comment: '' }))).toBe(true);
	});
});

describe('resolveReviewRowView', () => {
	it('is unrated when there is nothing to show', () => {
		expect(resolveReviewRowView({})).toEqual({ kind: 'unrated' });
	});

	it('prefers a draft over both pending and persisted state', () => {
		const view = resolveReviewRowView({
			rating: rating(),
			pending: { vote: 'up', comment: null, correction: null },
			draft: draft({ vote: 'down', comment: 'typing' }),
		});

		expect(view).toMatchObject({ kind: 'editing', vote: 'down', comment: 'typing' });
	});

	it('prefers pending over a persisted rating, and marks it saving', () => {
		const view = resolveReviewRowView({
			rating: rating({ vote: 'up' }),
			pending: { vote: 'down', comment: 'wrong', correction: null },
		});

		expect(view).toMatchObject({ kind: 'settled', vote: 'down', saving: true });
	});

	it('settles from a persisted rating', () => {
		const view = resolveReviewRowView({ rating: rating({ vote: 'up' }) });

		expect(view).toMatchObject({ kind: 'settled', vote: 'up', saving: false });
	});

	it('exposes the correction text from a persisted rating', () => {
		const view = resolveReviewRowView({
			rating: rating({
				vote: 'down',
				comment: 'It answered off-task.',
				correction: { finalText: 'Weather is not something I plan.' },
			}),
		});

		expect(view).toMatchObject({
			kind: 'settled',
			correction: 'Weather is not something I plan.',
			comment: 'It answered off-task.',
		});
	});

	describe('editing panels', () => {
		it('shows the reason field for a thumbs-down', () => {
			const view = resolveReviewRowView({ draft: draft({ vote: 'down', panel: 'reason' }) });

			expect(view).toMatchObject({ showReason: true, showAnswerEditor: false });
		});

		// The reason field must be unreachable on the agreement path.
		it('never shows the reason field for a thumbs-up', () => {
			const view = resolveReviewRowView({ draft: draft({ vote: 'up', panel: 'reason' }) });

			expect(view).toMatchObject({ showReason: false });
		});

		it('shows both fields when the answer is being edited alongside a reason', () => {
			const view = resolveReviewRowView({ draft: draft({ vote: 'down', panel: 'both' }) });

			expect(view).toMatchObject({ showReason: true, showAnswerEditor: true });
		});

		it('shows only the answer editor when that is the open panel', () => {
			const view = resolveReviewRowView({ draft: draft({ vote: 'down', panel: 'answer' }) });

			expect(view).toMatchObject({ showReason: false, showAnswerEditor: true });
		});
	});
});
