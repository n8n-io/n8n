import { RuleTester } from '@typescript-eslint/rule-tester';
import tseslint from 'typescript-eslint';
import * as vueParser from 'vue-eslint-parser';

import { designSystemComponentPath } from './design-system-component-path.js';
import { createElementPlusImportBanRule } from './element-plus-import-ban.factory.js';
import { createRekaUiImportBanRule } from './reka-ui-import-ban.factory.js';

const ruleTester = new RuleTester();

const vueRuleTester = new RuleTester({
	languageOptions: {
		parser: vueParser,
		parserOptions: {
			ecmaVersion: 'latest',
			sourceType: 'module',
			parser: tseslint.parser,
			extraFileExtensions: ['.vue'],
		},
	},
});

const template = (body: string) => `<template>${body}</template>`;

const elementPlusRule = createElementPlusImportBanRule({
	names: ['ElCollapse'],
	componentPaths: ['collapse'],
	templateNames: ['el-collapse', 'ElCollapse'],
	allowedPath: designSystemComponentPath('components/N8nCollapse'),
	messageId: 'noElementPlusCollapse',
	description: 'Test ban for the shared Element Plus visitor.',
	message: 'Do not use Element Plus `{{name}}`.',
});

const rekaRule = createRekaUiImportBanRule({
	prefix: ['Dialog', 'AlertDialog'],
	allowedPath: designSystemComponentPath('components/N8nDialog'),
	messageId: 'noRekaUiDialogSample',
	description: 'Test ban for the shared Reka UI visitor.',
	replacement: ['N8nDialog', 'N8nAlertDialog'],
});

const elementPlusError = (name: string) => ({
	messageId: 'noElementPlusCollapse' as const,
	data: { name },
});

const rekaError = (name: string) => ({
	messageId: 'noRekaUiDialogSample' as const,
	data: { name },
});

ruleTester.run('element-plus import ban factory', elementPlusRule, {
	valid: [
		{ code: "import { ElDialog } from 'element-plus';" },
		{
			name: 'a longer path segment does not match',
			code: "import Transition from 'element-plus/es/components/collapse-transition';",
		},
		{
			name: 'allowed wrapper path',
			code: "import { ElCollapse } from 'element-plus';",
			filename:
				'/repo/packages/frontend/@n8n/design-system/src/components/N8nCollapse/Collapse.vue',
		},
		{
			name: 'allowed wrapper path with windows separators',
			code: "import { ElCollapse } from 'element-plus';",
			filename:
				'C:\\repo\\packages\\frontend\\@n8n\\design-system\\src\\components\\N8nCollapse\\Collapse.vue',
		},
	],
	invalid: [
		{
			name: 'named import',
			code: "import { ElCollapse } from 'element-plus';",
			errors: [elementPlusError('ElCollapse')],
		},
		{
			name: 'deep component path',
			code: "import Collapse from 'element-plus/es/components/collapse';",
			errors: [elementPlusError('element-plus/es/components/collapse')],
		},
		{
			name: 'deep component subpath',
			code: "import Item from 'element-plus/es/components/collapse/src/collapse-item';",
			errors: [elementPlusError('element-plus/es/components/collapse/src/collapse-item')],
		},
		{
			name: 'named re-export',
			code: "export { ElCollapse } from 'element-plus';",
			errors: [elementPlusError('ElCollapse')],
		},
	],
});

const collapseWrapperPath =
	'/repo/packages/frontend/@n8n/design-system/src/components/N8nCollapse/Collapse.vue';

vueRuleTester.run('element-plus import ban factory templates', elementPlusRule, {
	valid: [
		{
			name: 'a longer template name does not match',
			filename: 'Component.vue',
			code: template('<el-collapse-item />'),
		},
		{
			name: 'template tags in the allowed wrapper path',
			filename: collapseWrapperPath,
			code: template('<el-collapse><ElCollapse /></el-collapse>'),
		},
	],
	invalid: [
		{
			name: 'kebab-case template tag',
			filename: 'Component.vue',
			code: template('<el-collapse />'),
			errors: [elementPlusError('el-collapse')],
		},
		{
			name: 'PascalCase template tag',
			filename: 'Component.vue',
			code: template('<ElCollapse />'),
			errors: [elementPlusError('ElCollapse')],
		},
		{
			name: 'named import and template tag in one vue file',
			filename: 'Component.vue',
			code: `<script>import { ElCollapse } from 'element-plus';</script>${template('<el-collapse />')}`,
			errors: [elementPlusError('ElCollapse'), elementPlusError('el-collapse')],
		},
	],
});

ruleTester.run('reka-ui import ban factory', rekaRule, {
	valid: [
		{
			name: 'a different prefix stays allowed',
			code: "import { SelectRoot } from 'reka-ui';",
		},
		{
			name: 'allowed wrapper path',
			code: "import { DialogRoot, AlertDialogContent } from 'reka-ui';",
			filename: '/repo/packages/frontend/@n8n/design-system/src/components/N8nDialog/Dialog.vue',
		},
	],
	invalid: [
		{
			name: 'each configured prefix is flagged',
			code: "import { DialogRoot, AlertDialogContent, SelectRoot } from 'reka-ui';",
			errors: [rekaError('DialogRoot'), rekaError('AlertDialogContent')],
		},
		{
			name: 'type-only import',
			code: "import type { DialogContentProps } from 'reka-ui';",
			errors: [rekaError('DialogContentProps')],
		},
	],
});
