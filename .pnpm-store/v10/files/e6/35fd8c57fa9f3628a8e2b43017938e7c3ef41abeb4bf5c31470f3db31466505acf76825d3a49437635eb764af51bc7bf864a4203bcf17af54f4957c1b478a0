import escapeString from './utils/escape-string.js';
import escapeTemplateElementRaw from './utils/escape-template-element-raw.js';
import {replaceTemplateElement} from './fix/index.js';

const defaultMessage = 'Prefer `{{suggest}}` over `{{match}}`.';
const SUGGESTION_MESSAGE_ID = 'replace';
const messages = {
	[SUGGESTION_MESSAGE_ID]: 'Replace `{{match}}` with `{{suggest}}`.',
};

const ignoredIdentifier = new Set([
	'gql',
	'html',
	'svg',
]);

const ignoredMemberExpressionObject = new Set([
	'styled',
]);

const isIgnoredTag = node => {
	if (!node.parent || !node.parent.parent || !node.parent.parent.tag) {
		return false;
	}

	const {tag} = node.parent.parent;

	if (tag.type === 'Identifier' && ignoredIdentifier.has(tag.name)) {
		return true;
	}

	if (tag.type === 'MemberExpression') {
		const {object} = tag;
		if (
			object.type === 'Identifier'
			&& ignoredMemberExpressionObject.has(object.name)
		) {
			return true;
		}
	}

	return false;
};

function getReplacements(patterns) {
	return Object.entries(patterns)
		.map(([match, options]) => {
			if (typeof options === 'string') {
				options = {
					suggest: options,
				};
			}

			return {
				match,
				regex: new RegExp(match, 'gu'),
				fix: true,
				...options,
			};
		});
}

/** @param {import('eslint').Rule.RuleContext} context */
const create = context => {
	const {patterns} = {
		patterns: {},
		...context.options[0],
	};
	const replacements = getReplacements(patterns);

	if (replacements.length === 0) {
		return;
	}

	context.on(['Literal', 'TemplateElement'], node => {
		const {type, value, raw} = node;

		let string;
		if (type === 'Literal') {
			string = value;
		} else if (!isIgnoredTag(node)) {
			string = value.raw;
		}

		if (!string || typeof string !== 'string') {
			return;
		}

		const replacement = replacements.find(({regex}) => regex.test(string));

		if (!replacement) {
			return;
		}

		const {fix: autoFix, message = defaultMessage, match, suggest, regex} = replacement;
		const problem = {
			node,
			message,
			data: {
				match,
				suggest,
			},
		};

		const fixed = string.replace(regex, suggest);
		const fix = type === 'Literal'
			? fixer => {
				const [quote] = raw;
				return fixer.replaceText(
					node,
					node.parent.type === 'JSXAttribute' ? quote + fixed + quote : escapeString(fixed, quote),
				);
			}
			: fixer => replaceTemplateElement(
				fixer,
				node,
				escapeTemplateElementRaw(fixed),
			);

		if (autoFix) {
			problem.fix = fix;
		} else {
			problem.suggest = [
				{
					messageId: SUGGESTION_MESSAGE_ID,
					fix,
				},
			];
		}

		return problem;
	});
};

const schema = [
	{
		type: 'object',
		additionalProperties: false,
		properties: {
			patterns: {
				type: 'object',
				additionalProperties: {
					anyOf: [
						{
							type: 'string',
						},
						{
							type: 'object',
							required: [
								'suggest',
							],
							properties: {
								suggest: {
									type: 'string',
								},
								fix: {
									type: 'boolean',
									// Default: true
								},
								message: {
									type: 'string',
									// Default: ''
								},
							},
							additionalProperties: false,
						},
					],
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
			description: 'Enforce better string content.',
			recommended: false,
		},
		fixable: 'code',
		hasSuggestions: true,
		schema,
		defaultOptions: [{}],
		messages,
	},
};

export default config;
