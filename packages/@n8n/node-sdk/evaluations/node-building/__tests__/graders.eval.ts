import { mkdtempSync, readFileSync } from 'node:fs';
import { cp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { SDK_DIR } from '../n1-adapter';
import { taskById, type Format } from '../tasks';
import { exec } from '../util';
import { copyTemplate, prepareTemplate } from '../workspace';

const EVAL_DIR = path.resolve(__dirname, '..');
const REFERENCE = path.join(EVAL_DIR, 'reference/acme-tasks');
const TSX = path.resolve(SDK_DIR, '../../../node_modules/.bin/tsx');
const ROOT = mkdtempSync(path.join(tmpdir(), 'n8n-6071-nodeeval-test-'));
const task = taskById('acme-tasks');

afterAll(async () => await rm(ROOT, { recursive: true, force: true }));

async function gradeDir(dir: string, format: Format) {
	const out = `${dir}-grade`;
	const result = await exec(
		TSX,
		[
			path.join(EVAL_DIR, 'run.ts'),
			'--grade',
			dir,
			'--task',
			task.id,
			'--format',
			format,
			'--out',
			out,
		],
		{ cwd: SDK_DIR, timeoutMs: 200_000 },
	);
	const graded: { pass: boolean; checks: Array<{ name: string; pass: boolean }> } = JSON.parse(
		readFileSync(path.join(out, 'grade.json'), 'utf8'),
	);
	return {
		...graded,
		output: result.output,
		failed: graded.checks.filter(({ pass }) => !pass).map(({ name }) => name),
	};
}

async function replaceIn(file: string, from: string, to: string) {
	const text = await readFile(file, 'utf8');
	expect(text).toContain(from);
	await writeFile(file, text.replace(from, to));
}

describe('old format grader', () => {
	async function oldProject(name: string) {
		const template = await prepareTemplate(path.join(ROOT, 'templates'), task, 'old');
		const dir = path.join(ROOT, name);
		await copyTemplate(template, dir);
		await rm(path.join(dir, 'nodes/Example'), { recursive: true });
		await cp(path.join(REFERENCE, 'old'), dir, { recursive: true });
		return dir;
	}

	it('passes the reference solution', async () => {
		const graded = await gradeDir(await oldProject('old-reference'), 'old');
		expect(graded.failed, graded.output).toEqual([]);
		expect(graded.pass).toBe(true);
		expect(graded.checks.map(({ name }) => name)).toEqual([
			'build',
			'lint',
			'node',
			'credential',
			...task.cases.map(({ id }) => `case:${id}`),
		]);
	});

	it('fails a copy that sends an empty assignee', async () => {
		const dir = await oldProject('old-broken');
		await replaceIn(
			path.join(dir, 'nodes/AcmeTasks/AcmeTasks.node.ts'),
			'...(assignee ? { assignee } : {}),',
			'assignee,',
		);
		const graded = await gradeDir(dir, 'old');
		expect(graded.pass).toBe(false);
		expect(graded.failed).toEqual(['case:create-unassigned']);
	});
});

describe('new format grader', () => {
	async function newProject(name: string) {
		const template = await prepareTemplate(path.join(ROOT, 'templates'), task, 'new');
		const dir = path.join(ROOT, name);
		await copyTemplate(template, dir);
		await rm(path.join(dir, 'src'), { recursive: true });
		await cp(path.join(REFERENCE, 'new'), dir, { recursive: true });
		return dir;
	}

	it('passes the reference solution', async () => {
		const graded = await gradeDir(await newProject('new-reference'), 'new');
		expect(graded.failed, graded.output).toEqual([]);
		expect(graded.pass).toBe(true);
		expect(graded.checks.map(({ name }) => name)).toEqual([
			'typecheck',
			'check',
			'node',
			'credential',
			...task.cases.map(({ id }) => `case:${id}`),
		]);
	});

	it('fails a copy that drops the status filter', async () => {
		const dir = await newProject('new-broken');
		await replaceIn(
			path.join(dir, 'src/index.ts'),
			"const status = input.status === 'any' ? undefined : input.status;",
			'const status = undefined;',
		);
		const graded = await gradeDir(dir, 'new');
		expect(graded.pass).toBe(false);
		expect(graded.failed).toEqual(['case:list-open-limit-5', 'case:list-done-all']);
	});
});
