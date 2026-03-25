import type { BeanStubEvent } from '../context/beanStub';
import { BeanStub } from '../context/beanStub';
import type { BeanCollection } from '../context/context';
import type { BaseBean, ComponentBean } from '../context/genericContext';
import type { AgEvent } from '../events';
import type { ElementParams } from '../utils/dom';
/** The RefPlaceholder is used to control when data-ref attribute should be applied to the component
 * There are hanging data-refs in the DOM that are not being used internally by the component which we don't want to apply to the component.
 * There is also the case where data-refs are solely used for passing parameters to the component and should not be applied to the component.
 * It also enables validation to catch typo errors in the data-ref attribute vs component name.
 * The value is `null` so that it can be identified in the component and distinguished from just missing with undefined.
 * The `null` value also allows for existing falsy checks to work as expected when code can be run before the template is setup.
 */
export declare const RefPlaceholder: any;
export type ComponentEvent = 'displayChanged' | BeanStubEvent;
export interface VisibleChangedEvent extends AgEvent<'displayChanged'> {
    visible: boolean;
}
export type ComponentSelector = {
    component: {
        new (params?: any): Component<any>;
    };
    selector: AgComponentSelector;
};
export declare class Component<TLocalEvent extends string = ComponentEvent> extends BeanStub<TLocalEvent | ComponentEvent> implements ComponentBean, BaseBean<BeanCollection> {
    private eGui;
    private componentSelectors;
    private suppressDataRefValidation;
    private displayed;
    private visible;
    private css;
    protected parentComponent: Component | undefined;
    private compId;
    private cssManager;
    constructor(templateOrParams?: string | ElementParams, componentSelectors?: ComponentSelector[]);
    preConstruct(): void;
    private wireTemplate;
    getCompId(): number;
    private getDataRefAttribute;
    private applyElementsToComponent;
    private createChildComponentsFromTags;
    private createComponentFromElement;
    private swapComponentForNode;
    protected activateTabIndex(elements?: Element[]): void;
    setTemplate(templateOrParams: ElementParams | string | null | undefined, componentSelectors?: ComponentSelector[], paramsMap?: {
        [key: string]: any;
    }): void;
    setTemplateFromElement(element: HTMLElement, components?: ComponentSelector[], paramsMap?: {
        [key: string]: any;
    }, suppressDataRefValidation?: boolean): void;
    getGui(): HTMLElement;
    getFocusableElement(): HTMLElement;
    getAriaElement(): Element;
    setParentComponent(component: Component<any>): void;
    getParentComponent(): Component | undefined;
    protected setGui(eGui: HTMLElement): void;
    protected queryForHtmlElement(cssSelector: string): HTMLElement;
    private getContainerAndElement;
    prependChild(newChild: HTMLElement | Component<any>, container?: HTMLElement): void;
    appendChild(newChild: HTMLElement | Component<any>, container?: HTMLElement): void;
    isDisplayed(): boolean;
    setVisible(visible: boolean, options?: {
        skipAriaHidden?: boolean;
    }): void;
    setDisplayed(displayed: boolean, options?: {
        skipAriaHidden?: boolean;
    }): void;
    destroy(): void;
    addGuiEventListener(event: string, listener: (event: any) => void, options?: AddEventListenerOptions): void;
    addCss(className: string): void;
    removeCss(className: string): void;
    toggleCss(className: string, addOrRemove: boolean): void;
    protected registerCSS(css: string): void;
}
/** All the AG Grid components that are used within internal templates via <ag-autocomplete> syntax */
export type AgComponentSelector = 'AG-AUTOCOMPLETE' | 'AG-CHECKBOX' | 'AG-COLOR-INPUT' | 'AG-COLOR-PICKER' | 'AG-FAKE-HORIZONTAL-SCROLL' | 'AG-FAKE-VERTICAL-SCROLL' | 'AG-FILTER-BUTTON' | 'AG-FILTERS-TOOL-PANEL-HEADER' | 'AG-FILTERS-TOOL-PANEL-LIST' | 'AG-GRID-BODY' | 'AG-GRID-HEADER-DROP-ZONES' | 'AG-GROUP-COMPONENT' | 'AG-HEADER-ROOT' | 'AG-INPUT-DATE-FIELD' | 'AG-INPUT-NUMBER-FIELD' | 'AG-INPUT-RANGE' | 'AG-INPUT-TEXT-AREA' | 'AG-INPUT-TEXT-FIELD' | 'AG-NAME-VALUE' | 'AG-OVERLAY-WRAPPER' | 'AG-PAGE-SIZE-SELECTOR' | 'AG-PAGINATION' | 'AG-PRIMARY-COLS-HEADER' | 'AG-PRIMARY-COLS-LIST' | 'AG-ROW-CONTAINER' | 'AG-SELECT' | 'AG-SIDE-BAR' | 'AG-SIDE-BAR-BUTTONS' | 'AG-SLIDER' | 'AG-SORT-INDICATOR' | 'AG-STATUS-BAR' | 'AG-TOGGLE-BUTTON' | 'AG-WATERMARK';
