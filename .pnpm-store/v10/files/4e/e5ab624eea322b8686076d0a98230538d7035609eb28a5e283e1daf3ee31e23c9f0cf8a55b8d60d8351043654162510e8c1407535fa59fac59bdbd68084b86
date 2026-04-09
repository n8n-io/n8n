import type { AgBeanStubEvent } from '../core/agBeanStub';
import type { AgBaseBean } from './agBaseBean';
import type { AgBean } from './agBean';
import type { AgEvent } from './agEvent';
import type { BaseEvents } from './baseEvents';
import type { BaseProperties } from './baseProperties';
export interface AgBaseComponent<TBeanCollection> extends AgBaseBean<TBeanCollection> {
    getGui(): HTMLElement;
}
export interface AgComponent<TBeanCollection, TProperties extends BaseProperties, TGlobalEvents extends BaseEvents, TLocalEventType extends string> extends AgBaseComponent<TBeanCollection>, AgBean<TBeanCollection, TProperties, TGlobalEvents, TLocalEventType> {
    getCompId(): number;
    getFocusableElement(): HTMLElement;
    getAriaElement(): Element;
    setParentComponent(component: AgComponent<TBeanCollection, TProperties, TGlobalEvents, any>): void;
    getParentComponent<T extends AgComponent<TBeanCollection, TProperties, TGlobalEvents, any>>(): T | undefined;
    prependChild(newChild: HTMLElement | AgBaseComponent<TBeanCollection>, container?: HTMLElement): void;
    appendChild(newChild: HTMLElement | AgBaseComponent<TBeanCollection>, container?: HTMLElement): void;
    isDisplayed(): boolean;
    setVisible(visible: boolean, options?: {
        skipAriaHidden?: boolean;
    }): void;
    setDisplayed(displayed: boolean, options?: {
        skipAriaHidden?: boolean;
    }): void;
    addGuiEventListener(event: string, listener: (event: any) => void, options?: AddEventListenerOptions): void;
    addCss(className: string): void;
    removeCss(className: string): void;
    toggleCss(className: string, addOrRemove: boolean): void;
}
/** The RefPlaceholder is used to control when data-ref attribute should be applied to the component
 * There are hanging data-refs in the DOM that are not being used internally by the component which we don't want to apply to the component.
 * There is also the case where data-refs are solely used for passing parameters to the component and should not be applied to the component.
 * It also enables validation to catch typo errors in the data-ref attribute vs component name.
 * The value is `null` so that it can be identified in the component and distinguished from just missing with undefined.
 * The `null` value also allows for existing falsy checks to work as expected when code can be run before the template is setup.
 */
export declare const RefPlaceholder: any;
export type AgComponentEvent = 'displayChanged' | AgBeanStubEvent;
export interface VisibleChangedEvent extends AgEvent<'displayChanged'> {
    visible: boolean;
}
export type AgComponentSelector<TComponentSelectorType extends string, TBeanCollection = any, TComponent extends AgBaseComponent<TBeanCollection> = AgBaseComponent<TBeanCollection>> = {
    component: {
        new (params?: any): TComponent;
    };
    selector: TComponentSelectorType;
};
export declare function _isComponent<TBeanCollection>(item: any): item is AgBaseComponent<TBeanCollection>;
