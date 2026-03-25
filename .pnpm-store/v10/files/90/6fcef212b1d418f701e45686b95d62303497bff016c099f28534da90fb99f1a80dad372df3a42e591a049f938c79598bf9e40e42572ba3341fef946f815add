import {isEmptyNode, isDirective} from './ast/index.js';

const MESSAGE_ID = 'no-empty-file';
const messages = {
	[MESSAGE_ID]: 'Empty files are not allowed.',
};

const isEmpty = node => isEmptyNode(node, isDirective);

const isTripleSlashDirective = node =>
	node.type === 'Line' && node.value.startsWith('/');

const hasTripeSlashDirectives = comments =>
	comments.some(currentNode => isTripleSlashDirective(currentNode));

/** @param {import('eslint').Rule.RuleContext} context */
const create = context => {
	const filename = context.physicalFilename;

	if (!/\.(?:js|mjs|cjs|jsx|ts|mts|cts|tsx)$/i.test(filename)) {
		return;
	}

	return {
		Program(node) {
			if (node.body.some(node => !isEmpty(node))) {
				return;
			}

			const {sourceCode} = context;
			const comments = sourceCode.getAllComments();

			if (hasTripeSlashDirectives(comments)) {
				return;
			}

			return {
				node,
				messageId: MESSAGE_ID,
			};
		},
	};
};

/** @type {import('eslint').Rule.RuleModule} */
const config = {
	create,
	meta: {
		type: 'suggestion',
		docs: {
			description: 'Disallow empty files.',
			recommended: true,
		},
		messages,
	},
};

export default config;
