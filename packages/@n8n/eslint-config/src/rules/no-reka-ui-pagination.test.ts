import { RuleTester } from '@typescript-eslint/rule-tester';
import { NoRekaUiPaginationRule } from './no-reka-ui-pagination.js';

const ruleTester = new RuleTester();

const wrapperPath =
	'/repo/packages/frontend/@n8n/design-system/src/components/N8nPagination/reka-ui.ts';
const wrapperWindowsPath =
	'C:\\repo\\packages\\frontend\\@n8n\\design-system\\src\\components\\N8nPagination\\Pagination.vue';

const error = (name: string) => ({
	messageId: 'noRekaUiPagination' as const,
	data: { name },
});

ruleTester.run('no-reka-ui-pagination', NoRekaUiPaginationRule, {
	valid: [
		// Non-pagination Reka UI primitives stay allowed — reka-ui is a mixed module.
		{ code: "import { SelectRoot, DialogRoot } from 'reka-ui';" },
		{ code: "import { SelectRoot as Root } from 'reka-ui';" },
		{ code: "export { SelectRoot } from 'reka-ui';" },
		{ code: "import type { SelectRootProps } from 'reka-ui';" },
		// Same export name from an unrelated package.
		{ code: "import { PaginationRoot } from 'some-other-pkg';" },
		{ code: "import { N8nPagination } from '@n8n/design-system';" },
		// Allowed wrapper (posix and windows separators).
		{
			name: 'named pagination import in the allowed wrapper path',
			code: "import { PaginationRoot } from 'reka-ui';",
			filename: wrapperPath,
		},
		{
			name: 're-export in the allowed wrapper path (windows separators)',
			code: "export { PaginationRoot, PaginationList } from 'reka-ui';",
			filename: wrapperWindowsPath,
		},
		// Namespace / star forms do not name a Pagination* specifier, so they are out of scope.
		// Closing them would false-positive mixed-module `import * as Reka from 'reka-ui'`.
		{ name: 'namespace import bypass', code: "import * as Reka from 'reka-ui';" },
		{ name: 'star re-export bypass', code: "export * from 'reka-ui';" },
		{ name: 'namespace re-export bypass', code: "export * as Reka from 'reka-ui';" },
		{ name: 'default import bypass', code: "import Reka from 'reka-ui';" },
	],
	invalid: [
		{
			name: 'named import',
			code: "import { PaginationRoot } from 'reka-ui';",
			errors: [error('PaginationRoot')],
		},
		{
			name: 'aliased import — flagged by the original export name',
			code: "import { PaginationRoot as Root } from 'reka-ui';",
			errors: [error('PaginationRoot')],
		},
		{
			name: 'multiple named pagination imports',
			code: "import { PaginationRoot, PaginationList, PaginationNext } from 'reka-ui';",
			errors: [error('PaginationRoot'), error('PaginationList'), error('PaginationNext')],
		},
		{
			name: 'mixed pagination and non-pagination specifiers — only pagination is flagged',
			code: "import { DialogRoot, PaginationRoot, SelectRoot } from 'reka-ui';",
			errors: [error('PaginationRoot')],
		},
		{
			name: 'named re-export',
			code: "export { PaginationRoot } from 'reka-ui';",
			errors: [error('PaginationRoot')],
		},
		{
			name: 'aliased re-export — flagged by the source-module name',
			code: "export { PaginationRoot as Root } from 'reka-ui';",
			errors: [error('PaginationRoot')],
		},
		{
			name: 'type-only pagination import',
			code: "import type { PaginationRootProps } from 'reka-ui';",
			errors: [error('PaginationRootProps')],
		},
		{
			name: 'pagination import outside the wrapper, even under a Pagination folder',
			code: "import { PaginationRoot } from 'reka-ui';",
			filename: '/repo/packages/frontend/editor-ui/src/components/Pagination/Foo.ts',
			errors: [error('PaginationRoot')],
		},
		{
			name: 'pagination import from a sibling v2 component',
			code: "import { PaginationList } from 'reka-ui';",
			filename: '/repo/packages/frontend/@n8n/design-system/src/v2/components/Select/Select.vue',
			errors: [error('PaginationList')],
		},
	],
});
