import { mock } from 'vitest-mock-extended';

import { AppCodeError, AppCodeRuntime, type RunStaticData } from '../app-code-runtime';
import type { AppActionContext, AppDataTableHandle, AppPageContext } from '../page-context.factory';

const staticData: RunStaticData = {
	app: { id: 'app-1', name: 'My App', namespace: 'my-app', projectId: 'project-1' },
	page: { id: 'page-1', route: '', path: '/apps/my-app' },
	blockId: 'block-1',
	params: {},
	query: {},
	viewer: null,
	baseUrl: 'https://n8n.example.com',
};

function buildCtx(overrides: Partial<AppPageContext> = {}): AppPageContext {
	return {
		app: staticData.app,
		page: staticData.page,
		params: staticData.params,
		query: staticData.query,
		viewer: staticData.viewer,
		dataTables: mock(),
		workflows: mock(),
		credentials: mock(),
		actionUrl: (name) => `${staticData.baseUrl}/apps/my-app/_actions/page-1/block-1/${name}`,
		fetch: vi.fn(),
		log: vi.fn(),
		...overrides,
	};
}

describe('AppCodeRuntime', () => {
	let runtime: AppCodeRuntime;

	beforeEach(() => {
		runtime = new AppCodeRuntime(mock());
	});

	afterEach(async () => {
		await runtime.dispose();
	});

	it('compiles TypeScript and runs the exported render()', async () => {
		const source = `
			export function render(ctx: PageContext) {
				return '<p>' + ctx.app.name + '</p>';
			}
		`;
		const { value, logs } = await runtime.render(source, buildCtx(), staticData);
		expect(value).toBe('<p>My App</p>');
		expect(logs).toEqual([]);
	});

	it('throws when the module exports no render()', async () => {
		await expect(runtime.render('export const x = 1;', buildCtx(), staticData)).rejects.toThrow(
			/render/,
		);
	});

	it('throws when render() does not return a string', async () => {
		await expect(
			runtime.render('export function render() { return 42; }', buildCtx(), staticData),
		).rejects.toThrow();
	});

	it('throws when render() output exceeds the 1 MB limit', async () => {
		const source = `
			export function render() { return 'x'.repeat(1024 * 1024 + 1); }
		`;
		await expect(runtime.render(source, buildCtx(), staticData)).rejects.toThrow(/1 MB/);
	});

	it('collects ctx.log(...) lines and returns them to the caller', async () => {
		const source = `
			export function render(ctx: PageContext) {
				ctx.log('one');
				ctx.log('two', 3);
				return 'ok';
			}
		`;
		const { logs } = await runtime.render(source, buildCtx(), staticData);
		expect(logs).toEqual(['["one"]', '["two",3]']);
	});

	it('runs a named action and returns its result', async () => {
		const source = `
			export function render() { return 'unused'; }
			export const actions = {
				greet: async (ctx: ActionContext) => ({ data: { hello: ctx.input.name } }),
			};
		`;
		const ctx: AppActionContext = { ...buildCtx(), input: { name: 'Ada' } };
		const { value } = await runtime.runAction(source, 'greet', ctx, staticData);
		expect(value).toEqual({ data: { hello: 'Ada' } });
	});

	it('throws for an action name the module does not export', async () => {
		const source = "export function render() { return 'ok'; } export const actions = {};";
		const ctx: AppActionContext = { ...buildCtx(), input: {} };
		await expect(runtime.runAction(source, 'missing', ctx, staticData)).rejects.toThrow(/missing/);
	});

	it('dispatches ctx.dataTables calls to the real PageContext', async () => {
		const handle = mock<AppDataTableHandle>({ id: 'dt-1', name: 'Clients' });
		handle.getManyRowsAndCount.mockResolvedValue({ count: 1, data: [] });
		const dataTables = mock<AppPageContext['dataTables']>();
		dataTables.get.mockResolvedValue(handle);

		const source = `
			export async function render(ctx: PageContext) {
				const table = await ctx.dataTables.get('dt-1');
				const rows = await table.getManyRowsAndCount({ take: 10 });
				return String(rows.count);
			}
		`;
		const { value } = await runtime.render(source, buildCtx({ dataTables }), staticData);
		expect(value).toBe('1');
		expect(dataTables.get).toHaveBeenCalledWith('dt-1');
		expect(handle.getManyRowsAndCount).toHaveBeenCalledWith({ take: 10 });
	});

	it('propagates a host-side error (e.g. NotFound) as a JS error inside the isolate', async () => {
		const dataTables = mock<AppPageContext['dataTables']>();
		dataTables.get.mockRejectedValue(new Error('Data table "missing" not found'));

		const source = `
			export async function render(ctx: PageContext) {
				try {
					await ctx.dataTables.get('missing');
					return 'no error';
				} catch (e) {
					return 'caught: ' + e.message;
				}
			}
		`;
		const { value } = await runtime.render(source, buildCtx({ dataTables }), staticData);
		expect(value).toBe('caught: Data table "missing" not found');
	});

	it('rejects a render call once it exceeds the host-call budget', async () => {
		const dataTables = mock<AppPageContext['dataTables']>();
		dataTables.list.mockResolvedValue([]);

		const source = `
			export async function render(ctx: PageContext) {
				for (let i = 0; i < 25; i++) {
					await ctx.dataTables.list();
				}
				return 'done';
			}
		`;
		await expect(runtime.render(source, buildCtx({ dataTables }), staticData)).rejects.toThrow(
			/host calls/,
		);
	});

	it('does not count ctx.log(...) against the host-call budget', async () => {
		const source = `
			export function render(ctx: PageContext) {
				for (let i = 0; i < 25; i++) ctx.log('line ' + i);
				return 'done';
			}
		`;
		const { value } = await runtime.render(source, buildCtx(), staticData);
		expect(value).toBe('done');
	});

	it('cannot escape the sandbox via constructor.constructor to reach the host process', async () => {
		const source = `
			export function render() {
				try {
					var F = (function () {}).constructor;
					var fn = new F('return typeof process');
					return String(fn());
				} catch (e) {
					return 'blocked';
				}
			}
		`;
		const { value } = await runtime.render(source, buildCtx(), staticData);
		// Either the escape is blocked, or it runs inside the isolate's own empty
		// global scope, where `process` was never defined.
		expect(['blocked', 'undefined']).toContain(value);
	});

	it('cannot import or require any module', async () => {
		const source = `
			export function render() {
				try {
					require('fs');
					return 'required';
				} catch (e) {
					return 'blocked: ' + e.message;
				}
			}
		`;
		const { value } = await runtime.render(source, buildCtx(), staticData);
		expect(value).toMatch(/^blocked:/);
	});

	it('times out a render() call that never returns', async () => {
		const source = 'export function render() { while (true) {} }';
		await expect(runtime.render(source, buildCtx(), staticData)).rejects.toBeInstanceOf(
			AppCodeError,
		);
	}, 12_000);
});
