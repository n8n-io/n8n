import {isValueNotUsable} from './utils/index.js';
import {isMethodCall} from './ast/index.js';

const messages = {
	replaceChildOrInsertBefore:
		'Prefer `{{oldChildNode}}.{{preferredMethod}}({{newChildNode}})` over `{{parentNode}}.{{method}}({{newChildNode}}, {{oldChildNode}})`.',
	insertAdjacentTextOrInsertAdjacentElement:
		'Prefer `{{reference}}.{{preferredMethod}}({{content}})` over `{{reference}}.{{method}}({{position}}, {{content}})`.',
};

const disallowedMethods = new Map([
	['replaceChild', 'replaceWith'],
	['insertBefore', 'before'],
]);

const checkForReplaceChildOrInsertBefore = (context, node) => {
	const method = node.callee.property.name;
	const parentNode = node.callee.object.name;
	const [newChildNode, oldChildNode] = node.arguments.map(({name}) => name);
	const preferredMethod = disallowedMethods.get(method);

	const fix = isValueNotUsable(node)
		? fixer => fixer.replaceText(
			node,
			`${oldChildNode}.${preferredMethod}(${newChildNode})`,
		)
		: undefined;

	return {
		node,
		messageId: 'replaceChildOrInsertBefore',
		data: {
			parentNode,
			method,
			preferredMethod,
			newChildNode,
			oldChildNode,
		},
		fix,
	};
};

const positionReplacers = new Map([
	['beforebegin', 'before'],
	['afterbegin', 'prepend'],
	['beforeend', 'append'],
	['afterend', 'after'],
]);

const checkForInsertAdjacentTextOrInsertAdjacentElement = (context, node) => {
	const method = node.callee.property.name;
	const [positionNode, contentNode] = node.arguments;

	const position = positionNode.value;
	// Return early when specified position value of first argument is not a recognized value.
	if (!positionReplacers.has(position)) {
		return;
	}

	const preferredMethod = positionReplacers.get(position);
	const {sourceCode} = context;
	const content = sourceCode.getText(contentNode);
	const reference = sourceCode.getText(node.callee.object);

	const fix = method === 'insertAdjacentElement' && !isValueNotUsable(node)
		? undefined
		// TODO: make a better fix, don't touch reference
		: fixer => fixer.replaceText(
			node,
			`${reference}.${preferredMethod}(${content})`,
		);

	return {
		node,
		messageId: 'insertAdjacentTextOrInsertAdjacentElement',
		data: {
			reference,
			method,
			preferredMethod,
			position: sourceCode.getText(positionNode),
			content,
		},
		fix,
	};
};

/** @param {import('eslint').Rule.RuleContext} context */
const create = context => {
	context.on('CallExpression', node => {
		if (
			isMethodCall(node, {
				methods: ['replaceChild', 'insertBefore'],
				argumentsLength: 2,
				optionalCall: false,
				optionalMember: false,
			})
			// We only allow Identifier for now
			&& node.arguments.every(node => node.type === 'Identifier' && node.name !== 'undefined')
			// This check makes sure that only the first method of chained methods with same identifier name e.g: parentNode.insertBefore(alfa, beta).insertBefore(charlie, delta); gets reported
			&& node.callee.object.type === 'Identifier'
		) {
			return checkForReplaceChildOrInsertBefore(context, node);
		}
	});

	context.on('CallExpression', node => {
		if (
			isMethodCall(node, {
				methods: ['insertAdjacentText', 'insertAdjacentElement'],
				argumentsLength: 2,
				optionalCall: false,
				optionalMember: false,
			})
			// Position argument should be `string`
			&& node.arguments[0].type === 'Literal'
			// TODO: remove this limits on second argument
			&& (
				node.arguments[1].type === 'Literal'
				|| node.arguments[1].type === 'Identifier'
			)
			// TODO: remove this limits on callee
			&& node.callee.object.type === 'Identifier'
		) {
			return checkForInsertAdjacentTextOrInsertAdjacentElement(context, node);
		}
	});
};

/** @type {import('eslint').Rule.RuleModule} */
const config = {
	create,
	meta: {
		type: 'suggestion',
		docs: {
			description: 'Prefer `.before()` over `.insertBefore()`, `.replaceWith()` over `.replaceChild()`, prefer one of `.before()`, `.after()`, `.append()` or `.prepend()` over `insertAdjacentText()` and `insertAdjacentElement()`.',
			recommended: true,
		},
		fixable: 'code',
		messages,
	},
};

export default config;
