import { RuleTester } from '@typescript-eslint/rule-tester';
import { MisplacedN8nTypeormImportRule } from './misplaced-n8n-typeorm-import.js';

const ruleTester = new RuleTester();

ruleTester.run('misplaced-n8n-typeorm-import', MisplacedN8nTypeormImportRule, {
	valid: [
		// Persistence layer (path contains `@n8n/db`) may import TypeORM freely.
		{
			code: "import { In } from '@n8n/typeorm';",
			filename: '/repo/packages/@n8n/db/src/repositories/foo.repository.ts',
		},
		{
			code: "import { In } from '@n8n/db';",
			filename: '/repo/packages/@n8n/db/src/index.ts',
		},
		// Sanctioned `@n8n/db` exports are not TypeORM re-exports.
		{
			code: "import { TransactionRunner, WorkflowRepository, type User } from '@n8n/db';",
			filename: '/repo/packages/cli/src/services/foo.service.ts',
		},
		// Unrelated imports are ignored.
		{
			code: "import { something } from 'other-package';",
			filename: '/repo/packages/cli/src/services/foo.service.ts',
		},
	],
	invalid: [
		// Direct `@n8n/typeorm` import in business logic.
		{
			code: "import { In } from '@n8n/typeorm';",
			filename: '/repo/packages/cli/src/services/foo.service.ts',
			errors: [{ messageId: 'moveImport' }],
		},
		// Subpath import.
		{
			code: "import { Foo } from '@n8n/typeorm/browser';",
			filename: '/repo/packages/cli/src/services/foo.service.ts',
			errors: [{ messageId: 'moveImport' }],
		},
		// Relabeled operator import from `@n8n/db` — one error per guarded symbol.
		{
			code: "import { In, Not, WorkflowRepository } from '@n8n/db';",
			filename: '/repo/packages/cli/src/services/foo.service.ts',
			errors: [
				{ messageId: 'noTypeormViaDb', data: { name: 'In' } },
				{ messageId: 'noTypeormViaDb', data: { name: 'Not' } },
			],
		},
		// Type-only relabel is still the anti-pattern.
		{
			code: "import type { FindOptionsWhere, EntityManager } from '@n8n/db';",
			filename: '/repo/packages/cli/src/services/foo.service.ts',
			errors: [
				{ messageId: 'noTypeormViaDb', data: { name: 'FindOptionsWhere' } },
				{ messageId: 'noTypeormViaDb', data: { name: 'EntityManager' } },
			],
		},
	],
});
