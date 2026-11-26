import type { AnyRuleModule } from '@typescript-eslint/utils/ts-eslint';

import { CssModuleClassUsageRule } from './css-module-class-usage.js';
import { NoDirectComponentImportsRule } from './no-direct-component-imports.js';
import { RequireTeleportedTooltipInDropdownRule } from './require-teleported-tooltip-in-dropdown.js';

export const rules = {
	'css-module-class-usage': CssModuleClassUsageRule,
	'no-direct-component-imports': NoDirectComponentImportsRule,
	'require-teleported-tooltip-in-dropdown': RequireTeleportedTooltipInDropdownRule,
} satisfies Record<string, AnyRuleModule>;
