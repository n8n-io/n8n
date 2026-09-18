import { AST_NODE_TYPES, ESLintUtils, type TSESTree } from '@typescript-eslint/utils';
import ts from 'typescript';

// Content writes only. `delete`/`remove`/`softDelete`/`recover` change a row's existence,
// not its content, so a content seal does not govern them.
const ENTITY_WRITE_METHODS = new Set(['save', 'insert', 'upsert']);
const CHECKED_METHODS = new Set([...ENTITY_WRITE_METHODS, 'update', 'into', 'query']);

/** Tests, fixtures and test utilities write entities for setup; a seal governs runtime code. */
const NON_RUNTIME_FILE =
	/(\.test\.ts$|\.spec\.ts$|[\\/]__tests__[\\/]|[\\/]packages[\\/](@n8n[\\/])?[^\\/]+[\\/]test[\\/]|[\\/]backend-test-utils[\\/])/;

export type SealedEntityWriteConfig = {
	/** The entity class the seal governs, e.g. `WorkflowEntity`. */
	entityName: string;
	/** The repository that owns the token-gated write methods, e.g. `WorkflowRepository`. */
	repositoryName: string;
	/** A sealed method to name in the report, e.g. `updateContent`. */
	sealedMethod: string;
	/**
	 * Matches the repository under any injected name (`workflowRepo`,
	 * `workflowsRepository`, …). Anchor it so siblings stay out.
	 */
	receiverPattern: RegExp;
	/** The one payload key the policy check reads, e.g. `nodes`. */
	policedKey: string;
	/** Files that may write the table directly: the sealed repository and migrations. */
	persistenceFile: RegExp;
	/** The table name, to catch a write built as raw SQL. */
	tableName: string;
	/** A narrow payload type to suggest, e.g. `Pick<WorkflowEntity, "active">`. */
	narrowExample: string;
};

type TypeServices = {
	checker: ts.TypeChecker;
	typeOf: (node: TSESTree.Node) => ts.Type;
};

type PayloadVerdict = 'policed' | 'opaque' | 'clean';

const memberName = (member: TSESTree.MemberExpression): string | undefined => {
	if (!member.computed && member.property.type === AST_NODE_TYPES.Identifier) {
		return member.property.name;
	}
	if (
		member.computed &&
		member.property.type === AST_NODE_TYPES.Literal &&
		typeof member.property.value === 'string'
	) {
		return member.property.value;
	}
	return undefined;
};

const receiverName = (node: TSESTree.Node): string | undefined => {
	if (node.type === AST_NODE_TYPES.Identifier) return node.name;
	if (node.type === AST_NODE_TYPES.MemberExpression) return memberName(node);
	return undefined;
};

const stringValue = (node: TSESTree.Node | undefined): string | undefined => {
	if (node?.type === AST_NODE_TYPES.Literal && typeof node.value === 'string') return node.value;
	if (node?.type === AST_NODE_TYPES.TemplateLiteral) {
		return node.quasis.map((q) => q.value.cooked ?? '').join(' ');
	}
	return undefined;
};

const isTypeReference = (type: ts.Type): type is ts.TypeReference =>
	'target' in type && typeof type.target === 'object';

// Keeps the narrowing local: an inline `isTypeParameter()` guard leaves the else-branch `never`.
const asTypeParameter = (type: ts.Type): ts.TypeParameter | undefined =>
	type.isTypeParameter() ? type : undefined;

/**
 * True for the entity itself, its repository, or any generic over the entity
 * (`Repository<WorkflowEntity>`, a query builder, a subclass of either).
 */
const refersToEntity = (
	type: ts.Type,
	checker: ts.TypeChecker,
	symbols: Set<string>,
	seen = new Set<ts.Type>(),
): boolean => {
	if (seen.has(type)) return false;
	seen.add(type);

	if (type.isUnionOrIntersection()) {
		return type.types.some((t) => refersToEntity(t, checker, symbols, seen));
	}

	const name = (type.getSymbol() ?? type.aliasSymbol)?.getName();
	if (name !== undefined && symbols.has(name)) return true;

	// A generic helper over `T extends WorkflowEntity` still writes the entity.
	const constraint = asTypeParameter(type)?.getConstraint();
	if (constraint !== undefined) return refersToEntity(constraint, checker, symbols, seen);

	const typeArguments = [
		...(type.aliasTypeArguments ?? []),
		...(isTypeReference(type) ? checker.getTypeArguments(type) : []),
	];
	if (typeArguments.some((t) => refersToEntity(t, checker, symbols, seen))) return true;

	const target = isTypeReference(type) ? type.target : type;
	if (target.isClassOrInterface()) {
		return checker.getBaseTypes(target).some((t) => refersToEntity(t, checker, symbols, seen));
	}
	return false;
};

