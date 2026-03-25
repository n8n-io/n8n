export function isLiteral(node, value) {
	if (node?.type !== 'Literal') {
		return false;
	}

	if (value === null) {
		return node.raw === 'null';
	}

	return node.value === value;
}

export const isStringLiteral = node => node?.type === 'Literal' && typeof node.value === 'string';

export const isNumberLiteral = node => node.type === 'Literal' && typeof node.value === 'number';

export const isRegexLiteral = node => node.type === 'Literal' && Boolean(node.regex);

// eslint-disable-next-line unicorn/no-null
export const isNullLiteral = node => isLiteral(node, null);

export const isBigIntLiteral = node => node.type === 'Literal' && Boolean(node.bigint);

