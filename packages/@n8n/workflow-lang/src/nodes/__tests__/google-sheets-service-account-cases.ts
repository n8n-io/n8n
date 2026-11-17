/**
 * Equivalence cases of Google Sheets with a Google service account (`googleApi`).
 *
 * The v1 node asks Google for a token before each request (`getGoogleAccessToken`) and sends
 * it itself. n8n makes that token for the library node, so the test drops the token requests
 * of v1 and gives the token of the first one to the library node as `n8nMinted`. The
 * responses of a case are in the order of the requests of v1: the token responses are in it.
 *
 * The private key signs the assertion of v1. It is new in each process and has no other use.
 */
import { generateKeyPairSync } from 'node:crypto';

import type { EquivalenceCase } from './equivalence.ts';

const { privateKey } = generateKeyPairSync('rsa', {
	modulusLength: 2048,
	privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
	publicKeyEncoding: { type: 'spki', format: 'pem' },
});
const credential = {
	type: 'googleApi',
	data: { email: 'robot@project.iam.gserviceaccount.com', privateKey },
};
const token = { body: { access_token: 'minted-token', expires_in: 3599, token_type: 'Bearer' } };
const meta = { body: { sheets: [{ properties: { sheetId: 0, title: 'Sheet1' } }] } };
const base = { type: 'n8n-nodes-base.googleSheets', typeVersion: 4.7, credential };
const target = {
	resource: 'sheet',
	authentication: 'serviceAccount',
	documentId: { __rl: true, mode: 'id', value: 'doc1' },
	sheetName: { __rl: true, mode: 'name', value: 'Sheet1' },
};

export const SHEETS_SERVICE_ACCOUNT_CASES: EquivalenceCase[] = [
	{
		...base,
		name: 'googleSheets sheet.read with a service account',
		parameters: { ...target, operation: 'read' },
		responses: [
			token,
			meta,
			token,
			{
				body: {
					values: [
						['Name', 'Count'],
						['Ada', 3],
						['Bob', 0],
					],
				},
			},
		],
	},
	{
		...base,
		name: 'googleSheets sheet.append with a service account',
		typeVersion: 4,
		parameters: {
			...target,
			operation: 'append',
			columns: {
				mappingMode: 'defineBelow',
				value: { date: '2024-01-01', email: 'ada@example.com', name: 'Ada' },
			},
			options: {},
			legacyCellFormat: true,
		},
		responses: [
			token,
			meta,
			token,
			{
				body: {
					values: [
						['date', 'email', 'name'],
						['2023-12-31', 'bob@example.com', 'Bob'],
					],
				},
			},
			token,
			{ body: {} },
			token,
			{ body: { updatedRows: 1 } },
		],
	},
];
