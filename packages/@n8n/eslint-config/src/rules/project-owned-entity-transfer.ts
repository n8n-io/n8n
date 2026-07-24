import { ESLintUtils, TSESTree } from '@typescript-eslint/utils';

const RELATION_DECORATORS = new Set(['ManyToOne', 'OneToOne', 'ManyToMany']);

function isEntityClass(node: TSESTree.ClassDeclaration): boolean {
	return node.decorators.some(
		(decorator) =>
			decorator.expression.type === TSESTree.AST_NODE_TYPES.CallExpression &&
			decorator.expression.callee.type === TSESTree.AST_NODE_TYPES.Identifier &&
			decorator.expression.callee.name === 'Entity',
	);
}

function referencesProject(decorator: TSESTree.Decorator): boolean {
	const { expression } = decorator;
	if (
		expression.type !== TSESTree.AST_NODE_TYPES.CallExpression ||
		expression.callee.type !== TSESTree.AST_NODE_TYPES.Identifier ||
		!RELATION_DECORATORS.has(expression.callee.name)
	) {
		return false;
	}
	const [firstArg] = expression.arguments;
	if (!firstArg) return false;
	// @ManyToOne(() => Project, ...)
	if (
		firstArg.type === TSESTree.AST_NODE_TYPES.ArrowFunctionExpression &&
		firstArg.body.type === TSESTree.AST_NODE_TYPES.Identifier &&
		firstArg.body.name === 'Project'
	) {
		return true;
	}
	// @ManyToOne('Project', ...)
	return firstArg.type === TSESTree.AST_NODE_TYPES.Literal && firstArg.value === 'Project';
}

function isProjectOwned(node: TSESTree.ClassDeclaration): boolean {
	return node.body.body.some((member) => {
		if (member.type !== TSESTree.AST_NODE_TYPES.PropertyDefinition) return false;
		if (member.key.type === TSESTree.AST_NODE_TYPES.Identifier && member.key.name === 'projectId') {
			return true;
		}
		return member.decorators.some(referencesProject);
	});
}

export interface AcknowledgedEntity {
	name: string;
	/** Repo-relative path of the file that is allowed to declare this entity */
	path: string;
}

const toPosix = (value: string) => value.replace(/\\/g, '/');

/**
 * Flags every project-owned entity that has no entry in the ownership-transfer
 * manifest (`packages/cli/src/services/ownership-transfer/ownership-transfer.manifest.json`). The
 * manifest is the single source of truth for how each project-owned resource
 * is handled on ownership transfer; the eslint configs feed its entries into
 * this rule via the `acknowledged` option. Each entry is pinned to its
 * declaring file, so a same-named entity in another file is not acknowledged.
 */
export const ProjectOwnedEntityTransferRule = ESLintUtils.RuleCreator.withoutDocs({
	meta: {
		type: 'problem',
		docs: {
			description:
				'Require every project-owned entity to record an explicit decision about how it is handled when a project’s resources are transferred to another owner (user deletion with transfer, LDAP reset). Prevents silently dropping user data when a new resource type is added.',
		},
		messages: {
			missingTransferDecision:
				'Entity `{{ name }}` belongs to a Project, but has no entry in `packages/cli/src/services/ownership-transfer/ownership-transfer.manifest.json`. Decide how it is handled when a project’s resources are transferred: handle it in `OwnershipTransferService.transferAllResources()` and add it to `transferred`, or consciously add it to `notTransferred` with the reason.',
			pathMismatch:
				'Entity `{{ name }}` is listed in `packages/cli/src/services/ownership-transfer/ownership-transfer.manifest.json` with path `{{ expectedPath }}`, but is declared in `{{ actualPath }}`. Update the manifest `path` if the file moved, or add a separate entry if this is a different entity with the same name.',
		},
		schema: [
			{
				type: 'object',
				properties: {
					acknowledged: {
						type: 'array',
						items: {
							type: 'object',
							properties: {
								name: { type: 'string' },
								path: { type: 'string' },
							},
							required: ['name', 'path'],
							additionalProperties: false,
						},
						description:
							'Entities listed in the ownership-transfer manifest, pinned to their declaring file',
					},
				},
				additionalProperties: false,
			},
		],
	},
	defaultOptions: [{ acknowledged: [] as AcknowledgedEntity[] }],
	create(context, [{ acknowledged }]) {
		const acknowledgedByName = new Map(acknowledged.map((entry) => [entry.name, entry]));
		return {
			ClassDeclaration(node) {
				if (!isEntityClass(node) || !isProjectOwned(node)) return;
				const name = node.id?.name;
				if (!name || name === 'Project') return;

				const entry = acknowledgedByName.get(name);
				if (!entry) {
					context.report({
						node: node.id ?? node,
						messageId: 'missingTransferDecision',
						data: { name },
					});
					return;
				}

				const actualPath = toPosix(context.filename);
				if (!actualPath.endsWith(toPosix(entry.path))) {
					context.report({
						node: node.id ?? node,
						messageId: 'pathMismatch',
						data: { name, expectedPath: entry.path, actualPath },
					});
				}
			},
		};
	},
});
