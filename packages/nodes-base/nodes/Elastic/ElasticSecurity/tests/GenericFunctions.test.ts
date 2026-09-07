import { jsonParse } from 'n8n-workflow';

describe('ElasticSecurity -> case delete query', () => {
	it('should keep a case id as a single array element', () => {
		const caseId = 'a","b';
		const query = encodeURIComponent(JSON.stringify([String(caseId)]));

		expect(jsonParse(decodeURIComponent(query))).toEqual([caseId]);
	});
});
