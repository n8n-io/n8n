import type { Component } from 'vue';

import type { IconName } from '../N8nIcon/icons';

/**
 * An icon shown in one of the side cards of the icon-cards cluster: a registered
 * design-system icon name, any Lucide icon name (resolved through `N8nIcon`'s
 * fallback loader), or a custom Vue component (e.g. an inline brand-mark SVG).
 * Custom components should render a `1em`-sized SVG so they track the card's font-size.
 */
export type EmptyStateCardIcon = IconName | (string & {}) | Component;

/**
 * The icon-cards variant of the `N8nEmptyState` icon area: a fanned trio of small
 * bordered cards. The raised centre card carries the static icon of the feature or
 * settings page the empty state belongs to, while the two tilted side cards cycle
 * through `sides` with a staggered fade+blur swap (static when fewer than three
 * icons are provided, or when the user prefers reduced motion).
 */
export interface EmptyStateIconCards {
	type: 'cards';
	/** Static centre icon naming the feature/page (e.g. `mcp` for the MCP settings page). */
	center: IconName | (string & {});
	/** Icons shown in the two side cards (and cycled through when animated). */
	sides: EmptyStateCardIcon[];
	/**
	 * Whether the side cards cycle through `sides`. Defaults to `true`; set to `false` for a
	 * static trio showing the first two side icons.
	 */
	animated?: boolean;
}
