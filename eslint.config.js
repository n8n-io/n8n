// Root ESLint configuration for n8n monorepo
// This is a minimal config since packages have their own specific configurations
export default [
	{
		ignores: [
			'**/node_modules/**',
			'**/dist/**',
			'**/build/**',
			'**/coverage/**',
			'**/.turbo/**',
			'**/bin/**',
			'**/templates/**',
			'**/*.d.ts',
			'**/*.json',
			'**/*.md',
			'**/*.yml',
			'**/*.yaml',
			'development/**', // Ignore development documentation files
			'patches/**',
			'scripts/**',
			'cypress/fixtures/**',
			'docker/**',
		],
	},
	{
		// Basic configuration for root-level files only
		files: ['*.js', '*.mjs', '*.ts'],
		languageOptions: {
			ecmaVersion: 2022,
			sourceType: 'module',
		},
		rules: {
			// Minimal rules for root-level files
			'no-console': 'warn',
			'no-debugger': 'error',
		},
	},
];