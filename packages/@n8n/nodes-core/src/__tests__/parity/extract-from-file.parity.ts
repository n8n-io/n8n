import { setFileExtractor } from '@n8n/node-sdk/host';
import { extractFile } from 'n8n-nodes-base/dist/nodes/Files/ExtractFromFile/extractFile';
import { ExtractFromFile } from 'n8n-nodes-base/dist/nodes/Files/ExtractFromFile/ExtractFromFile.node';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import type { IBinaryData, INodeParameters } from 'n8n-workflow';

import type * as Xlsx from '../../../../../nodes-base/node_modules/@e965/xlsx';
import { extractCsv } from '../../nodes/extract-from-file/actions/csv';
import { extractJson } from '../../nodes/extract-from-file/actions/json';
import { extractPdf } from '../../nodes/extract-from-file/actions/pdf';
import { extractText } from '../../nodes/extract-from-file/actions/text';
import { extractXlsx } from '../../nodes/extract-from-file/actions/xlsx';
import {
	actionNode,
	compareRuns,
	runNode,
	type AllowedDifference,
	type NodeUnderTest,
	type ParityCase,
} from './harness';

const NODES_BASE = path.resolve(__dirname, '../../../../../nodes-base');
const xlsx = createRequire(path.join(NODES_BASE, 'package.json'))('@e965/xlsx') as typeof Xlsx;

const workbookBytes = () => {
	const book = xlsx.utils.book_new();
	xlsx.utils.book_append_sheet(
		book,
		xlsx.utils.aoa_to_sheet([
			['name', 'score', 'active'],
			['Ada', 3, true],
			['Grace', 5, false],
		]),
		'Scores',
	);
	return Buffer.from(xlsx.write(book, { type: 'buffer', bookType: 'xlsx' }));
};

const FILES: Record<'csv' | 'xlsx' | 'json' | 'text' | 'pdf', IBinaryData> = {
	csv: {
		data: Buffer.from('name,plan,seats\nAda,pro,3\nGrace,,5\n').toString('base64'),
		mimeType: 'text/csv',
		fileName: 'plans.csv',
	},
	xlsx: {
		data: workbookBytes().toString('base64'),
		mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
		fileName: 'scores.xlsx',
	},
	json: {
		data: Buffer.from('{"orders":[{"id":1,"total":9.5}],"next":null}').toString('base64'),
		mimeType: 'application/json',
		fileName: 'orders.json',
	},
	text: {
		data: Buffer.from('First line\nSecond line: café\n').toString('base64'),
		mimeType: 'text/plain',
		fileName: 'notes.txt',
	},
	pdf: {
		data: readFileSync(path.join(NODES_BASE, 'nodes/ReadPdf/test/sample.pdf')).toString('base64'),
		mimeType: 'application/pdf',
		fileName: 'sample.pdf',
	},
};

const caseOf = (format: keyof typeof FILES): ParityCase => ({
	input: [{}],
	binary: { data: FILES[format] },
	routes: [],
});

const legacyNode = (operation: string, options: INodeParameters = {}): NodeUnderTest => ({
	nodeType: new ExtractFromFile(),
	type: 'n8n-nodes-base.extractFromFile',
	typeVersion: 1.1,
	parameters: { operation, binaryPropertyName: 'data', options },
});

// The legacy node keeps the other binaries of the item, so a file-only item gets `binary: {}`.
const emptyBinary: AllowedDifference = {
	path: 'items[0].binary',
	kind: 'intended',
	reason: 'The action output holds the extracted data only; Merge keeps other input data.',
};

const equal = { unexplained: [], stale: [] };

beforeAll(() => setFileExtractor(extractFile));

describe('extractFromFile parity with Extract from File v1.1', () => {
	it('gives one item per CSV row', async () => {
		const legacy = await runNode(legacyNode('csv'), caseOf('csv'));
		const next = await runNode(actionNode(extractCsv, { file: 'data' }), caseOf('csv'));
		expect(legacy.error).toBeUndefined();
		expect(next.items.map(({ json }) => json)).toEqual([
			{ name: 'Ada', plan: 'pro', seats: '3' },
			{ name: 'Grace', seats: '5' },
		]);
		expect(compareRuns(legacy, next, [])).toEqual(equal);
	});

	it('gives one item per row of the first sheet of an XLSX file', async () => {
		const legacy = await runNode(legacyNode('xlsx'), caseOf('xlsx'));
		const next = await runNode(actionNode(extractXlsx, { file: 'data' }), caseOf('xlsx'));
		expect(legacy.error).toBeUndefined();
		expect(next.items.map(({ json }) => json)).toEqual([
			{ name: 'Ada', score: 3, active: true },
			{ name: 'Grace', score: 5, active: false },
		]);
		expect(compareRuns(legacy, next, [])).toEqual(equal);
	});

	it('parses a JSON file into data', async () => {
		const legacy = await runNode(legacyNode('fromJson'), caseOf('json'));
		const next = await runNode(actionNode(extractJson, { file: 'data' }), caseOf('json'));
		expect(legacy.error).toBeUndefined();
		expect(next.items[0]?.json).toEqual({ data: { orders: [{ id: 1, total: 9.5 }], next: null } });
		expect(compareRuns(legacy, next, [emptyBinary])).toEqual(equal);
	});

	it('reads a text file into data', async () => {
		const legacy = await runNode(legacyNode('text', { encoding: 'utf8' }), caseOf('text'));
		const next = await runNode(actionNode(extractText, { file: 'data' }), caseOf('text'));
		expect(legacy.error).toBeUndefined();
		expect(next.items[0]?.json).toEqual({ data: 'First line\nSecond line: café\n' });
		expect(compareRuns(legacy, next, [emptyBinary])).toEqual(equal);
	});

	it('reads the text and the document information of a PDF file', async () => {
		const legacy = await runNode(legacyNode('pdf'), caseOf('pdf'));
		const next = await runNode(actionNode(extractPdf, { file: 'data' }), caseOf('pdf'));
		expect(legacy.error).toBeUndefined();
		expect(next.items[0]?.json).toMatchObject({
			text: expect.stringContaining('Sample PDF'),
			pageCount: 1,
			info: expect.objectContaining({ Title: 'sample' }),
		});
		const renamed = (field: string, reason: string): AllowedDifference => ({
			path: `items[0].json.${field}`,
			kind: 'intended',
			reason,
		});
		expect(
			compareRuns(legacy, next, [
				emptyBinary,
				renamed('numpages', 'The action names the page count pageCount.'),
				renamed('pageCount', 'The action names the page count pageCount.'),
				renamed('numrender', 'numrender is always numpages.'),
				renamed('version', 'The pdf.js version is not data of the file.'),
			]),
		).toEqual(equal);
	});
});
