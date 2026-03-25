import {listen} from './shared/no-unnecessary-length-or-infinity-rule.js';

const MESSAGE_ID = 'no-unnecessary-array-splice-count';
const messages = {
	[MESSAGE_ID]: 'Passing `{{description}}` as the `{{argumentName}}` argument is unnecessary.',
};

/** @type {import('eslint').Rule.RuleModule} */
const config = {
	create: context => listen(context, {methods: ['splice', 'toSpliced'], messageId: MESSAGE_ID}),
	meta: {
		type: 'suggestion',
		docs: {
			description: 'Disallow using `.length` or `Infinity` as the `deleteCount` or `skipCount` argument of `Array#{splice,toSpliced}()`.',
			recommended: true,
		},
		fixable: 'code',

		messages,
	},
};

export default config;
