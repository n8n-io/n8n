import { gradeIntentExpectation, parseIntentBlock } from '../build-expectations/intent';
import type { IntentExpectation } from '../types';

function block(body: string): string {
	return ['Some reasoning here.', '```intent', body, '```'].join('\n');
}

describe('parseIntentBlock', () => {
	it('parses a well-formed single block', () => {
		const result = parseIntentBlock(
			block('{"anchor": "workflow-anchored", "embeds_other": false}'),
		);
		expect(result).toEqual({
			ok: true,
			kind: 'single',
			tuple: { anchor: 'wf', embedsOther: false },
		});
	});

	it('normalizes anchor and embeds_other vocabulary variants', () => {
		expect(parseIntentBlock(block('{"anchor": "agent-anchored", "embeds_other": false}'))).toEqual({
			ok: true,
			kind: 'single',
			tuple: { anchor: 'agent', embedsOther: false },
		});
		expect(parseIntentBlock(block('{"anchor": "AGENT", "embeds_other": false}'))).toEqual({
			ok: true,
			kind: 'single',
			tuple: { anchor: 'agent', embedsOther: false },
		});
		expect(
			parseIntentBlock(block('{"anchor": "needs-clarification", "embeds_other": null}')),
		).toEqual({ ok: true, kind: 'single', tuple: { anchor: 'clarify', embedsOther: 'n/a' } });
		expect(parseIntentBlock(block('{"anchor": "out_of_scope"}'))).toEqual({
			ok: true,
			kind: 'single',
			tuple: { anchor: 'out-of-scope', embedsOther: 'n/a' },
		});
		expect(parseIntentBlock(block('{"anchor": "wf", "embeds_other": "false"}'))).toEqual({
			ok: true,
			kind: 'single',
			tuple: { anchor: 'wf', embedsOther: false },
		});
		expect(parseIntentBlock(block('{"anchor": "wf", "embedsOther": true}'))).toEqual({
			ok: true,
			kind: 'single',
			tuple: { anchor: 'wf', embedsOther: true },
		});
	});

	it('uses the last intent block when several are present', () => {
		const text = [
			block('{"anchor": "wf", "embeds_other": false}'),
			'more text',
			block('{"anchor": "agent", "embeds_other": true}'),
		].join('\n');
		expect(parseIntentBlock(text)).toEqual({
			ok: true,
			kind: 'single',
			tuple: { anchor: 'agent', embedsOther: true },
		});
	});

	it('returns undefined when no block is present', () => {
		expect(parseIntentBlock('just some prose, no fenced block')).toBeUndefined();
	});

	it('fails on invalid JSON', () => {
		const result = parseIntentBlock(block('{not json'));
		expect(result).toEqual({ ok: false, error: 'intent block is not valid JSON' });
	});

	it('fails on an unrecognized anchor value, naming it in the error', () => {
		const result = parseIntentBlock(block('{"anchor": "bogus", "embeds_other": false}'));
		expect(result?.ok).toBe(false);
		expect(!result?.ok && result.error).toContain('bogus');
	});
});

