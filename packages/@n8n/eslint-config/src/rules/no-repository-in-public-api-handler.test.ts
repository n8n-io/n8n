import { RuleTester } from '@typescript-eslint/rule-tester';
import { NoRepositoryInPublicApiHandlerRule } from './no-repository-in-public-api-handler.js';

const ruleTester = new RuleTester();

ruleTester.run('no-repository-in-public-api-handler', NoRepositoryInPublicApiHandlerRule, {
	valid: [
		// Non-repository @n8n/db imports are legit (the reference controller uses these).
		{
			code: "import { type AuthenticatedRequest, type User, WorkflowEntity } from '@n8n/db';",
			filename: '/repo/packages/cli/src/public-api/v1/controllers/tags.public.controller.ts',
		},
		// Services are the sanctioned way to reach data.
		{
			code: 'const service = Container.get(TagService); await service.getPaginated({});',
			filename: '/repo/packages/cli/src/public-api/v1/handlers/tags/tags.handler.ts',
		},
		// `Container.get` on a non-repository is fine.
		{
			code: 'Container.get(SomeService);',
			filename: '/repo/packages/cli/src/public-api/v1/handlers/tags/tags.handler.ts',
		},
		// A member call that is not `Container.get` is ignored.
		{
			code: 'foo.get(WorkflowRepository);',
			filename: '/repo/packages/cli/src/public-api/v1/handlers/tags/tags.handler.ts',
		},
		// Repository-looking imports from a package other than `@n8n/db` are ignored.
		{
			code: "import { WorkflowRepository } from 'some-other-package';",
			filename: '/repo/packages/cli/src/public-api/v1/handlers/tags/tags.handler.ts',
		},
	],
	invalid: [
		// Repository import from @n8n/db — one error per repository specifier.
		{
			code: "import { WorkflowRepository, TagRepository, type User } from '@n8n/db';",
			filename: '/repo/packages/cli/src/public-api/v1/handlers/workflows/workflows.handler.ts',
			errors: [
				{ messageId: 'noRepositoryImport', data: { name: 'WorkflowRepository' } },
				{ messageId: 'noRepositoryImport', data: { name: 'TagRepository' } },
			],
		},
		// Container.get(...Repository).
		{
			code: 'const repo = Container.get(WorkflowRepository);',
			filename: '/repo/packages/cli/src/public-api/v1/handlers/workflows/workflows.handler.ts',
			errors: [{ messageId: 'noRepositoryContainerGet', data: { name: 'WorkflowRepository' } }],
		},
	],
});
