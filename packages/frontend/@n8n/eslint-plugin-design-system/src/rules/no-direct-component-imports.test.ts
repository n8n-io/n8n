import { RuleTester } from '@typescript-eslint/rule-tester';
import tseslint from 'typescript-eslint';
import * as vueParser from 'vue-eslint-parser';

import { NoDirectComponentImportsRule } from './no-direct-component-imports.js';
import {
	formatWrappedComponentReplacement,
	wrappedComponentBans,
	type WrappedComponentBan,
} from './wrapped-component-bans.js';
import { wrappedModuleBans, type WrappedModuleBan } from './wrapped-module-bans.js';

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

const root = '/repo/packages/frontend/@n8n/design-system/src';

const wrapperFile = (folder: string, fileName = 'Component.vue') => `${root}/${folder}/${fileName}`;

const error = (name: string, ban: WrappedComponentBan) => ({
	messageId: 'noDirectWrappedComponentImport' as const,
	data: {
		name,
		library: ban.library,
		replacement: formatWrappedComponentReplacement(ban.replacement),
	},
});

const lists = (values: readonly string[] | undefined, token: string): boolean =>
	values?.includes(token) === true;

const requireBan = (
	library: WrappedComponentBan['library'],
	token: string,
): WrappedComponentBan => {
	const ban = wrappedComponentBans.find((entry) => {
		if (entry.library !== library) return false;
		if (entry.library === 'reka-ui') return lists(entry.prefixes, token);
		return (
			lists(entry.names, token) ||
			lists(entry.componentPaths, token) ||
			lists(entry.templateNames, token)
		);
	});
	if (ban === undefined) throw new Error(`Missing ${library} ban for ${token}`);
	return ban;
};

const paginationBan = requireBan('reka-ui', 'Pagination');
const dialogBan = requireBan('reka-ui', 'Dialog');
const dateRangeBan = requireBan('reka-ui', 'DateRangePicker');
const toggleBan = requireBan('reka-ui', 'Toggle');
const menuBan = requireBan('element-plus', 'ElMenu');
const tabsBan = requireBan('element-plus', 'ElTabs');
const radioBan = requireBan('reka-ui', 'RadioGroup');

const paginationWrapper =
	'/repo/packages/frontend/@n8n/design-system/src/components/N8nPagination/reka-ui.ts';
const paginationWindowsPath =
	'C:\\repo\\packages\\frontend\\@n8n\\design-system\\src\\components\\N8nPagination\\Pagination.vue';

const template = (body: string) => `<template>${body}</template>`;

