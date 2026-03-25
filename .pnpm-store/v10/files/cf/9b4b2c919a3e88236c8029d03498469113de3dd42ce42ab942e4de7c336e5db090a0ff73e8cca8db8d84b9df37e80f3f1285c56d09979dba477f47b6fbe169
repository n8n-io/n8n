import { AlignedPlacement } from '@floating-ui/dom';
import { Alignment } from '@floating-ui/dom';
import { autoPlacement } from '@floating-ui/dom';
import { AutoPlacementOptions } from '@floating-ui/dom';
import { autoUpdate } from '@floating-ui/dom';
import { AutoUpdateOptions } from '@floating-ui/dom';
import { Axis } from '@floating-ui/dom';
import { Boundary } from '@floating-ui/dom';
import { ClientRectObject } from '@floating-ui/dom';
import type { ComponentPublicInstance } from 'vue-demi';
import { computePosition } from '@floating-ui/dom';
import { ComputePositionConfig } from '@floating-ui/dom';
import { ComputePositionReturn } from '@floating-ui/dom';
import { Coords } from '@floating-ui/dom';
import { detectOverflow } from '@floating-ui/dom';
import { DetectOverflowOptions } from '@floating-ui/dom';
import { Dimensions } from '@floating-ui/dom';
import { ElementContext } from '@floating-ui/dom';
import { ElementRects } from '@floating-ui/dom';
import { Elements } from '@floating-ui/dom';
import { flip } from '@floating-ui/dom';
import { FlipOptions } from '@floating-ui/dom';
import { FloatingElement } from '@floating-ui/dom';
import { getOverflowAncestors } from '@floating-ui/dom';
import { hide } from '@floating-ui/dom';
import { HideOptions } from '@floating-ui/dom';
import { inline } from '@floating-ui/dom';
import { InlineOptions } from '@floating-ui/dom';
import { Length } from '@floating-ui/dom';
import { limitShift } from '@floating-ui/dom';
import { Middleware } from '@floating-ui/dom';
import { MiddlewareArguments } from '@floating-ui/dom';
import { MiddlewareData } from '@floating-ui/dom';
import { MiddlewareReturn } from '@floating-ui/dom';
import { MiddlewareState } from '@floating-ui/dom';
import { NodeScroll } from '@floating-ui/dom';
import { offset } from '@floating-ui/dom';
import { OffsetOptions } from '@floating-ui/dom';
import { Padding } from '@floating-ui/dom';
import { Placement } from '@floating-ui/dom';
import { Platform } from '@floating-ui/dom';
import { platform } from '@floating-ui/dom';
import { Rect } from '@floating-ui/dom';
import type { Ref } from 'vue-demi';
import { ReferenceElement } from '@floating-ui/dom';
import { RootBoundary } from '@floating-ui/dom';
import { shift } from '@floating-ui/dom';
import { ShiftOptions } from '@floating-ui/dom';
import { Side } from '@floating-ui/dom';
import { SideObject } from '@floating-ui/dom';
import { size } from '@floating-ui/dom';
import { SizeOptions } from '@floating-ui/dom';
import { Strategy } from '@floating-ui/dom';
import { VirtualElement } from '@floating-ui/dom';

export { AlignedPlacement }

export { Alignment }

/**
 * Positions an inner element of the floating element such that it is centered to the reference element.
 * @param options The arrow options.
 * @see https://floating-ui.com/docs/arrow
 */
export declare function arrow(options: ArrowOptions): Middleware;

export declare type ArrowOptions = {
    /**
     * The arrow element or template ref to be positioned.
     * @required
     */
    element: MaybeReadonlyRefOrGetter<MaybeElement<Element>>;
    /**
     * The padding between the arrow element and the floating element edges. Useful when the floating element has rounded corners.
     * @default 0
     */
    padding?: Padding;
};

export { autoPlacement }

export { AutoPlacementOptions }

export { autoUpdate }

export { AutoUpdateOptions }

export { Axis }

export { Boundary }

export { ClientRectObject }

export { computePosition }

export { ComputePositionConfig }

