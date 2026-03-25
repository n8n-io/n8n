// TODO: Support more types
function getPredicate(options) {
	if (typeof options === 'string') {
		return node => node.type === options;
	}
}

export default function getAncestor(node, options) {
	const predicate = getPredicate(options);
	for (; node.parent; node = node.parent) {
		if (predicate(node)) {
			return node;
		}
	}
}
