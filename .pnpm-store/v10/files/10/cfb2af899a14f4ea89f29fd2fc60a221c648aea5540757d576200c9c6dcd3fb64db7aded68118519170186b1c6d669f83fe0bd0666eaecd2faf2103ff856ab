import { IconifyJSON } from '@iconify/types';
import { IconCSSIconSetOptions, IconContentIconSetOptions, CSSUnformattedItem } from './types.cjs';

interface CSSData {
    common?: CSSUnformattedItem;
    css: CSSUnformattedItem[];
    errors: string[];
}
/**
 * Get data for getIconsCSS()
 */
declare function getIconsCSSData(iconSet: IconifyJSON, names: string[], options?: IconCSSIconSetOptions): CSSData;
/**
 * Get CSS for icons as background/mask
 */
declare function getIconsCSS(iconSet: IconifyJSON, names: string[], options?: IconCSSIconSetOptions): string;
/**
 * Get CSS for icons as content
 */
declare function getIconsContentCSS(iconSet: IconifyJSON, names: string[], options: IconContentIconSetOptions): string;

export { getIconsCSS, getIconsCSSData, getIconsContentCSS };
