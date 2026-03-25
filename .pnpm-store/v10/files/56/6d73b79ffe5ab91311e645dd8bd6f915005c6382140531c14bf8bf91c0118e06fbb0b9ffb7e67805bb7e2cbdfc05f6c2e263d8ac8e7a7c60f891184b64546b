import { BeanStub } from '../context/beanStub';
export declare const TabGuardClassNames: {
    readonly TAB_GUARD: "ag-tab-guard";
    readonly TAB_GUARD_TOP: "ag-tab-guard-top";
    readonly TAB_GUARD_BOTTOM: "ag-tab-guard-bottom";
};
export interface ITabGuard {
    setTabIndex(tabIndex?: string): void;
}
export declare class TabGuardCtrl extends BeanStub {
    private readonly comp;
    private readonly eTopGuard;
    private readonly eBottomGuard;
    private readonly eFocusableElement;
    private readonly focusTrapActive;
    private readonly forceFocusOutWhenTabGuardsAreEmpty;
    private readonly isFocusableContainer;
    private readonly providedFocusInnerElement?;
    private readonly providedFocusIn?;
    private readonly providedFocusOut?;
    private readonly providedShouldStopEventPropagation?;
    private readonly providedOnTabKeyDown?;
    private readonly providedHandleKeyDown?;
    private readonly providedIsEmpty?;
    private skipTabGuardFocus;
    private forcingFocusOut;
    private allowFocus;
    constructor(params: {
        comp: ITabGuard;
        eTopGuard: HTMLElement;
        eBottomGuard: HTMLElement;
        eFocusableElement: HTMLElement;
        focusTrapActive?: boolean;
        forceFocusOutWhenTabGuardsAreEmpty?: boolean;
        isFocusableContainer?: boolean;
        focusInnerElement?: (fromBottom: boolean) => boolean;
        onFocusIn?: (event: FocusEvent) => void;
        onFocusOut?: (event: FocusEvent) => void;
        shouldStopEventPropagation?: () => boolean;
        onTabKeyDown?: (e: KeyboardEvent) => void;
        handleKeyDown?: (e: KeyboardEvent) => void;
        isEmpty?: () => boolean;
    });
    postConstruct(): void;
    private handleKeyDown;
    private tabGuardsAreActive;
    private shouldStopEventPropagation;
    private activateTabGuards;
    private deactivateTabGuards;
    private onFocus;
    private findNextElementOutsideAndFocus;
    private onFocusIn;
    private onFocusOut;
    onTabKeyDown(e: KeyboardEvent): void;
    focusInnerElement(fromBottom?: boolean): boolean;
    getNextFocusableElement(backwards?: boolean): HTMLElement | null;
    forceFocusOutOfContainer(up?: boolean): void;
    isTabGuard(element: HTMLElement, bottom?: boolean): boolean;
    setAllowFocus(allowFocus: boolean): void;
}
