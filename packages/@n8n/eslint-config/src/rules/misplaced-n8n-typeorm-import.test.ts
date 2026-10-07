import { RuleTester } from '@typescript-eslint/rule-tester';
import { MisplacedN8nTypeormImportRule } from './misplaced-n8n-typeorm-import.js';

const ruleTester = new RuleTester();

ruleTester.run('misplaced-n8n-typeorm-import', MisplacedN8nTypeormImportRule, {
	valid: [
		// The @n8n/db package is the shared persistence layer.
		{
			code: "import { In } from '@n8n/typeorm';",
			filename: '/repo/packages/@n8n/db/src/repositories/foo.repository.ts',
		},
		{
			code: "import { In } from '@n8n/db';",
			filename: '/repo/packages/@n8n/db/src/index.ts',
		},
		// Entities can use any package-local layout and filename.
		{
			code: `
				import { Entity as OrmEntity, Column } from '@n8n/typeorm';
				@OrmEntity()
				export class AuditRecord { @Column() name: string; }
			`,
			filename: '/repo/packages/example/src/audit/model.ts',
			languageOptions: { parserOptions: { ecmaFeatures: { legacyDecorators: true } } },
		},
		// TypeORM repositories can be colocated with their domain.
		{
			code: `
				import { Repository as OrmRepository, In } from '@n8n/typeorm';
				export class AuditStore extends OrmRepository<AuditRecord> {}
			`,
			filename: '/repo/packages/example/src/audit/audit-store.ts',
		},
		// n8n BaseRepository declarations are persistence adapters too.
		{
			code: `
				import { BaseRepository } from '@n8n/db';
				import { In } from '@n8n/typeorm';
				export class AuditStore extends BaseRepository<AuditRecord> {}
			`,
			filename: '/repo/packages/example/src/persistence/audit-store.ts',
		},
		// Namespace imports support the same semantic declarations.
		{
			code: `
				import * as TypeOrm from '@n8n/typeorm';
				@TypeOrm.Entity()
				export class AuditRecord {}
			`,
			filename: '/repo/packages/example/src/audit/record.ts',
			languageOptions: { parserOptions: { ecmaFeatures: { legacyDecorators: true } } },
		},
		{
			code: `
				import * as TypeOrm from '@n8n/typeorm';
				export class AuditStore extends TypeOrm.Repository<AuditRecord> {}
			`,
			filename: '/repo/packages/example/src/audit/store.ts',
		},
		// Helper-only adapters, migrations, tests, and legacy names stay explicit and shrinkable.
		{
			code: "import { In } from '@n8n/typeorm';",
			filename: '/repo/packages/example/src/audit/query.helper.ts',
			options: [{ allowedFilePatterns: ['**/src/audit/query.helper.ts'] }],
		},
		{
			code: "import { QueryRunner } from '@n8n/typeorm';",
			filename: '/repo/packages/example/src/migrations/1710000000000-add-audit.ts',
			options: [{ allowedFilePatterns: ['**/src/migrations/*.ts'] }],
		},
		{
			code: "import { DataSource } from '@n8n/typeorm';",
			filename: '/repo/packages/example/src/audit/__tests__/audit.test.ts',
			options: [{ allowedFilePatterns: ['**/__tests__/**/*.ts'] }],
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
			filename: '/repo/packages/cli/src/database/foo.service.ts',
			errors: [{ messageId: 'moveImport' }],
		},
		// A semantic filename alone does not grant persistence access.
		{
			code: "import { In } from '@n8n/typeorm';",
			filename: '/repo/packages/cli/src/services/foo.repository.ts',
			errors: [{ messageId: 'moveImport' }],
		},
		// A package-level test exception does not allow production files in a nested test folder.
		{
			code: "import { In } from '@n8n/typeorm';",
			filename: '/repo/packages/cli/src/workflows/test/query.ts',
			options: [{ allowedFilePatterns: ['**/packages/cli/test/**/*.ts'] }],
			errors: [{ messageId: 'moveImport' }],
		},
		// Importing a persistence class does not make business logic a persistence adapter.
		{
			code: `
				import { In } from '@n8n/typeorm';
				import { WorkflowRepository } from '@n8n/db';
				export class WorkflowService {}
			`,
			filename: '/repo/packages/cli/src/workflows/workflow.service.ts',
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
		// Guarded re-exports remain prohibited even in a persistence-looking folder.
		{
			code: "import { In } from '@n8n/db';",
			filename: '/repo/packages/example/src/persistence/workflow.service.ts',
			errors: [{ messageId: 'noTypeormViaDb', data: { name: 'In' } }],
		},
		// Persistence adapters import TypeORM operators directly, not through @n8n/db.
		{
			code: `
				import { BaseRepository, In } from '@n8n/db';
				export class AuditStore extends BaseRepository<AuditRecord> {}
			`,
			filename: '/repo/packages/example/src/audit/store.ts',
			errors: [{ messageId: 'noTypeormViaDb', data: { name: 'In' } }],
		},
	],
});
