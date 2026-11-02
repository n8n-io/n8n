/** Color of the dot. */
export type StatusDotVariant = 'success' | 'warning' | 'danger' | 'neutral';

/** `fill` paints the dot. `outline` draws a ring in the same color. */
export type StatusDotAppearance = 'fill' | 'outline';

export interface StatusDotProps {
	/** Color of the dot. */
	variant?: StatusDotVariant;
	/**
	 * Paint style.
	 * `fill` is a solid dot. `outline` is a ring in the same color.
	 */
	appearance?: StatusDotAppearance;
	/** Draws a pulse ring. Use it for a live state. */
	pulse?: boolean;
}
