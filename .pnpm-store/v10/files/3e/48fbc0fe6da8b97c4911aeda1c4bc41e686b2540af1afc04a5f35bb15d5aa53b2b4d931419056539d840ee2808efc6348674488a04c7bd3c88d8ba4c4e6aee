import escapeString from './utils/escape-string.js';
import translateToKey from './shared/event-keys.js';
import {isNumberLiteral} from './ast/index.js';

const MESSAGE_ID = 'prefer-keyboard-event-key';
const messages = {
	[MESSAGE_ID]: 'Use `.key` instead of `.{{name}}`.',
};

const keys = new Set([
	'keyCode',
	'charCode',
	'which',
]);

const isPropertyNamedAddEventListener = node =>
	node?.type === 'CallExpression'
	&& node.callee.type === 'MemberExpression'
	&& node.callee.property.name === 'addEventListener';

const getEventNodeAndReferences = (context, node) => {
	const eventListener = getMatchingAncestorOfType(node, 'CallExpression', isPropertyNamedAddEventListener);
	const callback = eventListener?.arguments[1];
	switch (callback?.type) {
		case 'ArrowFunctionExpression':
		case 'FunctionExpression': {
			const eventVariable = context.sourceCode.getDeclaredVariables(callback)[0];
			const references = eventVariable?.references;
			return {
				event: callback.params[0],
				references,
			};
		}

		default: {
			return {};
		}
	}
};

const isPropertyOf = (node, eventNode) =>
	node?.parent?.type === 'MemberExpression'
	&& node.parent.object === eventNode;

// The third argument is a condition function, as one passed to `Array#filter()`
// Helpful if nearest node of type also needs to have some other property
const getMatchingAncestorOfType = (node, type, testFunction = () => true) => {
	let current = node;
	while (current) {
		if (current.type === type && testFunction(current)) {
			return current;
		}

		current = current.parent;
	}
};

const getParentByLevel = (node, level) => {
	let current = node;
	while (current && level) {
		level--;
		current = current.parent;
	}

	/* c8 ignore next 3 */
	if (level === 0) {
		return current;
	}
};

const fix = node => fixer => {
	// Since we're only fixing direct property access usages, like `event.keyCode`
	const nearestIf = getParentByLevel(node, 3);
	if (!nearestIf || nearestIf.type !== 'IfStatement') {
		return;
	}

	const {type, operator, right} = nearestIf.test;
	if (
		!(
			type === 'BinaryExpression'
			&& (operator === '==' || operator === '===')
			&& isNumberLiteral(right)
		)
	) {
		return;
	}

	// Either a meta key or a printable character
	const key = translateToKey[right.value] || String.fromCodePoint(right.value);
	// And if we recognize the `.keyCode`
	if (!key) {
		return;
	}

	// Apply fixes
	return [
		fixer.replaceText(node, 'key'),
		fixer.replaceText(right, escapeString(key)),
	];
};

const getProblem = node => ({
	messageId: MESSAGE_ID,
	data: {name: node.name},
	node,
	fix: fix(node),
});

/** @param {import('eslint').Rule.RuleContext} context */
const create = context => ({
	Identifier(node) {
		if (
			node.name !== 'keyCode'
			&& node.name !== 'charCode'
			&& node.name !== 'which'
		) {
			return;
		}

		// Normal case when usage is direct -> `event.keyCode`
		const {event, references} = getEventNodeAndReferences(context, node);
		if (!event) {
			return;
		}

		if (
			references
			&& references.some(reference => isPropertyOf(node, reference.identifier))
		) {
			return getProblem(node);
		}
	},

	Property(node) {
		// Destructured case
		const propertyName = node.value.name;
		if (!keys.has(propertyName)) {
			return;
		}

		const {event, references} = getEventNodeAndReferences(context, node);
		if (!event) {
			return;
		}

		const nearestVariableDeclarator = getMatchingAncestorOfType(
			node,
			'VariableDeclarator',
		);
		const initObject = nearestVariableDeclarator?.init;

		// Make sure initObject is a reference of eventVariable
		if (
			references
			&& references.some(reference => reference.identifier === initObject)
		) {
			return getProblem(node.value);
		}

		// When the event parameter itself is destructured directly
		const isEventParameterDestructured = event.type === 'ObjectPattern';
		if (isEventParameterDestructured) {
			// Check for properties
			for (const property of event.properties) {
				if (property === node) {
					return getProblem(node.value);
				}
			}
		}
	},
});

/** @type {import('eslint').Rule.RuleModule} */
const config = {
	create,
	meta: {
		type: 'suggestion',
		docs: {
			description: 'Prefer `KeyboardEvent#key` over `KeyboardEvent#keyCode`.',
			recommended: true,
		},
		fixable: 'code',
		messages,
	},
};

export default config;
