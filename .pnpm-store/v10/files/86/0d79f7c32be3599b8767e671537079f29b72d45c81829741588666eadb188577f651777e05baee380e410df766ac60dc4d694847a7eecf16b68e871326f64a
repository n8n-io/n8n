import type { InjectionKey, Ref, StyleValue } from 'vue';
import type { ElRovingFocusGroupProps } from './roving-focus-group';
declare type EventHandler<T = Event> = (e: T) => void;
export declare type RovingGroupInjectionContext = {
    currentTabbedId: Ref<string | null>;
    dir: Ref<ElRovingFocusGroupProps['dir']>;
    loop: Ref<ElRovingFocusGroupProps['loop']>;
    orientation: Ref<ElRovingFocusGroupProps['orientation']>;
    tabIndex: Ref<number>;
    rovingFocusGroupRef: Ref<HTMLElement | null>;
    rovingFocusGroupRootStyle: Ref<StyleValue>;
    onBlur: EventHandler;
    onFocus: EventHandler<FocusEvent>;
    onMousedown: EventHandler;
    onItemFocus: (id: string) => void;
    onItemShiftTab: () => void;
};
export declare type RovingFocusGroupItemInjectionContext = {
    rovingFocusGroupItemRef: Ref<HTMLElement | null>;
    tabIndex: Ref<number>;
    handleMousedown: EventHandler;
    handleFocus: EventHandler;
    handleKeydown: EventHandler;
};
export declare const ROVING_FOCUS_GROUP_INJECTION_KEY: InjectionKey<RovingGroupInjectionContext>;
export declare const ROVING_FOCUS_GROUP_ITEM_INJECTION_KEY: InjectionKey<RovingFocusGroupItemInjectionContext>;
export {};
