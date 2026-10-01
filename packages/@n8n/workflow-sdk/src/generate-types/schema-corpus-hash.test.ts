import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import { computeSchemaCorpusHash } from './generate-types';

function writeSchema(baseDir: string, relativePath: string, content: unknown): void {
	const filePath = path.join(baseDir, relativePath);
	fs.mkdirSync(path.dirname(filePath), { recursive: true });
	fs.writeFileSync(filePath, JSON.stringify(content));
}

describe('computeSchemaCorpusHash', () => {
	let baseDir: string;

	beforeEach(() => {
		baseDir = fs.mkdtempSync(path.join(os.tmpdir(), 'schema-corpus-hash-test-'));
	});

	afterEach(() => {
		fs.rmSync(baseDir, { recursive: true, force: true });
	});

	it('returns the same hash for an unchanged corpus', () => {
		writeSchema(baseDir, 'Widget/__schema__/v1.0.0/item/get.json', { type: 'object' });

		expect(computeSchemaCorpusHash([baseDir])).toBe(computeSchemaCorpusHash([baseDir]));
	});

	it('changes when a schema file is added', () => {
		writeSchema(baseDir, 'Widget/__schema__/v1.0.0/item/get.json', { type: 'object' });
		const before = computeSchemaCorpusHash([baseDir]);

		writeSchema(baseDir, 'Widget/__schema__/v1.0.0/item/create.json', { type: 'object' });
		const after = computeSchemaCorpusHash([baseDir]);

		expect(after).not.toBe(before);
	});

	it('changes when a schema file is edited', () => {
		writeSchema(baseDir, 'Widget/__schema__/v1.0.0/item/get.json', { type: 'object' });
		const before = computeSchemaCorpusHash([baseDir]);

		writeSchema(baseDir, 'Widget/__schema__/v1.0.0/item/get.json', {
			type: 'object',
			properties: { id: { type: 'string' } },
		});
		const after = computeSchemaCorpusHash([baseDir]);

		expect(after).not.toBe(before);
	});

	it('ignores non-schema files outside __schema__ directories', () => {
		writeSchema(baseDir, 'Widget/__schema__/v1.0.0/item/get.json', { type: 'object' });
		const before = computeSchemaCorpusHash([baseDir]);

		fs.writeFileSync(path.join(baseDir, 'Widget', 'unrelated.json'), JSON.stringify({ a: 1 }));
		const after = computeSchemaCorpusHash([baseDir]);

		expect(after).toBe(before);
	});

	it('returns a stable hash for a missing directory', () => {
		const missingDir = path.join(baseDir, 'does-not-exist');
		expect(computeSchemaCorpusHash([missingDir])).toBe(computeSchemaCorpusHash([missingDir]));
	});
});
