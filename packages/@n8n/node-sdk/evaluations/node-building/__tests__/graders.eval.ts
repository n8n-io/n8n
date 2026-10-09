import { mkdtempSync, readFileSync } from 'node:fs';
import { cp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { SDK_DIR } from '../n1-adapter';
import { taskById, type Format } from '../tasks';
import { exec } from '../util';
import { copyTemplate, prepareTemplate } from '../workspace';

const EVAL_DIR = path.resolve(__dirname, '..');
const TSX = path.join(SDK_DIR, 'node_modules/.bin/tsx');
const ROOT = mkdtempSync(path.join(tmpdir(), 'n8n-6071-nodeeval-test-'));

afterAll(async () => await rm(ROOT, { recursive: true, force: true }));

async function gradeDir(dir: string, taskId: string, format: Format) {
	const out = `${dir}-grade`;
	const result = await exec(
		TSX,
		[
			path.join(EVAL_DIR, 'run.ts'),
			'--grade',
			dir,
			'--task',
			taskId,
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

/** A copy of the scaffold with the example replaced by the reference solution. */
async function referenceProject(taskId: string, format: Format, name: string) {
	const template = await prepareTemplate(path.join(ROOT, 'templates'), taskById(taskId), format);
	const dir = path.join(ROOT, `${taskId}-${format}-${name}`);
	await copyTemplate(template, dir);
	await rm(path.join(dir, format === 'old' ? 'nodes/Example' : 'src'), { recursive: true });
	await cp(path.join(EVAL_DIR, 'reference', taskId, format), dir, { recursive: true });
	return dir;
}

const CHECKS: Record<Format, readonly string[]> = {
	old: ['build', 'lint', 'node', 'credential'],
	new: ['typecheck', 'check', 'node', 'credential'],
};

interface Broken {
	readonly file: string;
	readonly from: string;
	readonly to: string;
	readonly failed: readonly string[];
}

const SCENARIOS: ReadonlyArray<{
	task: string;
	format: Format;
	broken: ReadonlyArray<Broken & { readonly title: string }>;
}> = [
	{
		task: 'acme-tasks',
		format: 'old',
		broken: [
			{
				title: 'sends an empty assignee',
				file: 'nodes/AcmeTasks/AcmeTasks.node.ts',
				from: '...(assignee ? { assignee } : {}),',
				to: 'assignee,',
				failed: ['case:create-unassigned'],
			},
		],
	},
	{
		task: 'acme-tasks',
		format: 'new',
		broken: [
			{
				title: 'drops the status filter',
				file: 'src/actions/task.get-all.ts',
				from: "const status = input.status === 'any' ? undefined : input.status;",
				to: 'const status = undefined;',
				failed: ['case:list-open-limit-5', 'case:list-done-all'],
			},
		],
	},
	{
		task: 'inventory',
		format: 'old',
		broken: [
			{
				title: 'joins the field errors with commas',
				file: 'nodes/Inventory/Inventory.node.ts',
				from: "fields.join('; ')",
				to: "fields.join(', ')",
				failed: ['case:invalid-422'],
			},
		],
	},
	{
		task: 'inventory',
		format: 'new',
		broken: [
			{
				title: 'sends dimensions without a unit',
				file: 'src/actions/item.create.ts',
				from: "\t\t\t\t\t\t\tunit: 'cm',\n",
				to: '',
				failed: ['case:create-physical', 'case:invalid-422'],
			},
		],
	},
	{
		task: 'events',
		format: 'old',
		broken: [
			{
				title: 'uses the winter offset all year',
				file: 'nodes/EventLog/EventLog.node.ts',
				from: 'zoneOffset(wall - zoneOffset(wall, timeZone), timeZone)',
				to: 'zoneOffset(Date.UTC(2026, 0, 1), timeZone)',
				failed: ['case:berlin-dst-all'],
			},
		],
	},
	{
		task: 'events',
		format: 'new',
		broken: [
			{
				title: 'keeps tombstones',
				file: 'src/actions/event.get-all.ts',
				from: 'input.includeDeleted || !entry.deleted',
				to: "input.includeDeleted || entry.id !== ''",
				failed: ['case:berlin-dst-all', 'case:offset-limit-30', 'case:utc-default-all'],
			},
		],
	},
	{
		task: 'contacts',
		format: 'old',
		broken: [
			{
				title: 'reads the parameters of item 0 for each item',
				file: 'nodes/Contacts/Contacts.node.ts',
				from: 'this.getNodeParameter(name, itemIndex, ',
				to: 'this.getNodeParameter(name, 0, ',
				failed: ['case:create-items', 'case:create-continue-on-fail', 'case:search-per-item'],
			},
			{
				title: 'drops the items after a failure with continue on fail',
				file: 'nodes/Contacts/Contacts.node.ts',
				from: '\t\t\t\t\tcontinue;\n',
				to: '\t\t\t\t\tbreak;\n',
				failed: ['case:create-continue-on-fail'],
			},
		],
	},
	{
		task: 'contacts',
		format: 'new',
		broken: [
			{
				title: 'tags the contact by the parsed numeric id',
				file: 'src/actions/contact.create.ts',
				from: 'created.idStr',
				to: 'String(created.id)',
				failed: ['case:create-tags-additional'],
			},
		],
	},
	{
		task: 'projects',
		format: 'old',
		broken: [
			{
				title: 'uses the raw resource locator value as the id',
				file: 'nodes/Projects/Projects.node.ts',
				from: "this.getNodeParameter('project', itemIndex, '', { extractValue: true })",
				to: "this.getNodeParameter('project', itemIndex, '')",
				failed: ['case:get-by-id', 'case:get-by-url', 'case:get-from-list'],
			},
		],
	},
	{
		task: 'projects',
		format: 'new',
		broken: [
			{
				title: 'sends the URL as the id',
				file: 'src/actions/project.get.ts',
				from: '?.[1] ?? input.project',
				to: '?.[0] ?? input.project',
				failed: ['case:get-by-url'],
			},
		],
	},
];

describe.each(SCENARIOS)('$task $format grader', ({ task: taskId, format, broken }) => {
	const task = taskById(taskId);

	it('passes the reference solution', async () => {
		const graded = await gradeDir(
			await referenceProject(taskId, format, 'reference'),
			taskId,
			format,
		);
		expect(graded.failed, graded.output).toEqual([]);
		expect(graded.pass).toBe(true);
		expect(graded.checks.map(({ name }) => name)).toEqual([
			...CHECKS[format],
			...task.cases.map(({ id }) => `case:${id}`),
		]);
	});

	it.each(broken.map((copy, index) => ({ ...copy, index })))(
		'fails a copy that $title',
		async ({ file, from, to, failed, index }) => {
			const dir = await referenceProject(taskId, format, `broken-${index}`);
			await replaceIn(path.join(dir, file), from, to);
			const graded = await gradeDir(dir, taskId, format);
			expect(graded.pass).toBe(false);
			expect(graded.failed, graded.output).toEqual(failed);
		},
	);
});

describe('new format paging', () => {
	it('passes the acme-tasks reference with the SDK paging input', async () => {
		const dir = await referenceProject('acme-tasks', 'new', 'paging');
		const file = path.join(dir, 'src/actions/task.get-all.ts');
		await replaceIn(
			file,
			"import { t } from '@n8n/node-sdk';",
			"import { limitOf, paging, t } from '@n8n/node-sdk';",
		);
		await replaceIn(
			file,
			"\t\treturnAll: t.bool().title('Return All').default(false),\n\t\tlimit: t.int().title('Limit').with({ minimum: 1 }).default(50),\n",
			'\t\tpaging,\n',
		);
		await replaceIn(
			file,
			'input.returnAll ? Infinity : (input.limit ?? 50)',
			'limitOf(input.paging) ?? Infinity',
		);
		const graded = await gradeDir(dir, 'acme-tasks', 'new');
		expect(graded.failed, graded.output).toEqual([]);
	});
});

describe('grader parity', () => {
	it.each(['old', 'new'] as const)(
		'%s format runs no case when the compile step fails',
		async (format) => {
			const dir = await referenceProject('inventory', format, 'no-compile');
			const file = format === 'old' ? 'nodes/Inventory/Inventory.node.ts' : 'src/index.ts';
			await writeFile(
				path.join(dir, file),
				`${await readFile(path.join(dir, file), 'utf8')}\nconst broken: number = 'text';\n`,
			);
			const graded = await gradeDir(dir, 'inventory', format);
			expect(graded.checks.map(({ name }) => name)).toEqual([
				...CHECKS[format].slice(0, 2),
				'load',
				...taskById('inventory').cases.map(({ id }) => `case:${id}`),
			]);
			expect(graded.failed).toContain(CHECKS[format][0]);
			expect(graded.failed).toContain('case:create-physical');
		},
	);
});
