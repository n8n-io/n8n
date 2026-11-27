import { mcpServerToolNameSchema } from '@n8n/api-types';

import { toToolName, uniqueToolName } from '../tool-name';

describe('toToolName', () => {
	it.each([
		['Get campaign numbers', 'get_campaign_numbers'],
		['Summarize: ticket history (v2)', 'summarize_ticket_history_v2'],
		['  --Escalate to on-call--  ', 'escalate_to_on_call'],
		['Créer une facture', 'creer_une_facture'],
		['CRM_Sync', 'crm_sync'],
		['2024 report', '2024_report'],
	])('turns "%s" into "%s"', (workflowName, toolName) => {
		expect(toToolName(workflowName)).toBe(toolName);
	});

	it('gives "tool" for a name without letters or digits', () => {
		expect(toToolName('🚀 !!!')).toBe('tool');
	});

	it('cuts a long name to 64 characters, without a trailing underscore', () => {
		const name = toToolName(`${'a'.repeat(63)} b`);

		expect(name).toBe('a'.repeat(63));
	});

	it('always gives a name that the tool name schema accepts', () => {
		for (const workflowName of ['Ünïcödé wörkflow', 'x'.repeat(200), '___', 'A-B-C']) {
			expect(mcpServerToolNameSchema.safeParse(toToolName(workflowName)).success).toBe(true);
		}
	});
});

describe('uniqueToolName', () => {
	it('keeps a name that the server does not have', () => {
		expect(uniqueToolName('get_campaign_numbers', new Set(['other']))).toBe('get_campaign_numbers');
	});

	it('adds _2 to a name that exists', () => {
		expect(uniqueToolName('report', new Set(['report']))).toBe('report_2');
	});

	it('counts up to the first free suffix', () => {
		expect(uniqueToolName('report', new Set(['report', 'report_2', 'report_3']))).toBe('report_4');
	});

	it('cuts the base name so that the suffix fits in 64 characters', () => {
		const base = 'a'.repeat(64);

		expect(uniqueToolName(base, new Set([base]))).toBe(`${'a'.repeat(62)}_2`);
	});
});
