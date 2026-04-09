import type { AgBaseComponent, AgComponent, AgComponentEvent, AgComponentSelector } from '../interfaces/agComponent';
import type { AgCoreBeanCollection } from '../interfaces/agCoreBeanCollection';
import type { BaseEvents } from '../interfaces/baseEvents';
import type { BaseProperties } from '../interfaces/baseProperties';
import type { IPropertiesService } from '../interfaces/iProperties';
import type { AgElementParams } from '../utils/dom';
import { AgBeanStub } from './agBeanStub';
export declare abstract class AgComponentStub<TBeanCollection extends AgCoreBeanCollection<TProperties, TGlobalEvents, TCommon, TPropertiesService>, TProperties extends BaseProperties, TGlobalEvents extends BaseEvents, TCommon, TPropertiesService extends IPropertiesService<TProperties, TCommon>, TComponentSelectorType extends string, TLocalEventType extends string = AgComponentEvent> extends AgBeanStub<TBeanCollection, TProperties, TGlobalEvents, TCommon, TPropertiesService, TLocalEventType | AgComponentEvent> implements AgComponent<TBeanCollection, TProperties, TGlobalEvents, TLocalEventType> {
    private eGui;
    private readonly componentSelectors;
    private suppressDataRefValidation;
    private displayed;
    private visible;
    private css;
    protected parentComponent: AgComponent<TBeanCollection, TProperties, TGlobalEvents, any> | undefined;
    private readonly compId;
    private readonly cssManager;
    constructor(templateOrParams?: string | AgElementParams<TComponentSelectorType>, componentSelectors?: AgComponentSelector<TComponentSelectorType, TBeanCollection>[]);
    preConstruct(): void;
    private wireTemplate;
    getCompId(): number;
    private getDataRefAttribute;
    private applyElementsToComponent;
    private createChildComponentsFromTags;
    private createComponentFromElement;
    private swapComponentForNode;
    protected activateTabIndex(elements?: Element[]): void;
    protected setTemplate(templateOrParams: AgElementParams<TComponentSelectorType> | string | null | undefined, componentSelectors?: AgComponentSelector<TComponentSelectorType, TBeanCollection>[], paramsMap?: {
        [key: string]: any;
    }): void;
    protected setTemplateFromElement(element: HTMLElement, components?: AgComponentSelector<TComponentSelectorType, TBeanCollection>[], paramsMap?: {
        [key: string]: any;
    }, suppressDataRefValidation?: boolean): void;
    getGui(): HTMLElement;
    getFocusableElement(): HTMLElement;
    getAriaElement(): Element;
    setParentComponent(component: AgComponent<TBeanCollection, TProperties, TGlobalEvents, any>): void;
    getParentComponent<T extends AgComponent<TBeanCollection, TProperties, TGlobalEvents, any>>(): T | undefined;
    protected setGui(eGui: HTMLElement): void;
    protected queryForHtmlElement(cssSelector: string): HTMLElement;
    private getContainerAndElement;
    prependChild(newChild: HTMLElement | AgBaseComponent<TBeanCollection>, container?: HTMLElement): void;
    appendChild(newChild: HTMLElement | AgBaseComponent<TBeanCollection>, container?: HTMLElement): void;
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
