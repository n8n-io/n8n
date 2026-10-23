import type { BuiltInParserName } from 'prettier';

import { loadPrettier, type PrettierModules } from './loadPrettier';

type PluginName = keyof PrettierModules['plugins'];

// Use the browser build: the Node build has every parser built in and ignores the plugins
vi.mock('prettier', async () => await import('prettier/standalone'));

describe('loadPrettier', () => {
	it.each<[BuiltInParserName, PluginName[], string, string]>([
		['babel', ['babel', 'estree'], 'const a={b:1}', 'const a = { b: 1 };\n'],
		['html', ['html'], '<div><p>Hi</p></div>', '<div><p>Hi</p></div>\n'],
		['css', ['postcss'], '.a{color:red}', '.a {\n  color: red;\n}\n'],
	])('formats %s code with the matching plugins', async (parser, pluginNames, input, expected) => {
		const { format, plugins } = await loadPrettier();

		const formatted = await format(input, {
			parser,
			plugins: pluginNames.map((name) => plugins[name]),
		});

		expect(formatted).toBe(expected);
	});
});
