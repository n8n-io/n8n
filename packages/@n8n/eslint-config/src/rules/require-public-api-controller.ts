import { ESLintUtils } from '@typescript-eslint/utils';

/**
 * New public API endpoints must be written as `@PublicApiController` classes
 * (see the reference `TagsPublicController`), not the legacy
 * `express-openapi-validator` tuple module that ends in `export = handlers`.
 *
 * `export =` (`TSExportAssignment`) is the unambiguous marker of the old style —
 * controllers use `export class ... @PublicApiController(...)` and never
 * `export =`. Scoped to `*.handler.ts` files via the `files` glob in
 * `packages/cli/eslint.config.mjs`. Legacy handlers pending migration to
 * controllers (API-70) are baselined in the allowlist there.
 */
export const RequirePublicApiControllerRule = ESLintUtils.RuleCreator.withoutDocs({
	meta: {
		type: 'problem',
		docs: {
			description: 'Require public API endpoints to use the `@PublicApiController` class pattern.',
		},
		messages: {
			useController:
				'New public API endpoints must be an `@PublicApiController` class, not an `export =` handler tuple. See the reference `TagsPublicController`.',
		},
		schema: [],
	},
	defaultOptions: [],
	create(context) {
		return {
			TSExportAssignment(node) {
				context.report({ node, messageId: 'useController' });
			},
		};
	},
});