ruleTester.run('no-direct-component-imports', NoDirectComponentImportsRule, {
	valid: [
		...wrappedComponentBans.flatMap((ban) =>
			ban.allowedFolders.map((folder) => ({
				name: `${ban.library} ${ban.replacement.toString()} allowed in ${folder}`,
				code:
					ban.library === 'reka-ui'
						? `import { ${ban.prefixes.map((prefix) => `${prefix}Root`).join(', ')} } from 'reka-ui';`
						: `import { ${(ban.names ?? []).join(', ')} } from 'element-plus';`,
				filename: wrapperFile(folder),
			})),
		),
		{
			name: 'a reka primitive that is not migrated yet',
			code: "import { CollapsibleRoot, CollapsibleTrigger } from 'reka-ui';",
		},
		{
			name: 'an element-plus component that is not migrated yet',
			code: "import { ElDialog } from 'element-plus';",
		},
		{
			name: 'an element-plus service stays available',
			code: "import { ElNotification } from 'element-plus';",
		},
		{
			name: 'an element-plus type stays available',
			code: "import type { ElTooltipProps, UploadFile } from 'element-plus';",
		},
		{
			name: 'same export name from an unrelated package',
			code: "import { PaginationRoot } from 'some-other-pkg';",
		},
		{
			name: 'design-system component import',
			code: "import { N8nPagination } from '@n8n/design-system';",
		},
		{
			name: 're-export in the allowed wrapper path (windows separators)',
			code: "export { PaginationRoot, PaginationList } from 'reka-ui';",
			filename: paginationWindowsPath,
		},
		{
			name: 'DateRangePicker folder may import Popover and DateRangePicker',
			code: "import { PopoverRoot, DateRangePickerRoot } from 'reka-ui';",
			filename: wrapperFile('components/DateRangePicker'),
		},
		{
			name: 'dialog folder may import Dialog and AlertDialog',
			code: "import { DialogRoot, AlertDialogContent } from 'reka-ui';",
			filename: wrapperFile('components/N8nDialog', 'Dialog.vue'),
		},
		// Package-root namespace, star, and default forms do not name one primitive.
		{ name: 'namespace import bypass', code: "import * as Reka from 'reka-ui';" },
		{ name: 'star re-export bypass', code: "export * from 'reka-ui';" },
		{ name: 'namespace re-export bypass', code: "export * as Reka from 'reka-ui';" },
		{ name: 'default import bypass', code: "import Reka from 'reka-ui';" },
		{
			name: 'element-plus namespace import bypass',
			code: "import * as ElementPlus from 'element-plus';",
		},
		{ name: 'element-plus star re-export bypass', code: "export * from 'element-plus';" },
		{
			name: 'element-plus namespace re-export bypass',
			code: "export * as ElementPlus from 'element-plus';",
		},
		{ name: 'element-plus default import bypass', code: "import ElementPlus from 'element-plus';" },
		{
			name: 'deep path star re-export in the allowed wrapper',
			code: "export * from 'element-plus/es/components/menu';",
			filename: wrapperFile('components/N8nNavigationDropdown', 'menu.ts'),
		},
		{
			name: 'a pending element-plus deep path',
			code: "import Dialog from 'element-plus/es/components/dialog';",
		},
	],
	invalid: [
		...wrappedComponentBans.map((ban) => {
			if (ban.library === 'reka-ui') {
				const names = ban.prefixes.map((prefix) => `${prefix}Root`);
				return {
					name: `reka-ui ${ban.prefixes.join(', ')}`,
					code: `import { ${names.join(', ')} } from 'reka-ui';`,
					errors: names.map((name) => error(name, ban)),
				};
			}

			const names = [...(ban.names ?? [])];
			return {
				name: `element-plus ${names.join(', ')}`,
				code: `import { ${names.join(', ')} } from 'element-plus';`,
				errors: names.map((name) => error(name, ban)),
			};
		}),
		{
			name: 'named import',
			code: "import { PaginationRoot } from 'reka-ui';",
			errors: [error('PaginationRoot', paginationBan)],
		},
		{
			name: 'aliased import is flagged by the original export name',
			code: "import { PaginationRoot as Root } from 'reka-ui';",
			errors: [error('PaginationRoot', paginationBan)],
		},
		{
			name: 'multiple named pagination imports',
			code: "import { PaginationRoot, PaginationList, PaginationNext } from 'reka-ui';",
			errors: [
				error('PaginationRoot', paginationBan),
				error('PaginationList', paginationBan),
				error('PaginationNext', paginationBan),
			],
		},
		{
			name: 'only wrapped specifiers are flagged',
			code: "import { CollapsibleRoot, PaginationRoot } from 'reka-ui';",
			errors: [error('PaginationRoot', paginationBan)],
		},
		{
			name: 'each configured dialog prefix is flagged',
			code: "import { DialogRoot, AlertDialogContent, CollapsibleRoot } from 'reka-ui';",
			errors: [error('DialogRoot', dialogBan), error('AlertDialogContent', dialogBan)],
		},
		{
			name: 'named re-export',
			code: "export { PaginationRoot } from 'reka-ui';",
			errors: [error('PaginationRoot', paginationBan)],
		},
		{
			name: 'aliased re-export is flagged by the source-module name',
			code: "export { PaginationRoot as Root } from 'reka-ui';",
			errors: [error('PaginationRoot', paginationBan)],
		},
		{
			name: 'type-only pagination import',
			code: "import type { PaginationRootProps } from 'reka-ui';",
			errors: [error('PaginationRootProps', paginationBan)],
		},
		{
			name: 'pagination import outside the wrapper, even under a Pagination folder',
			code: "import { PaginationRoot } from 'reka-ui';",
			filename: '/repo/packages/frontend/editor-ui/src/components/Pagination/Foo.ts',
			errors: [error('PaginationRoot', paginationBan)],
		},
		{
			name: 'pagination import from a sibling v2 component',
			code: "import { PaginationList } from 'reka-ui';",
			filename: wrapperFile('v2/components/Select', 'Select.vue'),
			errors: [error('PaginationList', paginationBan)],
		},
		{
			name: 'ToggleGroup uses the Toggle prefix',
			code: "import { ToggleGroupRoot } from 'reka-ui';",
			errors: [error('ToggleGroupRoot', toggleBan)],
		},
		{
			name: 'Popover folder may not import DateRangePicker',
			code: "import { DateRangePickerRoot } from 'reka-ui';",
			filename: wrapperFile('components/N8nPopover'),
			errors: [error('DateRangePickerRoot', dateRangeBan)],
		},
		{
			name: 'deep element-plus component path',
			code: "import Menu from 'element-plus/es/components/menu';",
			errors: [error('element-plus/es/components/menu', menuBan)],
		},
		{
			name: 'namespace import of a deep element-plus component path',
			code: "import * as Menu from 'element-plus/es/components/menu';",
			errors: [error('element-plus/es/components/menu', menuBan)],
		},
		{
			name: 'star re-export of a deep element-plus component path',
			code: "export * from 'element-plus/es/components/menu';",
			errors: [error('element-plus/es/components/menu', menuBan)],
		},
		{
			name: 'namespace re-export of a deep element-plus component path',
			code: "export * as Menu from 'element-plus/es/components/menu';",
			errors: [error('element-plus/es/components/menu', menuBan)],
		},
		{
			name: 'deep element-plus component subpath',
			code: "import Item from 'element-plus/es/components/menu/src/menu-item';",
			errors: [error('element-plus/es/components/menu/src/menu-item', menuBan)],
		},
		{
			name: 'element-plus named re-export',
			code: "export { ElMenu } from 'element-plus';",
			errors: [error('ElMenu', menuBan)],
		},
		{
			name: 'a reka primitive that is not migrated and not allowlisted',
			code: "import { SeparatorRoot } from 'reka-ui';",
			errors: [
				{
					messageId: 'noDirectPrimitiveImport',
					data: { name: 'SeparatorRoot', library: 'reka-ui' },
				},
			],
		},
		{
			name: 'an element-plus component that is not migrated and not allowlisted',
			code: "import { ElButton } from 'element-plus';",
			errors: [
				{
					messageId: 'noDirectPrimitiveImport',
					data: { name: 'ElButton', library: 'element-plus' },
				},
			],
		},
		{
			name: 'only the unlisted specifier is flagged next to a pending import',
			code: "import { ElDialog, ElButton } from 'element-plus';",
			errors: [
				{
					messageId: 'noDirectPrimitiveImport',
					data: { name: 'ElButton', library: 'element-plus' },
				},
			],
		},
		{
			name: 'deep path of an unlisted element-plus component',
			code: "import Button from 'element-plus/es/components/button';",
			errors: [
				{
					messageId: 'noDirectPrimitiveImport',
					data: { name: 'ElButton', library: 'element-plus' },
				},
			],
		},
		{
			name: 'menu-item deep path uses the menu ban',
			code: "import Item from 'element-plus/es/components/menu-item';",
			errors: [error('element-plus/es/components/menu-item', menuBan)],
		},
		{
			name: 'reka radio context helper',
			code: "import { injectRadioGroupRootContext, injectRadioGroupItemContext } from 'reka-ui';",
			errors: [
				error('injectRadioGroupRootContext', radioBan),
				error('injectRadioGroupItemContext', radioBan),
			],
		},
		{
			name: 'reka radio primitives outside the wrapper',
			code: "import { RadioGroupRoot, RadioGroupItem } from 'reka-ui';",
			errors: [error('RadioGroupRoot', radioBan), error('RadioGroupItem', radioBan)],
		},
		{
			name: 'element-plus tabs point at N8nTabs',
			code: "import { ElTabs, ElTabPane } from 'element-plus';",
			errors: [error('ElTabs', tabsBan), error('ElTabPane', tabsBan)],
		},
		{
			name: 'deep element-plus tabs path',
			code: "import Tabs from 'element-plus/es/components/tabs';",
			errors: [error('element-plus/es/components/tabs', tabsBan)],
		},
		{
			name: 'deep element-plus tab-pane path',
			code: "import Pane from 'element-plus/es/components/tab-pane';",
			errors: [error('element-plus/es/components/tab-pane', tabsBan)],
		},
		{
			name: 'element-plus radio stays a direct primitive import',
			code: "import { ElRadio, ElRadioGroup } from 'element-plus';",
			errors: [
				{
					messageId: 'noDirectPrimitiveImport',
					data: { name: 'ElRadio', library: 'element-plus' },
				},
				{
					messageId: 'noDirectPrimitiveImport',
					data: { name: 'ElRadioGroup', library: 'element-plus' },
				},
			],
		},
		{
			name: 'deep element-plus radio path stays a direct primitive import',
			code: "import Radio from 'element-plus/es/components/radio';",
			errors: [
				{
					messageId: 'noDirectPrimitiveImport',
					data: { name: 'ElRadio', library: 'element-plus' },
				},
			],
		},
	],
});

