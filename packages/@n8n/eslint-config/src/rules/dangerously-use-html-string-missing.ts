import { ESLintUtils, TSESTree } from '@typescript-eslint/utils';
import path from 'path';
import fs from 'fs';

const USE_HTML_PROPERTY = 'dangerouslyUseHTMLString';

export const DangerouslyUseHtmlStringMissingRule = ESLintUtils.RuleCreator.withoutDocs({
	meta: {
		type: 'problem',
		docs: {
			description:
				'Calls to the `showToast` and `showMessage` methods must include `dangerouslyUseHTMLString: true` when at least one of the values in `title` or `message` contains HTML.',
		},
		messages: {
			dangerouslyUseHtml:
				'Set `{{ useHtmlProperty }}: true` in the argument to `{{ methodName }}`. At least one of the values in `title` or `message` contains HTML.',
		},
		schema: [],
	},
	defaultOptions: [],
	create(context) {
		const cwd = context.cwd;
		const locale = 'src/plugins/i18n/locales/en.json';

		const LOCALE_NAMESPACE = '$locale';
		const LOCALE_FILEPATH = cwd.endsWith('editor-ui')
			? path.join(cwd, locale)
			: path.join(cwd, 'packages/frontend/editor-ui', locale);

		let LOCALE_MAP: Record<string, string>;

		try {
			LOCALE_MAP = JSON.parse(fs.readFileSync(LOCALE_FILEPATH, 'utf-8'));
		} catch {
			console.log(
				'[dangerously-use-html-string-missing] Failed to load locale map, skipping rule...',
			);
			return {};
		}

		const METHODS_POSSIBLY_REQUIRING_HTML = new Set(['showToast', 'showMessage']);
		const PROPERTIES_POSSIBLY_CONTAINING_HTML = new Set(['title', 'message']);

		const isMethodPossiblyRequiringRawHtml = (node: TSESTree.CallExpression) =>
			node.callee.type === 'MemberExpression' &&
			node.callee.object.type === 'ThisExpression' &&
			node.callee.property.type === 'Identifier' &&
			METHODS_POSSIBLY_REQUIRING_HTML.has(node.callee.property.name) &&
			node.arguments.length === 1 &&
			node.arguments[0]?.type === 'ObjectExpression';

		const isPropertyWithLocaleStringAsValue = (property: TSESTree.Property) =>
			property.key.type === 'Identifier' &&
			PROPERTIES_POSSIBLY_CONTAINING_HTML.has(property.key.name) &&
			property.value.type === 'CallExpression' &&
			property.value.callee.type === 'MemberExpression' &&
			property.value.callee.object.type === 'MemberExpression' &&
			property.value.callee.object.property.type === 'Identifier' &&
			property.value.callee.object.property.name === LOCALE_NAMESPACE &&
			property.value.arguments.length >= 1 &&
			property.value.arguments[0].type === 'Literal' &&
			typeof property.value.arguments[0].value === 'string';

		const containsHtml = (str: string): boolean => {
			let insideTag = false;

			for (const char of str) {
				if (char === '<') {
					insideTag = true;
				} else if (char === '>') {
					if (insideTag) return true;
					insideTag = false;
				}
			}

			return false;
		};

		return {
			CallExpression(node) {
				if (!isMethodPossiblyRequiringRawHtml(node)) return;

				const arg = node.arguments[0];

				if (!arg || arg.type !== 'ObjectExpression') return;

				const hasArgWithHtml = arg.properties
					.filter(
						(prop): prop is TSESTree.Property => prop.type === TSESTree.AST_NODE_TYPES.Property,
					)
					.reduce<string[]>((acc, p) => {
						if (
							isPropertyWithLocaleStringAsValue(p) &&
							p.value.type === TSESTree.AST_NODE_TYPES.CallExpression &&
							p.value.arguments[0].type === TSESTree.AST_NODE_TYPES.Literal
						) {
							const key = p.value.arguments[0].value as string;
							return [...acc, key];
						}
						return acc;
					}, [])
					.some((key) => containsHtml(LOCALE_MAP[key]));

				if (!hasArgWithHtml) return;

				const hasRawHtmlPropertyAsTrue = arg.properties.some(
					(p): boolean =>
						p.type === TSESTree.AST_NODE_TYPES.Property &&
						p.key.type === 'Identifier' &&
						p.key.name === USE_HTML_PROPERTY &&
						p.value.type === 'Literal' &&
						p.value.value === true,
				);

				if (hasRawHtmlPropertyAsTrue) return;

				if (node.callee.type !== 'MemberExpression' || node.callee.property.type !== 'Identifier')
					return;

				const methodName = node.callee.property.name;

				context.report({
					node,
					messageId: 'dangerouslyUseHtml',
					data: {
						useHtmlProperty: USE_HTML_PROPERTY,
						methodName,
					},
				});
			},
		};
	},
});
