import { RuleTester } from '@typescript-eslint/rule-tester';
import * as vueParser from 'vue-eslint-parser';

import { UseFeatureMaturityBadgesRule } from './use-feature-maturity-badges.js';

const ruleTester = new RuleTester({
	languageOptions: {
		parser: vueParser,
		parserOptions: {
			ecmaVersion: 'latest',
			sourceType: 'module',
		},
	},
});

const vue = (template: string, script = '') => `${script}<template>${template}</template>`;

ruleTester.run('use-feature-maturity-badges', UseFeatureMaturityBadgesRule, {
	valid: [
		{
			filename: 'Component.vue',
			code: vue('<N8nFeatureMaturityBadges feature="agents" />'),
		},
		{
			filename: 'Component.vue',
			code: vue('<N8nFeatureMaturityBadges preview />'),
		},
		{
			filename: 'src/components/FeatureMaturityBadges/FeatureMaturityBadges.vue',
			code: vue('<N8nPreviewBadge /><N8nEnterpriseReadinessBadge />'),
		},
		{
			filename: 'src/components/PreviewBadge/PreviewBadge.vue',
			code: vue('<span />'),
		},
		{
			filename: 'src/components/EnterpriseReadinessBadge/EnterpriseReadinessBadge.vue',
			code: vue('<span />'),
		},
		{
			filename: 'PromotionPreviewBadges.vue',
			code: vue('<div data-test-id="promotion-preview-badges" />'),
		},
	],
	invalid: [
		{
			filename: 'MenuItem.vue',
			code: vue('<PreviewBadge />'),
			errors: [{ messageId: 'useFeatureMaturityBadges' }],
		},
		{
			filename: 'Tabs.vue',
			code: vue('<N8nPreviewBadge />'),
			errors: [{ messageId: 'useFeatureMaturityBadges' }],
		},
		{
			filename: 'Row.vue',
			code: vue('<N8nEnterpriseReadinessBadge />'),
			errors: [{ messageId: 'useFeatureMaturityBadges' }],
		},
		{
			filename: 'Row.vue',
			code: vue('<n8n-enterprise-readiness-badge />'),
			errors: [{ messageId: 'useFeatureMaturityBadges' }],
		},
		{
			filename: 'MenuItem.vue',
			code: vue(
				'',
				"<script setup>import PreviewBadge from '../PreviewBadge/PreviewBadge.vue';</script>",
			),
			errors: [{ messageId: 'useFeatureMaturityBadges' }],
		},
		{
			filename: 'Page.vue',
			code: vue(
				'',
				"<script setup>import { N8nPreviewBadge, N8nText } from '@n8n/design-system';</script>",
			),
			errors: [{ messageId: 'useFeatureMaturityBadges' }],
		},
	],
});
