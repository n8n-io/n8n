import * as numeric from './utils/numeric.js';
import {isBigIntLiteral} from './ast/index.js';

const MESSAGE_ID = 'numeric-separators-style';
const messages = {
	[MESSAGE_ID]: 'Invalid group length in numeric value.',
};

function addSeparator(value, {minimumDigits, groupLength}, fromLeft) {
	const {length} = value;

	if (length < minimumDigits) {
		return value;
	}

	const parts = [];
	if (fromLeft) {
		for (let start = 0; start < length; start += groupLength) {
			const end = Math.min(start + groupLength, length);
			parts.push(value.slice(start, end));
		}
	} else {
		for (let end = length; end > 0; end -= groupLength) {
			const start = Math.max(end - groupLength, 0);
			parts.unshift(value.slice(start, end));
		}
	}

	return parts.join('_');
}

function addSeparatorFromLeft(value, options) {
	return addSeparator(value, options, true);
}

function formatNumber(value, options) {
	const {integer, dot, fractional} = numeric.parseFloatNumber(value);
	return addSeparator(integer, options) + dot + addSeparatorFromLeft(fractional, options);
}

function format(value, {prefix, data}, options) {
	const formatOption = options[prefix.toLowerCase()];

	if (prefix) {
		return prefix + addSeparator(data, formatOption);
	}

	const {
		number,
		mark,
		sign,
		power,
	} = numeric.parseNumber(value);

	return formatNumber(number, formatOption) + mark + sign + addSeparator(power, options['']);
}

const defaultOptions = {
	binary: {minimumDigits: 0, groupLength: 4},
	octal: {minimumDigits: 0, groupLength: 4},
	hexadecimal: {minimumDigits: 0, groupLength: 2},
	number: {minimumDigits: 5, groupLength: 3},
};
const create = context => {
	const {
		onlyIfContainsSeparator,
		binary,
		octal,
		hexadecimal,
		number,
	} = {
		onlyIfContainsSeparator: false,
		...context.options[0],
	};

	const options = {
		'0b': {
			onlyIfContainsSeparator,
			...defaultOptions.binary,
			...binary,
		},
		'0o': {
			onlyIfContainsSeparator,
			...defaultOptions.octal,
			...octal,
		},
		'0x': {
			onlyIfContainsSeparator,
			...defaultOptions.hexadecimal,
			...hexadecimal,
		},
		'': {
			onlyIfContainsSeparator,
			...defaultOptions.number,
			...number,
		},
	};

	return {
		Literal(node) {
			if (!numeric.isNumeric(node) || numeric.isLegacyOctal(node)) {
				return;
			}

			const {raw} = node;
			let number = raw;
			let suffix = '';
			if (isBigIntLiteral(node)) {
				number = raw.slice(0, -1);
				suffix = 'n';
			}

			const strippedNumber = number.replaceAll('_', '');
			const {prefix, data} = numeric.getPrefix(strippedNumber);

			const {onlyIfContainsSeparator} = options[prefix.toLowerCase()];
			if (onlyIfContainsSeparator && !raw.includes('_')) {
				return;
			}

			const formatted = format(strippedNumber, {prefix, data}, options) + suffix;

			if (raw !== formatted) {
				return {
					node,
					messageId: MESSAGE_ID,
					fix: fixer => fixer.replaceText(node, formatted),
				};
			}
		},
	};
};

const formatOptionsSchema = () => ({
	type: 'object',
	additionalProperties: false,
	properties: {
		onlyIfContainsSeparator: {
			type: 'boolean',
		},
		minimumDigits: {
			type: 'integer',
			minimum: 0,
		},
		groupLength: {
			type: 'integer',
			minimum: 1,
		},
	},
});

const schema = [{
	type: 'object',
	additionalProperties: false,
	properties: {
		...Object.fromEntries(
			Object.entries(defaultOptions).map(([type]) => [type, formatOptionsSchema()]),
		),
		onlyIfContainsSeparator: {
			type: 'boolean',
		},
	},
}];

/** @type {import('eslint').Rule.RuleModule} */
const config = {
	create,
	meta: {
		type: 'suggestion',
		docs: {
			description: 'Enforce the style of numeric separators by correctly grouping digits.',
			recommended: true,
		},
		fixable: 'code',
		schema,
		defaultOptions: [
			{
				onlyIfContainsSeparator: false,
				binary: defaultOptions.binary,
				octal: defaultOptions.octal,
				hexadecimal: defaultOptions.hexadecimal,
				number: defaultOptions.number,
			},
		],
		messages,
	},
};

export default config;
