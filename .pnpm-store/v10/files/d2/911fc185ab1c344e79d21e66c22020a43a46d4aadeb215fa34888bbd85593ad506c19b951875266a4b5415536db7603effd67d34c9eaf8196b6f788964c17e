export declare type AlignedPlacement = `${Side}-${Alignment}`;

export declare type Alignment = 'start' | 'end';

export declare const alignments: Alignment[];

export declare type Axis = 'x' | 'y';

export declare function clamp(start: number, value: number, end: number): number;

export declare type ClientRectObject = Prettify<Rect & SideObject>;

export declare type Coords = {
    [key in Axis]: number;
};

export declare const createCoords: (v: number) => {
    x: number;
    y: number;
};

export declare type Dimensions = {
    [key in Length]: number;
};

export declare interface ElementRects {
    reference: Rect;
    floating: Rect;
}

export declare function evaluate<T, P>(value: T | ((param: P) => T), param: P): T;

export declare function expandPaddingObject(padding: Partial<SideObject>): SideObject;

export declare const floor: (x: number) => number;

export declare function getAlignment(placement: Placement): Alignment | undefined;

export declare function getAlignmentAxis(placement: Placement): Axis;

export declare function getAlignmentSides(placement: Placement, rects: ElementRects, rtl?: boolean): [Side, Side];

export declare function getAxisLength(axis: Axis): Length;

export declare function getExpandedPlacements(placement: Placement): Array<Placement>;

export declare function getOppositeAlignmentPlacement<T extends string>(placement: T): T;

export declare function getOppositeAxis(axis: Axis): Axis;

export declare function getOppositeAxisPlacements(placement: Placement, flipAlignment: boolean, direction: 'none' | Alignment, rtl?: boolean): Placement[];

export declare function getOppositePlacement<T extends string>(placement: T): T;

export declare function getPaddingObject(padding: Padding): SideObject;

export declare function getSide(placement: Placement): Side;

export declare function getSideAxis(placement: Placement): Axis;

export declare type Length = 'width' | 'height';

export declare const max: (...values: number[]) => number;

export declare const min: (...values: number[]) => number;

export declare type Padding = number | Prettify<Partial<SideObject>>;

export declare type Placement = Prettify<Side | AlignedPlacement>;

export declare const placements: Placement[];

declare type Prettify<T> = {
    [K in keyof T]: T[K];
} & {};

export declare type Rect = Prettify<Coords & Dimensions>;

export declare function rectToClientRect(rect: Rect): ClientRectObject;

export declare const round: (x: number) => number;

export declare type Side = 'top' | 'right' | 'bottom' | 'left';

export declare type SideObject = {
    [key in Side]: number;
};

export declare const sides: Side[];

export declare type Strategy = 'absolute' | 'fixed';

/**
 * Custom positioning reference element.
 * @see https://floating-ui.com/docs/virtual-elements
 */
export declare interface VirtualElement {
    getBoundingClientRect(): ClientRectObject;
    getClientRects?(): Array<ClientRectObject>;
    contextElement?: any;
}

export { }
