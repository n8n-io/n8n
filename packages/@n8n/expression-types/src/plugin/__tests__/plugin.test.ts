import path from 'node:path';
import ts from 'typescript';

import { expressionPlugin } from '../plugin';

// No flow SDK: a field type that takes a value, a function of the item, or an expression.
const FIXTURE = `type Value<I, V> = V | ((item: I) => V) | \`=\${string}\`;
interface Item { id: string; subject: string; count: number }
declare function step(parameters: { id?: Value<Item, string>; max?: Value<Item, number>; note?: string }): void;
declare function expr(text: string): \`=\${string}\`;
declare function fields<F extends Record<string, string | ((item: Item) => unknown)>>(fields: F): F;

step({ id: '={{ $json.idd }}' });
step({ id: '=after:{{ $now.toISO() }} {{ $now.toISo() }}' });
step({ id: '={{ $pageCount }}' });
step({ max: '={{ $json.subject }}' });
step({ id: expr('{{ $json.subjcet }}') });
step({ note: '={{ $json.nope }}' });
step({ id: '={{ $json.subject.toTitleCase() }}', max: '={{ $json.count + 1 }}' });
step({ id: '={{ String($) }}' });
fields({ label: '=Re: {{ $json.subjetc }}', id: '={{ $json.id }}' });
export {};
`;

function languageService(fileName: string, text: string): ts.LanguageService {
	const options: ts.CompilerOptions = {
		strict: true,
		module: ts.ModuleKind.NodeNext,
		moduleResolution: ts.ModuleResolutionKind.NodeNext,
		target: ts.ScriptTarget.ES2022,
		skipLibCheck: true,
		types: [],
	};
	const host: ts.LanguageServiceHost = {
		getCompilationSettings: () => options,
		getScriptFileNames: () => [fileName],
		getScriptVersion: () => '1',
		getScriptSnapshot: (file) => {
			const content = file === fileName ? text : ts.sys.readFile(file);
			return content === undefined ? undefined : ts.ScriptSnapshot.fromString(content);
		},
		getCurrentDirectory: () => path.dirname(fileName),
		getDefaultLibFileName: (o) => ts.getDefaultLibFilePath(o),
		fileExists: (file) => file === fileName || ts.sys.fileExists(file),
		readFile: (file) => (file === fileName ? text : ts.sys.readFile(file)),
		directoryExists: ts.sys.directoryExists,
		getDirectories: ts.sys.getDirectories,
		readDirectory: ts.sys.readDirectory,
	};
	const inner = ts.createLanguageService(host);
	const info = {
		languageService: inner,
		languageServiceHost: host,
		project: {
			getCurrentDirectory: () => path.dirname(fileName),
			projectService: { logger: { info: () => {} } },
		},
		serverHost: ts.sys,
		config: {},
	} as unknown as ts.server.PluginCreateInfo;
	return expressionPlugin({ typescript: ts }).create(info);
}

const position = (needle: string, offset = 0) => {
	const index = FIXTURE.indexOf(needle);
	expect(index).toBeGreaterThan(-1);
	const before = FIXTURE.slice(0, index + offset).split('\n');
	return `${before.length}:${(before.at(-1)?.length ?? 0) + 1}`;
};

describe('expression tsserver plugin', () => {
	it('reports each wrong expression at its place in the string, with the TypeScript message', () => {
		const fileName = path.join(__dirname, 'fixture.ts');
		const ls = languageService(fileName, FIXTURE);

		const found = ls
			.getSemanticDiagnostics(fileName)
			.filter((diagnostic) => diagnostic.source === 'n8n-expression')
			.map((diagnostic) => {
				const { line, character } = ts.getLineAndCharacterOfPosition(
					diagnostic.file!,
					diagnostic.start!,
				);
				return `${line + 1}:${character + 1} TS${diagnostic.code}: ${ts.flattenDiagnosticMessageText(diagnostic.messageText, ' ')}`;
			});

		expect(found).toEqual([
			`${position('$json.idd', 6)} TS2339: Property 'idd' does not exist on type 'Item'.`,
			`${position('$now.toISo', 5)} TS2551: Property 'toISo' does not exist on type 'DateTime'. Did you mean 'toISO'?`,
			`${position('$pageCount')} TS2304: Cannot find name '$pageCount'.`,
			`${position("'={{ $json.subject }}'")} TS2322: The expression result does not fit the field: Type 'string' is not assignable to type 'number'.`,
			`${position('$json.subjcet', 6)} TS2551: Property 'subjcet' does not exist on type 'Item'. Did you mean 'subject'?`,
			`${position('$json.subjetc', 6)} TS2551: Property 'subjetc' does not exist on type 'Item'. Did you mean 'subject'?`,
			`${position('$) }}')} TS0: n8n: Cannot access "$" without calling it as a function.`,
		]);
	});
});
