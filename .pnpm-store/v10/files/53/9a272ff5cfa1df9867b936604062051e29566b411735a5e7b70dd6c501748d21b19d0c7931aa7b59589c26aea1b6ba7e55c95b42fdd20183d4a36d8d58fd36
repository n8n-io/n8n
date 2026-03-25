const MESSAGE_ID_ERROR = 'no-accessor-recursion/error';
const messages = {
	[MESSAGE_ID_ERROR]: 'Disallow recursive access to `this` within {{kind}}ters.',
};

/**
Get the closest non-arrow function scope.

@param {import('eslint').SourceCode} sourceCode
@param {import('estree').Node} node
@return {import('eslint').Scope.Scope | undefined}
*/
const getClosestFunctionScope = (sourceCode, node) => {
	for (let scope = sourceCode.getScope(node); scope; scope = scope.upper) {
		if (scope.type === 'class') {
			return;
		}

		if (scope.type === 'function' && scope.block.type !== 'ArrowFunctionExpression') {
			return scope;
		}
	}
};

/** @param {import('estree').Identifier | import('estree').PrivateIdentifier} node */
const isIdentifier = node => node.type === 'Identifier' || node.type === 'PrivateIdentifier';

/** @param {import('estree').ThisExpression} node */
const isDotNotationAccess = node =>
	node.parent.type === 'MemberExpression'
	&& node.parent.object === node
	&& !node.parent.computed
	&& isIdentifier(node.parent.property);

/**
Check if a property is a valid getter or setter.

@param {import('estree').Property | import('estree').MethodDefinition} property
*/
const isValidProperty = property =>
	['Property', 'MethodDefinition'].includes(property?.type)
	&& !property.computed
	&& ['set', 'get'].includes(property.kind)
	&& isIdentifier(property.key);

/**
Check if two property keys are the same.

@param {import('estree').Property['key']} keyLeft
@param {import('estree').Property['key']} keyRight
*/
const isSameKey = (keyLeft, keyRight) => ['type', 'name'].every(key => keyLeft[key] === keyRight[key]);

/**
Check if `this` is accessed recursively within a getter or setter.

@param {import('estree').ThisExpression} node
@param {import('estree').Property | import('estree').MethodDefinition} property
*/
const isMemberAccess = (node, property) =>
	isDotNotationAccess(node)
	&& isSameKey(node.parent.property, property.key);

/**
Check if `this` is accessed recursively within a destructuring assignment.

@param {import('estree').ThisExpression} node
@param {import('estree').Property | import('estree').MethodDefinition} property
*/
const isRecursiveDestructuringAccess = (node, property) =>
	node.parent.type === 'VariableDeclarator'
	&& node.parent.init === node
	&& node.parent.id.type === 'ObjectPattern'
	&& node.parent.id.properties.some(declaratorProperty =>
		declaratorProperty.type === 'Property'
		&& !declaratorProperty.computed
		&& isSameKey(declaratorProperty.key, property.key),
	);

const isPropertyRead = (thisExpression, property) =>
	isMemberAccess(thisExpression, property)
	|| isRecursiveDestructuringAccess(thisExpression, property);

const isPropertyWrite = (thisExpression, property) => {
	if (!isMemberAccess(thisExpression, property)) {
		return false;
	}

	const memberExpression = thisExpression.parent;
	const {parent} = memberExpression;

	// This part is similar to `isLeftHandSide`, try to DRY in future
	return (
		// `this.foo = …`
		// `[this.foo = …] = …`
		// `({property: this.foo = …] = …)`
		(
			(parent.type === 'AssignmentExpression' || parent.type === 'AssignmentPattern')
			&& parent.left === memberExpression
		)
		// `++ this.foo`
		|| (parent.type === 'UpdateExpression' && parent.argument === memberExpression)
		// `[this.foo] = …`
		|| (parent.type === 'ArrayPattern' && parent.elements.includes(memberExpression))
		// `({property: this.foo} = …)`
		|| (
			parent.type === 'Property'
			&& parent.value === memberExpression
			&& parent.parent.type === 'ObjectPattern'
			&& parent.parent.properties.includes(memberExpression.parent)
		)
	);
};

/** @param {import('eslint').Rule.RuleContext} context */
const create = context => {
	const {sourceCode} = context;

	return {
		/** @param {import('estree').ThisExpression} thisExpression */
		ThisExpression(thisExpression) {
			const scope = getClosestFunctionScope(sourceCode, thisExpression);

			if (!scope) {
				return;
			}

			/** @type {import('estree').Property | import('estree').MethodDefinition} */
			const property = scope.block.parent;

			if (!isValidProperty(property)) {
				return;
			}

			if (property.kind === 'get' && isPropertyRead(thisExpression, property)) {
				return {node: thisExpression.parent, messageId: MESSAGE_ID_ERROR, data: {kind: property.kind}};
			}

			if (property.kind === 'set' && isPropertyWrite(thisExpression, property)) {
				return {node: thisExpression.parent, messageId: MESSAGE_ID_ERROR, data: {kind: property.kind}};
			}
		},
	};
};

/** @type {import('eslint').Rule.RuleModule} */
const config = {
	create,
	meta: {
		type: 'problem',
		docs: {
			description: 'Disallow recursive access to `this` within getters and setters.',
			recommended: true,
		},
		defaultOptions: [],
		messages,
	},
};

export default config;
