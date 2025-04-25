import { defineConfig } from 'eslint/config';
import VueEslintParser from 'vue-eslint-parser';
import TypescriptEslintParser from '@typescript-eslint/parser';

export default (tsconfigRootDir: string, mode?: 'frontend') => {
	const isFrontend = mode === 'frontend';
	const parser = isFrontend ? VueEslintParser : TypescriptEslintParser;
	const extraParserOptions = isFrontend
		? {
				extraFileExtensions: ['.vue'],
				parser: {
					ts: TypescriptEslintParser,
					js: TypescriptEslintParser,
					vue: VueEslintParser,
					template: VueEslintParser,
				},
			}
		: {};

	const parserOptions = {
		tsconfigRootDir,
		project: ['./tsconfig.json'],
		...extraParserOptions,
	};

	const settings = {
		'import/parsers': {
			'@typescript-eslint/parser': ['.ts'],
		},

		'import/resolver': {
			typescript: {
				tsconfigRootDir,
				project: './tsconfig.json',
			},
		},
	};

	return defineConfig({
		languageOptions: { parser, parserOptions },
		settings,
	});
};
