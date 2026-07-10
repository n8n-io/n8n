import { RuleTester } from '@typescript-eslint/rule-tester';
import {
	EnforceModuleBoundariesRule,
	type Options,
	type PackageTag,
} from './enforce-module-boundaries.js';

const ruleTester = new RuleTester();

// A representative slice of a tagged n8n frontend monorepo.
const packages: PackageTag[] = [
	{ name: 'apps-frontend', path: 'apps/frontend', type: 'app', scope: 'shell' },
	{ name: '@n8n/feature-ai', path: 'features/ai', type: 'feature', scope: 'ai' },
	{
		name: '@n8n/feature-credentials',
		path: 'features/credentials',
		type: 'feature',
		scope: 'credentials',
	},
	{
		name: '@n8n/credentials-data',
		path: 'data-access/credentials',
		type: 'data-access',
		scope: 'credentials',
	},
	{
		name: '@n8n/rest-api-client',
		path: 'shared/rest-api-client',
		type: 'data-access',
		scope: 'shared',
	},
	{ name: '@n8n/design-system', path: 'shared/design-system', type: 'ui', scope: 'shared' },
	{ name: '@n8n/utils', path: 'shared/utils', type: 'util', scope: 'shared' },
];

const options: [Options] = [{ packages }];

ruleTester.run('enforce-module-boundaries', EnforceModuleBoundariesRule, {
	valid: [
		{
			// app may glue together features
			code: 'import { AiPanel } from "@n8n/feature-ai"',
			filename: '/repo/apps/frontend/src/main.ts',
			options,
		},
		{
			// feature -> data-access (shared) is allowed
			code: 'import { restApi } from "@n8n/rest-api-client"',
			filename: '/repo/features/ai/src/store.ts',
			options,
		},
		{
			// feature -> shared UI is allowed
			code: 'import { N8nButton } from "@n8n/design-system"',
			filename: '/repo/features/ai/src/Panel.vue',
			options,
		},
		{
			// anyone -> util is allowed
			code: 'import { deepCopy } from "@n8n/utils"',
			filename: '/repo/shared/rest-api-client/src/client.ts',
			options,
		},
		{
			// external / relative imports are ignored
			code: 'import { ref } from "vue"; import { helper } from "./helper";',
			filename: '/repo/features/ai/src/store.ts',
			options,
		},
		{
			// cross-scope becomes valid once explicitly opted in
			code: 'import { credData } from "@n8n/credentials-data"',
			filename: '/repo/features/ai/src/store.ts',
			options: [{ packages, allowedScopeDependencies: { ai: ['credentials'] } }] as [Options],
		},
	],
	invalid: [
		{
			// data-access must stay UI-free
			code: 'import { N8nButton } from "@n8n/design-system"',
			filename: '/repo/shared/rest-api-client/src/client.ts',
			options,
			errors: [{ messageId: 'forbiddenType' }],
		},
		{
			// features must not import each other (vertical slicing)
			code: 'import { CredForm } from "@n8n/feature-credentials"',
			filename: '/repo/features/ai/src/Panel.vue',
			options,
			errors: [{ messageId: 'forbiddenType' }],
		},
		{
			// type is allowed (feature->data-access) but scope crosses without opt-in
			code: 'import { credData } from "@n8n/credentials-data"',
			filename: '/repo/features/ai/src/store.ts',
			options,
			errors: [{ messageId: 'forbiddenScope' }],
		},
	],
});
