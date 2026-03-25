declare const HIGHLIGHT = "storybook/highlight/add";
declare const REMOVE_HIGHLIGHT = "storybook/highlight/remove";
declare const RESET_HIGHLIGHT = "storybook/highlight/reset";
declare const SCROLL_INTO_VIEW = "storybook/highlight/scroll-into-view";

declare const iconPaths: {
    chevronLeft: string[];
    chevronRight: string[];
    info: string[];
    shareAlt: string[];
};
type IconName = keyof typeof iconPaths;

interface HighlightMenuItem {
    /** Unique identifier for the menu item */
    id: string;
    /** Title of the menu item */
    title: string;
    /** Description of the menu item */
    description?: string;
    /** Icon for the menu item, left side */
    iconLeft?: IconName;
    /** Icon for the menu item, right side */
    iconRight?: IconName;
    /** Name for a channel event to trigger when the menu item is clicked */
    clickEvent?: string;
    /** HTML selectors for which this menu item should show (subset of `selectors`) */
    selectors?: HighlightOptions['selectors'];
}
interface HighlightOptions {
    /** Unique identifier for the highlight, required if you want to remove the highlight later */
    id?: string;
    /** HTML selectors of the elements */
    selectors: string[];
    /** Priority of the highlight, higher takes precedence, defaults to 0 */
    priority?: number;
    /** CSS styles to apply to the highlight */
    styles?: Record<string, string>;
    /** CSS styles to apply to the highlight when it is hovered */
    hoverStyles?: Record<string, string>;
    /** CSS styles to apply to the highlight when it is focused or selected */
    focusStyles?: Record<string, string>;
    /** Keyframes required for animations */
    keyframes?: string;
    /** Groups of menu items to show when the highlight is selected */
    menu?: HighlightMenuItem[][];
}
interface ClickEventDetails {
    top: number;
    left: number;
    width: number;
    height: number;
    selectors: string[];
    element: {
        attributes: Record<string, string>;
        localName: string;
        tagName: string;
        outerHTML: string;
    };
}

export { type ClickEventDetails, HIGHLIGHT, type HighlightMenuItem, type HighlightOptions, REMOVE_HIGHLIGHT, RESET_HIGHLIGHT, SCROLL_INTO_VIEW };
