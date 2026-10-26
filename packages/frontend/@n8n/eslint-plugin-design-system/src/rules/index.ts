import type { AnyRuleModule } from '@typescript-eslint/utils/ts-eslint';

import { NoDirectWrappedComponentImportsRule } from './no-direct-wrapped-component-imports.js';
import { RequireTeleportedTooltipInDropdownRule } from './require-teleported-tooltip-in-dropdown.js';

export const rules = {
	'no-direct-wrapped-component-imports': NoDirectWrappedComponentImportsRule,
	'require-teleported-tooltip-in-dropdown': RequireTeleportedTooltipInDropdownRule,
} satisfies Record<string, AnyRuleModule>;
