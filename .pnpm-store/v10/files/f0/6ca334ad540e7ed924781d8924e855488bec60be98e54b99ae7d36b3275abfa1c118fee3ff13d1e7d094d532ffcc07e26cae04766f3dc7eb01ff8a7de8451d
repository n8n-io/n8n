import {upperFirst} from './utils/lodash.js';

const MESSAGE_ID_INVALID_EXPORT = 'invalidExport';
const messages = {
	[MESSAGE_ID_INVALID_EXPORT]: 'Exported error name should match error class',
};

const nameRegexp = /^(?:[A-Z][\da-z]*)*Error$/;

const getClassName = name => upperFirst(name).replace(/(?:error|)$/i, 'Error');

const getConstructorMethod = className => `
	constructor() {
		super();
		this.name = '${className}';
	}
`;

const hasValidSuperClass = node => {
	if (!node.superClass) {
		return false;
	}

	let {name, type, property} = node.superClass;

	if (type === 'MemberExpression') {
		({name} = property);
	}

	return nameRegexp.test(name);
};

const isSuperExpression = node =>
	node.type === 'ExpressionStatement'
	&& node.expression.type === 'CallExpression'
	&& node.expression.callee.type === 'Super';

const isAssignmentExpression = (node, name) => {
	if (
		node.type !== 'ExpressionStatement'
		|| node.expression.type !== 'AssignmentExpression'
	) {
		return false;
	}

	const lhs = node.expression.left;

	if (!lhs.object || lhs.object.type !== 'ThisExpression') {
		return false;
	}

	return lhs.property.name === name;
};

const isPropertyDefinition = (node, name) =>
	node.type === 'PropertyDefinition'
	&& !node.computed
	&& node.key.type === 'Identifier'
	&& node.key.name === name;

function * customErrorDefinition(context, node) {
	if (!hasValidSuperClass(node)) {
		return;
	}

	if (node.id === null) {
		return;
	}

	const {name} = node.id;
	const className = getClassName(name);

	if (name !== className) {
		yield {
			node: node.id,
			message: `Invalid class name, use \`${className}\`.`,
		};
	}

	const {sourceCode} = context;
	const {body} = node.body;
	const range = sourceCode.getRange(node.body);
	const constructor = body.find(x => x.kind === 'constructor');

	if (!constructor) {
		yield {
			node,
			message: 'Add a constructor to your error.',
			fix: fixer => fixer.insertTextAfterRange([
				range[0],
				range[0] + 1,
			], getConstructorMethod(name)),
		};
		return;
	}

	const constructorBodyNode = constructor.value.body;

	// Verify the constructor has a body (TypeScript)
	if (!constructorBodyNode) {
		return;
	}

	const constructorBody = constructorBodyNode.body;

	const superExpression = constructorBody.find(body => isSuperExpression(body));
	const messageExpressionIndex = constructorBody.findIndex(x => isAssignmentExpression(x, 'message'));

	if (!superExpression) {
		yield {
			node: constructorBodyNode,
			message: 'Missing call to `super()` in constructor.',
		};
	} else if (messageExpressionIndex !== -1) {
		const expression = constructorBody[messageExpressionIndex];

		yield {
			node: superExpression,
			message: 'Pass the error message to `super()` instead of setting `this.message`.',
			* fix(fixer) {
				if (superExpression.expression.arguments.length === 0) {
					const rhs = expression.expression.right;
					const [start] = sourceCode.getRange(superExpression);
					yield fixer.insertTextAfterRange([start, start + 6], rhs.raw || rhs.name);
				}

				const start = messageExpressionIndex === 0
					? sourceCode.getRange(constructorBodyNode)[0]
					: sourceCode.getRange(constructorBody[messageExpressionIndex - 1])[1];
				const [, end] = sourceCode.getRange(expression);
				yield fixer.removeRange([start, end]);
			},
		};
	}

	const nameExpression = constructorBody.find(x => isAssignmentExpression(x, 'name'));
	if (!nameExpression) {
		const nameProperty = body.find(node => isPropertyDefinition(node, 'name'));

		if (!nameProperty?.value || nameProperty.value.value !== name) {
			yield {
				node: nameProperty?.value ?? constructorBodyNode,
				message: `The \`name\` property should be set to \`${name}\`.`,
			};
		}
	} else if (nameExpression.expression.right.value !== name) {
		yield {
			node: nameExpression?.expression.right ?? constructorBodyNode,
			message: `The \`name\` property should be set to \`${name}\`.`,
		};
	}
}

const customErrorExport = (context, node) => {
	const exportsName = node.left.property.name;

	const maybeError = node.right;

	if (maybeError.type !== 'ClassExpression') {
		return;
	}

	if (!hasValidSuperClass(maybeError)) {
		return;
	}

	if (!maybeError.id) {
		return;
	}

	// Assume rule has already fixed the error name
	const errorName = maybeError.id.name;

	if (exportsName === errorName) {
		return;
	}

	return {
		node: node.left.property,
		messageId: MESSAGE_ID_INVALID_EXPORT,
		fix: fixer => fixer.replaceText(node.left.property, errorName),
	};
};

/** @param {import('eslint').Rule.RuleContext} context */
const create = context => {
	context.on('ClassDeclaration', node => customErrorDefinition(context, node));
	context.on('AssignmentExpression', node => {
		if (node.right.type === 'ClassExpression') {
			return customErrorDefinition(context, node.right);
		}
	});
	context.on('AssignmentExpression', node => {
		if (
			node.left.type === 'MemberExpression'
			&& node.left.object.type === 'Identifier'
			&& node.left.object.name === 'exports'
		) {
			return customErrorExport(context, node);
		}
	});
};

/** @type {import('eslint').Rule.RuleModule} */
const config = {
	create,
	meta: {
		type: 'problem',
		docs: {
			description: 'Enforce correct `Error` subclassing.',
			recommended: false,
		},
		fixable: 'code',
		messages,
	},
};

export default config;
