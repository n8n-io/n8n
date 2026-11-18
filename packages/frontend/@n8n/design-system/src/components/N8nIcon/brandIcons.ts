/**
 * Names of the n8n brand icons that the icon picker offers. The icons themselves load lazily
 * from `brand-picker-icons.ts`; this module only holds the naming, so it costs nothing to import.
 *
 * `brand:<name>` draws the 16px outline version, `brand:<name>:filled` the 16px solid version.
 */
export const BRAND_ICON_PREFIX = 'brand:';
export const BRAND_ICON_FILLED_SUFFIX = ':filled';

export type BrandIconStyle = 'outline' | 'filled';

export function isBrandIcon(name: string | undefined): name is string {
	return typeof name === 'string' && name.startsWith(BRAND_ICON_PREFIX);
}

export function getBrandIconStyle(name: string): BrandIconStyle {
	return name.endsWith(BRAND_ICON_FILLED_SUFFIX) ? 'filled' : 'outline';
}

/** The same brand icon in the given style */
export function withBrandIconStyle(name: string, style: BrandIconStyle): string {
	const outline = name.endsWith(BRAND_ICON_FILLED_SUFFIX)
		? name.slice(0, -BRAND_ICON_FILLED_SUFFIX.length)
		: name;
	return style === 'filled' ? `${outline}${BRAND_ICON_FILLED_SUFFIX}` : outline;
}
