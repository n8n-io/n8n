import type { UtilBeanCollection } from '../interfaces/agCoreBeanCollection';
/**
 * This method adds a class to an element and remove that class from all siblings.
 * Useful for toggling state.
 * @param {HTMLElement} element The element to receive the class
 * @param {string} elementClass The class to be assigned to the element
 * @param {boolean} otherElementClass The class to be assigned to siblings of the element, but not the element itself
 */
export declare function _radioCssClass(element: HTMLElement, elementClass: string | null, otherElementClass?: string | null): void;
export declare const FOCUSABLE_SELECTOR = "[tabindex], input, select, button, textarea, [href]";
export declare const FOCUSABLE_EXCLUDE = "[disabled], .ag-disabled:not(.ag-button), .ag-disabled *";
export declare function _isFocusableFormField(element: Element | null): boolean;
export declare function _setDisplayed(element: Element, displayed: boolean, options?: {
    skipAriaHidden?: boolean;
}): void;
export declare function _setVisible(element: HTMLElement, visible: boolean, options?: {
    skipAriaHidden?: boolean;
}): void;
export declare function _setDisabled(element: HTMLElement, disabled: boolean): void;
export declare function _isElementChildOfClass(element: HTMLElement | null, cls: string, maxNest?: HTMLElement | number): boolean;
export declare function _getElementSize(el: HTMLElement): {
    height: number;
    width: number;
    borderTopWidth: number;
    borderRightWidth: number;
    borderBottomWidth: number;
    borderLeftWidth: number;
    paddingTop: number;
    paddingRight: number;
    paddingBottom: number;
    paddingLeft: number;
    marginTop: number;
    marginRight: number;
    marginBottom: number;
    marginLeft: number;
    boxSizing: string;
};
export declare function _getInnerHeight(el: HTMLElement): number;
export declare function _getInnerWidth(el: HTMLElement): number;
export declare function _getAbsoluteHeight(el: HTMLElement): number;
export declare function _getAbsoluteWidth(el: HTMLElement): number;
export declare function _getElementRectWithOffset(el: HTMLElement): {
    top: number;
    left: number;
    right: number;
    bottom: number;
};
export declare function _getScrollLeft(element: HTMLElement, rtl: boolean): number;
export declare function _setScrollLeft(element: HTMLElement, value: number, rtl: boolean): void;
export declare function _clearElement(el: HTMLElement | null | undefined): void;
export declare function _removeFromParent(node: Element | null | undefined): void;
export declare function _isInDOM(element: Element): element is HTMLElement;
export declare function _isVisible(element: Element): boolean;
/**
 * Loads the template and returns it as an element.
 * NOTE: Prefer _createElement
 * @param {string} template
 * @returns {HTMLElement}
 */
export declare function _loadTemplate(template: string | undefined | null): HTMLElement;
export declare function _ensureDomOrder(eContainer: HTMLElement, eChild: HTMLElement, eChildBefore?: HTMLElement | null): void;
export declare function _setDomChildOrder(eContainer: HTMLElement, orderedChildren: (HTMLElement | null)[]): void;
export declare function _addStylesToElement(eElement: any, styles: {
    [cssProperty: string]: string | number;
} | null | undefined): void;
export declare function _isElementOverflowingCallback(getElement: () => HTMLElement | undefined): () => boolean;
export declare function _isHorizontalScrollShowing(element: HTMLElement): boolean;
export declare function _isVerticalScrollShowing(element: HTMLElement): boolean;
export declare function _setElementWidth(element: HTMLElement, width: string | number): void;
export declare function _setFixedWidth(element: HTMLElement, width: string | number): void;
export declare function _setFixedHeight(element: HTMLElement, height: string | number): void;
export declare function _formatSize(size: number | string): string;
export declare function _isNodeOrElement(o: any): o is Node | Element;
export declare function _addOrRemoveAttribute(element: HTMLElement, name: string, value: string | number | null | undefined): void;
export declare function _observeResize(beans: UtilBeanCollection, element: HTMLElement, callback: ResizeObserverCallback): () => void;
export declare function _requestAnimationFrame(beans: UtilBeanCollection, callback: any): void;
type Attributes = {
    [key: string]: string;
};
type TagName<SelectorType extends string> = keyof HTMLElementTagNameMap | Lowercase<SelectorType>;
/** Type to help avoid typos, add new roles as required. */
type RoleType = 'button' | 'columnheader' | 'gridcell' | 'heading' | 'menu' | 'option' | 'presentation' | 'role' | 'row' | 'rowgroup' | 'status' | 'tab' | 'tablist' | 'tabpanel' | 'treeitem';
export type AgElementParams<SelectorType extends string> = {
    /** The tag name to use for the element, either browser tag or one of the AG Grid components such as ag-checkbox
     */
    tag: TagName<SelectorType>;
    /** AG Grid data-ref attribute, should match a property on the class that uses the same name and is initialised with RefPlaceholder
     * @example
     * ref: 'eLabel'
     * private eLabel: HTMLElement = RefPlaceholder;
     */
    ref?: string;
    /**
     * Should be a single string of space-separated class names
     * @example
     * cls: 'ag-header-cell ag-header-cell-sortable'
     */
    cls?: string;
    /** The role attribute to add to the dom element */
    role?: RoleType;
    /** Key Value pair of attributes to add to the dom element via `element.setAttribute(key,value)` */
    attrs?: Attributes;
    /**
     * A single string can be passed to the children property and this will call `element.textContent = children` on the element.
     *
     * Otherwise an array of children is passed.
     * A child element can be an ElementParams / string / (() => Element) / null/undefined.
     *  - If an ElementParams is passed it will be created and appended to the parent element. It will be wrapped with whitespace to mimic the previous behaviour of multi line strings.
     *  - If a string is passed it will be appended as a text node.
     *  - If a function is passed, it will be called and the result appended
     *  - If null or undefined is passed it will be ignored.
     */
    children?: (AgElementParams<SelectorType> | string | (() => Element) | null | undefined)[] | string;
};
/** AG Grid attribute used to automatically assign DOM Elements to class properties */
export declare const DataRefAttribute = "data-ref";
export declare function _createAgElement<T extends HTMLElement = HTMLElement, TComponentSelector extends string = string>(params: AgElementParams<TComponentSelector>): T;
export {};
