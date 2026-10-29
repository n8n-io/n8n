export type StatusDotVariant = 'success' | 'warning' | 'danger' | 'neutral';

export type StatusDotAppearance = 'fill' | 'outline';

export interface StatusDotProps {
	/**
	 * Color of the dot.
	 * @defaultValue 'success'
	 */
	variant?: StatusDotVariant;
	/**
	 * Paint style.
	 * `fill` is a solid dot. `outline` is a ring in the same color.
	 * @defaultValue 'fill'
	 */
	appearance?: StatusDotAppearance;
	/**
	 * Draws a pulse ring on a solid dot. Use it for a live state.
	 * An outline ring does not pulse.
	 * @defaultValue false
	 */
	pulse?: boolean;
}
