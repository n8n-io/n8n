import type { AnyRuleModule } from '@typescript-eslint/utils/ts-eslint';

import { NoDirectComponentImportsRule } from './no-direct-component-imports.js';
import { RequireTeleportedTooltipInDropdownRule } from './require-teleported-tooltip-in-dropdown.js';

export const rules = {
	'no-direct-component-imports': NoDirectComponentImportsRule,
	'require-teleported-tooltip-in-dropdown': RequireTeleportedTooltipInDropdownRule,
} satisfies Record<string, AnyRuleModule>;
