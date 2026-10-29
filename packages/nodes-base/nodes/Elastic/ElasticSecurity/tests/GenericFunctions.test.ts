import { jsonParse } from 'n8n-workflow';

import { buildDeleteCasesEndpoint } from '../GenericFunctions';

describe('ElasticSecurity -> buildDeleteCasesEndpoint', () => {
	it('should keep a case id as a single array element', () => {
		const caseId = 'a","b';
		const endpoint = buildDeleteCasesEndpoint(caseId);
		const query = endpoint.split('?ids=')[1];

		expect(jsonParse(decodeURIComponent(query))).toEqual([caseId]);
	});
});
