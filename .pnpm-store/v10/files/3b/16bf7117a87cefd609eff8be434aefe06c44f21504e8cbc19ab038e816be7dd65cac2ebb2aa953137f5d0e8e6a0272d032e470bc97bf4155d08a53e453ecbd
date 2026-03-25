export default function getPreviousNode(node, sourceCode) {
	const {parent} = node;
	const visitorKeys = sourceCode.visitorKeys[parent.type] || Object.keys(parent);

	for (const property of visitorKeys) {
		const value = parent[property];

		if (value === node) {
			return;
		}

		if (Array.isArray(value)) {
			const index = value.indexOf(node);

			if (index !== -1) {
				return value[index - 1];
			}
		}
	}
}