// `any`/`unknown` could carry the policed key, and an optional one (a wide partial type)
// might; the seal treats both as opaque rather than clean.
const payloadTypeVerdict = (type: ts.Type, policedKey: string): PayloadVerdict => {
	if (type.isUnionOrIntersection()) {
		const verdicts = type.types.map((t) => payloadTypeVerdict(t, policedKey));
		if (verdicts.includes('policed')) return 'policed';
		return verdicts.includes('opaque') ? 'opaque' : 'clean';
	}
	if (type.flags & (ts.TypeFlags.Any | ts.TypeFlags.Unknown)) return 'opaque';
	// An index signature (`Record<string, unknown>`) carries the key without declaring it.
	if (type.getStringIndexType() !== undefined) return 'opaque';
	const parameter = asTypeParameter(type);
	if (parameter) {
		const constraint = parameter.getConstraint();
		return constraint === undefined ? 'opaque' : payloadTypeVerdict(constraint, policedKey);
	}
	const policed = type.getProperty(policedKey);
	if (policed === undefined) return 'clean';
	return policed.flags & ts.SymbolFlags.Optional ? 'opaque' : 'policed';
};

// A computed key is only knowable when its type pins it to literals.
const computedKeyVerdict = (type: ts.Type, policedKey: string): PayloadVerdict => {
	if (type.isUnion()) {
		const verdicts = type.types.map((t) => computedKeyVerdict(t, policedKey));
		if (verdicts.includes('policed')) return 'policed';
		return verdicts.includes('opaque') ? 'opaque' : 'clean';
	}
	if (type.isStringLiteral()) return type.value === policedKey ? 'policed' : 'clean';
	if (type.isNumberLiteral()) return 'clean';
	return 'opaque';
};

/** Finds the `.set(values)` chained after a query-builder `.update(...)`. */
const chainedSetPayload = (call: TSESTree.CallExpression): TSESTree.Node | undefined => {
	let current: TSESTree.Node = call;
	while (
		current.parent?.type === AST_NODE_TYPES.MemberExpression &&
		current.parent.object === current
	) {
		const member: TSESTree.MemberExpression = current.parent;
		const outer: TSESTree.Node | undefined = member.parent;
		if (outer?.type !== AST_NODE_TYPES.CallExpression || outer.callee !== member) return undefined;
		if (memberName(member) === 'set') return outer.arguments[0];
		current = outer;
	}
	return undefined;
};

/**
 * Builds a rule that seals one entity's content writes to the token-gated methods on its
 * repository. Type-aware where a program is available, with the syntactic name/literal
 * checks as a floor. Ceiling: SQL built from non-literal strings, and a repository
 * resolved from a runtime value (`getRepository(name)`), which types as `Repository<any>`.
 * The runtime `assertClearedFor` gate in the repository is the enforcing half.
 */
