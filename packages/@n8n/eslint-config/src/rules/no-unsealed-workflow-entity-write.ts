import { ESLintUtils } from '@typescript-eslint/utils';

const NON_RUNTIME_FILE =
	/(\.(test|spec)\.ts$)|([\\/]__tests__[\\/])|([\\/]test[\\/])|([\\/]migrations[\\/])/;
const WORKFLOW_REPOSITORY_FILE = /[\\/]repositories[\\/]workflow\.repository\.ts$/;
const WRITE_METHODS = new Set(['save', 'insert', 'upsert']);
const RAW_WORKFLOW_WRITE =
	/\b(?:UPDATE|INSERT\s+INTO)\s+(?:(?:"?\w+"?)\s*\.\s*)?["'`]?\w*workflow_entity["'`]?(?=\s|\(|$)/i;
const WORKFLOW_REPOSITORY_NAME = /^(?:workflow|workflows)Repo(?:sitory)?$/i;

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

const targetsWorkflowEntity = (node: SyntaxNode | undefined) =>
	node !== undefined &&
	((node.type === 'Identifier' && node.name === 'WorkflowEntity') ||
		(node.type === 'Literal' &&
			(node.value === 'WorkflowEntity' || node.value === 'workflow_entity')));

const targetsWorkflowRepositoryClass = (node: SyntaxNode | undefined) =>
	node?.type === 'Identifier' && node.name === 'WorkflowRepository';

const isWorkflowRepository = (node: SyntaxNode): boolean => {
	const target = unwrapChain(node);
	if (target.type === 'Identifier') return WORKFLOW_REPOSITORY_NAME.test(target.name ?? '');
	if (target.type === 'MemberExpression') {
		return WORKFLOW_REPOSITORY_NAME.test(memberName(target) ?? '');
	}
	if (target.type !== 'CallExpression' || !target.callee) return false;
	const callee = unwrapChain(target.callee);
	return (
		callee.type === 'MemberExpression' &&
		((memberName(callee) === 'get' && targetsWorkflowRepositoryClass(target.arguments?.[0])) ||
			(memberName(callee) === 'getRepository' && targetsWorkflowEntity(target.arguments?.[0])))
	);
};

const hasNodes = (node: SyntaxNode) =>
	node.type === 'ObjectExpression' &&
	(node.properties ?? []).some((property) => {
		if (property.type === 'SpreadElement' || !property.key) return false;
		if (!property.computed && property.key.type === 'Identifier') {
			return property.key.name === 'nodes';
		}
		return property.key.type === 'Literal' && property.key.value === 'nodes';
	});

const isWorkflowQueryBuilder = (node: SyntaxNode): boolean => {
	const call = unwrapChain(node);
	if (call.type !== 'CallExpression' || !call.callee) return false;
	const callee = unwrapChain(call.callee);
	if (callee.type !== 'MemberExpression' || !callee.object) return false;
	const method = memberName(callee);
	if (method === 'createQueryBuilder') return isWorkflowRepository(callee.object);
	if (method !== 'update') return false;
	return (
		targetsWorkflowEntity(call.arguments?.[0]) ||
		(call.arguments?.length === 0 && isWorkflowQueryBuilder(callee.object))
	);
};

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
				const callee = unwrapChain(node.callee as never);
				if (callee.type !== 'MemberExpression' || !callee.object) return;
				const method = memberName(callee);
				if (!method) return;

				if (WRITE_METHODS.has(method) && isWorkflowRepository(callee.object)) {
					context.report({ node, messageId: 'unsealedWrite' });
					return;
				}

				const secondArgument = node.arguments[1];
				if (
					method === 'update' &&
					isWorkflowRepository(callee.object) &&
					secondArgument !== undefined &&
					secondArgument.type !== 'SpreadElement' &&
					hasNodes(secondArgument as never)
				) {
					context.report({ node, messageId: 'unsealedWrite' });
					return;
				}

				const callPrefix = context.sourceCode.getText(node).split('(', 1)[0];
				const hasWorkflowTypeArgument = /<[^>]*\bWorkflowEntity\b[^>]*>/.test(callPrefix);
				const explicitWorkflowTarget = targetsWorkflowEntity(node.arguments[0] as never);
				const updatePayload = explicitWorkflowTarget ? node.arguments[2] : node.arguments[1];
				if (
					method === 'update' &&
					(explicitWorkflowTarget || hasWorkflowTypeArgument) &&
					updatePayload !== undefined &&
					updatePayload.type !== 'SpreadElement' &&
					hasNodes(updatePayload as never)
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
					hasNodes(node.arguments[0] as never) &&
					(isWorkflowQueryBuilder(callee.object) ||
						/update\s*<[^>]*\bWorkflowEntity\b[^>]*>/.test(queryBuilderText))
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
						RAW_WORKFLOW_WRITE.test(
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
