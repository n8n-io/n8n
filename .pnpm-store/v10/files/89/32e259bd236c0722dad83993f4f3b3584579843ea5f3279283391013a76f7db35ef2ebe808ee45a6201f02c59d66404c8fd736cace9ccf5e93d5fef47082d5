import {GlobalReferenceTracker} from './utils/global-reference-tracker.js';

const MESSAGE_ID = 'no-document-cookie';
const messages = {
	[MESSAGE_ID]: 'Do not use `document.cookie` directly.',
};

const tracker = new GlobalReferenceTracker({
	object: 'document.cookie',
	filter: ({node}) => node.parent.type === 'AssignmentExpression' && node.parent.left === node,
	handle: ({node}) => ({node, messageId: MESSAGE_ID}),
});

/** @type {import('eslint').Rule.RuleModule} */
const config = {
	create: context => tracker.createListeners(context),
	meta: {
		type: 'problem',
		docs: {
			description: 'Do not use `document.cookie` directly.',
			recommended: true,
		},
		messages,
	},
};

export default config;
