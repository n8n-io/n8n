import { RuleTester } from '@typescript-eslint/rule-tester';
import { NoElementPlusRadioRule } from './no-element-plus-radio.js';

const ruleTester = new RuleTester();

const error = { messageId: 'noElementPlusRadio' as const };

ruleTester.run('no-element-plus-radio', NoElementPlusRadioRule, {
	valid: [
		{ code: "import { ElSelect, ElSwitch } from 'element-plus';" },
		{ code: "import { N8nRadioGroup, N8nRadioGroupItem } from '@n8n/design-system';" },
		{ code: "import { ElRadio } from 'some-other-pkg';" },
	],
	invalid: [
		{
			name: 'named import',
			code: "import { ElRadio } from 'element-plus';",
			errors: [error],
		},
		{
			name: 'group and button imports',
			code: "import { ElRadioGroup, ElRadioButton } from 'element-plus';",
			errors: [error, error],
		},
		{
			name: 'aliased import',
			code: "import { ElRadio as Radio } from 'element-plus';",
			errors: [error],
		},
		{
			name: 'type-only import',
			code: "import type { ElRadioGroup } from 'element-plus';",
			errors: [error],
		},
		{
			name: 'mixed specifiers — only radio exports are flagged',
			code: "import { ElSelect, ElRadio, ElButton } from 'element-plus';",
			errors: [error],
		},
		{
			name: 'deep radio module import',
			code: "import Radio from 'element-plus/es/components/radio';",
			errors: [error],
		},
		{
			name: 'named re-export',
			code: "export { ElRadioGroup } from 'element-plus';",
			errors: [error],
		},
	],
});
