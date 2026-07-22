import type { Component } from 'vue';

import type { IconName } from '../N8nIcon/icons';

/**
 * A registered design-system icon name, any Lucide icon name, or a custom Vue component
 * (e.g. an inline brand-mark SVG). Custom components should render a `1em`-sized SVG so
 * they track the card's font-size.
 */
export type EmptyStateCardIcon = IconName | (string & {}) | Component;

/**
 * The icon-cards variant of the `N8nEmptyState` icon area: a fanned trio of small cards
 * where the two side cards cycle through `sides` (static when fewer than three icons are
 * provided, or when the user prefers reduced motion).
 */
export interface EmptyStateIconCards {
	type: 'cards';
	center: IconName | (string & {});
	sides: EmptyStateCardIcon[];
	/** Defaults to `true`; set to `false` for a static trio showing the first two side icons. */
	animated?: boolean;
}
