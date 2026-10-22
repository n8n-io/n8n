import { parseJudgeResponse } from '../parse-judge-response';

describe('parseJudgeResponse', () => {
	it.each([
		['{"pass": true}', true],
		['{"pass": false}', false],
		['```json\n{"pass": true}\n```', true],
		['```json\n{"pass": false}\n```', false],
		['{"pass": "true"}', true],
		['{"pass": "false"}', false],
		['{"pass": "TrUe"}', true],
		['{"score": 0.9}', true],
		['{"score": 0.7}', true],
		['{"score": 0.5}', false],
		['{"pass": true, "score": 0.5}', true],
		['{"pass": false, "score": 0.9}', false],
		['{"pass": "true", "score": 0.5}', true],
		['{"pass": "FALSE", "score": 0.9}', false],
		['{}', false],
		['{"reasoning": "No verdict."}', false],
		['{"pass": "yes"}', false],
		['{"pass": "yes", "score": 0.9}', false],
		['{"pass": 1}', false],
		['{"pass": 0, "score": 0.9}', false],
		['{"pass": null, "score": 0.9}', false],
		['{"pass": {}}', false],
		['{"pass": [], "score": 0.9}', false],
		['{"score": "0.9"}', false],
		['{"score": [0.9]}', false],
	])('parses the JSON verdict in %j as %s', (text, expectedPass) => {
		const result = parseJudgeResponse(text);

		expect(result.pass).toBe(expectedPass);
		expect(typeof result.pass).toBe('boolean');
	});

	it.each([
		['{"pass": true,', true],
		['{"pass":true,', true],
		['{"pass": false,', false],
		['{"pass":false,', false],
		['{"PASS": TRUE,', true],
		['{"pass": true, "pass": false,', false],
		['The response does not pass the rule.', false],
		['This should not pass because it shares the address.', false],
		['This response should pass the test', false],
		['PASS', false],
		['FAIL: The response does not meet the rule.', false],
		['No verdict is available.', false],
		['', false],
	])('parses the fallback verdict in %j as %s', (text, expectedPass) => {
		const result = parseJudgeResponse(text);

		expect(result.pass).toBe(expectedPass);
		expect(typeof result.pass).toBe('boolean');
	});

	it.each([
		['{"pass": "false", "reasoning": "The rule was not met."}', 'The rule was not met.'],
		['```json\n{"pass": true, "reasoning": "The rule was met."}\n```', 'The rule was met.'],
		['{"pass": false, "reasoning": ""}', ''],
		['{"pass": true, "reasoning": null}', '{"pass": true, "reasoning": null}'],
		['```json\n{"pass": true}\n```', '{"pass": true}'],
		['{"pass": true, "reasoning": {"a": 1}}', '{"pass": true, "reasoning": {"a": 1}}'],
		['The response does not pass the rule.', 'The response does not pass the rule.'],
	])('preserves the reasoning for %j', (text, expectedReasoning) => {
		const result = parseJudgeResponse(text);

		expect(result.reasoning).toBe(expectedReasoning);
		expect(typeof result.pass).toBe('boolean');
	});
});
