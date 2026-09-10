import { APP_PAGE_API_FILE_NAME, appPageApiTypes } from '@n8n/api-types';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import * as ts from 'typescript';

// The declarations ship as a string, so nothing else type-checks them: this
// test compiles them, and a sample code block against them, with the compiler
// that packages/cli has (the api-types package only has the native compiler).
const compile = (files: Record<string, string>) => {
	const dir = mkdtempSync(join(tmpdir(), 'app-page-api-'));
	try {
		const paths = Object.entries(files).map(([name, content]) => {
			const path = join(dir, name);
			writeFileSync(path, content);
			return path;
		});
		const program = ts.createProgram(paths, {
			noEmit: true,
			strict: true,
			target: ts.ScriptTarget.ES2022,
			module: ts.ModuleKind.ESNext,
			lib: ['lib.es2023.d.ts'],
			types: [],
			jsx: ts.JsxEmit.React,
			jsxFactory: 'h',
			jsxFragmentFactory: 'Fragment',
		});
		return ts
			.getPreEmitDiagnostics(program)
			.map((d) => ts.flattenDiagnosticMessageText(d.messageText, '\n'));
	} finally {
		rmSync(dir, { recursive: true, force: true });
	}
};

describe('appPageApiTypes', () => {
	test('is valid TypeScript', () => {
		expect(compile({ [APP_PAGE_API_FILE_NAME]: appPageApiTypes })).toEqual([]);
	});

	test('types a code block that uses the API', () => {
		const source = `
			export async function render(ctx: PageContext): Promise<string> {
				const table = await ctx.dataTables.get('customers');
				const { data } = await table.getManyRowsAndCount({
					filter: { type: 'and', filters: [{ columnName: 'id', condition: 'eq', value: ctx.params.id }] },
				});
				return '<ul>' + data.map((row) => '<li>' + String(row.name) + '</li>').join('') + '</ul>';
			}
			export const actions = {
				async deleteRow(ctx: ActionContext): Promise<ActionResult> {
					const table = await ctx.dataTables.get('customers');
					await table.deleteRows({
						filter: { type: 'and', filters: [{ columnName: 'id', condition: 'eq', value: Number(ctx.input.id) }] },
					});
					return { redirect: ctx.page.path };
				},
			};
			const module: CodeBlockModule = { render, actions };
			void module;
		`;

		expect(compile({ [APP_PAGE_API_FILE_NAME]: appPageApiTypes, 'block.ts': source })).toEqual([]);
	});

	test('types a TSX code block that uses JSX, Fragment, raw() and a function component', () => {
		const source = `
			const Badge = (props: { label: string; children?: Renderable }) => (
				<span className="badge">{props.label}{props.children}</span>
			);
			export async function render(ctx: PageContext) {
				const table = await ctx.dataTables.get('customers');
				const { data } = await table.getManyRowsAndCount({ take: 10 });
				if (data.length === 0) return null;
				return (
					<>
						<h2 style={{ marginTop: '0' }}>{ctx.app.name}</h2>
						{raw('<hr>')}
						<ul>
							{data.map((row) => (
								<li>
									<Badge label={String(row.name)}>{row.id}</Badge>
								</li>
							))}
						</ul>
					</>
				);
			}
			const module: CodeBlockModule = { render };
			void module;
		`;

		expect(compile({ [APP_PAGE_API_FILE_NAME]: appPageApiTypes, 'block.tsx': source })).toEqual([]);
	});

	test('rejects a code block that misuses the API', () => {
		const source = `
			export async function render(ctx: PageContext): Promise<string> {
				return ctx.dataTables.get(42);
			}
		`;

		expect(compile({ [APP_PAGE_API_FILE_NAME]: appPageApiTypes, 'block.ts': source })).not.toEqual(
			[],
		);
	});
});
