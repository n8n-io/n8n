import { IconifyIcon } from '@iconify/types';
import { IconCSSCommonCodeOptions, IconCSSItemOptions, IconContentItemOptions } from './types.mjs';

/**
 * Generates common CSS rules for multiple icons, rendered as background/mask
 */
declare function getCommonCSSRules(options: IconCSSCommonCodeOptions): Record<string, string>;
/**
 * Generate CSS rules for one icon, rendered as background/mask
 *
 * This function excludes common rules
 */
declare function generateItemCSSRules(icon: Required<IconifyIcon>, options: IconCSSItemOptions): Record<string, string>;
/**
 * Generate content for one icon, rendered as content of pseudo-selector
 */
declare function generateItemContent(icon: Required<IconifyIcon>, options: IconContentItemOptions): string;

export { generateItemCSSRules, generateItemContent, getCommonCSSRules };
