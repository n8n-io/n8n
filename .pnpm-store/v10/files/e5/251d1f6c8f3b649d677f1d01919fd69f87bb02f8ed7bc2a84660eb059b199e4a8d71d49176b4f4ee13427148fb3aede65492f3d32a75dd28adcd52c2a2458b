import { AlignedPlacement } from '@floating-ui/utils';
import { Alignment } from '@floating-ui/utils';
import { Axis } from '@floating-ui/utils';
import { ClientRectObject } from '@floating-ui/utils';
import { Coords } from '@floating-ui/utils';
import { Dimensions } from '@floating-ui/utils';
import { ElementRects } from '@floating-ui/utils';
import { Length } from '@floating-ui/utils';
import { Padding } from '@floating-ui/utils';
import { Placement } from '@floating-ui/utils';
import { Rect } from '@floating-ui/utils';
import { rectToClientRect } from '@floating-ui/utils';
import { Side } from '@floating-ui/utils';
import { SideObject } from '@floating-ui/utils';
import { Strategy } from '@floating-ui/utils';
import { VirtualElement } from '@floating-ui/utils';

export { AlignedPlacement }

export { Alignment }

/**
 * Provides data to position an inner element of the floating element so that it
 * appears centered to the reference element.
 * @see https://floating-ui.com/docs/arrow
 */
export declare const arrow: (options: ArrowOptions | Derivable<ArrowOptions>) => Middleware;

export declare interface ArrowOptions {
    /**
     * The arrow element to be positioned.
     * @default undefined
     */
    element: any;
    /**
     * The padding between the arrow element and the floating element edges.
     * Useful when the floating element has rounded corners.
     * @default 0
     */
    padding?: Padding;
}

/**
 * Optimizes the visibility of the floating element by choosing the placement
 * that has the most space available automatically, without needing to specify a
 * preferred placement. Alternative to `flip`.
 * @see https://floating-ui.com/docs/autoPlacement
 */
export declare const autoPlacement: (options?: AutoPlacementOptions | Derivable<AutoPlacementOptions>) => Middleware;

export declare interface AutoPlacementOptions extends DetectOverflowOptions {
    /**
     * The axis that runs along the alignment of the floating element. Determines
     * whether to check for most space along this axis.
     * @default false
     */
    crossAxis?: boolean;
    /**
     * Choose placements with a particular alignment.
     * @default undefined
     */
    alignment?: Alignment | null;
    /**
     * Whether to choose placements with the opposite alignment if the preferred
     * alignment does not fit.
     * @default true
     */
    autoAlignment?: boolean;
    /**
     * Which placements are allowed to be chosen. Placements must be within the
     * `alignment` option if explicitly set.
     * @default allPlacements (variable)
     */
    allowedPlacements?: Array<Placement>;
}

export { Axis }

export declare type Boundary = any;

export { ClientRectObject }

export declare type ComputePosition = (reference: unknown, floating: unknown, config: ComputePositionConfig) => Promise<ComputePositionReturn>;

/**
 * Computes the `x` and `y` coordinates that will place the floating element
 * next to a given reference element.
 *
 * This export does not have any `platform` interface logic. You will need to
 * write one for the platform you are using Floating UI with.
 */
export declare const computePosition: ComputePosition;

export declare interface ComputePositionConfig {
    /**
     * Object to interface with the current platform.
     */
    platform: Platform;
    /**
     * Where to place the floating element relative to the reference element.
     */
    placement?: Placement;
    /**
     * The strategy to use when positioning the floating element.
     */
    strategy?: Strategy;
    /**
     * Array of middleware objects to modify the positioning or provide data for
     * rendering.
     */
    middleware?: Array<Middleware | null | undefined | false>;
}

export declare interface ComputePositionReturn extends Coords {
    /**
     * The final chosen placement of the floating element.
     */
    placement: Placement;
    /**
     * The strategy used to position the floating element.
     */
    strategy: Strategy;
    /**
     * Object containing data returned from all middleware, keyed by their name.
     */
    middlewareData: MiddlewareData;
}

export { Coords }

/**
 * Function option to derive middleware options from state.
 */
export declare type Derivable<T> = (state: MiddlewareState) => T;

/**
 * Resolves with an object of overflow side offsets that determine how much the
 * element is overflowing a given clipping boundary on each side.
 * - positive = overflowing the boundary by that number of pixels
 * - negative = how many pixels left before it will overflow
 * - 0 = lies flush with the boundary
 * @see https://floating-ui.com/docs/detectOverflow
 */
export declare function detectOverflow(state: MiddlewareState, options?: DetectOverflowOptions | Derivable<DetectOverflowOptions>): Promise<SideObject>;

export declare interface DetectOverflowOptions {
    /**
     * The clipping element(s) or area in which overflow will be checked.
     * @default 'clippingAncestors'
     */
    boundary?: Boundary;
    /**
     * The root clipping area in which overflow will be checked.
     * @default 'viewport'
     */
    rootBoundary?: RootBoundary;
    /**
     * The element in which overflow is being checked relative to a boundary.
     * @default 'floating'
     */
    elementContext?: ElementContext;
    /**
     * Whether to check for overflow using the alternate element's boundary
     * (`clippingAncestors` boundary only).
     * @default false
     */
    altBoundary?: boolean;
    /**
     * Virtual padding for the resolved overflow detection offsets.
     * @default 0
     */
    padding?: Padding;
}

