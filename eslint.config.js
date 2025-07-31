// Root ESLint configuration for n8n monorepo
// Optimized for monorepo structure with proper package delegation
export default [
	{
		// Global ignores applied to all configurations
		ignores: [
			// Build outputs and dependencies
			'**/node_modules/**',
			'**/dist/**',
			'**/build/**',
			'**/coverage/**',
			'**/.turbo/**',
			'**/bin/**',
			'**/templates/**',
			
			// Generated and config files
			'**/*.d.ts',
			'**/*.json',
			'**/*.md',
			'**/*.yml',
			'**/*.yaml',
			
			// Project specific directories
			'development/**', // Development documentation
			'patches/**',     // Package patches
			'scripts/**',     // Build scripts
			'cypress/fixtures/**',
			'docker/**',
			
			// Temporary and cache files
			'.vscode/**',
			'.idea/**',
			'*.log',
			'**/temp/**',
			'**/tmp/**',
		],
	},
	{
		// Minimal configuration for root-level files only
		// Packages handle their own linting via individual eslint.config.mjs files
		files: ['*.js', '*.mjs', '*.ts'],
		languageOptions: {
			ecmaVersion: 2024,
			sourceType: 'module',
		},
		rules: {
			// Essential rules for root-level configuration files
			'no-console': 'warn',
			'no-debugger': 'error',
			'no-unused-vars': 'warn',
		},
	},
];