import { ESLintUtils } from '@typescript-eslint/utils';

const NON_RUNTIME_FILE =
	/(\.(test|spec)\.ts$)|([\\/]__tests__[\\/])|([\\/]test[\\/])|([\\/]backend-test-utils[\\/])/;

// A database migration owns its table, so it writes entities directly. Only those
// directories are exempt: `cli/src/modules/breaking-changes/migrations` holds node
// migrations, which are runtime code that rewrites workflow content.
const DATABASE_MIGRATION_FILE = /[\\/](?:db[\\/]src|database)[\\/]migrations[\\/]/;
const WRITE_METHODS = new Set(['save', 'insert', 'upsert']);

export type SealedEntityWriteConfig = {
	/** The entity class the seal governs, e.g. `WorkflowEntity`. */
	entityName: string;
	/** The table behind it, to catch a write built as raw SQL. */
	tableName: string;
	/** The repository that owns the token-gated write methods, e.g. `WorkflowRepository`. */
	repositoryName: string;
	/** The repository under any injected name. Anchor it so siblings stay out. */
	repositoryReceiver: RegExp;
	/** The one file allowed to write the table directly. */
	repositoryFile: RegExp;
	/** The one payload key the policy check reads, e.g. `nodes`. */
	policedKey: string;
	/** `meta.docs.description`. */
	description: string;
	/** The report message. */
	message: string;
};

type SyntaxNode = {
	type: string;
	name?: string;
	value?: unknown;
	computed?: boolean;
	property?: SyntaxNode;
	object?: SyntaxNode;
	expression?: SyntaxNode;
	callee?: SyntaxNode;
	arguments?: SyntaxNode[];
	properties?: Array<{
		type: string;
		computed?: boolean;
		key?: SyntaxNode;
	}>;
};

const unwrapChain = (node: SyntaxNode): SyntaxNode =>
	node.type === 'ChainExpression' && node.expression ? node.expression : node;

const memberName = (node: SyntaxNode) => {
	if (!node.property) return undefined;
	if (!node.computed && node.property.type === 'Identifier') return node.property.name;
	if (
		node.computed &&
		node.property.type === 'Literal' &&
		typeof node.property.value === 'string'
	) {
		return node.property.value;
	}
	return undefined;
};

/**
 * Builds a rule that routes one entity's content writes through its policy-cleared
 * repository methods. Purely syntactic, so Oxlint can execute it as a jsPlugin rule:
 * a hoisted payload, an aliased receiver and a target built at runtime all stay out of
 * reach. The `assertClearedFor` gate in the repository is the enforcing half.
 */
