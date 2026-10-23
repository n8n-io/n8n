import { RuleTester } from '@typescript-eslint/rule-tester';
import { NoElementPlusDropdownRule } from './no-element-plus-dropdown.js';

const ruleTester = new RuleTester();

const error = { messageId: 'noElementPlusDropdown' as const };

ruleTester.run('no-element-plus-dropdown', NoElementPlusDropdownRule, {
	valid: [
		{ code: "import { ElSelect, ElSwitch } from 'element-plus';" },
		{ code: "import { N8nDropdownMenu } from '@n8n/design-system';" },
		{ code: "import { ElDropdown } from 'some-other-pkg';" },
	],
	invalid: [
		{
			name: 'named import',
			code: "import { ElDropdown } from 'element-plus';",
			errors: [error],
		},
		{
			name: 'menu and item imports',
			code: "import { ElDropdownMenu, ElDropdownItem } from 'element-plus';",
			errors: [error, error],
		},
		{
			name: 'aliased import',
			code: "import { ElDropdown as Dropdown } from 'element-plus';",
			errors: [error],
		},
		{
			name: 'type-only import',
			code: "import type { ElDropdown } from 'element-plus';",
			errors: [error],
		},
		{
			name: 'mixed specifiers — only dropdown exports are flagged',
			code: "import { ElSelect, ElDropdown, ElButton } from 'element-plus';",
			errors: [error],
		},
		{
			name: 'deep dropdown module import',
			code: "import Dropdown from 'element-plus/es/components/dropdown';",
			errors: [error],
		},
		{
			name: 'named re-export',
			code: "export { ElDropdownItem } from 'element-plus';",
			errors: [error],
		},
	],
});
