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
		['```json\n{"pass": true,', true],
		['```json\n{"pass": false,', false],
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
		'{"pass": true}',
		'{"pass": false}',
		'```json\n{"pass": false}\n```',
		'{"pass": "FALSE"}',
		'{"score": 0.5}',
		'{"pass": true,',
		'{"pass":false,',
		'```json\n{"pass": true,',
	])('reads a verdict in %j, so the result is not inconclusive', (text) => {
		expect(parseJudgeResponse(text)).not.toHaveProperty('inconclusive');
	});

	it.each([
		'{}',
		'{"reasoning": "No verdict."}',
		'{"pass": "yes"}',
		'{"pass": "yes", "score": 0.9}',
		'{"pass": 0, "score": 0.9}',
		'Use "pass": true only when the rule is met.',
		'{"pass": true, "pass": false,',
		'{"score": [0.9]}',
		'{"pass": "partially", "reasoning": "Mentions the number but not the date."}',
		'{"pass": 1}',
		'{"pass": null}',
		'{"score": "0.9"}',
		'The response does not pass the rule.',
		'This response should pass the test',
		'PASS',
		'FAIL: The response does not meet the rule.',
		"I'm sorry, but I can't help with evaluating this content.",
		'{"pass": tr',
		'null',
		'0.9',
		'',
	])('marks %j as inconclusive and fails it closed', (text) => {
		const result = parseJudgeResponse(text);

		expect(result.inconclusive).toBe(true);
		expect(result.pass).toBe(false);
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
