import { parseIntentPredictions } from '../intent/parse';

describe('parseIntentPredictions', () => {
	it('parses a single classification block', () => {
		const { predictions, error } = parseIntentPredictions(
			[
				'Anchor: workflow',
				'Embeds other: no',
				'Rationale: Fixed trigger and fixed action, no reasoning.',
			].join('\n'),
		);
		expect(error).toBeUndefined();
		expect(predictions).toEqual([
			{
				span: undefined,
				anchor: 'wf',
				embedsOther: false,
				rationale: 'Fixed trigger and fixed action, no reasoning.',
				clarifyingQuestions: undefined,
			},
		]);
	});

	it('normalizes "wf" and "workflow" both to the "wf" anchor', () => {
		expect(parseIntentPredictions('Anchor: wf\nEmbeds other: no').predictions[0].anchor).toBe('wf');
		expect(parseIntentPredictions('Anchor: workflow\nEmbeds other: no').predictions[0].anchor).toBe(
			'wf',
		);
	});

	it('parses multiple parts, each carrying its own Part: span', () => {
		const text = [
			'Part: "part 1"',
			'Anchor: workflow',
			'Embeds other: no',
			'Rationale: Scheduled + fixed action.',
			'',
			'Part: "part 2"',
			'Anchor: agent',
			'Embeds other: yes',
			'Rationale: Chat + escalation reasoning.',
		].join('\n');

		const { predictions, error } = parseIntentPredictions(text);
		expect(error).toBeUndefined();
		expect(predictions).toHaveLength(2);
		expect(predictions[0]).toMatchObject({ span: 'part 1', anchor: 'wf', embedsOther: false });
		expect(predictions[1]).toMatchObject({ span: 'part 2', anchor: 'agent', embedsOther: true });
	});

	it('parses a clarify block with bulleted clarifying questions', () => {
		const text = [
			'Anchor: clarify',
			'Embeds other: n/a',
			'Rationale: Under-specified: filing, triage, or autonomous reply?',
			'Clarifying questions:',
			'- Do you want deterministic rules or judgment-based triage?',
			'- Should replies go out automatically or wait for your approval?',
		].join('\n');

		const { predictions } = parseIntentPredictions(text);
		expect(predictions).toHaveLength(1);
		expect(predictions[0].anchor).toBe('clarify');
		expect(predictions[0].embedsOther).toBe('n/a');
		expect(predictions[0].clarifyingQuestions).toEqual([
			'Do you want deterministic rules or judgment-based triage?',
			'Should replies go out automatically or wait for your approval?',
		]);
	});

	it('tolerates markdown-bolded headers and leading bullets', () => {
		const text = [
			'- **Anchor:** agent',
			'- **Embeds other:** yes',
			'- **Rationale:** reasoning loop.',
		].join('\n');
		const { predictions } = parseIntentPredictions(text);
		expect(predictions).toEqual([
			{
				span: undefined,
				anchor: 'agent',
				embedsOther: true,
				rationale: 'reasoning loop.',
				clarifyingQuestions: undefined,
			},
		]);
	});

	it('defaults embeds_other to n/a when missing entirely', () => {
		const { predictions } = parseIntentPredictions(
			'Anchor: out-of-scope\nRationale: meta question.',
		);
		expect(predictions[0].embedsOther).toBe('n/a');
	});

	it('returns an error and no predictions when no classification block is found', () => {
		const { predictions, error } = parseIntentPredictions(
			"Sure, I'll build that workflow for you now.",
		);
		expect(predictions).toEqual([]);
		expect(error).toBe('no classification block found');
	});

	it('drops a block with an unrecognized anchor value and reports an error if none remain', () => {
		const { predictions, error } = parseIntentPredictions(
			'Anchor: something-else\nEmbeds other: no',
		);
		expect(predictions).toEqual([]);
		expect(error).toBe('no classification block found');
	});
});
