import type { Placement } from "../enums";
import type { Modifier, Rect, Offsets } from "../types";
export declare type OffsetsFunction = (arg0: {
    popper: Rect;
    reference: Rect;
    placement: Placement;
}) => [number | null | undefined, number | null | undefined];
declare type Offset = OffsetsFunction | [number | null | undefined, number | null | undefined];
export declare type Options = {
    offset: Offset;
};
export declare function distanceAndSkiddingToXY(placement: Placement, rects: {
    popper: Rect;
    reference: Rect;
}, offset: Offset): Offsets;
export declare type OffsetModifier = Modifier<"offset", Options>;
declare const _default: OffsetModifier;
export default _default;
