import { RuleTester } from '@typescript-eslint/rule-tester';
import { NoRekaUiSwitchRule } from './no-reka-ui-switch.js';

const ruleTester = new RuleTester();

const switchPath = '/repo/packages/frontend/@n8n/design-system/src/components/N8nSwitch/Switch.vue';
const switchTypesWindowsPath =
	'C:\\repo\\packages\\frontend\\@n8n\\design-system\\src\\components\\N8nSwitch\\Switch.types.ts';

const error = (name: string) => ({
	messageId: 'noRekaUiSwitch' as const,
	data: { name },
});

ruleTester.run('no-reka-ui-switch', NoRekaUiSwitchRule, {
	valid: [
		{ code: "import { SelectRoot, DialogRoot, Toggle } from 'reka-ui';" },
		{ code: "import { N8nSwitch } from '@n8n/design-system';" },
		{ code: "import { SwitchRoot } from 'some-other-pkg';" },
		{
			name: 'switch import inside N8nSwitch',
			code: "import { SwitchRoot, SwitchThumb, Label } from 'reka-ui';",
			filename: switchPath,
		},
		{
			name: 'switch type import inside N8nSwitch (windows separators)',
			code: "import type { SwitchRootProps } from 'reka-ui';",
			filename: switchTypesWindowsPath,
		},
		{ name: 'namespace import bypass', code: "import * as Reka from 'reka-ui';" },
	],
	invalid: [
		{
			name: 'named import',
			code: "import { SwitchRoot } from 'reka-ui';",
			errors: [error('SwitchRoot')],
		},
		{
			name: 'aliased import — flagged by the original export name',
			code: "import { SwitchThumb as Thumb } from 'reka-ui';",
			errors: [error('SwitchThumb')],
		},
		{
			name: 'multiple switch imports',
			code: "import { SwitchRoot, SwitchThumb } from 'reka-ui';",
			errors: [error('SwitchRoot'), error('SwitchThumb')],
		},
		{
			name: 'mixed specifiers — only switch primitives are flagged',
			code: "import { SelectRoot, SwitchRoot, DialogRoot } from 'reka-ui';",
			errors: [error('SwitchRoot')],
		},
		{
			name: 'type-only switch import',
			code: "import type { SwitchRootProps } from 'reka-ui';",
			errors: [error('SwitchRootProps')],
		},
		{
			name: 'switch import outside the design-system wrapper',
			code: "import { SwitchRoot } from 'reka-ui';",
			filename: '/repo/packages/frontend/editor-ui/src/features/settings/SecuritySwitch.vue',
			errors: [error('SwitchRoot')],
		},
		{
			name: 'named re-export',
			code: "export { SwitchRoot } from 'reka-ui';",
			errors: [error('SwitchRoot')],
		},
	],
});