describe('gradeIntentExpectation', () => {
	it('passes a single classification matching the accepted tuple', () => {
		const expectation: IntentExpectation = { accepts: [{ anchor: 'wf', embedsOther: false }] };
		const results = gradeIntentExpectation(
			expectation,
			block('{"anchor": "workflow-anchored", "embeds_other": false}'),
		);
		expect(results).toEqual([
			{
				expectation: 'intent: anchor + embeds_other exact-match',
				pass: true,
				reason: 'matched {anchor: wf, embeds_other: false}',
			},
		]);
	});

	it('fails, not incomplete, when finalText carries no intent block', () => {
		const expectation: IntentExpectation = { accepts: [{ anchor: 'wf', embedsOther: false }] };
		const [result] = gradeIntentExpectation(expectation, 'no block here');
		expect(result.pass).toBe(false);
		expect(result.incomplete).toBeUndefined();
		expect(result.reason).toContain('no intent block found');
	});

	it('marks incomplete when finalText itself is undefined (timeout/infra)', () => {
		const expectation: IntentExpectation = { accepts: [{ anchor: 'wf', embedsOther: false }] };
		const [result] = gradeIntentExpectation(expectation, undefined);
		expect(result).toEqual({
			expectation: 'intent: anchor + embeds_other exact-match',
			pass: false,
			reason: 'no agent output captured',
			incomplete: true,
		});
	});

	it('fails, not incomplete, on invalid JSON in the block', () => {
		const expectation: IntentExpectation = { accepts: [{ anchor: 'wf', embedsOther: false }] };
		const [result] = gradeIntentExpectation(expectation, block('{not json'));
		expect(result.pass).toBe(false);
		expect(result.incomplete).toBeUndefined();
		expect(result.reason).toBe('intent block is not valid JSON');
	});

	it('fails and names the value on an unrecognized anchor', () => {
		const expectation: IntentExpectation = { accepts: [{ anchor: 'wf', embedsOther: false }] };
		const [result] = gradeIntentExpectation(
			expectation,
			block('{"anchor": "bogus", "embeds_other": false}'),
		);
		expect(result.pass).toBe(false);
		expect(result.reason).toContain('bogus');
	});

	it('tolerates either produced variant when accepts lists more than one tuple', () => {
		const expectation: IntentExpectation = {
			accepts: [
				{ anchor: 'agent', embedsOther: false },
				{ anchor: 'agent', embedsOther: true },
			],
		};
		const passFalse = gradeIntentExpectation(
			expectation,
			block('{"anchor": "agent", "embeds_other": false}'),
		);
		const passTrue = gradeIntentExpectation(
			expectation,
			block('{"anchor": "agent", "embeds_other": true}'),
		);
		expect(passFalse[0].pass).toBe(true);
		expect(passTrue[0].pass).toBe(true);
	});

	it("treats an accepted embedsOther of 'n/a' as matching any produced value", () => {
		const expectation: IntentExpectation = { accepts: [{ anchor: 'wf', embedsOther: 'n/a' }] };
		const results = gradeIntentExpectation(
			expectation,
			block('{"anchor": "wf", "embeds_other": true}'),
		);
		expect(results[0].pass).toBe(true);
	});

	it('ignores produced embeds_other entirely for clarify/out-of-scope accepted anchors', () => {
		const clarifyExpectation: IntentExpectation = {
			accepts: [{ anchor: 'clarify', embedsOther: 'n/a' }],
		};
		expect(
			gradeIntentExpectation(
				clarifyExpectation,
				block('{"anchor": "clarify", "embeds_other": true}'),
			)[0].pass,
		).toBe(true);

		const outOfScopeExpectation: IntentExpectation = {
			accepts: [{ anchor: 'out-of-scope', embedsOther: 'n/a' }],
		};
		expect(
			gradeIntentExpectation(
				outOfScopeExpectation,
				block('{"anchor": "out-of-scope", "embeds_other": false}'),
			)[0].pass,
		).toBe(true);
	});

	it('matches compound parts in order and passes each independently', () => {
		const expectation: IntentExpectation = {
			parts: [
				{ label: 'weather', accepts: [{ anchor: 'wf', embedsOther: false }] },
				{ label: 'support', accepts: [{ anchor: 'agent', embedsOther: true }] },
			],
		};
		const results = gradeIntentExpectation(
			expectation,
			block(
				'{"parts": [{"anchor": "wf", "embeds_other": false}, {"anchor": "agent", "embeds_other": true}]}',
			),
		);
		expect(results).toEqual([
			{
				expectation: 'intent [weather]: anchor + embeds_other exact-match',
				pass: true,
				reason: 'matched {anchor: wf, embeds_other: false}',
			},
			{
				expectation: 'intent [support]: anchor + embeds_other exact-match',
				pass: true,
				reason: 'matched {anchor: agent, embeds_other: true}',
			},
		]);
	});

	it('fails every expected part on a part-count mismatch', () => {
		const expectation: IntentExpectation = {
			parts: [
				{ label: 'weather', accepts: [{ anchor: 'wf', embedsOther: false }] },
				{ label: 'support', accepts: [{ anchor: 'agent', embedsOther: true }] },
			],
		};
		const results = gradeIntentExpectation(
			expectation,
			block('{"anchor": "wf", "embeds_other": false}'),
		);
		expect(results).toHaveLength(2);
		for (const result of results) {
			expect(result.pass).toBe(false);
			expect(result.reason).toContain('expected 2 parts, got 1');
		}
	});

	it('fails only the mismatched part, passing the other', () => {
		const expectation: IntentExpectation = {
			parts: [
				{ label: 'weather', accepts: [{ anchor: 'wf', embedsOther: false }] },
				{ label: 'support', accepts: [{ anchor: 'agent', embedsOther: true }] },
			],
		};
		const results = gradeIntentExpectation(
			expectation,
			block(
				'{"parts": [{"anchor": "wf", "embeds_other": false}, {"anchor": "wf", "embeds_other": true}]}',
			),
		);
		expect(results[0].pass).toBe(true);
		expect(results[1].pass).toBe(false);
	});

	it('fails a single-accepts expectation when the agent produces multiple parts', () => {
		const expectation: IntentExpectation = { accepts: [{ anchor: 'wf', embedsOther: false }] };
		const results = gradeIntentExpectation(
			expectation,
			block(
				'{"parts": [{"anchor": "wf", "embeds_other": false}, {"anchor": "agent", "embeds_other": true}]}',
			),
		);
		expect(results).toHaveLength(1);
		expect(results[0].pass).toBe(false);
		expect(results[0].reason).toBe('expected a single classification, got 2 parts');
	});
});
