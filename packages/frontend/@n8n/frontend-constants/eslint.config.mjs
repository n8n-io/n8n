import { defineConfig } from 'eslint/config';
import { frontendConfig } from '@n8n/eslint-config/frontend';

export default defineConfig(
	frontendConfig,
	{
		// `VIEWS` is declared as a plain `enum` (not a `const enum`) so this package's
		// `dist` stays consumable by `isolatedModules` downstream packages (a `const
		// enum` emits an ambient const enum → TS2748). See the doc comment in views.ts.
		// - `no-restricted-syntax` otherwise bans raw enums in favor of `const enum`.
		// - view identifiers are UPPER_CASE by long-standing app convention.
		files: ['src/views.ts'],
		rules: {
			'no-restricted-syntax': 'off',
			'@typescript-eslint/naming-convention': 'off',
		},
	},
	{
		files: ['**/*.test.ts'],
		rules: {
			'@typescript-eslint/naming-convention': 'warn',
		},
	},
);
