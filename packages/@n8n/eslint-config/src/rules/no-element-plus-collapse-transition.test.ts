import { RuleTester } from '@typescript-eslint/rule-tester';
import { NoElementPlusCollapseTransitionRule } from './no-element-plus-collapse-transition.js';

const ruleTester = new RuleTester();

const error = { messageId: 'noElementPlusCollapseTransition' as const };

ruleTester.run('no-element-plus-collapse-transition', NoElementPlusCollapseTransitionRule, {
	valid: [
		{ code: "import { ElSelect, ElMenu } from 'element-plus';" },
		{ code: "import { ElCollapse, ElCollapseItem } from 'element-plus';" },
		{ code: "import { N8nAnimatedCollapsibleContent } from '@n8n/design-system';" },
		{ code: "import { ElCollapseTransition } from 'some-other-pkg';" },
		{ code: "import Collapse from 'element-plus/es/components/collapse';" },
	],
	invalid: [
		{
			name: 'named import',
			code: "import { ElCollapseTransition } from 'element-plus';",
			errors: [error],
		},
		{
			name: 'aliased import',
			code: "import { ElCollapseTransition as Collapse } from 'element-plus';",
			errors: [error],
		},
		{
			name: 'type-only import',
			code: "import type { ElCollapseTransition } from 'element-plus';",
			errors: [error],
		},
		{
			name: 'mixed specifiers — only ElCollapseTransition is flagged',
			code: "import { ElCollapse, ElCollapseTransition, ElRow } from 'element-plus';",
			errors: [error],
		},
		{
			name: 'deep collapse-transition module import',
			code: "import CollapseTransition from 'element-plus/es/components/collapse-transition';",
			errors: [error],
		},
		{
			name: 'named re-export',
			code: "export { ElCollapseTransition } from 'element-plus';",
			errors: [error],
		},
	],
});
