import { RuleTester } from '@typescript-eslint/rule-tester';
import { NoRekaUiCollapsibleRule } from './no-reka-ui-collapsible.js';

const ruleTester = new RuleTester();

const animatedContentPath =
	'/repo/packages/frontend/@n8n/design-system/src/components/N8nAnimatedCollapsibleContent/AnimatedCollapsibleContent.vue';
const animatedContentWindowsPath =
	'C:\\repo\\packages\\frontend\\@n8n\\design-system\\src\\components\\N8nAnimatedCollapsibleContent\\reka-ui.ts';
const collapsiblePanelPath =
	'/repo/packages/frontend/@n8n/design-system/src/components/N8nCollapsiblePanel/CollapsiblePanel.vue';
const activityStepPath =
	'/repo/packages/frontend/@n8n/design-system/src/components/N8nAiActivityStep/AiActivityStep.vue';
const activityStepGroupPath =
	'/repo/packages/frontend/@n8n/design-system/src/components/N8nAiActivityStepGroup/AiActivityStepGroup.vue';

const error = (name: string) => ({
	messageId: 'noRekaUiCollapsible' as const,
	data: { name },
});

ruleTester.run('no-reka-ui-collapsible', NoRekaUiCollapsibleRule, {
	valid: [
		{ code: "import { SelectRoot, DialogRoot, DropdownMenuRoot } from 'reka-ui';" },
		{
			code: "import { N8nAnimatedCollapsibleContent, CollapsibleRoot } from '@n8n/design-system';",
		},
		{ code: "import { CollapsibleRoot } from 'some-other-pkg';" },
		{
			name: 'collapsible import inside N8nAnimatedCollapsibleContent',
			code: "import { CollapsibleContent, CollapsibleRoot, CollapsibleTrigger } from 'reka-ui';",
			filename: animatedContentPath,
		},
		{
			name: 'collapsible type import inside N8nAnimatedCollapsibleContent (windows separators)',
			code: "import type { CollapsibleRootProps } from 'reka-ui';",
			filename: animatedContentWindowsPath,
		},
		{
			name: 'collapsible import inside N8nCollapsiblePanel',
			code: "import { CollapsibleRoot, CollapsibleTrigger, CollapsibleContent } from 'reka-ui';",
			filename: collapsiblePanelPath,
		},
		{
			name: 'collapsible import inside N8nAiActivityStep',
			code: "import { CollapsibleRoot, CollapsibleTrigger } from 'reka-ui';",
			filename: activityStepPath,
		},
		{
			name: 'collapsible import inside N8nAiActivityStepGroup',
			code: "import { CollapsibleRoot, CollapsibleTrigger } from 'reka-ui';",
			filename: activityStepGroupPath,
		},
		{ name: 'namespace import bypass', code: "import * as Reka from 'reka-ui';" },
	],
	invalid: [
		{
			name: 'named import',
			code: "import { CollapsibleRoot } from 'reka-ui';",
			errors: [error('CollapsibleRoot')],
		},
		{
			name: 'aliased import — flagged by the original export name',
			code: "import { CollapsibleTrigger as Trigger } from 'reka-ui';",
			errors: [error('CollapsibleTrigger')],
		},
		{
			name: 'multiple collapsible imports',
			code: "import { CollapsibleContent, CollapsibleRoot } from 'reka-ui';",
			errors: [error('CollapsibleContent'), error('CollapsibleRoot')],
		},
		{
			name: 'mixed specifiers — only collapsible primitives are flagged',
			code: "import { SelectRoot, CollapsibleRoot, DialogRoot } from 'reka-ui';",
			errors: [error('CollapsibleRoot')],
		},
		{
			name: 'type-only collapsible import',
			code: "import type { CollapsibleRootProps } from 'reka-ui';",
			errors: [error('CollapsibleRootProps')],
		},
		{
			name: 'collapsible import outside the design-system wrappers',
			code: "import { CollapsibleRoot } from 'reka-ui';",
			filename:
				'/repo/packages/frontend/editor-ui/src/features/ndv/settings/components/NodeWebhooks.vue',
			errors: [error('CollapsibleRoot')],
		},
		{
			name: 'named re-export',
			code: "export { CollapsibleContent } from 'reka-ui';",
			errors: [error('CollapsibleContent')],
		},
	],
});
