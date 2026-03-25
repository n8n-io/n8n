import {isNodeMatches} from '../utils/is-node-matches.js';

/**
Check if the given node is a tagged template literal.

@param {Node} node - The AST node to check.
@param {string[]} tags - The object name or key paths.
@returns {boolean}
*/
export default function isTaggedTemplateLiteral(node, tags) {
	if (
		node.type !== 'TemplateLiteral'
		|| node.parent.type !== 'TaggedTemplateExpression'
		|| node.parent.quasi !== node
	) {
		return false;
	}

	if (tags) {
		return isNodeMatches(node.parent.tag, tags);
	}

	return true;
}
