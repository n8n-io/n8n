import { ESLintUtils } from '@typescript-eslint/utils';

const NON_RUNTIME_FILE =
	/(\.(test|spec)\.ts$)|([\\/]__tests__[\\/])|([\\/]test[\\/])|([\\/]migrations[\\/])/;
const WORKFLOW_REPOSITORY_FILE = /[\\/]repositories[\\/]workflow\.repository\.ts$/;
const WRITE_METHODS = new Set(['save', 'insert', 'upsert']);
const RAW_WORKFLOW_WRITE = /\b(?:UPDATE|INSERT\s+INTO)\s+["'`]?\w*workflow_entity\b/i;

const memberName = (node: {
	computed: boolean;
	property: { type: string; name?: string; value?: unknown };
}) => {
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

const isWorkflowRepository = (node: { type: string; name?: string; property?: unknown }) => {
	if (node.type === 'Identifier')
		return /^(?:workflow|workflows)Repo(?:sitory)?$/i.test(node.name ?? '');
	if (node.type !== 'MemberExpression') return false;
	return memberName(node as never) === 'workflowRepository';
};

const hasNodes = (node: {
	type: string;
	properties?: Array<{
		type: string;
		computed?: boolean;
		key?: { type: string; name?: string; value?: unknown };
	}>;
}) =>
	node.type === 'ObjectExpression' &&
	(node.properties ?? []).some((property) => {
		if (property.type === 'SpreadElement' || !property.key) return false;
		if (!property.computed && property.key.type === 'Identifier')
			return property.key.name === 'nodes';
		return property.key.type === 'Literal' && property.key.value === 'nodes';
	});

const targetsWorkflowEntity = (
	node: { type: string; name?: string; value?: unknown } | undefined,
) =>
	node !== undefined &&
	((node.type === 'Identifier' && node.name === 'WorkflowEntity') ||
		(node.type === 'Literal' &&
			(node.value === 'WorkflowEntity' || node.value === 'workflow_entity')));

export const NoUnsealedWorkflowEntityWriteRule = ESLintUtils.RuleCreator.withoutDocs({
	meta: {
		type: 'problem',
		docs: {
			description: 'Route workflow content writes through policy-cleared repository methods.',
		},
		messages: {
			unsealedWrite:
				'Route WorkflowEntity content writes through a policy-cleared repository method.',
		},
		schema: [],
	},
	defaultOptions: [],
	create(context) {
		if (
			NON_RUNTIME_FILE.test(context.filename) ||
			WORKFLOW_REPOSITORY_FILE.test(context.filename)
		) {
			return {};
		}

		return {
			CallExpression(node) {
				if (node.callee.type !== 'MemberExpression') return;
				const method = memberName(node.callee);
				if (!method) return;

				if (WRITE_METHODS.has(method) && isWorkflowRepository(node.callee.object)) {
					context.report({ node, messageId: 'unsealedWrite' });
					return;
				}

				if (
					method === 'update' &&
					isWorkflowRepository(node.callee.object) &&
					node.arguments[1]?.type !== 'SpreadElement' &&
					hasNodes(node.arguments[1] as never)
				) {
					context.report({ node, messageId: 'unsealedWrite' });
					return;
				}

				if (
					['save', 'insert', 'upsert'].includes(method) &&
					node.arguments[0]?.type !== 'SpreadElement' &&
					targetsWorkflowEntity(node.arguments[0] as never)
				) {
					context.report({ node, messageId: 'unsealedWrite' });
					return;
				}

				if (
					method === 'into' &&
					node.arguments[0]?.type !== 'SpreadElement' &&
					targetsWorkflowEntity(node.arguments[0] as never)
				) {
					context.report({ node, messageId: 'unsealedWrite' });
					return;
				}

				for (const argument of node.arguments) {
					if (
						argument.type === 'Literal' &&
						typeof argument.value === 'string' &&
						RAW_WORKFLOW_WRITE.test(argument.value)
					) {
						context.report({ node: argument, messageId: 'unsealedWrite' });
					}
					if (
						argument.type === 'TemplateLiteral' &&
						RAW_WORKFLOW_WRITE.test(argument.quasis.map((quasi) => quasi.value.raw).join(''))
					) {
						context.report({ node: argument, messageId: 'unsealedWrite' });
					}
				}
			},
		};
	},
});
