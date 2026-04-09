import { BeanStub } from '../context/beanStub';
export interface ManagedFocusCallbacks {
    shouldStopEventPropagation?: (e: KeyboardEvent) => boolean;
    onTabKeyDown?: (e: KeyboardEvent) => void;
    handleKeyDown?: (e: KeyboardEvent) => void;
    onFocusIn?: (e: FocusEvent) => void;
    onFocusOut?: (e: FocusEvent) => void;
}
export declare const FOCUS_MANAGED_CLASS = "ag-focus-managed";
export declare class ManagedFocusFeature extends BeanStub {
    private readonly eFocusable;
    private readonly callbacks;
    constructor(eFocusable: HTMLElement, callbacks?: ManagedFocusCallbacks);
    postConstruct(): void;
    private addKeyDownListeners;
}
