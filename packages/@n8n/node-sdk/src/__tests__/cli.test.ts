import { execFile } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:http';
import type { AddressInfo } from 'node:net';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { promisify } from 'node:util';

const SDK_ROOT = resolve(__dirname, '..', '..');
const BIN = join(SDK_ROOT, 'src', 'cli', 'n8n-node-next');

interface CliResult {
	code: number;
	stdout: string;
	stderr: string;
}

async function cli(cwd: string, args: string[], env: NodeJS.ProcessEnv = {}): Promise<CliResult> {
	try {
		const { stdout, stderr } = await promisify(execFile)(process.execPath, [BIN, ...args], {
			cwd,
			env: { ...process.env, ...env },
		});
		return { code: 0, stdout, stderr };
	} catch (error) {
		const failed = error as { code: number; stdout: string; stderr: string };
		return { code: failed.code, stdout: failed.stdout, stderr: failed.stderr };
	}
}

/** What `pnpm install` does for the scaffold: link the SDK and the Node types. */
function install(project: string) {
	const link = (target: string, path: string) => {
		mkdirSync(dirname(join(project, path)), { recursive: true });
		symlinkSync(target, join(project, path));
	};
	link(SDK_ROOT, 'node_modules/@n8n/node-sdk');
	link(dirname(require.resolve('@types/node/package.json')), 'node_modules/@types/node');
}

