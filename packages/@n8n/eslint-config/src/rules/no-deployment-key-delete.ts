import { ESLintUtils, TSESTree } from '@typescript-eslint/utils';
import type * as ts from 'typescript';

const DELETE_METHODS = new Set(['delete', 'remove', 'softDelete', 'softRemove', 'clear']);

/** Methods that hand out an alternative surface over the entity. */
const ACCESS_METHODS = new Set(['getRepository', 'createQueryBuilder', 'from']);

/** The entity's class name and its table name, as entity targets. */
const ENTITY_NAMES = new Set(['DeploymentKey', 'deployment_key']);

/** Argument shapes that can never carry an entity-instance type. */
const NON_ENTITY_ARGUMENTS = new Set<TSESTree.AST_NODE_TYPES>([
	TSESTree.AST_NODE_TYPES.Literal,
	TSESTree.AST_NODE_TYPES.TemplateLiteral,
	TSESTree.AST_NODE_TYPES.ObjectExpression,
]);

/** Test files may clean up rows for setup/teardown. */
const TEST_FILE_PATTERN = /(\.(test|spec)\.ts$)|([\\/]__tests__[\\/])|([\\/]test[\\/])/;

/** The repository itself legitimately uses `tx.getRepository(DeploymentKey)`. */
const OWN_REPOSITORY_FILE = /[\\/]deployment-key\.repository\.ts$/;

export const NoDeploymentKeyDeleteRule = ESLintUtils.RuleCreator.withoutDocs({
	meta: {
		type: 'problem',
		docs: {
			description:
				'Disallow deleting deployment keys, and disallow reaching the deployment_key entity through surfaces that would allow it. Old ciphertext stays decryptable only while every key row survives — keys are deactivated, never deleted.',
		},
		messages: {
			noDelete:
				'Never delete deployment keys: data encrypted with a key becomes unreadable without it. Deactivate the key instead (`markInactive`).',
			noAlternativeSurface:
				'Do not reach the deployment_key entity through `{{method}}` — it bypasses the delete lockdown. Go through `DeploymentKeyRepository`.',
		},
		schema: [],
	},
	defaultOptions: [],
	create(context) {
		if (TEST_FILE_PATTERN.test(context.filename)) return {};
		const isOwnRepositoryFile = OWN_REPOSITORY_FILE.test(context.filename);

		/** Identifier `DeploymentKey`, or the entity/table name as a string target. */
		const namesEntity = (node: TSESTree.Node | undefined): boolean => {
			if (node === undefined) return false;
			if (node.type === TSESTree.AST_NODE_TYPES.Identifier) {
				return node.name === 'DeploymentKey';
			}
			return (
				node.type === TSESTree.AST_NODE_TYPES.Literal &&
				typeof node.value === 'string' &&
				ENTITY_NAMES.has(node.value)
			);
		};

		/** True when the type of `node` is (an array of) the DeploymentKey entity. */
		const isDeploymentKeyTyped = (node: TSESTree.Node): boolean => {
			const services = ESLintUtils.getParserServices(context);
			const type = services.getTypeAtLocation(node);
			const symbolName = (type.getSymbol() ?? type.aliasSymbol)?.getName();
			if (symbolName === 'DeploymentKey') return true;
			const elementSymbol = type.getNumberIndexType?.()?.getSymbol();
			return elementSymbol?.getName() === 'DeploymentKey';
		};

		/**
		 * The concrete repository by name, or TypeORM's generic `Repository`
		 * instantiated for the entity (`Repository<DeploymentKey>`, e.g. from
		 * `getRepository(...)` results stored behind an annotation).
		 */
		const isDeploymentKeyRepository = (type: ts.Type): boolean => {
			const symbolName = (type.getSymbol() ?? type.aliasSymbol)?.getName();
			if (symbolName === 'DeploymentKeyRepository') return true;
			if (symbolName !== 'Repository') return false;
			const typeArguments = (type as ts.TypeReference).typeArguments ?? [];
			return typeArguments.some((arg) => arg.getSymbol()?.getName() === 'DeploymentKey');
		};

		return {
			CallExpression(node) {
				const callee =
					node.callee.type === TSESTree.AST_NODE_TYPES.ChainExpression
						? node.callee.expression
						: node.callee;
				if (callee.type !== TSESTree.AST_NODE_TYPES.MemberExpression) return;

				const { property } = callee;
				let method: string | null = null;
				if (!callee.computed && property.type === TSESTree.AST_NODE_TYPES.Identifier) {
					method = property.name;
				} else if (
					callee.computed &&
					property.type === TSESTree.AST_NODE_TYPES.Literal &&
					typeof property.value === 'string'
				) {
					method = property.value;
				}
				if (method === null) return;

				const [firstArg] = node.arguments;

				// Alternative surfaces over the entity bypass the repository's
				// delete lockdown: tx.getRepository(DeploymentKey).delete(…),
				// qb.delete().from(DeploymentKey), createQueryBuilder(DeploymentKey, …)
				// — by identifier or by entity/table name string.
				if (ACCESS_METHODS.has(method)) {
					if (namesEntity(firstArg) && !isOwnRepositoryFile) {
						context.report({ node: property, messageId: 'noAlternativeSurface', data: { method } });
					}
					return;
				}

				if (!DELETE_METHODS.has(method)) return;

				// Entity-manager form: tx.delete(DeploymentKey, …) / tx.delete('deployment_key', …).
				if (namesEntity(firstArg)) {
					context.report({ node: property, messageId: 'noDelete' });
					return;
				}

				// Typed entity instances in any argument position, whatever the
				// expression shape (identifier, member, call result, await, array).
				for (const argument of node.arguments) {
					if (NON_ENTITY_ARGUMENTS.has(argument.type)) continue;
					const target =
						argument.type === TSESTree.AST_NODE_TYPES.SpreadElement ? argument.argument : argument;
					if (isDeploymentKeyTyped(target)) {
						context.report({ node: property, messageId: 'noDelete' });
						return;
					}
				}

				// Repository form: the concrete repository or Repository<DeploymentKey>.
				const services = ESLintUtils.getParserServices(context);
				const receiverType = services.getTypeAtLocation(callee.object);
				if (!isDeploymentKeyRepository(receiverType)) return;

				context.report({ node: property, messageId: 'noDelete' });
			},
		};
	},
});
