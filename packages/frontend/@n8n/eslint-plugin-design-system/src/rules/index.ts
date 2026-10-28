import type { AnyRuleModule } from '@typescript-eslint/utils/ts-eslint';

import { RequireTeleportedTooltipInDropdownRule } from './require-teleported-tooltip-in-dropdown.js';
import { UseFeatureMaturityBadgesRule } from './use-feature-maturity-badges.js';

export const rules = {
	'require-teleported-tooltip-in-dropdown': RequireTeleportedTooltipInDropdownRule,
	'use-feature-maturity-badges': UseFeatureMaturityBadgesRule,
} satisfies Record<string, AnyRuleModule>;