describe('n8n-node-next', () => {
	const workspace = mkdtempSync(join(tmpdir(), 'n8n-node-next-'));
	const project = join(workspace, 'todo');
	const server = createServer((request, response) => {
		const authorized = request.headers.authorization === 'Bearer secret';
		response.writeHead(authorized ? 200 : 401, { 'content-type': 'application/json' });
		const items = [{ id: '1', name: 'First', ownerId: null }];
		response.end(JSON.stringify(authorized ? { items, nextCursor: null } : {}));
	});
	const baseUrl = () => `http://127.0.0.1:${(server.address() as AddressInfo).port}/v1`;

	beforeAll(async () => await new Promise<void>((done) => server.listen(0, '127.0.0.1', done)));

	afterAll(() => {
		server.close();
		rmSync(workspace, { recursive: true, force: true });
	});

	it('new scaffolds a project', async () => {
		const result = await cli(workspace, ['new', 'todo', '--dir', 'todo']);
		expect(result.code).toBe(0);
		const manifest = JSON.parse(readFileSync(join(project, 'package.json'), 'utf8'));
		expect(manifest.dependencies['@n8n/node-sdk']).toBe(`link:${SDK_ROOT}`);
		expect(readFileSync(join(project, 'AGENTS.md'), 'utf8').split('\n').length).toBeLessThan(150);
		expect(readFileSync(join(project, 'src/index.ts'), 'utf8')).toContain('export const actions');
		// The scaffold has the layout that check enforces.
		expect(readFileSync(join(project, 'src/todo.node.ts'), 'utf8')).toContain(
			"node.resource('item')",
		);
		expect(readFileSync(join(project, 'src/actions/item.get-all.ts'), 'utf8')).toContain(
			"item.action('getAll'",
		);
		install(project);
		expect((await cli(workspace, ['new', 'todo', '--dir', 'todo'])).stderr).toContain(
			'is not empty',
		);
	});

	it('check passes on the scaffold', async () => {
		expect(await cli(project, ['check'])).toMatchObject({
			code: 0,
			stdout: 'check passed. Next: n8n-node-next test\n',
		});
	});

	it('check reports the file, action id and schema path', async () => {
		const file = join(project, 'src/actions/item.get-all.ts');
		const source = readFileSync(file, 'utf8');
		writeFileSync(file, source.replace("examples: ['itm_1']", 'examples: [1]'));
		const result = await cli(project, ['check']);
		writeFileSync(file, source);
		expect(result.code).toBe(1);
		expect(result.stderr).toContain(
			'src/actions/item.get-all.ts: todo.item.getAll: output.id.examples[0]: must be string, got 1',
		);
	});

	it('check reports an action file whose name does not match the action id', async () => {
		const file = join(project, 'src/actions/item.get-all.ts');
		const source = readFileSync(file, 'utf8');
		writeFileSync(file, source.replace("item.action('getAll'", "item.action('list'"));
		const result = await cli(project, ['check']);
		writeFileSync(file, source);
		expect(result.code).toBe(1);
		expect(result.stderr).toContain(
			'src/index.ts: todo.item.list: file: must be src/actions/item.list.ts',
		);
	});

	it('test runs the node:test files', async () => {
		const result = await cli(project, ['test']);
		expect(result.code).toBe(0);
		expect(result.stdout).toContain('pass 4');
		expect(result.stdout).toContain('tests passed. Next:');
	});

	it('test fails a test that does not end and names it', async () => {
		const file = join(project, 'src/hangs.test.ts');
		writeFileSync(
			file,
			"import { test } from 'node:test';\ntest('waits forever', () => new Promise(() => setInterval(() => {}, 1000)));\n",
		);
		const result = await cli(project, ['test', '--timeout', '1']);
		rmSync(file);
		expect(result.code).toBe(1);
		expect(result.stdout).toContain('waits forever');
		expect(result.stdout).toContain('test timed out after 1000ms');
	}, 20_000);

	it('test stops a run that blocks the event loop and names the file', async () => {
		const file = join(project, 'src/spins.test.ts');
		writeFileSync(
			file,
			"import { test } from 'node:test';\ntest('spins', () => {\n\twhile (true) {}\n});\n",
		);
		const started = Date.now();
		const result = await cli(project, ['test', '--timeout', '1']);
		rmSync(file);
		expect(Date.now() - started).toBeLessThan(15_000);
		expect(result.code).toBe(1);
		expect(result.stdout).toContain('src/spins.test.ts');
		expect(result.stderr).toContain('tests stopped after 3 s');
	}, 20_000);

	it('describe prints the typed module', async () => {
		const result = await cli(project, ['describe', 'todo.item.getAll']);
		expect(result.stdout).toContain('export type TodoItemGetAllOutput');
		expect(result.stdout).toContain('contractStep("n8n-nodes-todo.todoItemGetAll", config)');
	});

	it('run calls the API with the credential from the environment', async () => {
		const node = join(project, 'src/todo.node.ts');
		writeFileSync(
			node,
			readFileSync(node, 'utf8').replace('https://api.todo.example.com/v1', baseUrl()),
		);
		const args = [
			'run',
			'todo.item.getAll',
			'--input',
			'{"paging":{"mode":"limit","max":1}}',
			'--credential-env',
			'TODO',
		];
		const ok = await cli(project, args, { TODO_API_KEY: 'secret' });
		expect(ok.code).toBe(0);
		expect(JSON.parse(ok.stdout)).toEqual([{ id: '1', name: 'First', ownerId: null }]);

		const credentialFile = join(workspace, 'credential.json');
		writeFileSync(credentialFile, JSON.stringify({ type: 'todoApi', data: { apiKey: 'secret' } }));
		const fromFile = await cli(project, [...args.slice(0, 4), '--credential-file', credentialFile]);
		expect(JSON.parse(fromFile.stdout)).toEqual([{ id: '1', name: 'First', ownerId: null }]);

		const denied = await cli(project, args, { TODO_API_KEY: 'wrong' });
		expect(denied.code).toBe(1);
		expect(JSON.parse(denied.stderr).error.httpStatus).toBe(401);

		const input = '{"paging":{"mode":"limit","max":0}}';
		const invalid = await cli(project, ['run', 'todo.item.getAll', '--input', input]);
		expect(JSON.parse(invalid.stderr).error.path).toBe('input.paging.max');
	});
});
