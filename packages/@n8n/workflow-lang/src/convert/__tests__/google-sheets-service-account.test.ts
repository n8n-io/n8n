/**
 * Google Sheets with a Google service account in the converter: the library node runs it, and
 * the workflow asks n8n for the token of the v1 node (a credential mint).
 */
import { compile } from '../../compiler/index.ts';
import { googleMint } from '../../node-compile/specialise.ts';
import { convertWorkflow } from '../index.ts';

function workflow(parameters: Record<string, unknown>, credentials: Record<string, unknown>) {
	return {
		name: 'Sheets',
		nodes: [
			{
				name: 'Hook',
				type: 'n8n-nodes-base.webhook',
				typeVersion: 2,
				position: [0, 0],
				parameters: { path: 'p' },
			},
			{
				name: 'Rows',
				type: 'n8n-nodes-base.googleSheets',
				typeVersion: 4.7,
				position: [200, 0],
				parameters,
				credentials,
			},
		],
		connections: { Hook: { main: [[{ node: 'Rows', type: 'main', index: 0 }]] } },
	};
}

const read = {
	resource: 'sheet',
	operation: 'read',
	documentId: { __rl: true, mode: 'id', value: 'doc1' },
	sheetName: { __rl: true, mode: 'name', value: 'Sheet1' },
	options: {},
};
const account = { googleApi: { id: 'c1', name: 'Robot' } };
const mint = googleMint('sheetV2', [
	'https://www.googleapis.com/auth/drive.file',
	'https://www.googleapis.com/auth/spreadsheets',
	'https://www.googleapis.com/auth/drive.metadata',
]);

describe('Google Sheets with a service account in the converter', () => {
	it('links the library node and asks for the token of the v1 node', () => {
		const out = convertWorkflow(workflow({ ...read, authentication: 'serviceAccount' }, account));
		expect(out.ok).toBe(true);
		expect(compile(out.source).diagnostics).toEqual([]);
		expect(out.source).not.toContain("host: 'fallback'");
		expect(out.fallbackNodes).toEqual([]);
		expect(out.credentialMints).toEqual({ robot: [mint] });
	});

	it('has the token name that the library node reads', () => {
		expect(mint.name).toBe('m116a0d8b');
	});

	it('still links the library node with OAuth2, without a token request', () => {
		const out = convertWorkflow(
			workflow({ ...read, authentication: 'oAuth2' }, { googleSheetsOAuth2Api: { id: 'c2' } }),
		);
		expect(out.source).not.toContain("host: 'fallback'");
		expect(out.credentialMints).toBeUndefined();
	});
});

describe('Google Sheets clear and delete in the converter', () => {
	const oauth = { googleSheetsOAuth2Api: { id: 'c2' } };

	it('links a clear and a delete, once for all items', () => {
		for (const parameters of [
			{ ...read, operation: 'clear', clear: 'specificRows', startIndex: '={{ $json.body.row }}' },
			{ ...read, operation: 'delete', toDelete: 'columns', startIndex: 'B', numberToDelete: 2 },
		]) {
			const out = convertWorkflow(workflow(parameters, oauth));
			expect(out.ok).toBe(true);
			expect(compile(out.source).diagnostics).toEqual([]);
			expect(out.source).not.toContain("host: 'fallback'");
			expect(out.source).toContain('batch:');
		}
	});
});
