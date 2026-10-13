import type { BuiltInParserName } from 'prettier';

import { loadPrettier, type PrettierModules } from './loadPrettier';

type PluginName = keyof PrettierModules['plugins'];

// Node resolves `prettier` to a build with every parser built in, so plugins would be ignored.
// The browser gets the standalone build, which formats only with the plugins it is given.
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
