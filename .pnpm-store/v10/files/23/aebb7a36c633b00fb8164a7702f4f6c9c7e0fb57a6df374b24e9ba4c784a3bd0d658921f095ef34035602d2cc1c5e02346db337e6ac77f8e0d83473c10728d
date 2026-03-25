import {getAvailableVariableName, isLeftHandSide} from './utils/index.js';
import {isCallOrNewExpression} from './ast/index.js';

const MESSAGE_ID = 'consistentDestructuring';
const MESSAGE_ID_SUGGEST = 'consistentDestructuringSuggest';

const isSimpleExpression = expression => {
	while (expression) {
		if (expression.computed) {
			return false;
		}

		if (expression.type !== 'MemberExpression') {
			break;
		}

		expression = expression.object;
	}

	return expression.type === 'Identifier'
		|| expression.type === 'ThisExpression';
};

const isChildInParentScope = (child, parent) => {
	while (child) {
		if (child === parent) {
			return true;
		}

		child = child.upper;
	}

	return false;
};

/** @param {import('eslint').Rule.RuleContext} context */
const create = context => {
	const {sourceCode} = context;
	const declarations = new Map();

	return {
		VariableDeclarator(node) {
			if (!(
				node.id.type === 'ObjectPattern'
				&& node.init
				&& node.init.type !== 'Literal'
				// Ignore any complex expressions (e.g. arrays, functions)
				&& isSimpleExpression(node.init)
			)) {
				return;
			}

			declarations.set(sourceCode.getText(node.init), {
				scope: sourceCode.getScope(node),
				variables: sourceCode.getDeclaredVariables(node),
				objectPattern: node.id,
			});
		},
		MemberExpression(node) {
			if (
				node.computed
				|| (
					isCallOrNewExpression(node.parent)
					&& node.parent.callee === node
				)
				|| isLeftHandSide(node)
			) {
				return;
			}

			const declaration = declarations.get(sourceCode.getText(node.object));

			if (!declaration) {
				return;
			}

			const {scope, objectPattern} = declaration;
			const memberScope = sourceCode.getScope(node);

			// Property is destructured outside the current scope
			if (!isChildInParentScope(memberScope, scope)) {
				return;
			}

			const destructurings = objectPattern.properties.filter(property =>
				property.type === 'Property'
				&& property.key.type === 'Identifier'
				&& property.value.type === 'Identifier',
			);
			const lastProperty = objectPattern.properties.at(-1);

			const hasRest = lastProperty && lastProperty.type === 'RestElement';

			const expression = sourceCode.getText(node);
			const member = sourceCode.getText(node.property);

			// Member might already be destructured
			const destructuredMember = destructurings.find(property =>
				property.key.name === member,
			);

			if (!destructuredMember) {
				// Don't destructure additional members when rest is used
				if (hasRest) {
					return;
				}

				// Destructured member collides with an existing identifier
				if (getAvailableVariableName(member, [memberScope]) !== member) {
					return;
				}
			}

			// Don't try to fix nested member expressions
			if (node.parent.type === 'MemberExpression') {
				return {
					node,
					messageId: MESSAGE_ID,
				};
			}

			const newMember = destructuredMember ? destructuredMember.value.name : member;

			return {
				node,
				messageId: MESSAGE_ID,
				suggest: [{
					messageId: MESSAGE_ID_SUGGEST,
					data: {
						expression,
						property: newMember,
					},
					* fix(fixer) {
						const {properties} = objectPattern;
						const lastProperty = properties.at(-1);

						yield fixer.replaceText(node, newMember);

						if (!destructuredMember) {
							yield lastProperty
								? fixer.insertTextAfter(lastProperty, `, ${newMember}`)
								: fixer.replaceText(objectPattern, `{${newMember}}`);
						}
					},
				}],
			};
		},
	};
};

/** @type {import('eslint').Rule.RuleModule} */
const config = {
	create,
	meta: {
		type: 'suggestion',
		docs: {
			description: 'Use destructured variables over properties.',
			recommended: false,
		},
		fixable: 'code',
		hasSuggestions: true,
		messages: {
			[MESSAGE_ID]: 'Use destructured variables over properties.',
			[MESSAGE_ID_SUGGEST]: 'Replace `{{expression}}` with destructured property `{{property}}`.',
		},
	},
};

export default config;
