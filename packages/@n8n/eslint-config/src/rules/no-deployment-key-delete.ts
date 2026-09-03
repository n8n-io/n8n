import { ESLintUtils, TSESTree } from '@typescript-eslint/utils';

const DELETE_METHODS = new Set(['delete', 'remove', 'softDelete', 'softRemove', 'clear']);

/** Methods that hand out an alternative surface over the entity. */
const ACCESS_METHODS = new Set(['getRepository', 'createQueryBuilder', 'from']);

/**
 * Cheap prefilter before the type checker: repository-instance receivers by
 * naming convention, or anything that names the entity outright. Deletes that
 * name the entity (as the first argument or as a typed entity instance) are
 * caught by the argument checks regardless of the receiver.
 */
const RECEIVER_PREFILTER = /eposito|DeploymentKey/;

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

		/** True when the type of `node` is (an array of) the DeploymentKey entity. */
		const isDeploymentKeyTyped = (node: TSESTree.Node): boolean => {
			const services = ESLintUtils.getParserServices(context);
			const type = services.getTypeAtLocation(node);
			const symbolName = (type.getSymbol() ?? type.aliasSymbol)?.getName();
			if (symbolName === 'DeploymentKey') return true;
			const elementSymbol = type.getNumberIndexType?.()?.getSymbol();
			return elementSymbol?.getName() === 'DeploymentKey';
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
				const firstArgIsEntityIdentifier =
					firstArg?.type === TSESTree.AST_NODE_TYPES.Identifier &&
					firstArg.name === 'DeploymentKey';

				// Alternative surfaces over the entity bypass the repository's
				// delete lockdown: tx.getRepository(DeploymentKey).delete(…),
				// qb.delete().from(DeploymentKey), createQueryBuilder(DeploymentKey, …).
				if (ACCESS_METHODS.has(method)) {
					if (firstArgIsEntityIdentifier && !isOwnRepositoryFile) {
						context.report({ node: property, messageId: 'noAlternativeSurface', data: { method } });
					}
					return;
				}

				if (!DELETE_METHODS.has(method)) return;

				// Entity-manager form: tx.delete(DeploymentKey, …), or a typed entity
				// instance: manager.remove(deploymentKey) / softRemove(keys).
				if (firstArgIsEntityIdentifier) {
					context.report({ node: property, messageId: 'noDelete' });
					return;
				}
				// Only references can carry an entity-instance type; literals and
				// object/array expressions never do, so skip the checker for them.
				if (
					firstArg !== undefined &&
					(firstArg.type === TSESTree.AST_NODE_TYPES.Identifier ||
						firstArg.type === TSESTree.AST_NODE_TYPES.MemberExpression) &&
					isDeploymentKeyTyped(firstArg)
				) {
					context.report({ node: property, messageId: 'noDelete' });
					return;
				}

				// Repository form: <DeploymentKeyRepository instance>.delete(…)
				const receiverText = context.sourceCode.getText(callee.object);
				if (!RECEIVER_PREFILTER.test(receiverText)) return;

				const services = ESLintUtils.getParserServices(context);
				const receiverType = services.getTypeAtLocation(callee.object);
				const symbolName = (receiverType.getSymbol() ?? receiverType.aliasSymbol)?.getName();
				if (symbolName !== 'DeploymentKeyRepository') return;

				context.report({ node: property, messageId: 'noDelete' });
			},
		};
	},
});