export const createUnsealedEntityWriteRule = (config: SealedEntityWriteConfig) => {
	const {
		entityName,
		repositoryName,
		sealedMethod,
		receiverPattern,
		policedKey,
		persistenceFile,
		tableName,
		narrowExample,
	} = config;

	const entitySymbols = new Set([entityName, repositoryName]);
	const rawSqlWrite = new RegExp(`\\b(update|insert\\s+into)\\s+"?${tableName}"?\\b`, 'i');

	const isEntityIdentifier = (node: TSESTree.Node | undefined) =>
		node?.type === AST_NODE_TYPES.Identifier && node.name === entityName;

	const keyVerdict = (
		property: TSESTree.Property,
		services: TypeServices | null,
	): PayloadVerdict => {
		const { key, computed } = property;
		if (key.type === AST_NODE_TYPES.Literal) {
			return key.value === policedKey ? 'policed' : 'clean';
		}
		if (!computed && key.type === AST_NODE_TYPES.Identifier) {
			return key.name === policedKey ? 'policed' : 'clean';
		}
		return services ? computedKeyVerdict(services.typeOf(key), policedKey) : 'opaque';
	};

	const payloadVerdict = (
		payload: TSESTree.Node,
		services: TypeServices | null,
	): PayloadVerdict => {
		if (payload.type === AST_NODE_TYPES.ObjectExpression) {
			let verdict: PayloadVerdict = 'clean';
			for (const property of payload.properties) {
				if (property.type === AST_NODE_TYPES.Property) {
					const key = keyVerdict(property, services);
					if (key === 'policed') return 'policed';
					if (key === 'opaque') verdict = 'opaque';
					continue;
				}
				if (property.type === AST_NODE_TYPES.SpreadElement && services) {
					const spread = payloadTypeVerdict(services.typeOf(property.argument), policedKey);
					if (spread === 'policed') return 'policed';
					if (spread === 'opaque') verdict = 'opaque';
				}
			}
			return verdict;
		}
		// Without type information a hoisted payload cannot be inspected; the syntactic floor
		// keeps its historical behaviour and lets it through.
		if (!services) return 'clean';
		return payloadTypeVerdict(services.typeOf(payload), policedKey);
	};

	return ESLintUtils.RuleCreator.withoutDocs({
		meta: {
			type: 'problem',
			docs: {
				description: `Seal ${entityName} writes behind a policy-cleared repository method.`,
			},
			messages: {
				unsealedWrite: `This writes \`${entityName}\` outside the sealed repository path. Route it through a token-gated \`${repositoryName}\` method (e.g. \`${sealedMethod}\`).`,
				opaquePayload: `The payload type of this \`${entityName}\` update may contain \`${policedKey}\`, so the seal cannot rule out a \`${policedKey}\` write. Narrow the payload type (e.g. \`${narrowExample}\`) or route it through \`${repositoryName}.${sealedMethod}\`.`,
			},
			schema: [],
		},
		defaultOptions: [],
		create(context) {
			if (persistenceFile.test(context.filename) || NON_RUNTIME_FILE.test(context.filename)) {
				return {};
			}

			let services: TypeServices | null | undefined;
			const typeServices = (): TypeServices | null => {
				if (services !== undefined) return services;
				const parserServices = ESLintUtils.getParserServices(context, true);
				services = parserServices.program
					? {
							checker: parserServices.program.getTypeChecker(),
							typeOf: (node) => parserServices.getTypeAtLocation(node),
						}
					: null;
				return services;
			};

			// TypeORM accepts the table name in place of the entity class.
			const targetsTable = (node: TSESTree.Node | undefined): boolean =>
				node !== undefined && stringValue(node)?.toLowerCase() === tableName;

			const targetsEntity = (node: TSESTree.Node | undefined): boolean => {
				if (!node) return false;
				if (isEntityIdentifier(node) || targetsTable(node)) return true;
				const typed = typeServices();
				return typed !== null && refersToEntity(typed.typeOf(node), typed.checker, entitySymbols);
			};

			return {
				CallExpression(node: TSESTree.CallExpression) {
					const callee =
						node.callee.type === AST_NODE_TYPES.ChainExpression
							? node.callee.expression
							: node.callee;
					if (callee.type !== AST_NODE_TYPES.MemberExpression) return;
					const method = memberName(callee);
					if (method === undefined || !CHECKED_METHODS.has(method)) return;

					if (method === 'query') {
						const sql = stringValue(node.arguments[0]);
						if (sql !== undefined && rawSqlWrite.test(sql)) {
							context.report({ node, messageId: 'unsealedWrite' });
						}
						return;
					}

					if (method === 'into') {
						if (targetsEntity(node.arguments[0])) {
							context.report({ node, messageId: 'unsealedWrite' });
						}
						return;
					}

					const typeArg = node.typeArguments?.params?.[0];
					const genericIsEntity =
						typeArg?.type === AST_NODE_TYPES.TSTypeReference &&
						typeArg.typeName.type === AST_NODE_TYPES.Identifier &&
						typeArg.typeName.name === entityName;
					const receiver = receiverName(callee.object);
					const onRepositoryByName = receiver !== undefined && receiverPattern.test(receiver);

					// Full-entity writes always carry the policed key.
					if (ENTITY_WRITE_METHODS.has(method)) {
						const onEntity =
							genericIsEntity ||
							onRepositoryByName ||
							targetsEntity(callee.object) ||
							node.arguments.some((arg) => targetsEntity(arg));
						if (onEntity) context.report({ node, messageId: 'unsealedWrite' });
						return;
					}

					// `update`: the payload is the last argument, or a chained `.set()` on a query builder.
					const payload =
						node.arguments.length >= 2 ? node.arguments.at(-1) : chainedSetPayload(node);
					const entityArgs = node.arguments.filter((arg) => arg !== payload);
					const onEntity =
						genericIsEntity ||
						onRepositoryByName ||
						targetsEntity(callee.object) ||
						entityArgs.some((arg) => targetsEntity(arg));
					if (!onEntity) return;

					// A write that cannot carry the policed key is out of scope. A query builder with
					// no `.set()` in reach is treated as one that does.
					const verdict = payload ? payloadVerdict(payload, typeServices()) : 'policed';
					if (verdict === 'policed') context.report({ node, messageId: 'unsealedWrite' });
					if (verdict === 'opaque') context.report({ node, messageId: 'opaquePayload' });
				},
			};
		},
	});
};
