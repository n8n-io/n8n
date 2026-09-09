import { jsonParse } from 'n8n-workflow';
import { execFile } from 'node:child_process';
import { mkdtemp, mkdir, readFile, writeFile, symlink, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { promisify } from 'node:util';

import {
	loadWorkflowDiagnosticsWorker,
	SANDBOX_TYPESCRIPT_VERSION,
	WORKFLOW_DIAGNOSTICS_FILENAME,
} from '../../../workspace/sandbox-typescript';

const exec = promisify(execFile);

describe('sandbox TypeScript diagnostics', () => {
	let root: string;

	beforeEach(async () => {
		root = await mkdtemp(join(tmpdir(), 'workflow-diagnostics-'));
		await mkdir(join(root, 'node_modules/@n8n'), { recursive: true });
		await mkdir(join(root, 'src'));
		await writeFile(
			join(root, WORKFLOW_DIAGNOSTICS_FILENAME),
			await loadWorkflowDiagnosticsWorker(),
		);
		await writeFile(join(root, 'package.json'), JSON.stringify({ type: 'module' }));
		await mkdir(join(root, 'node_modules/@types'));
		await symlink(
			dirname(require.resolve('@types/node/package.json')),
			join(root, 'node_modules/@types/node'),
		);
		const packageRoot = dirname(require.resolve('typescript/package.json'));
		expect(
			jsonParse<{ version: string }>(await readFile(join(packageRoot, 'package.json'), 'utf8'))
				.version,
		).toBe(SANDBOX_TYPESCRIPT_VERSION);
		await symlink(packageRoot, join(root, 'node_modules/typescript'));
		await symlink(
			dirname(require.resolve('@n8n/workflow-sdk/package.json')),
			join(root, 'node_modules/@n8n/workflow-sdk'),
		);
	});

	afterEach(async () => {
		await rm(root, { recursive: true, force: true });
	});

	async function diagnose(source: string) {
		await writeFile(join(root, 'src/main.ts'), source);
		const { stdout } = await exec(
			process.execPath,
			[WORKFLOW_DIAGNOSTICS_FILENAME, './src/main.ts'],
			{ cwd: root, timeout: 10_000 },
		);
		return jsonParse<string[]>(stdout);
	}

	it('returns both syntax errors in one result', async () => {
		const diagnostics = await diagnose(`declare function tool(config: unknown): unknown;
const first = tool({ config: { parameters: { value: true } });
const second = tool({ config: { parameters: { value: true } });`);
		expect(diagnostics).toEqual([
			expect.stringMatching(/^src\/main.ts\(2,\d+\): error TS1005:/),
			expect.stringMatching(/^src\/main.ts\(3,\d+\): error TS1005:/),
		]);
	});

	it('returns SDK method errors and imported syntax and type errors together', async () => {
		await writeFile(
			join(root, 'src/chunk.ts'),
			"export const count: number = 'three';\nexport const broken = { value: };",
		);
		await writeFile(join(root, 'src/unrelated.ts'), "const unrelated: number = 'ignore';");
		const diagnostics = await diagnose(`import { workflow } from '@n8n/workflow-sdk';
import { count } from './chunk';
const wf = workflow('id', 'name');
wf.onError();
wf.onDone();
export default wf;`);
		expect(diagnostics).toEqual(
			expect.arrayContaining([
				expect.stringContaining('src/chunk.ts(1,14): error TS2322:'),
				expect.stringContaining('src/chunk.ts(2,32): error TS1109:'),
				expect.stringContaining("src/main.ts(4,4): error TS2339: Property 'onError'"),
				expect.stringContaining("src/main.ts(5,4): error TS2339: Property 'onDone'"),
			]),
		);
		expect(diagnostics).toHaveLength(4);
	});

	it('accepts supported SDK methods', async () => {
		const diagnostics = await diagnose(`import { workflow, node } from '@n8n/workflow-sdk';
const first = node({ type: 'n8n-nodes-base.noOp', version: 1, config: {} });
const failure = node({ type: 'n8n-nodes-base.noOp', version: 1, config: {} });
export default workflow('id', 'name').add(first.onError(failure));`);
		expect(diagnostics).toEqual([]);
	});

	it('preserves positions after Unicode characters and nested error messages', async () => {
		const source = `const emoji = '😀'; const count: number = 'three';
declare const actual: { nested: { value: string } };
const expected: { nested: { value: number } } = actual;`;
		const diagnostics = await diagnose(source);
		expect(diagnostics).toEqual(
			expect.arrayContaining([
				expect.stringContaining(`src/main.ts(1,${source.indexOf('count') + 1}): error TS2322:`),
				expect.stringMatching(/src\/main.ts\(3,\d+\): error TS2322:[\s\S]*\n.*nested.value/),
			]),
		);
	});

	it('accepts Node globals', async () => {
		expect(await diagnose("export const value = Buffer.from(process.env.VALUE ?? '');")).toEqual(
			[],
		);
	});
});
