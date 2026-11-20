import { frontendConfig } from '@n8n/oxlint-config/frontend';
import { defineConfig } from 'oxlint';

export default defineConfig({
	extends: [frontendConfig],
	options: { typeAware: true },
	overrides: [
		{
			// `VIEWS` is declared as a plain `enum` (not a `const enum`) so this package's
			// `dist` stays consumable by `isolatedModules` downstream packages (a `const
			// enum` emits an ambient const enum → TS2748). See the doc comment in views.ts.
			// `no-raw-enum` otherwise bans raw enums in favor of `const enum`.
			files: ['src/views.ts'],
			rules: {
				'n8n-local-rules/no-raw-enum': 'off',
			},
		},
	],
});
