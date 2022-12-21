/**
 * @type {(dir: string, mode: 'frontend' | undefined) => import('@types/eslint').ESLint.ConfigData}
 */
exports.sharedOptions = (tsconfigRootDir, mode) => {
	const isFrontend = mode === 'frontend';
	const parser = isFrontend ? 'vue-eslint-parser' : '@typescript-eslint/parser';
	const extraParserOptions = isFrontend
		? {
				extraFileExtensions: ['.vue'],
				parser: {
					ts: '@typescript-eslint/parser',
					js: '@typescript-eslint/parser',
					vue: 'vue-eslint-parser',
					template: 'vue-eslint-parser',
				},
		  }
		: {};

	const settings = {
		'import/parsers': {
			'@typescript-eslint/parser': isFrontend ? ['.ts', '.vue'] : ['.ts'],
		},

		'import/resolver': {
			typescript: {
				tsconfigRootDir,
				project: './tsconfig.json',
			},
		},
	};

	return {
		parser,
		parserOptions: {
			tsconfigRootDir,
			project: ['./tsconfig.json'],
			...extraParserOptions,
		},
		settings,
	};
};
