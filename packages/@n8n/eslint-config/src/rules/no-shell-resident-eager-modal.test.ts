import { RuleTester } from '@typescript-eslint/rule-tester';
import { NoShellResidentEagerModalRule } from './no-shell-resident-eager-modal.js';

const ruleTester = new RuleTester();

const MANIFEST = '/repo/packages/frontend/editor-ui/src/app/modals.manifest.ts';

ruleTester.run('no-shell-resident-eager-modal', NoShellResidentEagerModalRule, {
	valid: [
		{
			name: 'a single fragment imported through the alias',
			filename: MANIFEST,
			code: `
				import { AUTH_MODALS } from '@/features/core/auth/modals';
				const eagerModals: ModalDefinition[] = [...AUTH_MODALS];
			`,
		},
		{
			name: 'several fragments, and an import that follows the declaration',
			filename: MANIFEST,
			code: `
				import { AUTH_MODALS } from '@/features/core/auth/modals';
				const eagerModals: ModalDefinition[] = [...AUTH_MODALS, ...SSO_MODALS];
				import { SSO_MODALS } from '@/features/settings/sso/modals';
			`,
		},
		{
			name: 'a relative path into src/features',
			filename: MANIFEST,
			code: `
				import { AUTH_MODALS } from '../features/core/auth/modals';
				const eagerModals: ModalDefinition[] = [...AUTH_MODALS];
			`,
		},
		{
			name: 'a namespace import from a feature',
			filename: MANIFEST,
			code: `
				import * as authModals from '@/features/core/auth/modals';
				const eagerModals: ModalDefinition[] = [...authModals.AUTH_MODALS];
			`,
		},
		{
			name: 'a default import from a feature',
			filename: MANIFEST,
			code: `
				import authModals from '@/features/core/auth/modals';
				const eagerModals: ModalDefinition[] = [...authModals];
			`,
		},
		{
			name: 'an empty array is not a reacquisition',
			filename: MANIFEST,
			code: 'const eagerModals: ModalDefinition[] = [];',
		},
		{
			name: 'a satisfies assertion around the literal',
			filename: MANIFEST,
			code: `
				import { AUTH_MODALS } from '@/features/core/auth/modals';
				const eagerModals = [...AUTH_MODALS] satisfies ModalDefinition[];
			`,
		},
	],

	invalid: [
		{
			// The case this gate exists for: the definition lives in the shell file.
			name: 'an inline definition in the shell file',
			filename: MANIFEST,
			code: `
				import { SHELL_MODAL_KEY } from '@/app/constants/modals';
				const eagerModals: ModalDefinition[] = [
					{
						key: SHELL_MODAL_KEY,
						component: async () => await import('./components/ShellModal.vue'),
						initialState: { open: false },
					},
				];
			`,
			errors: [{ messageId: 'definedInShell' }],
		},
		{
			name: 'an inline definition next to a legitimate fragment',
			filename: MANIFEST,
			code: `
				import { AUTH_MODALS } from '@/features/core/auth/modals';
				const eagerModals: ModalDefinition[] = [...AUTH_MODALS, { key: 'sneaky', component: {} }];
			`,
			errors: [{ messageId: 'definedInShell' }],
		},
		{
			// A shell-resident fragment: defined in the same file, spread like a feature one.
			name: 'a spread of a fragment declared in the shell file',
			filename: MANIFEST,
			code: `
				const SHELL_MODALS: ModalDefinition[] = [{ key: 'shell', component: {} }];
				const eagerModals: ModalDefinition[] = [...SHELL_MODALS];
			`,
			errors: [{ messageId: 'definedInShell' }],
		},
		{
			// A shell-resident fragment in a sibling shell file.
			name: 'a spread of a fragment imported from another shell file',
			filename: MANIFEST,
			code: `
				import { SHELL_MODALS } from '@/app/shell-modals';
				const eagerModals: ModalDefinition[] = [...SHELL_MODALS];
			`,
			errors: [
				{
					messageId: 'nonFeatureOrigin',
					data: { imported: 'SHELL_MODALS', source: '@/app/shell-modals' },
				},
			],
		},
		{
			name: 'a spread of a fragment imported by a relative shell path',
			filename: MANIFEST,
			code: `
				import { SHELL_MODALS } from './shell-modals';
				const eagerModals: ModalDefinition[] = [...SHELL_MODALS];
			`,
			errors: [{ messageId: 'nonFeatureOrigin' }],
		},
		{
			// A module package is not `src/features/**`. It stays a rejection until the
			// gate is widened on purpose, in the change that needs it.
			name: 'a spread of a fragment imported from a module package',
			filename: MANIFEST,
			code: `
				import { OTEL_MODALS } from '@n8n/frontend-module-otel';
				const eagerModals: ModalDefinition[] = [...OTEL_MODALS];
			`,
			errors: [{ messageId: 'nonFeatureOrigin' }],
		},
		{
			name: 'one error per bad entry',
			filename: MANIFEST,
			code: `
				import { AUTH_MODALS } from '@/features/core/auth/modals';
				import { SHELL_MODALS } from '@/app/shell-modals';
				const eagerModals: ModalDefinition[] = [
					...AUTH_MODALS,
					...SHELL_MODALS,
					{ key: 'inline', component: {} },
				];
			`,
			errors: [{ messageId: 'nonFeatureOrigin' }, { messageId: 'definedInShell' }],
		},
		{
			name: 'an expression that hides the entries from the gate',
			filename: MANIFEST,
			code: `
				import { AUTH_MODALS } from '@/features/core/auth/modals';
				const eagerModals: ModalDefinition[] = AUTH_MODALS.concat(SHELL_MODALS);
			`,
			errors: [{ messageId: 'notAnArray' }],
		},
		{
			name: 'the declaration is renamed, so the gate would read nothing',
			filename: MANIFEST,
			code: `
				import { AUTH_MODALS } from '@/features/core/auth/modals';
				const preLoginModals: ModalDefinition[] = [...AUTH_MODALS];
			`,
			errors: [{ messageId: 'missingDeclaration' }],
		},
	],
});
