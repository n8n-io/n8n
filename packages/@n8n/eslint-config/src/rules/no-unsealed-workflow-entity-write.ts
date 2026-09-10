import { AST_NODE_TYPES, ESLintUtils, type TSESTree } from '@typescript-eslint/utils';
import ts from 'typescript';

// Node-content writes only. `delete`/`remove`/`softDelete`/`recover` change a row's existence,
// not its node content, so the node seal does not govern them.
const ENTITY_WRITE_METHODS = new Set(['save', 'insert', 'upsert']);
const CHECKED_METHODS = new Set([...ENTITY_WRITE_METHODS, 'update', 'into', 'query']);

/** Tests, fixtures and test utilities write `WorkflowEntity` for setup; the seal governs runtime code. */
const NON_RUNTIME_FILE =
	/(\.test\.ts$|\.spec\.ts$|[\\/]__tests__[\\/]|[\\/]packages[\\/](@n8n[\\/])?[^\\/]+[\\/]test[\\/]|[\\/]backend-test-utils[\\/])/;

/** Only the sealed repository and migrations may write `WorkflowEntity` directly. */
const PERSISTENCE_FILE =
	/([\\/]@n8n[\\/]db[\\/]src[\\/]repositories[\\/]workflow\.repository\.ts$|[\\/]migrations[\\/])/;

const RAW_SQL_WORKFLOW_WRITE = /\b(update|insert\s+into)\s+"?workflow_entity"?\b/i;

// Matches the repository under any injected name (`workflowRepo`, `workflowsRepository`, …),
// while a sibling like `sharedWorkflowRepository` stays out because the match is anchored.
const WORKFLOW_REPO_RECEIVER = /^workflows?Repo/;

const WORKFLOW_TYPE_SYMBOLS = new Set(['WorkflowEntity', 'WorkflowRepository']);

type TypeServices = {
	checker: ts.TypeChecker;
	typeOf: (node: TSESTree.Node) => ts.Type;
};

type PayloadVerdict = 'nodes' | 'opaque' | 'clean';

const isWorkflowEntityIdentifier = (node: TSESTree.Node | undefined) =>
	node?.type === AST_NODE_TYPES.Identifier && node.name === 'WorkflowEntity';

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

const isNodesKey = (key: TSESTree.Node) =>
	(key.type === AST_NODE_TYPES.Identifier && key.name === 'nodes') ||
	(key.type === AST_NODE_TYPES.Literal && key.value === 'nodes');

const stringValue = (node: TSESTree.Node | undefined): string | undefined => {
	if (node?.type === AST_NODE_TYPES.Literal && typeof node.value === 'string') return node.value;
	if (node?.type === AST_NODE_TYPES.TemplateLiteral) {
		return node.quasis.map((q) => q.value.cooked ?? '').join(' ');
	}
	return undefined;
};

const isTypeReference = (type: ts.Type): type is ts.TypeReference =>
	'target' in type && typeof type.target === 'object';

/**
 * True for the entity itself, `WorkflowRepository`, or any generic over the entity
 * (`Repository<WorkflowEntity>`, a query builder, a subclass of either).
 */
const refersToWorkflowEntity = (
	type: ts.Type,
	checker: ts.TypeChecker,
	seen = new Set<ts.Type>(),
): boolean => {
	if (seen.has(type)) return false;
	seen.add(type);

	if (type.isUnionOrIntersection()) {
		return type.types.some((t) => refersToWorkflowEntity(t, checker, seen));
	}

	const name = (type.getSymbol() ?? type.aliasSymbol)?.getName();
	if (name !== undefined && WORKFLOW_TYPE_SYMBOLS.has(name)) return true;

	const typeArguments = [
		...(type.aliasTypeArguments ?? []),
		...(isTypeReference(type) ? checker.getTypeArguments(type) : []),
	];
	if (typeArguments.some((t) => refersToWorkflowEntity(t, checker, seen))) return true;

	const target = isTypeReference(type) ? type.target : type;
	if (target.isClassOrInterface()) {
		return checker.getBaseTypes(target).some((t) => refersToWorkflowEntity(t, checker, seen));
	}
	return false;
};

// `any`/`unknown` could carry `nodes`, and an optional `nodes` (a wide partial type) might; the
// seal treats both as opaque rather than clean.
const payloadTypeVerdict = (type: ts.Type): PayloadVerdict => {
	if (type.isUnionOrIntersection()) {
		const verdicts = type.types.map(payloadTypeVerdict);
		if (verdicts.includes('nodes')) return 'nodes';
		return verdicts.includes('opaque') ? 'opaque' : 'clean';
	}
	if (type.flags & (ts.TypeFlags.Any | ts.TypeFlags.Unknown)) return 'opaque';
	const nodes = type.getProperty('nodes');
	if (nodes === undefined) return 'clean';
	return nodes.flags & ts.SymbolFlags.Optional ? 'opaque' : 'nodes';
};

