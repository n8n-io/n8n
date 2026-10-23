import { RuleTester } from '@typescript-eslint/rule-tester';
import { NoElementPlusSwitchRule } from './no-element-plus-switch.js';

const ruleTester = new RuleTester();

const error = { messageId: 'noElementPlusSwitch' as const };

ruleTester.run('no-element-plus-switch', NoElementPlusSwitchRule, {
	valid: [
		{ code: "import { ElSelect, ElOption } from 'element-plus';" },
		{ code: "import { ElDialog } from 'element-plus';" },
		{ code: "import { N8nSwitch } from '@n8n/design-system';" },
		{ code: "import { ElSwitch } from 'some-other-pkg';" },
	],
	invalid: [
		{
			name: 'named import',
			code: "import { ElSwitch } from 'element-plus';",
			errors: [error],
		},
		{
			name: 'aliased import',
			code: "import { ElSwitch as Switch } from 'element-plus';",
			errors: [error],
		},
		{
			name: 'type-only import',
			code: "import type { ElSwitch } from 'element-plus';",
			errors: [error],
		},
		{
			name: 'mixed specifiers — only ElSwitch is flagged',
			code: "import { ElSelect, ElSwitch, ElButton } from 'element-plus';",
			errors: [error],
		},
		{
			name: 'deep switch module import',
			code: "import Switch from 'element-plus/es/components/switch';",
			errors: [error],
		},
		{
			name: 'named re-export',
			code: "export { ElSwitch } from 'element-plus';",
			errors: [error],
		},
	],
});
