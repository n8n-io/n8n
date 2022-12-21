/**
 * @type {(dir: string, mode: 'frontend' | undefined) => import('@types/eslint').ESLint.ConfigData}
 */
exports.sharedOptions = (tsconfigRootDir, mode) => ({
	parser: mode === 'frontend' ? 'vue-eslint-parser' : '@typescript-eslint/parser',

	parserOptions:
		mode === 'frontend'
			? {
					tsconfigRootDir,
					project: ['./tsconfig.json'],
					extraFileExtensions: ['.vue'],
					parser: {
						ts: '@typescript-eslint/parser',
						js: '@typescript-eslint/parser',
						vue: 'vue-eslint-parser',
						template: 'vue-eslint-parser',
					},
			  }
			: {
					tsconfigRootDir,
					project: ['./tsconfig.json'],
			  },

	settings: {
		'import/parsers': {
			'@typescript-eslint/parser': ['.ts'],
		},

		'import/resolver': {
			typescript: {
				tsconfigRootDir,
				project: './tsconfig.json',
			},
		},
	},
});
