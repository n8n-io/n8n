import { ESLintUtils } from '@typescript-eslint/utils';
import type { TSESTree } from '@typescript-eslint/utils';
import type { RuleListener } from '@typescript-eslint/utils/ts-eslint';
import type { VElement } from 'vue-eslint-parser/ast/nodes';

const BANNED_ELEMENTS = new Set([
	'N8nPreviewBadge',
	'n8n-preview-badge',
	'PreviewBadge',
	'N8nEnterpriseReadinessBadge',
	'n8n-enterprise-readiness-badge',
	'EnterpriseReadinessBadge',
]);

const BANNED_IMPORTS = new Set([
	'N8nPreviewBadge',
	'PreviewBadge',
	'N8nEnterpriseReadinessBadge',
	'EnterpriseReadinessBadge',
]);

const BADGE_MODULE = /(?:^|\/)(?:PreviewBadge|EnterpriseReadinessBadge)(?:\.vue)?$/;

type TemplateVisitor = Record<string, (node: VElement) => void>;

type VueParserServices = {
	defineTemplateBodyVisitor: (
		templateVisitor: TemplateVisitor,
		scriptVisitor?: RuleListener,
	) => RuleListener;
};

const isAllowedFile = (filename: string) =>
	filename.endsWith('FeatureMaturityBadges.vue') ||
	filename.endsWith('PreviewBadge/PreviewBadge.vue') ||
	filename.endsWith('EnterpriseReadinessBadge/EnterpriseReadinessBadge.vue');

export const UseFeatureMaturityBadgesRule = ESLintUtils.RuleCreator.withoutDocs({
	meta: {
		type: 'problem',
		docs: {
			description:
				'Require Preview and Limited enterprise support badges to render through N8nFeatureMaturityBadges',
		},
		messages: {
			useFeatureMaturityBadges:
				'Use N8nFeatureMaturityBadges instead of {{name}}. The shared component reads the feature list.',
		},
		schema: [],
	},
	defaultOptions: [],
	create(context) {
		if (isAllowedFile(context.filename)) return {};

		const parserServices = context.sourceCode.parserServices as unknown as VueParserServices;
		if (!parserServices.defineTemplateBodyVisitor) return {};

		return parserServices.defineTemplateBodyVisitor(
			{
				VElement(node) {
					if (!BANNED_ELEMENTS.has(node.rawName)) return;

					context.report({
						node: node as unknown as TSESTree.Node,
						messageId: 'useFeatureMaturityBadges',
						data: { name: node.rawName },
					});
				},
			},
			{
				ImportDeclaration(node) {
					const source = node.source.value;
					if (typeof source !== 'string') return;

					if (source === '@n8n/design-system') {
						for (const specifier of node.specifiers) {
							if (specifier.type !== 'ImportSpecifier') continue;
							if (specifier.imported.type !== 'Identifier') continue;
							if (!BANNED_IMPORTS.has(specifier.imported.name)) continue;

							context.report({
								node: specifier,
								messageId: 'useFeatureMaturityBadges',
								data: { name: specifier.imported.name },
							});
						}
						return;
					}

					if (!BADGE_MODULE.test(source)) return;

					context.report({
						node,
						messageId: 'useFeatureMaturityBadges',
						data: { name: source },
					});
				},
			},
		);
	},
});
