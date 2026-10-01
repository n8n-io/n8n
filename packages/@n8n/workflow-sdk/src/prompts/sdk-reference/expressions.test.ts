import { EXPRESSION_REFERENCE } from './expressions';

describe('EXPRESSION_REFERENCE', () => {
	it('explains paired item references versus first item references', () => {
		expect(EXPRESSION_REFERENCE).toContain("$('NodeName').item.json");
		expect(EXPRESSION_REFERENCE).toContain('paired item');
		expect(EXPRESSION_REFERENCE).toContain('every downstream item reuses the first value');
	});

	it('warns that replacing nodes require explicit upstream references', () => {
		expect(EXPRESSION_REFERENCE).toContain('after another node replaces item JSON');
		expect(EXPRESSION_REFERENCE).toContain('read the earlier node directly');
		expect(EXPRESSION_REFERENCE).toContain("nodeJson(extractEventId, 'eventId')");
	});
});
