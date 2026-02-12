/**
 * Tests for CSV prompt loader.
 */

import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';

import { loadTestCasesFromCsv } from '../cli/csv-prompt-loader';

describe('csv-prompt-loader', () => {
	const tempDirs: string[] = [];

	function writeTempCsv(filename: string, content: string): string {
		const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'eval-csv-'));
		tempDirs.push(dir);
		const csvPath = path.join(dir, filename);
		fs.writeFileSync(csvPath, content, 'utf8');
		return csvPath;
	}

	afterEach(() => {
		while (tempDirs.length > 0) {
			const dir = tempDirs.pop();
			if (dir && fs.existsSync(dir)) {
				fs.rmSync(dir, { recursive: true, force: true });
			}
		}
	});

	it('should load dos/donts into context when present', () => {
		const csvPath = writeTempCsv(
			'pairwise.csv',
			'id,prompt,dos,donts\npw-1,"Create a workflow","Must use Notion","No HTTP Request"\n',
		);

		const testCases = loadTestCasesFromCsv(csvPath);
		expect(testCases).toEqual([
			{
				id: 'pw-1',
				prompt: 'Create a workflow',
				context: { dos: 'Must use Notion', donts: 'No HTTP Request' },
			},
		]);
	});

	it('should load prompts without context when dos/donts are absent', () => {
		const csvPath = writeTempCsv('llm.csv', 'id,prompt\nllm-1,"Create a workflow"\n');

		const testCases = loadTestCasesFromCsv(csvPath);
		expect(testCases).toEqual([{ id: 'llm-1', prompt: 'Create a workflow' }]);
	});

	it('should support header column re-ordering', () => {
		const csvPath = writeTempCsv(
			'reorder.csv',
			'prompt,id,donts,dos\n"Create a workflow","pw-1","No HTTP Request","Must use Notion"\n',
		);

		const testCases = loadTestCasesFromCsv(csvPath);
		expect(testCases).toEqual([
			{
				id: 'pw-1',
				prompt: 'Create a workflow',
				context: { dos: 'Must use Notion', donts: 'No HTTP Request' },
			},
		]);
	});

	it('should support do/dont header aliases', () => {
		const csvPath = writeTempCsv(
			'aliases.csv',
			'id,prompt,do,dont\npw-1,"Create a workflow","Must use Notion","No HTTP Request"\n',
		);

		const testCases = loadTestCasesFromCsv(csvPath);
		expect(testCases).toEqual([
			{
				id: 'pw-1',
				prompt: 'Create a workflow',
				context: { dos: 'Must use Notion', donts: 'No HTTP Request' },
			},
		]);
	});

	it('should not create context when dos/donts columns are present but empty', () => {
		const csvPath = writeTempCsv(
			'empty-context.csv',
			'id,prompt,dos,donts\npw-1,"Create a workflow",,\n',
		);

		const testCases = loadTestCasesFromCsv(csvPath);
		expect(testCases).toEqual([{ id: 'pw-1', prompt: 'Create a workflow' }]);
	});

	it('should allow headerless CSV (treat first column as prompt)', () => {
		const csvPath = writeTempCsv('no-header.csv', '"Create a workflow"\n"Second prompt"\n');

		const testCases = loadTestCasesFromCsv(csvPath);
		expect(testCases).toEqual([
			{ id: 'csv-case-1', prompt: 'Create a workflow' },
			{ id: 'csv-case-2', prompt: 'Second prompt' },
		]);
	});

	it('should ignore rows with empty prompts', () => {
		const csvPath = writeTempCsv('empty-rows.csv', 'id,prompt\nrow-1,\nrow-2,"Valid prompt"\n');

		const testCases = loadTestCasesFromCsv(csvPath);
		expect(testCases).toEqual([{ id: 'row-2', prompt: 'Valid prompt' }]);
	});

	it('should handle UTF-8 BOM', () => {
		const csvPath = writeTempCsv('bom.csv', '\ufeffid,prompt\nllm-1,"Create a workflow"\n');

		const testCases = loadTestCasesFromCsv(csvPath);
		expect(testCases).toEqual([{ id: 'llm-1', prompt: 'Create a workflow' }]);
	});

	it('should resolve relative paths from process.cwd()', () => {
		const csvPath = writeTempCsv('relative.csv', 'id,prompt\nllm-1,"Create a workflow"\n');
		const relativePath = path.relative(process.cwd(), csvPath);

		const testCases = loadTestCasesFromCsv(relativePath);
		expect(testCases).toEqual([{ id: 'llm-1', prompt: 'Create a workflow' }]);
	});

	it('should throw when file does not exist', () => {
		expect(() => loadTestCasesFromCsv('/definitely-not-a-real-path.csv')).toThrow(
			/CSV file not found/,
		);
	});

	it('should throw when CSV is empty', () => {
		const csvPath = writeTempCsv('empty.csv', '');
		expect(() => loadTestCasesFromCsv(csvPath)).toThrow('The provided CSV file is empty');
	});

	it('should throw when no valid prompts exist', () => {
		const csvPath = writeTempCsv('no-prompts.csv', 'id,prompt\nrow-1,\nrow-2,"  "\n');
		expect(() => loadTestCasesFromCsv(csvPath)).toThrow(
			'No valid prompts found in the provided CSV file',
		);
	});
});
