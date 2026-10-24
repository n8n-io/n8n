import { RuleTester } from '@typescript-eslint/rule-tester';
import { NoRekaUiRadioRule } from './no-reka-ui-radio.js';

const ruleTester = new RuleTester();

const radioPath =
	'/repo/packages/frontend/@n8n/design-system/src/components/N8nRadioGroup/RadioGroup.vue';
const segmentWindowsPath =
	'C:\\repo\\packages\\frontend\\@n8n\\design-system\\src\\components\\N8nSegmentControl\\SegmentControl.vue';

const error = (name: string) => ({
	messageId: 'noRekaUiRadio' as const,
	data: { name },
});

ruleTester.run('no-reka-ui-radio', NoRekaUiRadioRule, {
	valid: [
		{ code: "import { SelectRoot, DialogRoot, SwitchRoot } from 'reka-ui';" },
		{ code: "import { ContextMenuRadioGroup } from 'reka-ui';" },
		{ code: "import { N8nRadioGroup } from '@n8n/design-system';" },
		{ code: "import { RadioGroupRoot } from 'some-other-pkg';" },
		{
			name: 'radio import inside N8nRadioGroup',
			code: "import { RadioGroupRoot, RadioGroupItem, RadioGroupIndicator } from 'reka-ui';",
			filename: radioPath,
		},
		{
			name: 'radio import inside N8nSegmentControl (windows separators)',
			code: "import { RadioGroupRoot, RadioGroupItem } from 'reka-ui';",
			filename: segmentWindowsPath,
		},
		{ name: 'namespace import bypass', code: "import * as Reka from 'reka-ui';" },
	],
	invalid: [
		{
			name: 'named import',
			code: "import { RadioGroupRoot } from 'reka-ui';",
			errors: [error('RadioGroupRoot')],
		},
		{
			name: 'aliased import — flagged by the original export name',
			code: "import { RadioGroupItem as Item } from 'reka-ui';",
			errors: [error('RadioGroupItem')],
		},
		{
			name: 'multiple radio imports',
			code: "import { RadioGroupItem, RadioGroupIndicator } from 'reka-ui';",
			errors: [error('RadioGroupItem'), error('RadioGroupIndicator')],
		},
		{
			name: 'mixed specifiers — only radio primitives are flagged',
			code: "import { SelectRoot, RadioGroupRoot, DialogRoot } from 'reka-ui';",
			errors: [error('RadioGroupRoot')],
		},
		{
			name: 'type-only radio import',
			code: "import type { RadioGroupRootProps } from 'reka-ui';",
			errors: [error('RadioGroupRootProps')],
		},
		{
			name: 'radio import outside the design-system wrappers',
			code: "import { RadioGroupRoot } from 'reka-ui';",
			filename: '/repo/packages/frontend/editor-ui/src/features/settings/UserRadio.vue',
			errors: [error('RadioGroupRoot')],
		},
		{
			name: 'named re-export',
			code: "export { RadioGroupItem } from 'reka-ui';",
			errors: [error('RadioGroupItem')],
		},
	],
});