export { Dimensions }

export declare type ElementContext = 'reference' | 'floating';

export { ElementRects }

export declare interface Elements {
    reference: ReferenceElement;
    floating: FloatingElement;
}

/**
 * Optimizes the visibility of the floating element by flipping the `placement`
 * in order to keep it in view when the preferred placement(s) will overflow the
 * clipping boundary. Alternative to `autoPlacement`.
 * @see https://floating-ui.com/docs/flip
 */
export declare const flip: (options?: FlipOptions | Derivable<FlipOptions>) => Middleware;

export declare interface FlipOptions extends DetectOverflowOptions {
    /**
     * The axis that runs along the side of the floating element. Determines
     * whether overflow along this axis is checked to perform a flip.
     * @default true
     */
    mainAxis?: boolean;
    /**
     * The axis that runs along the alignment of the floating element. Determines
     * whether overflow along this axis is checked to perform a flip.
     * - `true`: Whether to check cross axis overflow for both side and alignment flipping.
     * - `false`: Whether to disable all cross axis overflow checking.
     * - `'alignment'`: Whether to check cross axis overflow for alignment flipping only.
     * @default true
     */
    crossAxis?: boolean | 'alignment';
    /**
     * Placements to try sequentially if the preferred `placement` does not fit.
     * @default [oppositePlacement] (computed)
     */
    fallbackPlacements?: Array<Placement>;
    /**
     * What strategy to use when no placements fit.
     * @default 'bestFit'
     */
    fallbackStrategy?: 'bestFit' | 'initialPlacement';
    /**
     * Whether to allow fallback to the perpendicular axis of the preferred
     * placement, and if so, which side direction along the axis to prefer.
     * @default 'none' (disallow fallback)
     */
    fallbackAxisSideDirection?: 'none' | 'start' | 'end';
    /**
     * Whether to flip to placements with the opposite alignment if they fit
     * better.
     * @default true
     */
    flipAlignment?: boolean;
}

export declare type FloatingElement = any;

/**
 * Provides data to hide the floating element in applicable situations, such as
 * when it is not in the same clipping context as the reference element.
 * @see https://floating-ui.com/docs/hide
 */
export declare const hide: (options?: HideOptions | Derivable<HideOptions>) => Middleware;

export declare interface HideOptions extends DetectOverflowOptions {
    /**
     * The strategy used to determine when to hide the floating element.
     */
    strategy?: 'referenceHidden' | 'escaped';
}

/**
 * Provides improved positioning for inline reference elements that can span
 * over multiple lines, such as hyperlinks or range selections.
 * @see https://floating-ui.com/docs/inline
 */
export declare const inline: (options?: InlineOptions | Derivable<InlineOptions>) => Middleware;

export declare interface InlineOptions {
    /**
     * Viewport-relative `x` coordinate to choose a `ClientRect`.
     * @default undefined
     */
    x?: number;
    /**
     * Viewport-relative `y` coordinate to choose a `ClientRect`.
     * @default undefined
     */
    y?: number;
    /**
     * Represents the padding around a disjoined rect when choosing it.
     * @default 2
     */
    padding?: Padding;
}

export { Length }

/**
 * Built-in `limiter` that will stop `shift()` at a certain point.
 */
export declare const limitShift: (options?: LimitShiftOptions | Derivable<LimitShiftOptions>) => {
    options: any;
    fn: (state: MiddlewareState) => Coords;
};

declare type LimitShiftOffset = number | {
    /**
     * Offset the limiting of the axis that runs along the alignment of the
     * floating element.
     */
    mainAxis?: number;
    /**
     * Offset the limiting of the axis that runs along the side of the
     * floating element.
     */
    crossAxis?: number;
};

export declare interface LimitShiftOptions {
    /**
     * Offset when limiting starts. `0` will limit when the opposite edges of the
     * reference and floating elements are aligned.
     * - positive = start limiting earlier
     * - negative = start limiting later
     */
    offset?: LimitShiftOffset | Derivable<LimitShiftOffset>;
    /**
     * Whether to limit the axis that runs along the alignment of the floating
     * element.
     */
    mainAxis?: boolean;
    /**
     * Whether to limit the axis that runs along the side of the floating element.
     */
    crossAxis?: boolean;
}

export declare type Middleware = {
    name: string;
    options?: any;
    fn: (state: MiddlewareState) => Promisable<MiddlewareReturn>;
};

/**
 * @deprecated use `MiddlewareState` instead.
 */
export declare type MiddlewareArguments = MiddlewareState;

