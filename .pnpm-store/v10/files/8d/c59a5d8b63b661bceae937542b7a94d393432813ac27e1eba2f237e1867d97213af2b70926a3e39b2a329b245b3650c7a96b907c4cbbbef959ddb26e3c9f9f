const isChainElement = node => node.type === 'MemberExpression' || node.type === 'CallExpression';

export default function hasOptionalChainElement(node) {
	if (!isChainElement(node)) {
		return false;
	}

	if (node.optional) {
		return true;
	}

	if (node.type === 'MemberExpression') {
		return hasOptionalChainElement(node.object);
	}

	return false;
}
