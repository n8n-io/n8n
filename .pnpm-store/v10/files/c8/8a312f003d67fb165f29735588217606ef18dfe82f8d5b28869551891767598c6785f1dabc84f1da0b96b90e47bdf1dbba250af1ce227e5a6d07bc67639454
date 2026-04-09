/**
 * Icon mode
 */
type IconCSSMode = 'mask' | 'background';
/**
 * Selector for icon
 */
interface IconCSSIconSelectorOptions {
    pseudoSelector?: boolean;
    iconSelector?: string;
}
/**
 * Selector for icon when generating data from icon set
 */
interface IconCSSSelectorOptions extends IconCSSIconSelectorOptions {
    commonSelector?: string;
    overrideSelector?: string;
}
/**
 * Options common for both multiple icons and single icon
 */
interface IconCSSSharedOptions {
    varName?: string | null;
    forceSquare?: boolean;
    color?: string;
    rules?: Record<string, string>;
}
/**
 * Mode
 */
interface IconCSSModeOptions {
    mode?: IconCSSMode;
}
/**
 * Options for generating common code
 *
 * Requires mode
 */
interface IconCSSCommonCodeOptions extends IconCSSSharedOptions, IconCSSIconSelectorOptions, Required<IconCSSModeOptions> {
}
/**
 * Options for generating data for one icon
 */
interface IconCSSItemOptions extends IconCSSSharedOptions, Required<IconCSSModeOptions> {
}
/**
 * Selector for icon
 */
interface IconContentIconSelectorOptions {
    iconSelector?: string;
}
/**
 * Options common for both multiple icons and single icon
 */
interface IconContentSharedOptions {
    height: number;
    width?: number;
    color?: string;
    rules?: Record<string, string>;
}
/**
 * Options for generating data for one icon
 */
type IconContentItemOptions = IconContentSharedOptions;
/**
 * Formatting modes. Same as in SASS
 */
type CSSFormatMode = 'expanded' | 'compact' | 'compressed';
/**
 * Item to format
 */
interface CSSUnformattedItem {
    selector: string | string[];
    rules: Record<string, string>;
}
/**
 * Formatting options
 */
interface IconCSSFormatOptions {
    format?: CSSFormatMode;
}
/**
 * Options for generating data for one icon as background/mask
 */
interface IconCSSIconOptions extends IconCSSSharedOptions, IconCSSIconSelectorOptions, IconCSSModeOptions, IconCSSFormatOptions {
    customise?: (content: string) => string;
}
/**
 * Options for generating data for one icon as content
 */
interface IconContentIconOptions extends IconContentSharedOptions, IconContentIconSelectorOptions, IconCSSFormatOptions {
    customise?: (content: string) => string;
}
/**
 * Options for generating multiple icons as background/mask
 */
interface IconCSSIconSetOptions extends IconCSSSharedOptions, IconCSSSelectorOptions, IconCSSModeOptions, IconCSSFormatOptions {
    customise?: (content: string, name: string) => string;
}
/**
 * Options for generating multiple icons as content
 */
interface IconContentIconSetOptions extends IconContentSharedOptions, IconContentIconSelectorOptions, IconCSSFormatOptions {
    customise?: (content: string, name: string) => string;
}

export type { CSSFormatMode, CSSUnformattedItem, IconCSSCommonCodeOptions, IconCSSFormatOptions, IconCSSIconOptions, IconCSSIconSelectorOptions, IconCSSIconSetOptions, IconCSSItemOptions, IconCSSMode, IconCSSModeOptions, IconCSSSelectorOptions, IconCSSSharedOptions, IconContentIconOptions, IconContentIconSelectorOptions, IconContentIconSetOptions, IconContentItemOptions, IconContentSharedOptions };
