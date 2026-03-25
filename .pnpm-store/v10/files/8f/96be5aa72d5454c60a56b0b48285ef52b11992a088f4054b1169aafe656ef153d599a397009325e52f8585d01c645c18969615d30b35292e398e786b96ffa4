import {findVariable} from '@eslint-community/eslint-utils';

const getReferences = (scope, nodeOrName) => {
	const {references = []} = findVariable(scope, nodeOrName) || {};
	return references;
};

/**
Check if `this`, `arguments`, or the function name is used inside of itself.

@param {Node} functionNode - The function node.
@param {Scope} functionScope - The scope of the function node.
@returns {boolean}
*/
export default function isFunctionSelfUsedInside(functionNode, functionScope) {
	/* c8 ignore next 3 */
	if (functionScope.block !== functionNode) {
		throw new Error('"functionScope" should be the scope of "functionNode".');
	}

	const {type, id} = functionNode;
	if (type === 'ArrowFunctionExpression') {
		return false;
	}

	if (functionScope.thisFound) {
		return true;
	}

	if (getReferences(functionScope, 'arguments').some(({from}) => from === functionScope)) {
		return true;
	}

	if (id && getReferences(functionScope, id).length > 0) {
		return true;
	}

	return false;
}
