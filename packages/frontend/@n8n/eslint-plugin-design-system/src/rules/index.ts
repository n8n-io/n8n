import type { AnyRuleModule } from '@typescript-eslint/utils/ts-eslint';

import { FocusVisibleStyleRule } from './focus-visible-style.js';
import { LabelHasForRule } from './label-has-for.js';
import { NoAccessKeyRule } from './no-access-key.js';
import { NoAriaHiddenOnFocusableRule } from './no-aria-hidden-on-focusable.js';
import { NoInvalidAriaPropsRule } from './no-invalid-aria-props.js';
import { NoInvalidAriaRoleRule } from './no-invalid-aria-role.js';
import { NoPointerOnlyEventsRule } from './no-pointer-only-events.js';
import { NoPositiveTabindexRule } from './no-positive-tabindex.js';
import { NoRedundantRolesRule } from './no-redundant-roles.js';
import { NoStaticElementInteractionsRule } from './no-static-element-interactions.js';
import { PrefersReducedMotionRule } from './prefers-reduced-motion.js';
import { RequireTeleportedTooltipInDropdownRule } from './require-teleported-tooltip-in-dropdown.js';
import { RoleHasRequiredAriaPropsRule } from './role-has-required-aria-props.js';

export const rules = {
	'focus-visible-style': FocusVisibleStyleRule,
	'label-has-for': LabelHasForRule,
	'no-access-key': NoAccessKeyRule,
	'no-aria-hidden-on-focusable': NoAriaHiddenOnFocusableRule,
	'no-invalid-aria-props': NoInvalidAriaPropsRule,
	'no-invalid-aria-role': NoInvalidAriaRoleRule,
	'no-pointer-only-events': NoPointerOnlyEventsRule,
	'no-positive-tabindex': NoPositiveTabindexRule,
	'no-redundant-roles': NoRedundantRolesRule,
	'no-static-element-interactions': NoStaticElementInteractionsRule,
	'prefers-reduced-motion': PrefersReducedMotionRule,
	'require-teleported-tooltip-in-dropdown': RequireTeleportedTooltipInDropdownRule,
	'role-has-required-aria-props': RoleHasRequiredAriaPropsRule,
} satisfies Record<string, AnyRuleModule>;
