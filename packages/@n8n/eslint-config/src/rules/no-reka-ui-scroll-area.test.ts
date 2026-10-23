import { RuleTester } from '@typescript-eslint/rule-tester';
import { NoRekaUiScrollAreaRule } from './no-reka-ui-scroll-area.js';

const ruleTester = new RuleTester();

const scrollAreaPath =
	'/repo/packages/frontend/@n8n/design-system/src/components/N8nScrollArea/N8nScrollArea.vue';
const scrollAreaWindowsPath =
	'C:\\repo\\packages\\frontend\\@n8n\\design-system\\src\\components\\N8nScrollArea\\N8nScrollArea.vue';

const error = (name: string) => ({
	messageId: 'noRekaUiScrollArea' as const,
	data: { name },
});

ruleTester.run('no-reka-ui-scroll-area', NoRekaUiScrollAreaRule, {
	valid: [
		{ code: "import { SelectRoot, DialogRoot, DropdownMenuRoot } from 'reka-ui';" },
		{ code: "import { N8nScrollArea } from '@n8n/design-system';" },
		{ code: "import { ScrollAreaRoot } from 'some-other-pkg';" },
		{
			name: 'scroll area import inside N8nScrollArea',
			code: "import { ScrollAreaRoot, ScrollAreaViewport, ScrollAreaScrollbar, ScrollAreaThumb, ScrollAreaCorner } from 'reka-ui';",
			filename: scrollAreaPath,
		},
		{
			name: 'scroll area type import inside N8nScrollArea (windows separators)',
			code: "import type { ScrollAreaRootProps } from 'reka-ui';",
			filename: scrollAreaWindowsPath,
		},
		{ name: 'namespace import bypass', code: "import * as Reka from 'reka-ui';" },
	],
	invalid: [
		{
			name: 'named import',
			code: "import { ScrollAreaRoot } from 'reka-ui';",
			errors: [error('ScrollAreaRoot')],
		},
		{
			name: 'aliased import — flagged by the original export name',
			code: "import { ScrollAreaViewport as Viewport } from 'reka-ui';",
			errors: [error('ScrollAreaViewport')],
		},
		{
			name: 'multiple scroll area imports',
			code: "import { ScrollAreaScrollbar, ScrollAreaThumb } from 'reka-ui';",
			errors: [error('ScrollAreaScrollbar'), error('ScrollAreaThumb')],
		},
		{
			name: 'mixed specifiers — only scroll area primitives are flagged',
			code: "import { SelectRoot, ScrollAreaRoot, DialogRoot } from 'reka-ui';",
			errors: [error('ScrollAreaRoot')],
		},
		{
			name: 'type-only scroll area import',
			code: "import type { ScrollAreaRootProps } from 'reka-ui';",
			errors: [error('ScrollAreaRootProps')],
		},
		{
			name: 'scroll area import outside the design-system wrapper',
			code: "import { ScrollAreaRoot } from 'reka-ui';",
			filename:
				'/repo/packages/frontend/editor-ui/src/features/ai/evaluation.ee/components/RunDetail/MetricSummaryStrip.vue',
			errors: [error('ScrollAreaRoot')],
		},
		{
			name: 'named re-export',
			code: "export { ScrollAreaCorner } from 'reka-ui';",
			errors: [error('ScrollAreaCorner')],
		},
	],
});