export const createUnsealedEntityWriteRule = (config: SealedEntityWriteConfig) => {
	const {
		entityName,
		tableName,
		repositoryName,
		repositoryReceiver,
		repositoryFile,
		policedKey,
		description,
		message,
	} = config;

	const rawWrite = new RegExp(
		`\\b(?:UPDATE|INSERT\\s+INTO)\\s+(?:(?:"?\\w+"?)\\s*\\.\\s*)?["'\`]?\\w*${tableName}["'\`]?(?=\\s|\\(|$)`,
		'i',
	);

	const targetsEntity = (node: SyntaxNode | undefined) =>
		node !== undefined &&
		((node.type === 'Identifier' && node.name === entityName) ||
			(node.type === 'Literal' && (node.value === entityName || node.value === tableName)));

	const targetsRepositoryClass = (node: SyntaxNode | undefined) =>
		node?.type === 'Identifier' && node.name === repositoryName;

	const isRepository = (node: SyntaxNode): boolean => {
		const target = unwrapChain(node);
		if (target.type === 'Identifier') return repositoryReceiver.test(target.name ?? '');
		if (target.type === 'MemberExpression') {
			return repositoryReceiver.test(memberName(target) ?? '');
		}
		if (target.type !== 'CallExpression' || !target.callee) return false;
		const callee = unwrapChain(target.callee);
		return (
			callee.type === 'MemberExpression' &&
			((memberName(callee) === 'get' && targetsRepositoryClass(target.arguments?.[0])) ||
				(memberName(callee) === 'getRepository' && targetsEntity(target.arguments?.[0])))
		);
	};

	const hasPolicedKey = (node: SyntaxNode) =>
		node.type === 'ObjectExpression' &&
		(node.properties ?? []).some((property) => {
			if (property.type === 'SpreadElement' || !property.key) return false;
			if (!property.computed && property.key.type === 'Identifier') {
				return property.key.name === policedKey;
			}
			return property.key.type === 'Literal' && property.key.value === policedKey;
		});

	const isEntityQueryBuilder = (node: SyntaxNode): boolean => {
		const call = unwrapChain(node);
		if (call.type !== 'CallExpression' || !call.callee) return false;
		const callee = unwrapChain(call.callee);
		if (callee.type !== 'MemberExpression' || !callee.object) return false;
		const method = memberName(callee);
		if (method === 'createQueryBuilder') return isRepository(callee.object);
		if (method !== 'update') return false;
		return (
			targetsEntity(call.arguments?.[0]) ||
			(call.arguments?.length === 0 && isEntityQueryBuilder(callee.object))
		);
	};

	const entityTypeArgument = new RegExp(`<[^>]*\\b${entityName}\\b[^>]*>`);
	const updateTypeArgument = new RegExp(`update\\s*<[^>]*\\b${entityName}\\b[^>]*>`);

	return ESLintUtils.RuleCreator.withoutDocs({
		meta: {
			type: 'problem',
			docs: { description },
			messages: { unsealedWrite: message },
			schema: [],
		},
		defaultOptions: [],
		create(context) {
			if (
				NON_RUNTIME_FILE.test(context.filename) ||
				DATABASE_MIGRATION_FILE.test(context.filename) ||
				repositoryFile.test(context.filename)
			) {
				return {};
			}

			return {
				CallExpression(node) {
					const callee = unwrapChain(node.callee as never);
					if (callee.type !== 'MemberExpression' || !callee.object) return;
					const method = memberName(callee);
					if (!method) return;

					if (WRITE_METHODS.has(method) && isRepository(callee.object)) {
						context.report({ node, messageId: 'unsealedWrite' });
						return;
					}

					const secondArgument = node.arguments[1];
					if (
						method === 'update' &&
						isRepository(callee.object) &&
						secondArgument !== undefined &&
						secondArgument.type !== 'SpreadElement' &&
						hasPolicedKey(secondArgument as never)
					) {
						context.report({ node, messageId: 'unsealedWrite' });
						return;
					}

					// Only the text between the callee and its arguments is the type argument list.
					// Cutting the whole call at the first `(` stops inside a receiver such as
					// `container.get(dataSource)`, which hides the type argument.
					const callText = context.sourceCode.getText(node);
					const calleeText = context.sourceCode.getText(callee as never);
					const afterCallee = callText.startsWith(calleeText)
						? callText.slice(calleeText.length)
						: callText;
					const hasEntityTypeArgument = entityTypeArgument.test(afterCallee.split('(', 1)[0]);
					const explicitEntityTarget = targetsEntity(node.arguments[0] as never);
					const updatePayload = explicitEntityTarget ? node.arguments[2] : node.arguments[1];
					if (
						method === 'update' &&
						(explicitEntityTarget || hasEntityTypeArgument) &&
						updatePayload !== undefined &&
						updatePayload.type !== 'SpreadElement' &&
						hasPolicedKey(updatePayload as never)
					) {
						context.report({ node, messageId: 'unsealedWrite' });
						return;
					}

					const queryBuilderText = callee.object
						? context.sourceCode.getText(callee.object as never)
						: '';
					if (
						method === 'set' &&
						node.arguments[0]?.type !== 'SpreadElement' &&
						hasPolicedKey(node.arguments[0] as never) &&
						(isEntityQueryBuilder(callee.object) || updateTypeArgument.test(queryBuilderText))
					) {
						context.report({ node, messageId: 'unsealedWrite' });
						return;
					}

					if (
						WRITE_METHODS.has(method) &&
						node.arguments[0]?.type !== 'SpreadElement' &&
						targetsEntity(node.arguments[0] as never)
					) {
						context.report({ node, messageId: 'unsealedWrite' });
						return;
					}

					if (
						method === 'into' &&
						node.arguments[0]?.type !== 'SpreadElement' &&
						targetsEntity(node.arguments[0] as never)
					) {
						context.report({ node, messageId: 'unsealedWrite' });
						return;
					}

					for (const argument of node.arguments) {
						if (
							argument.type === 'Literal' &&
							typeof argument.value === 'string' &&
							rawWrite.test(argument.value)
						) {
							context.report({ node: argument, messageId: 'unsealedWrite' });
						}
						if (
							argument.type === 'TemplateLiteral' &&
							rawWrite.test(
								argument.quasis.map((quasi) => quasi.value.cooked ?? quasi.value.raw).join(''),
							)
						) {
							context.report({ node: argument, messageId: 'unsealedWrite' });
						}
					}
				},
			};
		},
	});
};
