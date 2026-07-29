import { parseModelHeadersJson } from '../parse-model-headers';

describe('parseModelHeadersJson', () => {
	it('returns undefined for empty input', () => {
		expect(parseModelHeadersJson(undefined)).toBeUndefined();
		expect(parseModelHeadersJson('')).toBeUndefined();
		expect(parseModelHeadersJson('   ')).toBeUndefined();
	});

	it('parses a JSON object of string headers', () => {
		expect(
			parseModelHeadersJson('{"Modal-Key":"wk-test","Modal-Secret":"ws-test","X-Custom":"value"}'),
		).toEqual({
			'Modal-Key': 'wk-test',
			'Modal-Secret': 'ws-test',
			'X-Custom': 'value',
		});
	});

	it('trims header names and rejects invalid JSON or non-object payloads', () => {
		expect(parseModelHeadersJson('{not json')).toBeUndefined();
		expect(parseModelHeadersJson('["Modal-Key"]')).toBeUndefined();
		expect(parseModelHeadersJson('null')).toBeUndefined();
		expect(parseModelHeadersJson('{"Modal-Key":123}')).toBeUndefined();
		expect(parseModelHeadersJson('{"": "value"}')).toBeUndefined();
		expect(parseModelHeadersJson('{}')).toBeUndefined();
	});
});