export declare interface MiddlewareData {
    [key: string]: any;
    arrow?: Partial<Coords> & {
        centerOffset: number;
        alignmentOffset?: number;
    };
    autoPlacement?: {
        index?: number;
        overflows: Array<{
            placement: Placement;
            overflows: Array<number>;
        }>;
    };
    flip?: {
        index?: number;
        overflows: Array<{
            placement: Placement;
            overflows: Array<number>;
        }>;
    };
    hide?: {
        referenceHidden?: boolean;
        escaped?: boolean;
        referenceHiddenOffsets?: SideObject;
        escapedOffsets?: SideObject;
    };
    offset?: Coords & {
        placement: Placement;
    };
    shift?: Coords & {
        enabled: {
            [key in Axis]: boolean;
        };
    };
}

export declare interface MiddlewareReturn extends Partial<Coords> {
    data?: {
        [key: string]: any;
    };
    reset?: boolean | {
        placement?: Placement;
        rects?: boolean | ElementRects;
    };
}

export declare interface MiddlewareState extends Coords {
    initialPlacement: Placement;
    placement: Placement;
    strategy: Strategy;
    middlewareData: MiddlewareData;
    elements: Elements;
    rects: ElementRects;
    platform: {
        detectOverflow: typeof detectOverflow;
    } & Platform;
}

/**
 * Modifies the placement by translating the floating element along the
 * specified axes.
 * A number (shorthand for `mainAxis` or distance), or an axes configuration
 * object may be passed.
 * @see https://floating-ui.com/docs/offset
 */
export declare const offset: (options?: OffsetOptions) => Middleware;

export declare type OffsetOptions = OffsetValue | Derivable<OffsetValue>;

declare type OffsetValue = number | {
    /**
     * The axis that runs along the side of the floating element. Represents
     * the distance (gutter or margin) between the reference and floating
     * element.
     * @default 0
     */
    mainAxis?: number;
    /**
     * The axis that runs along the alignment of the floating element.
     * Represents the skidding between the reference and floating element.
     * @default 0
     */
    crossAxis?: number;
    /**
     * The same axis as `crossAxis` but applies only to aligned placements
     * and inverts the `end` alignment. When set to a number, it overrides the
     * `crossAxis` value.
     *
     * A positive number will move the floating element in the direction of
     * the opposite edge to the one that is aligned, while a negative number
     * the reverse.
     * @default null
     */
    alignmentAxis?: number | null;
};

export { Padding }

export { Placement }

/**
 * Platform interface methods to work with the current platform.
 * @see https://floating-ui.com/docs/platform
 */
export declare interface Platform {
    getElementRects: (args: {
        reference: ReferenceElement;
        floating: FloatingElement;
        strategy: Strategy;
    }) => Promisable<ElementRects>;
    getClippingRect: (args: {
        element: any;
        boundary: Boundary;
        rootBoundary: RootBoundary;
        strategy: Strategy;
    }) => Promisable<Rect>;
    getDimensions: (element: any) => Promisable<Dimensions>;
    convertOffsetParentRelativeRectToViewportRelativeRect?: (args: {
        elements?: Elements;
        rect: Rect;
        offsetParent: any;
        strategy: Strategy;
    }) => Promisable<Rect>;
    getOffsetParent?: (element: any) => Promisable<any>;
    isElement?: (value: any) => Promisable<boolean>;
    getDocumentElement?: (element: any) => Promisable<any>;
    getClientRects?: (element: any) => Promisable<Array<ClientRectObject>>;
    isRTL?: (element: any) => Promisable<boolean>;
    getScale?: (element: any) => Promisable<{
        x: number;
        y: number;
    }>;
    detectOverflow?: typeof detectOverflow;
}

declare type Promisable<T> = T | Promise<T>;

export { Rect }

export { rectToClientRect }

export declare type ReferenceElement = any;

export declare type RootBoundary = 'viewport' | 'document' | Rect;

/**
 * Optimizes the visibility of the floating element by shifting it in order to
 * keep it in view when it will overflow the clipping boundary.
 * @see https://floating-ui.com/docs/shift
 */
export declare const shift: (options?: ShiftOptions | Derivable<ShiftOptions>) => Middleware;

export declare interface ShiftOptions extends DetectOverflowOptions {
    /**
     * The axis that runs along the alignment of the floating element. Determines
     * whether overflow along this axis is checked to perform shifting.
     * @default true
     */
    mainAxis?: boolean;
    /**
     * The axis that runs along the side of the floating element. Determines
     * whether overflow along this axis is checked to perform shifting.
     * @default false
     */
    crossAxis?: boolean;
    /**
     * Accepts a function that limits the shifting done in order to prevent
     * detachment.
     */
    limiter?: {
        fn: (state: MiddlewareState) => Coords;
        options?: any;
    };
}

export { Side }

export { SideObject }

/**
 * Provides data that allows you to change the size of the floating element —
 * for instance, prevent it from overflowing the clipping boundary or match the
 * width of the reference element.
 * @see https://floating-ui.com/docs/size
 */
export declare const size: (options?: SizeOptions | Derivable<SizeOptions>) => Middleware;

export declare interface SizeOptions extends DetectOverflowOptions {
    /**
     * Function that is called to perform style mutations to the floating element
     * to change its size.
     * @default undefined
     */
    apply?(args: MiddlewareState & {
        availableWidth: number;
        availableHeight: number;
    }): void | Promise<void>;
}

export { Strategy }

export { VirtualElement }

export { }
