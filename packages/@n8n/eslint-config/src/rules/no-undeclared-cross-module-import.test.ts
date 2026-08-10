import { RuleTester } from '@typescript-eslint/rule-tester';
import { NoUndeclaredCrossModuleImportRule } from './no-undeclared-cross-module-import.js';

const ruleTester = new RuleTester();

const moduleFile = '/repo/packages/cli/src/modules/data-table/data-table.service.ts';
const coreFile = '/repo/packages/cli/src/services/foo.service.ts';

ruleTester.run('no-undeclared-cross-module-import', NoUndeclaredCrossModuleImportRule, {
	valid: [
		// Declared edge.
		{
			code: "import { FavoritesService } from '@/modules/favorites/favorites.service';",
			filename: moduleFile,
			options: [{ allowedDependencies: { 'data-table': ['favorites'] } }],
		},
		// Same-module deep relative import.
		{
			code: "import { sqlUtils } from '../../modules/data-table/utils/sql-utils';",
			filename: '/repo/packages/cli/src/modules/data-table/nested/deep/foo.ts',
		},
		// Module importing core is fine.
		{
			code: "import { UrlService } from '@/services/url.service';",
			filename: moduleFile,
		},
		{
			code: "import { UrlService } from '../../services/url.service';",
			filename: moduleFile,
		},
		// Bare package specifiers are ignored.
		{
			code: "import { Service } from '@n8n/di';",
			filename: moduleFile,
		},
		// Core importing core.
		{
			code: "import { Push } from '@/push';",
			filename: coreFile,
		},
		// Files outside packages/cli/src are ignored.
		{
			code: "import { foo } from '@/modules/favorites/favorites.service';",
			filename: '/repo/packages/cli/test/integration/foo.test.ts',
		},
	],
	invalid: [
		// Alias import into another module without a declared edge.
		{
			code: "import { FavoritesService } from '@/modules/favorites/favorites.service';",
			filename: moduleFile,
			errors: [
				{
					messageId: 'undeclaredDependency',
					data: { from: 'data-table', to: 'favorites' },
				},
			],
		},
		// Edge declared for a different target module does not cover it.
		{
			code: "import { McpService } from '@/modules/mcp/mcp.service';",
			filename: moduleFile,
			options: [{ allowedDependencies: { 'data-table': ['favorites'] } }],
			errors: [{ messageId: 'undeclaredDependency', data: { from: 'data-table', to: 'mcp' } }],
		},
		// Relative import escaping into a sibling module.
		{
			code: "import { FavoritesService } from '../favorites/favorites.service';",
			filename: moduleFile,
			errors: [
				{
					messageId: 'undeclaredDependency',
					data: { from: 'data-table', to: 'favorites' },
				},
			],
		},
		// `.ee` suffix is part of the module name.
		{
			code: "import { SourceControlService } from '@/modules/source-control.ee/source-control.service.ee';",
			filename: moduleFile,
			errors: [
				{
					messageId: 'undeclaredDependency',
					data: { from: 'data-table', to: 'source-control.ee' },
				},
			],
		},
		// Core file importing a module.
		{
			code: "import { DataTableService } from '@/modules/data-table/data-table.service';",
			filename: coreFile,
			errors: [{ messageId: 'coreImportsModule', data: { to: 'data-table' } }],
		},
		// Dynamic import of a compiled `.js` path (module init pattern).
		{
			code: "await import('@/modules/favorites/favorite-resource-resolver.registry.js');",
			filename: moduleFile,
			errors: [
				{
					messageId: 'undeclaredDependency',
					data: { from: 'data-table', to: 'favorites' },
				},
			],
		},
		// Type-only imports are still coupling.
		{
			code: "import type { FavoritesService } from '@/modules/favorites/favorites.service';",
			filename: moduleFile,
			errors: [
				{
					messageId: 'undeclaredDependency',
					data: { from: 'data-table', to: 'favorites' },
				},
			],
		},
		// Re-exporting from another module.
		{
			code: "export { FavoritesService } from '@/modules/favorites/favorites.service';",
			filename: moduleFile,
			errors: [
				{
					messageId: 'undeclaredDependency',
					data: { from: 'data-table', to: 'favorites' },
				},
			],
		},
		{
			code: "export * from '../favorites/favorites.service';",
			filename: moduleFile,
			errors: [
				{
					messageId: 'undeclaredDependency',
					data: { from: 'data-table', to: 'favorites' },
				},
			],
		},
	],
});
