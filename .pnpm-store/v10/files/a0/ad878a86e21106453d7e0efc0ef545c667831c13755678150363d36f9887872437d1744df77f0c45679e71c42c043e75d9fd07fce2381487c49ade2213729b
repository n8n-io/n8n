import type { Ref, ToRefs } from 'vue';
import type { Middleware, Placement, SideObject, Strategy, VirtualElement } from '@floating-ui/dom';
export declare const useFloatingProps: {};
export declare type UseFloatingProps = ToRefs<{
    middleware: Array<Middleware>;
    placement: Placement;
    strategy: Strategy;
}>;
export declare const getPositionDataWithUnit: <T extends Record<string, number>>(record: T | undefined, key: keyof T) => string;
export declare const useFloating: ({ middleware, placement, strategy, }: UseFloatingProps) => {
    update: () => Promise<void>;
    referenceRef: Ref<HTMLElement | VirtualElement | undefined>;
    contentRef: Ref<HTMLElement | undefined>;
    x: Ref<number | undefined>;
    y: Ref<number | undefined>;
    placement: Ref<Placement>;
    strategy: Ref<Strategy>;
    middlewareData: Ref<{
        [x: string]: any;
        arrow?: {
            x?: number | undefined;
            y?: number | undefined;
            centerOffset: number;
        } | undefined;
        autoPlacement?: {
            index?: number | undefined;
            overflows: {
                placement: Placement;
                overflows: number[];
            }[];
        } | undefined;
        flip?: {
            index?: number | undefined;
            overflows: {
                placement: Placement;
                overflows: number[];
            }[];
        } | undefined;
        hide?: {
            referenceHidden?: boolean | undefined;
            escaped?: boolean | undefined;
            referenceHiddenOffsets?: {
                top: number;
                bottom: number;
                right: number;
                left: number;
            } | undefined;
            escapedOffsets?: {
                top: number;
                bottom: number;
                right: number;
                left: number;
            } | undefined;
        } | undefined;
        offset?: {
            x: number;
            y: number;
        } | undefined;
        shift?: {
            x: number;
            y: number;
        } | undefined;
    }>;
};
export declare type ArrowMiddlewareProps = {
    arrowRef: Ref<HTMLElement | null | undefined>;
    padding?: number | SideObject;
};
export declare const arrowMiddleware: ({ arrowRef, padding, }: ArrowMiddlewareProps) => Middleware;
