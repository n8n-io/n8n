import {listen} from './shared/no-unnecessary-length-or-infinity-rule.js';

const MESSAGE_ID = 'no-unnecessary-slice-end';
const messages = {
	[MESSAGE_ID]: 'Passing `{{description}}` as the `end` argument is unnecessary.',
};

/** @type {import('eslint').Rule.RuleModule} */
const config = {
	create: context => listen(context, {methods: ['slice'], messageId: MESSAGE_ID}),
	meta: {
		type: 'suggestion',
		docs: {
			description: 'Disallow using `.length` or `Infinity` as the `end` argument of `{Array,String,TypedArray}#slice()`.',
			recommended: true,
		},
		fixable: 'code',
		messages,
	},
};

export default config;
