import { mock } from 'vitest-mock-extended';

import { AppCodeError, AppCodeRuntime, type RunStaticData } from '../app-code-runtime';
import type { AppActionContext, AppDataTableHandle, AppPageContext } from '../page-context.factory';

const staticData: RunStaticData = {
	app: { id: 'app-1', name: 'My App', namespace: 'my-app', projectId: 'project-1' },
	page: { id: 'page-1', route: '', path: '/apps/my-app' },
	actionPageId: 'page-1',
	blockId: 'block-1',
	params: {},
	query: {},
	viewer: null,
	menu: [],
	baseUrl: 'https://n8n.example.com',
};

function buildCtx(overrides: Partial<AppPageContext> = {}): AppPageContext {
	return {
		app: staticData.app,
		page: staticData.page,
		params: staticData.params,
		query: staticData.query,
		viewer: staticData.viewer,
		menu: staticData.menu,
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

	it('exposes ctx.menu and the owner page in ctx.actionUrl() inside the isolate', async () => {
		const source = `
			export function render(ctx: PageContext) {
				return ctx.menu.map((item) => item.title + (item.current ? '*' : '')).join(',') + ' ' + ctx.actionUrl('go');
			}
		`;
		const menu = [
			{ title: 'Home', path: '/apps/my-app', current: false, children: [] },
			{ title: 'clients', path: '/apps/my-app/clients', current: true, children: [] },
		];
		const { value } = await runtime.render(source, buildCtx({ menu }), {
			...staticData,
			menu,
			actionPageId: 'parent-page',
		});
		expect(value).toBe(
			'Home,clients* https://n8n.example.com/apps/my-app/_actions/parent-page/block-1/go',
		);
	});

	it('throws when the module exports no render()', async () => {
		await expect(runtime.render('export const x = 1;', buildCtx(), staticData)).rejects.toThrow(
			/render/,
		);
	});

	describe('render() result', () => {
		const render = async (expression: string) =>
			(
				await runtime.render(
					`export function render() { return ${expression}; }`,
					buildCtx(),
					staticData,
				)
			).value;

		it.each([
			['null', ''],
			['undefined', ''],
			['42', '42'],
			['true', ''],
			["['a', <b/>]", 'a<b></b>'],
		])('turns %s into %j', async (expression, expected) => {
			expect(await render(expression)).toBe(expected);
		});

		it('inserts a returned string as raw HTML', async () => {
			expect(await render("'<p>' + 'x & y' + '</p>'")).toBe('<p>x & y</p>');
		});

		it('rejects a plain object', async () => {
			await expect(render('{ a: 1 }')).rejects.toThrow(
				'render() must return HTML, text, a number, null or an array of those',
			);
		});
	});

	describe('JSX', () => {
		const renderJsx = async (body: string, query: Record<string, string> = {}) =>
			(
				await runtime.render(
					`export function render(ctx: PageContext) { ${body} }`,
					buildCtx({ query }),
					{ ...staticData, query },
				)
			).value;

		it('escapes text children and attribute values', async () => {
			const value = await renderJsx('return <p title={ctx.query.q}>{ctx.query.q}</p>;', {
				q: '<b>"x" & \'y\'</b>',
			});
			expect(value).toBe(
				'<p title="&lt;b&gt;&quot;x&quot; &amp; &#39;y&#39;&lt;/b&gt;">&lt;b&gt;&quot;x&quot; &amp; &#39;y&#39;&lt;/b&gt;</p>',
			);
		});

		it('does not escape nested elements twice', async () => {
			expect(await renderJsx('return <div><span>{"<i>"}</span></div>;')).toBe(
				'<div><span>&lt;i&gt;</span></div>',
			);
		});

		it('renders a Fragment without a wrapping element', async () => {
			expect(await renderJsx('return <><a>1</a><b>2</b></>;')).toBe('<a>1</a><b>2</b>');
		});

		it('renders arrays of elements in order', async () => {
			expect(await renderJsx('return <ul>{[1, 2].map((n) => <li>{n}</li>)}</ul>;')).toBe(
				'<ul><li>1</li><li>2</li></ul>',
			);
		});

		it('inserts raw() HTML as-is', async () => {
			expect(await renderJsx("return <div>{raw('<hr>')}</div>;")).toBe('<div><hr></div>');
		});

		it('renders void elements without a closing tag', async () => {
			expect(await renderJsx('return <p><br/><img src="/a.png"/></p>;')).toBe(
				'<p><br><img src="/a.png"></p>',
			);
		});

		it('renders true as a bare attribute and skips false, null and undefined', async () => {
			expect(
				await renderJsx(
					'return <input disabled={true} checked={false} name={null} id={undefined}/>;',
				),
			).toBe('<input disabled>');
		});

		it('drops an href with a javascript: scheme and keeps safe URLs', async () => {
			const value = await renderJsx(
				'return <><a href={ctx.query.q}>x</a><a href="https://n8n.io">y</a><a href="?p=1">z</a><a href="clients/1">r</a><img src={ctx.query.d} /></>;',
				{ q: ' javascript:alert(1)', d: 'data:text/html,<script>1</script>' },
			);
			expect(value).toBe(
				'<a>x</a><a href="https://n8n.io">y</a><a href="?p=1">z</a><a href="clients/1">r</a><img>',
			);
		});

		it('maps className and htmlFor and serialises a style object', async () => {
			expect(
				await renderJsx(
					'return <label className="a" htmlFor="b" style={{ marginTop: "1px", color: "red" }}>x</label>;',
				),
			).toBe('<label class="a" for="b" style="margin-top: 1px; color: red;">x</label>');
		});

		it('calls a function component with props and children and escapes a string it returns', async () => {
			const source = `
				const Card = (props: { title: string; children?: Renderable }) =>
					<section><h2>{props.title}</h2>{props.children}</section>;
				const Text = (props: { value: string }) => props.value;
				export function render() {
					return <Card title="<t>"><Text value="<v>"/></Card>;
				}
			`;
			const { value } = await runtime.render(source, buildCtx(), staticData);
			expect(value).toBe('<section><h2>&lt;t&gt;</h2>&lt;v&gt;</section>');
		});

		it('keeps an existing template-string block unchanged', async () => {
			const source = `
				export function render(ctx: PageContext) {
					return \`<div class="p-md"><h2>\${ctx.app.name}</h2></div>\`;
				}
			`;
			const { value } = await runtime.render(source, buildCtx(), staticData);
			expect(value).toBe('<div class="p-md"><h2>My App</h2></div>');
		});

		it('fails to compile an angle-bracket type assertion', async () => {
			const source =
				'export function render() { const n = <number>(1 as unknown); return String(n); }';
			await expect(runtime.render(source, buildCtx(), staticData)).rejects.toThrow();
		});
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