const menuWrapper = wrapperFile('components/N8nNavigationDropdown', 'NavigationDropdown.vue');
const radioWrapper = wrapperFile('components/N8nRadioGroup', 'RadioGroup.vue');

vueRuleTester.run('no-direct-component-imports templates', NoDirectComponentImportsRule, {
	valid: [
		{
			name: 'a longer template name does not match',
			filename: 'Component.vue',
			code: template('<el-menu-button />'),
		},
		{
			name: 'template tags in the allowed wrapper path',
			filename: menuWrapper,
			code: template('<el-menu><ElMenu /></el-menu>'),
		},
		{
			name: 'tabs template tags in the allowed wrapper path',
			filename: wrapperFile('components/N8nTabs', 'Tabs.vue'),
			code: template('<el-tabs><ElTabPane /></el-tabs>'),
		},
		{
			name: 'reka radio imports in the allowed wrapper path',
			filename: radioWrapper,
			code: "<script>import { RadioGroupRoot, injectRadioGroupRootContext } from 'reka-ui';</script>",
		},
		{
			name: 'named import in the allowed wrapper path',
			filename: paginationWrapper,
			code: "<script>import { PaginationRoot } from 'reka-ui';</script>",
		},
	],
	invalid: [
		{
			name: 'kebab-case template tag',
			filename: 'Component.vue',
			code: template('<el-menu />'),
			errors: [error('el-menu', menuBan)],
		},
		{
			name: 'PascalCase template tag',
			filename: 'Component.vue',
			code: template('<ElMenu />'),
			errors: [error('ElMenu', menuBan)],
		},
		{
			name: 'named import and template tag in one vue file',
			filename: 'Component.vue',
			code: `<script>import { ElMenu } from 'element-plus';</script>${template('<el-menu />')}`,
			errors: [error('ElMenu', menuBan), error('el-menu', menuBan)],
		},
		{
			name: 'reka radio context helper in a vue file',
			filename: 'Component.vue',
			code: "<script>import { injectRadioGroupRootContext } from 'reka-ui';</script>",
			errors: [error('injectRadioGroupRootContext', radioBan)],
		},
		{
			name: 'kebab-case tabs template tag',
			filename: 'Component.vue',
			code: template('<el-tabs><el-tab-pane /></el-tabs>'),
			errors: [error('el-tabs', tabsBan), error('el-tab-pane', tabsBan)],
		},
		{
			name: 'PascalCase tabs template tag',
			filename: 'Component.vue',
			code: template('<ElTabs><ElTabPane /></ElTabs>'),
			errors: [error('ElTabs', tabsBan), error('ElTabPane', tabsBan)],
		},
		{
			name: 'kebab-case radio template tag',
			filename: 'Component.vue',
			code: template('<el-radio />'),
			errors: [
				{
					messageId: 'noDirectPrimitiveImport',
					data: { name: 'ElRadio', library: 'element-plus' },
				},
			],
		},
		{
			name: 'PascalCase radio group template tag',
			filename: 'Component.vue',
			code: template('<ElRadioGroup />'),
			errors: [
				{
					messageId: 'noDirectPrimitiveImport',
					data: { name: 'ElRadioGroup', library: 'element-plus' },
				},
			],
		},
	],
});

