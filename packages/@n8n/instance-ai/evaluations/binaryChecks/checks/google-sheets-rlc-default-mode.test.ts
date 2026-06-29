import { googleSheetsRlcDefaultMode } from './google-sheets-rlc-default-mode';
import type { WorkflowResponse } from '../../clients/n8n-client';

function sheetWorkflow(documentId: unknown, sheetName?: unknown): WorkflowResponse {
	return {
		id: 'wf-1',
		name: 'Log to sheet',
		active: false,
		versionId: 'v1',
		nodes: [
			{ name: 'Form', type: 'n8n-nodes-base.formTrigger', parameters: {} },
			{
				name: 'Append Row',
				type: 'n8n-nodes-base.googleSheets',
				parameters: {
					documentId,
					...(sheetName !== undefined ? { sheetName } : {}),
				},
			},
		],
		connections: {},
	};
}

describe('googleSheetsRlcDefaultMode', () => {
	it('fails when documentId defaults to an empty By ID field (INS-631 shape)', () => {
		const result = googleSheetsRlcDefaultMode.run(
			sheetWorkflow({
				__rl: true,
				mode: 'id',
				value: '',
				cachedResultName: 'SmartAssist Bookings',
			}),
			{ prompt: 'log form submissions to a Google Sheet named SmartAssist Bookings' },
		);

		expect(result.pass).toBe(false);
		expect(result.comment).toContain('Append Row.documentId');
	});

	it('fails when documentId is By ID mode with only a placeholder value', () => {
		const result = googleSheetsRlcDefaultMode.run(
			sheetWorkflow({
				__rl: true,
				mode: 'id',
				value: '<__PLACEHOLDER_VALUE__Spreadsheet ID__>',
			}),
			{ prompt: 'log form submissions to a Google Sheet' },
		);

		expect(result.pass).toBe(false);
	});

	it('fails when documentId is By ID mode with a fabricated ID absent from the prompt (real-build shape)', () => {
		const result = googleSheetsRlcDefaultMode.run(
			sheetWorkflow({
				__rl: true,
				mode: 'id',
				value: '1AbCdEfGhIjKlMnOpQrStUvWxYz0123456789',
				cachedResultName: 'SmartAssist Bookings spreadsheet',
			}),
			{ prompt: 'log bookings to a Google Sheet named SmartAssist Bookings (Sheet1)' },
		);

		expect(result.pass).toBe(false);
		expect(result.comment).toContain('Append Row.documentId');
	});

	it('passes when documentId uses the From list picker mode', () => {
		const result = googleSheetsRlcDefaultMode.run(
			sheetWorkflow(
				{ __rl: true, mode: 'list', value: '', cachedResultName: 'SmartAssist Bookings' },
				{ __rl: true, mode: 'list', value: 0, cachedResultName: 'Sheet1' },
			),
			{ prompt: 'log form submissions to a Google Sheet' },
		);

		expect(result.pass).toBe(true);
	});

	it('passes when the user supplied a concrete spreadsheet ID', () => {
		const result = googleSheetsRlcDefaultMode.run(
			sheetWorkflow({
				__rl: true,
				mode: 'id',
				value: '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgVE2upms',
			}),
			{ prompt: 'log to spreadsheet 1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgVE2upms' },
		);

		expect(result.pass).toBe(true);
	});

	it('is not applicable when there are no Google Sheets nodes', () => {
		const result = googleSheetsRlcDefaultMode.run(
			{
				id: 'wf',
				name: 'x',
				active: false,
				versionId: 'v1',
				nodes: [{ name: 'Form', type: 'n8n-nodes-base.formTrigger', parameters: {} }],
				connections: {},
			},
			{ prompt: 'x' },
		);

		expect(result.applicable).toBe(false);
		expect(result.pass).toBe(true);
	});
});
