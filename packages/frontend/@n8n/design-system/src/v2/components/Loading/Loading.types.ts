export const SKELETON_VARIANTS = [
	'custom',
	'p',
	'text',
	'h1',
	'h3',
	'caption',
	'button',
	'image',
	'circle',
	'rect',
] as const;

export type SkeletonVariant = (typeof SKELETON_VARIANTS)[number];

export interface LoadingProps {
	/**
	 * Controls whether the skeleton shows pulsing animation.
	 * @default true
	 */
	animated?: boolean;
	/**
	 * Controls whether the loading skeleton is displayed.
	 * When `false`, the skeleton is hidden.
	 * @default true
	 */
	loading?: boolean;
	/**
	 * Number of skeleton rows to display.
	 * @default 1
	 */
	rows?: number;
	/**
	 * Number of skeleton columns to display.
	 * When set (non-zero), overrides row-based layout.
	 * @default 0
	 */
	cols?: number;
	/**
	 * Whether to shrink the last row to a shorter width.
	 * Only applies to `'h1'` and `'p'` variants when `rows > 1`.
	 * @default true
	 */
	shrinkLast?: boolean;
	/**
	 * Visual variant determining the shape and style of skeleton items.
	 * @default 'p'
	 */
	variant?: SkeletonVariant;
}
