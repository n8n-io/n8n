import type { AnyRuleModule } from '@typescript-eslint/utils/ts-eslint';

import { RequireTeleportedTooltipInDropdownRule } from './require-teleported-tooltip-in-dropdown.js';

export const rules = {
	'require-teleported-tooltip-in-dropdown': RequireTeleportedTooltipInDropdownRule,
} satisfies Record<string, AnyRuleModule>;
