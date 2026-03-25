import type { CSSProperties, ComputedRef, InjectionKey, Ref } from 'vue';
import type { Instance } from '@popperjs/core';
export declare type Measurable = {
    getBoundingClientRect: () => DOMRect;
};
/**
 * triggerRef indicates the element that triggers popper
 * contentRef indicates the element of popper content
 * referenceRef indicates the element that popper content relative with
 */
export declare type ElPopperInjectionContext = {
    triggerRef: Ref<Measurable | undefined>;
    contentRef: Ref<HTMLElement | undefined>;
    popperInstanceRef: Ref<Instance | undefined>;
    referenceRef: Ref<Measurable | undefined>;
    role: ComputedRef<string>;
};
export declare type ElPopperContentInjectionContext = {
    arrowRef: Ref<HTMLElement | undefined>;
    arrowOffset: Ref<number | undefined>;
    arrowStyle: ComputedRef<CSSProperties>;
};
export declare const POPPER_INJECTION_KEY: InjectionKey<ElPopperInjectionContext>;
export declare const POPPER_CONTENT_INJECTION_KEY: InjectionKey<ElPopperContentInjectionContext>;