const payloadVerdict = (payload: TSESTree.Node, services: TypeServices | null): PayloadVerdict => {
	if (payload.type === AST_NODE_TYPES.ObjectExpression) {
		let verdict: PayloadVerdict = 'clean';
		for (const property of payload.properties) {
			if (property.type === AST_NODE_TYPES.Property && isNodesKey(property.key)) return 'nodes';
			if (property.type === AST_NODE_TYPES.SpreadElement && services) {
				const spread = payloadTypeVerdict(services.typeOf(property.argument));
				if (spread === 'nodes') return 'nodes';
				if (spread === 'opaque') verdict = 'opaque';
			}
		}
		return verdict;
	}
	// Without type information a hoisted payload cannot be inspected; the syntactic floor
	// keeps its historical behaviour and lets it through.
	if (!services) return 'clean';
	return payloadTypeVerdict(services.typeOf(payload));
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
 * Seals `WorkflowEntity` node writes to the token-gated `WorkflowRepository` methods.
 * Type-aware where a program is available, with the syntactic name/literal checks as a floor.
 * Ceiling: SQL built from non-literal strings and `any`-typed receivers; the runtime
 * `assertClearedFor` gate in the repository is the enforcing half.
 */
export const NoUnsealedWorkflowEntityWriteRule = ESLintUtils.RuleCreator.withoutDocs({
	meta: {
		type: 'problem',
		docs: {
			description: 'Seal WorkflowEntity writes behind a policy-cleared repository method.',
		},
		messages: {
			unsealedWrite:
				'This writes `WorkflowEntity` outside the sealed repository path. Route it through a token-gated `WorkflowRepository` method (e.g. `updateContent`).',
			opaquePayload:
				'The payload type of this `WorkflowEntity` update may contain `nodes`, so the seal cannot rule out a node write. Narrow the payload type (e.g. `Pick<WorkflowEntity, "active">`) or route it through `WorkflowRepository.updateContent`.',
		},
		schema: [],
	},
	defaultOptions: [],
	create(context) {
		if (PERSISTENCE_FILE.test(context.filename) || NON_RUNTIME_FILE.test(context.filename)) {
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

		const refersToWorkflow = (node: TSESTree.Node | undefined): boolean => {
			if (!node) return false;
			if (isWorkflowEntityIdentifier(node)) return true;
			const typed = typeServices();
			return typed !== null && refersToWorkflowEntity(typed.typeOf(node), typed.checker);
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
					if (sql !== undefined && RAW_SQL_WORKFLOW_WRITE.test(sql)) {
						context.report({ node, messageId: 'unsealedWrite' });
					}
					return;
				}

				if (method === 'into') {
					if (refersToWorkflow(node.arguments[0])) {
						context.report({ node, messageId: 'unsealedWrite' });
					}
					return;
				}

				const typeArg = node.typeArguments?.params?.[0];
				const genericIsWorkflowEntity =
					typeArg?.type === AST_NODE_TYPES.TSTypeReference &&
					typeArg.typeName.type === AST_NODE_TYPES.Identifier &&
					typeArg.typeName.name === 'WorkflowEntity';
				const receiver = receiverName(callee.object);
				const onWorkflowRepoByName =
					receiver !== undefined && WORKFLOW_REPO_RECEIVER.test(receiver);

				// Full-entity writes always carry `nodes`.
				if (ENTITY_WRITE_METHODS.has(method)) {
					const targetsWorkflow =
						genericIsWorkflowEntity ||
						onWorkflowRepoByName ||
						refersToWorkflow(callee.object) ||
						node.arguments.some((arg) => refersToWorkflow(arg));
					if (targetsWorkflow) context.report({ node, messageId: 'unsealedWrite' });
					return;
				}

				// `update`: the payload is the last argument, or a chained `.set()` on a query builder.
				const payload =
					node.arguments.length >= 2 ? node.arguments.at(-1) : chainedSetPayload(node);
				const entityArgs = node.arguments.filter((arg) => arg !== payload);
				const targetsWorkflow =
					genericIsWorkflowEntity ||
					onWorkflowRepoByName ||
					refersToWorkflow(callee.object) ||
					entityArgs.some((arg) => refersToWorkflow(arg));
				if (!targetsWorkflow) return;

				// A settings-/active-only update is out of the node seal's scope. A query builder with
				// no `.set()` in reach is treated as a node write.
				const verdict = payload ? payloadVerdict(payload, typeServices()) : 'nodes';
				if (verdict === 'nodes') context.report({ node, messageId: 'unsealedWrite' });
				if (verdict === 'opaque') context.report({ node, messageId: 'opaquePayload' });
			},
		};
	},
});
