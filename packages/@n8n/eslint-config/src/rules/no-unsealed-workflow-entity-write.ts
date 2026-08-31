import { ESLintUtils, type TSESTree } from '@typescript-eslint/utils';

// Node-content writes only. `delete`/`remove`/`softDelete`/`recover` change a row's existence,
// not its node content, so the node seal does not govern them.
const WRITE_METHODS = new Set(['save', 'insert', 'update', 'upsert']);

/** Tests and fixtures write `WorkflowEntity` directly for setup; the seal governs runtime code. */
const NON_RUNTIME_FILE = /(\.test\.ts|\.spec\.ts|\/__tests__\/|\/test\/)/;

const isWorkflowEntity = (node: TSESTree.Node | undefined) =>
	node?.type === 'Identifier' && node.name === 'WorkflowEntity';

const receiverName = (node: TSESTree.Node): string | undefined => {
	if (node.type === 'Identifier') return node.name;
	if (node.type === 'MemberExpression' && node.property.type === 'Identifier')
		return node.property.name;
	return undefined;
};

const hasNodesKey = (node: TSESTree.Node) =>
	node.type === 'ObjectExpression' &&
	node.properties.some(
		(p) =>
			p.type === 'Property' &&
			((p.key.type === 'Identifier' && p.key.name === 'nodes') ||
				(p.key.type === 'Literal' && p.key.value === 'nodes')),
	);

/**
 * Seals `WorkflowEntity` node writes to the token-gated `WorkflowRepository` methods.
 *
 * Flags, outside `@n8n/db`, a write call (`save/insert/update/upsert`) that targets
 * `WorkflowEntity` — by a `WorkflowEntity` generic arg or first-arg identifier, a full-entity
 * write on the `workflowRepository`, or a `.update(…, { nodes })` payload.
 *
 * Syntactic by design. The known ceilings, all requiring type information to close, are:
 * - an aliased or injected receiver (`const r = this.workflowRepository`, or a repository
 *   injected under any name other than `workflowRepository`) — the receiver match is by name;
 * - a hoisted payload (`.update(id, payload)` where `payload` names `nodes` off-site) — only
 *   inline `{ nodes }` object literals are inspected;
 * - `getRepository(WorkflowEntity)` and raw-SQL string writes.
 * The runtime `assertClearedFor` gate in `WorkflowRepository.updateContent` is the enforcing
 * half; this rule is the compile-time backstop for the common shapes. The receiver match is
 * exact, so a sibling like `sharedWorkflowRepository` is untouched.
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
		},
		schema: [],
	},
	defaultOptions: [],
	create(context) {
		if (context.filename.includes('@n8n/db') || NON_RUNTIME_FILE.test(context.filename)) return {};
		return {
			CallExpression(node: TSESTree.CallExpression) {
				const { callee } = node;
				if (callee.type !== 'MemberExpression' || callee.property.type !== 'Identifier') return;
				const method = callee.property.name;
				if (!WRITE_METHODS.has(method)) return;

				const typeArg = node.typeArguments?.params?.[0];
				const genericIsWorkflowEntity =
					typeArg?.type === 'TSTypeReference' &&
					typeArg.typeName.type === 'Identifier' &&
					typeArg.typeName.name === 'WorkflowEntity';
				const firstArgIsWorkflowEntity = isWorkflowEntity(node.arguments[0]);
				const onWorkflowRepo = receiverName(callee.object) === 'workflowRepository';
				const targetsWorkflow =
					genericIsWorkflowEntity || firstArgIsWorkflowEntity || onWorkflowRepo;
				if (!targetsWorkflow) return;

				// Full-entity writes always carry `nodes`.
				if (method === 'save' || method === 'insert' || method === 'upsert') {
					context.report({ node, messageId: 'unsealedWrite' });
					return;
				}

				if (method === 'update') {
					// Query-builder form `.update(WorkflowEntity)` — a raw write whose payload is a chained `.set()`.
					if (firstArgIsWorkflowEntity && node.arguments.length === 1) {
						context.report({ node, messageId: 'unsealedWrite' });
						return;
					}
					// A partial update is only a node write when its payload names `nodes`; a
					// settings-/active-only update to WorkflowEntity is out of the node seal's scope.
					if (node.arguments.some(hasNodesKey)) {
						context.report({ node, messageId: 'unsealedWrite' });
					}
				}
			},
		};
	},
});
