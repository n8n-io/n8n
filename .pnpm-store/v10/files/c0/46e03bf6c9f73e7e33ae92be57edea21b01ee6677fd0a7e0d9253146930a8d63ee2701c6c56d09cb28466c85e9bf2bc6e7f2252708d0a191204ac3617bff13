import stripIndent from 'strip-indent';
import indentString from 'indent-string';
import esquery from 'esquery';
import {replaceTemplateElement} from './fix/index.js';
import {isMethodCall, isCallExpression, isTaggedTemplateLiteral} from './ast/index.js';
import {isNodeMatches} from './utils/index.js';

const MESSAGE_ID_IMPROPERLY_INDENTED_TEMPLATE = 'template-indent';
const messages = {
	[MESSAGE_ID_IMPROPERLY_INDENTED_TEMPLATE]: 'Templates should be properly indented.',
};

const isJestInlineSnapshot = node =>
	isMethodCall(node.parent, {
		method: 'toMatchInlineSnapshot',
		argumentsLength: 1,
		optionalCall: false,
		optionalMember: false,
	})
	&& node.parent.arguments[0] === node
	&& isCallExpression(node.parent.callee.object, {
		name: 'expect',
		argumentsLength: 1,
		optionalCall: false,
		optionalMember: false,
	});

const parsedEsquerySelectors = new Map();
const parseEsquerySelector = selector => {
	if (!parsedEsquerySelectors.has(selector)) {
		parsedEsquerySelectors.set(selector, esquery.parse(selector));
	}

	return parsedEsquerySelectors.get(selector);
};

/** @param {import('eslint').Rule.RuleContext} context */
const create = context => {
	const {sourceCode} = context;
	const options = {
		tags: ['outdent', 'dedent', 'gql', 'sql', 'html', 'styled'],
		functions: ['dedent', 'stripIndent'],
		selectors: [],
		comments: ['HTML', 'indent'],
		...context.options[0],
	};

	options.comments = options.comments.map(comment => comment.toLowerCase());

	/** @param {import('@babel/core').types.TemplateLiteral} node */
	const getProblem = node => {
		const delimiter = '__PLACEHOLDER__' + Math.random();
		const joined = node.quasis
			.map(quasi => {
				const untrimmedText = sourceCode.getText(quasi);
				return untrimmedText.slice(1, quasi.tail ? -1 : -2);
			})
			.join(delimiter);

		const eolMatch = joined.match(/\r?\n/);
		if (!eolMatch) {
			return;
		}

		const eol = eolMatch[0];

		const startLine = sourceCode.lines[sourceCode.getLoc(node).start.line - 1];
		const marginMatch = startLine.match(/^(\s*)\S/);
		const parentMargin = marginMatch ? marginMatch[1] : '';

		let indent;
		if (typeof options.indent === 'string') {
			indent = options.indent;
		} else if (typeof options.indent === 'number') {
			indent = ' '.repeat(options.indent);
		} else {
			const tabs = parentMargin.startsWith('\t');
			indent = tabs ? '\t' : '  ';
		}

		const dedented = stripIndent(joined);
		const trimmed = dedented.replaceAll(new RegExp(`^${eol}|${eol}[ \t]*$`, 'g'), '');

		const fixed
			= eol
				+ indentString(trimmed, 1, {indent: parentMargin + indent})
				+ eol
				+ parentMargin;

		if (fixed === joined) {
			return;
		}

		return {
			node,
			messageId: MESSAGE_ID_IMPROPERLY_INDENTED_TEMPLATE,
			fix: fixer => fixed
				.split(delimiter)
				.map((replacement, index) => replaceTemplateElement(fixer, node.quasis[index], replacement)),
		};
	};

	const shouldIndent = node => {
		if (options.comments.length > 0) {
			const previousToken = sourceCode.getTokenBefore(node, {includeComments: true});
			if (previousToken?.type === 'Block' && options.comments.includes(previousToken.value.trim().toLowerCase())) {
				return true;
			}
		}

		if (isJestInlineSnapshot(node)) {
			return true;
		}

		if (
			options.tags.length > 0
			&& isTaggedTemplateLiteral(node, options.tags)
		) {
			return true;
		}

		if (
			options.functions.length > 0
			&& node.parent.type === 'CallExpression'
			&& node.parent.arguments.includes(node)
			&& isNodeMatches(node.parent.callee, options.functions)
		) {
			return true;
		}

		if (options.selectors.length > 0) {
			const ancestors = sourceCode.getAncestors(node).reverse();
			if (options.selectors.some(selector => esquery.matches(node, parseEsquerySelector(selector), ancestors))) {
				return true;
			}
		}

		return false;
	};

	return {
		/** @param {import('@babel/core').types.TemplateLiteral} node */
		TemplateLiteral(node) {
			if (!shouldIndent(node)) {
				return;
			}

			return getProblem(node);
		},
	};
};

/** @type {import('json-schema').JSONSchema7[]} */
const schema = [
	{
		type: 'object',
		additionalProperties: false,
		properties: {
			indent: {
				oneOf: [
					{
						type: 'string',
						pattern: /^\s+$/.source,
					},
					{
						type: 'integer',
						minimum: 1,
					},
				],
			},
			tags: {
				type: 'array',
				uniqueItems: true,
				items: {
					type: 'string',
				},
			},
			functions: {
				type: 'array',
				uniqueItems: true,
				items: {
					type: 'string',
				},
			},
			selectors: {
				type: 'array',
				uniqueItems: true,
				items: {
					type: 'string',
				},
			},
			comments: {
				type: 'array',
				uniqueItems: true,
				items: {
					type: 'string',
				},
			},
		},
	},
];

/** @type {import('eslint').Rule.RuleModule} */
const config = {
	create,
	meta: {
		type: 'suggestion',
		docs: {
			description: 'Fix whitespace-insensitive template indentation.',
			recommended: true,
		},
		fixable: 'code',
		schema,
		defaultOptions: [{}],
		messages,
	},
};

export default config;