const chartsBan = wrappedModuleBans.find((ban) => ban.library === 'vue-chartjs');
if (chartsBan === undefined) throw new Error('Missing vue-chartjs module ban');

const moduleError = (ban: WrappedModuleBan) => ({
	messageId: 'noDirectWrappedModuleImport' as const,
	data: { library: ban.library, entry: ban.entry },
});

const chartsEntry = wrapperFile('charts', 'index.ts');
const chartsEntryWindowsPath =
	'C:\\repo\\packages\\frontend\\@n8n\\design-system\\src\\charts\\index.ts';
const editorChart = '/repo/packages/frontend/editor-ui/src/features/x/Chart.vue';

ruleTester.run('no-direct-component-imports wrapped modules', NoDirectComponentImportsRule, {
	valid: [
		...wrappedModuleBans.flatMap((ban) =>
			ban.allowedFolders.map((folder) => ({
				name: `${ban.library} allowed in ${folder}`,
				code: `import { createTypedChart } from '${ban.library}';\nimport type * as Lib from '${ban.library}';\nexport type { ChartComponentRef } from '${ban.library}';`,
				filename: wrapperFile(folder, 'index.ts'),
			})),
		),
		{
			name: 'the entry folder with windows separators',
			code: "import { createTypedChart } from 'vue-chartjs';",
			filename: chartsEntryWindowsPath,
		},
		{
			name: 'type query import in the entry folder',
			code: "type Ref = import('vue-chartjs').ChartComponentRef;",
			filename: chartsEntry,
		},
		{
			name: 'type query import of another package',
			code: "type Data = import('chart.js').ChartData;",
			filename: editorChart,
		},
		{
			name: 'dynamic import in the entry folder',
			code: "const lib = await import('vue-chartjs');",
			filename: chartsEntry,
		},
		{
			name: 'the design-system entry',
			code: "import { Bar, Line, type ChartComponentRef } from '@n8n/design-system/charts';",
			filename: editorChart,
		},
		{
			name: 'a package whose name only starts with the library name',
			code: "import { thing } from 'vue-chartjs-extra';",
			filename: editorChart,
		},
		{
			name: 'chart.js itself stays available for types and plugins',
			code: "import { type ChartData, Filler } from 'chart.js';",
			filename: editorChart,
		},
		{
			name: 'a dynamic import with a computed source',
			code: 'const lib = await import(name);',
			filename: editorChart,
		},
	],
	invalid: [
		...wrappedModuleBans.map((ban) => ({
			name: `${ban.library} named import outside the entry`,
			code: `import { Bar } from '${ban.library}';`,
			filename: editorChart,
			errors: [moduleError(ban)],
		})),
		{
			name: 'aliased import',
			code: "import { Line as LineChart } from 'vue-chartjs';",
			errors: [moduleError(chartsBan)],
		},
		{
			name: 'type-only import',
			code: "import type { ChartComponentRef } from 'vue-chartjs';",
			errors: [moduleError(chartsBan)],
		},
		{
			name: 'inline type specifier',
			code: "import { type ChartComponentRef } from 'vue-chartjs';",
			errors: [moduleError(chartsBan)],
		},
		{
			name: 'default import',
			code: "import Lib from 'vue-chartjs';",
			errors: [moduleError(chartsBan)],
		},
		{
			name: 'namespace import',
			code: "import * as Lib from 'vue-chartjs';",
			errors: [moduleError(chartsBan)],
		},
		{ name: 'side-effect import', code: "import 'vue-chartjs';", errors: [moduleError(chartsBan)] },
		{
			name: 'subpath import',
			code: "import { Bar } from 'vue-chartjs/dist/index.js';",
			errors: [moduleError(chartsBan)],
		},
		{
			name: 'named re-export',
			code: "export { Bar } from 'vue-chartjs';",
			errors: [moduleError(chartsBan)],
		},
		{
			name: 'type re-export',
			code: "export type { ChartComponentRef } from 'vue-chartjs';",
			errors: [moduleError(chartsBan)],
		},
		{
			name: 'star re-export',
			code: "export * from 'vue-chartjs';",
			errors: [moduleError(chartsBan)],
		},
		{
			name: 'dynamic import',
			code: "const lib = await import('vue-chartjs');",
			errors: [moduleError(chartsBan)],
		},
		{
			name: 'type query import',
			code: "type Ref = import('vue-chartjs').ChartComponentRef;",
			errors: [moduleError(chartsBan)],
		},
		{
			name: 'type query import of a subpath',
			code: "let chart: import('vue-chartjs/dist/index.js').ChartComponentRef;",
			errors: [moduleError(chartsBan)],
		},
		{
			name: 'import equals require',
			code: "import Lib = require('vue-chartjs');",
			errors: [moduleError(chartsBan)],
		},
		{
			name: 'export import equals require',
			code: "export import Lib = require('vue-chartjs');",
			errors: [moduleError(chartsBan)],
		},
		{
			name: 'a design-system file outside the entry folder',
			code: "import { Bar } from 'vue-chartjs';",
			filename: wrapperFile('components/N8nCard', 'Card.vue'),
			errors: [moduleError(chartsBan)],
		},
		{
			name: 'a folder name that only starts with the entry folder name',
			code: "import { Bar } from 'vue-chartjs';",
			filename: wrapperFile('charts-legacy', 'index.ts'),
			errors: [moduleError(chartsBan)],
		},
	],
});

vueRuleTester.run(
	'no-direct-component-imports wrapped modules in vue files',
	NoDirectComponentImportsRule,
	{
		valid: [
			{
				name: 'a vue file in the entry folder',
				filename: wrapperFile('charts', 'Chart.vue'),
				code: '<script setup lang="ts">import { Bar } from \'vue-chartjs\';</script>',
			},
		],
		invalid: [
			{
				name: 'a script setup import in a product component',
				filename: editorChart,
				code: '<script setup lang="ts">import { Line } from \'vue-chartjs\';</script>',
				errors: [moduleError(chartsBan)],
			},
		],
	},
);
