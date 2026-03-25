import type { Ref } from 'vue';
import type { Instance, Modifier, Options, State, VirtualElement } from '@popperjs/core';
declare type ElementType = HTMLElement | undefined;
declare type ReferenceElement = ElementType | VirtualElement;
export declare type PartialOptions = Partial<Options>;
export declare const usePopper: (referenceElementRef: Ref<ReferenceElement>, popperElementRef: Ref<ElementType>, opts?: Ref<PartialOptions> | PartialOptions) => {
    state: import("vue").ComputedRef<{
        elements?: {
            reference: Element | VirtualElement;
            popper: HTMLElement;
            arrow?: HTMLElement | undefined;
        } | undefined;
        options?: import("@popperjs/core").OptionsGeneric<any> | undefined;
        placement?: import("@popperjs/core").Placement | undefined;
        strategy?: import("@popperjs/core").PositioningStrategy | undefined;
        orderedModifiers?: Modifier<any, any>[] | undefined;
        rects?: import("@popperjs/core").StateRects | undefined;
        scrollParents?: {
            reference: (Element | import("@popperjs/core").Window | import("@popperjs/core").VisualViewport)[];
            popper: (Element | import("@popperjs/core").Window | import("@popperjs/core").VisualViewport)[];
        } | undefined;
        styles?: {
            [key: string]: Partial<CSSStyleDeclaration>;
        } | undefined;
        attributes?: {
            [key: string]: {
                [key: string]: string | boolean;
            };
        } | undefined;
        modifiersData?: {
            [key: string]: any;
            arrow?: {
                x?: number | undefined;
                y?: number | undefined;
                centerOffset: number;
            } | undefined;
            hide?: {
                isReferenceHidden: boolean;
                hasPopperEscaped: boolean;
                referenceClippingOffsets: import("@popperjs/core").SideObject;
                popperEscapeOffsets: import("@popperjs/core").SideObject;
            } | undefined;
            offset?: {
                auto?: import("@popperjs/core").Offsets | undefined;
                top?: import("@popperjs/core").Offsets | undefined;
                bottom?: import("@popperjs/core").Offsets | undefined;
                "auto-start"?: import("@popperjs/core").Offsets | undefined;
                "auto-end"?: import("@popperjs/core").Offsets | undefined;
                right?: import("@popperjs/core").Offsets | undefined;
                left?: import("@popperjs/core").Offsets | undefined;
                "top-start"?: import("@popperjs/core").Offsets | undefined;
                "top-end"?: import("@popperjs/core").Offsets | undefined;
                "bottom-start"?: import("@popperjs/core").Offsets | undefined;
                "bottom-end"?: import("@popperjs/core").Offsets | undefined;
                "right-start"?: import("@popperjs/core").Offsets | undefined;
                "right-end"?: import("@popperjs/core").Offsets | undefined;
                "left-start"?: import("@popperjs/core").Offsets | undefined;
                "left-end"?: import("@popperjs/core").Offsets | undefined;
            } | undefined;
            preventOverflow?: import("@popperjs/core").Offsets | undefined;
            popperOffsets?: import("@popperjs/core").Offsets | undefined;
        } | undefined;
        reset?: boolean | undefined;
    }>;
    styles: import("vue").ComputedRef<{
        [key: string]: Partial<CSSStyleDeclaration>;
    }>;
    attributes: import("vue").ComputedRef<{
        [key: string]: {
            [key: string]: string | boolean;
        };
    }>;
    update: () => Promise<Partial<State>> | undefined;
    forceUpdate: () => void | undefined;
    instanceRef: import("vue").ComputedRef<Instance | undefined>;
};
export declare type UsePopperReturn = ReturnType<typeof usePopper>;
export {};
