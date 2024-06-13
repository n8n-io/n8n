/**
 * @type {(dir: string, mode: 'frontend' | undefined) => import('@types/eslint').ESLint.ConfigData}
 */
module.exports = (tsconfigRootDir, mode) => {
	const parserOptions = {
		tsconfigRootDir,
		project: './tsconfig.json',
	};
	const config = {
		parser: '@typescript-eslint/parser',
		parserOptions,
		settings: {
			'import/parsers': {
				'@typescript-eslint/parser': ['.ts'],
			},
			'import/resolver': {
				typescript: parserOptions,
			},
		},
	};

	if (mode === 'frontend') {
		config.parser = 'vue-eslint-parser';
		config.parserOptions.extraFileExtensions = ['.vue'];
		config.overrides = [
			{
				files: ['*.ts'],
				parser: 'typescript-eslint-parser-for-extra-files',
				parserOptions,
			},
			{
				files: ['*.vue'],
				parserOptions: {
					parser: 'typescript-eslint-parser-for-extra-files',
					...parserOptions,
				},
			},
		];
	}

	return config;
};