export { ComputePositionReturn }

export { Coords }

export { detectOverflow }

export { DetectOverflowOptions }

export { Dimensions }

export { ElementContext }

export { ElementRects }

export { Elements }

export { flip }

export { FlipOptions }

export { FloatingElement }

export { getOverflowAncestors }

export { hide }

export { HideOptions }

export { inline }

export { InlineOptions }

export { Length }

export { limitShift }

export declare type MaybeElement<T> = T | ComponentPublicInstance | null | undefined;

export declare type MaybeReadonlyRef<T> = T | Readonly<Ref<T>>;

export declare type MaybeReadonlyRefOrGetter<T> = MaybeReadonlyRef<T> | (() => T);

export { Middleware }

export { MiddlewareArguments }

export { MiddlewareData }

export { MiddlewareReturn }

export { MiddlewareState }

export { NodeScroll }

export { offset }

export { OffsetOptions }

export { Padding }

export { Placement }

export { Platform }

export { platform }

export { Rect }

export { ReferenceElement }

export { RootBoundary }

export { shift }

export { ShiftOptions }

export { Side }

export { SideObject }

export { size }

export { SizeOptions }

export { Strategy }

/**
 * Computes the `x` and `y` coordinates that will place the floating element next to a reference element when it is given a certain CSS positioning strategy.
 * @param reference The reference template ref.
 * @param floating The floating template ref.
 * @param options The floating options.
 * @see https://floating-ui.com/docs/vue
 */
export declare function useFloating<T extends ReferenceElement = ReferenceElement>(reference: Readonly<Ref<MaybeElement<T>>>, floating: Readonly<Ref<MaybeElement<FloatingElement>>>, options?: UseFloatingOptions<T>): UseFloatingReturn;

export declare type UseFloatingOptions<T extends ReferenceElement = ReferenceElement> = {
    /**
     * Represents the open/close state of the floating element.
     * @default true
     */
    open?: MaybeReadonlyRefOrGetter<boolean | undefined>;
    /**
     * Where to place the floating element relative to its reference element.
     * @default 'bottom'
     */
    placement?: MaybeReadonlyRefOrGetter<Placement | undefined>;
    /**
     * The type of CSS position property to use.
     * @default 'absolute'
     */
    strategy?: MaybeReadonlyRefOrGetter<Strategy | undefined>;
    /**
     * These are plain objects that modify the positioning coordinates in some fashion, or provide useful data for the consumer to use.
     * @default undefined
     */
    middleware?: MaybeReadonlyRefOrGetter<Middleware[] | undefined>;
    /**
     * Whether to use `transform` instead of `top` and `left` styles to
     * position the floating element (`floatingStyles`).
     * @default true
     */
    transform?: MaybeReadonlyRefOrGetter<boolean | undefined>;
    /**
     * Callback to handle mounting/unmounting of the elements.
     * @default undefined
     */
    whileElementsMounted?: (reference: T, floating: FloatingElement, update: () => void) => () => void;
};

export declare type UseFloatingReturn = {
    /**
     * The x-coord of the floating element.
     */
    x: Readonly<Ref<number>>;
    /**
     * The y-coord of the floating element.
     */
    y: Readonly<Ref<number>>;
    /**
     * The stateful placement, which can be different from the initial `placement` passed as options.
     */
    placement: Readonly<Ref<Placement>>;
    /**
     * The type of CSS position property to use.
     */
    strategy: Readonly<Ref<Strategy>>;
    /**
     * Additional data from middleware.
     */
    middlewareData: Readonly<Ref<MiddlewareData>>;
    /**
     * The boolean that let you know if the floating element has been positioned.
     */
    isPositioned: Readonly<Ref<boolean>>;
    /**
     * CSS styles to apply to the floating element to position it.
     */
    floatingStyles: Readonly<Ref<{
        position: Strategy;
        top: string;
        left: string;
        transform?: string;
        willChange?: string;
    }>>;
    /**
     * The function to update floating position manually.
     */
    update: () => void;
};

export { VirtualElement }

export { }
