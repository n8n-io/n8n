import { CODE_SUMMARY, GMAIL_SEND, HTTP_LIST, SLACK_POST } from './__fixtures__/facts';
import { buildCandidateSet } from './candidates';
import type { JevAnswers, JevQuestion } from './types';

function offered(question: JevQuestion | undefined): string[] {
	return question?.type === 'choice' ? Object.keys(question.criteria) : [];
}

/**
 * Jev never writes content: every answer is validated against the options the
 * mapper itself offered in `questions`. Anything else is ignored and the card
 * stays exactly the deterministic default (`source: 'mapped'`).
 */
describe('applyAnswers — answer validation', () => {
	it('ignores a title choice that was not among the offered options', () => {
		const set = buildCandidateSet(CODE_SUMMARY)!;
		expect(set.questions.title).toBeDefined();
		expect(offered(set.questions.title)).not.toContain('field:total');

		expect(set.apply({ title: { choice: 'field:total', confidence: 0.95 } })).toEqual(
			set.defaultCard,
		);
		expect(set.apply({ title: { choice: 'Made-up headline', confidence: 0.95 } })).toEqual(
			set.defaultCard,
		);
		expect(set.defaultCard.source).toBe('mapped');
	});

	it('ignores a metric_label choice that was never offered even if the path exists', () => {
		const set = buildCandidateSet(CODE_SUMMARY)!;
		expect(set.facts.fields.map((field) => field.path)).toContain('bySource');
		expect(offered(set.questions.metric_label)).toContain('field:topSource');
		expect(offered(set.questions.metric_label)).not.toContain('field:bySource');

		expect(set.apply({ metric_label: { choice: 'field:bySource', confidence: 0.9 } })).toEqual(
			set.defaultCard,
		);
	});

	it('still honours a metric_label choice that was offered', () => {
		const set = buildCandidateSet(CODE_SUMMARY)!;
		expect(
			set.apply({ metric_label: { choice: 'field:topSource', confidence: 0.9 } }),
		).toMatchObject({ type: 'metric', label: 'LinkedIn', source: 'jev' });
	});

	it('ignores answers to questions that were not asked', () => {
		// Registry cards never ask `include` — the gate must not fire for them.
		const gmail = buildCandidateSet(GMAIL_SEND)!;
		expect(gmail.questions).toEqual({});
		expect(gmail.apply({ include: { noul: 0 } })).toEqual(gmail.defaultCard);
		expect(gmail.apply({ email_show_preview: { noul: 0 } })).toEqual(gmail.defaultCard);

		// Only `message_emphasis` is asked for a Slack post.
		const slack = buildCandidateSet(SLACK_POST)!;
		expect(slack.apply({ title: { choice: 'node', confidence: 1 } })).toEqual(slack.defaultCard);

		// No metric archetype ⇒ no metric_value question, even though `rank` is a numeric path.
		const list = buildCandidateSet(HTTP_LIST)!;
		expect(list.questions.metric_value).toBeUndefined();
		expect(list.apply({ metric_value: { choice: 'rank', confidence: 0.9 } })).toEqual(
			list.defaultCard,
		);
		// Four columns ⇒ no col_* questions ⇒ scores are ignored.
		expect(list.apply({ col_0: { score: 0.1 }, col_1: { score: 0.9 } })).toEqual(list.defaultCard);
	});

	it('ignores a choice answer whose type does not match the question', () => {
		const set = buildCandidateSet(CODE_SUMMARY)!;
		expect(set.questions.include.type).toBe('noul');
		// `include` is a noul question; a choice/score payload must not trip the gate.
		expect(set.apply({ include: { choice: 'no', confidence: 1 } })).toEqual(set.defaultCard);
		expect(set.apply({ include: { score: 0 } })).toEqual(set.defaultCard);
		// `archetype` is a choice question; a noul payload must not select anything.
		expect(set.apply({ archetype: { noul: 1 } })).toEqual(set.defaultCard);
	});

	it('does not throw on primitive, null or malformed answers', () => {
		const set = buildCandidateSet(CODE_SUMMARY)!;
		const malformed = {
			title: 'yes',
			include: 0.9,
			archetype: null,
			metric_label: { choice: 42 },
			col_0: { score: 'high' },
		} as unknown as JevAnswers;

		expect(() => set.apply(malformed)).not.toThrow();
		expect(set.apply(malformed)).toEqual(set.defaultCard);
		expect(() => set.apply('nope' as unknown as JevAnswers)).not.toThrow();
		expect(set.apply('nope' as unknown as JevAnswers)).toEqual(set.defaultCard);
	});

	it('stamps source: jev only when a validated answer was applied', () => {
		const set = buildCandidateSet(CODE_SUMMARY)!;
		expect(set.apply({ title: { choice: 'nonsense', confidence: 1 } })?.source).toBe('mapped');
		expect(set.apply({ title: { choice: 'workflow', confidence: 1 } })).toMatchObject({
			title: 'Leads log',
			source: 'jev',
		});
	});
});
