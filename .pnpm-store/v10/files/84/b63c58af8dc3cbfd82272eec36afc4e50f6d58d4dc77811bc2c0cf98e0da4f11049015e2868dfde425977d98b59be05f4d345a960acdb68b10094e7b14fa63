import {isNumberLiteral, isBigIntLiteral} from '../ast/index.js';

// Determine whether this node is a decimal integer literal.
// Copied from https://github.com/eslint/eslint/blob/cc4871369645c3409dc56ded7a555af8a9f63d51/lib/rules/utils/ast-utils.js#L1237
const DECIMAL_INTEGER_PATTERN = /^(?:0|0[0-7]*[89]\d*|[1-9](?:_?\d)*)$/u;

export const isDecimalInteger = text => DECIMAL_INTEGER_PATTERN.test(text);

export const isDecimalIntegerNode = node => isNumberLiteral(node) && isDecimalInteger(node.raw);

export const isNumeric = node => isNumberLiteral(node) || isBigIntLiteral(node);

export const isLegacyOctal = node => isNumberLiteral(node) && /^0\d+$/.test(node.raw);

export function getPrefix(text) {
	let prefix = '';
	let data = text;

	if (/^0[box]/i.test(text)) {
		prefix = text.slice(0, 2);
		data = text.slice(2);
	}

	return {prefix, data};
}

export function parseNumber(text) {
	const {
		number,
		mark = '',
		sign = '',
		power = '',
	} = text.match(/^(?<number>[\d._]*?)(?:(?<mark>[Ee])(?<sign>[+-])?(?<power>[\d_]+))?$/).groups;

	return {
		number,
		mark,
		sign,
		power,
	};
}

export function parseFloatNumber(text) {
	const parts = text.split('.');
	const [integer, fractional = ''] = parts;
	const dot = parts.length === 2 ? '.' : '';

	return {integer, dot, fractional};
}
