import type { AgGradientColor, AgImageFill, AgPatternColor } from '../series/cartesian/commonOptions';
import type { AgChartThemeParams } from './themeParamsOptions';
export type WithThemeParams<T> = ExtendLiteralLeaves<T, Operation, ExcludeLeaves>;
export type Operation = CacheOperation | ChartOperation | ColorOperation | FontOperation | LocationOperation | LogicOperation | NumericOperation | TransformOperation;
type Leaf<T extends ExcludeLeaves | object> = Operation | T;
type AnyLeaf = Leaf<ExcludeLeaves>;
type ExcludeLeaves = string | symbol | number | boolean | undefined | AgGradientColor | AgPatternColor | AgImageFill;
/**
 * Modify a type T by extending it's leaves with the type V, excluding any leaf that extends E.
 *
 * @param T type to extend
 * @param V value to union with the leaves
 * @param E leaf types to exclude and keep their original type
 */
type ExtendLiteralLeaves<T, V, E> = {
    [P in keyof T]: NonNullable<T[P]> extends Array<infer U> ? U extends E ? Array<U> | Array<V> | V : ExtendLiteralLeavesInner<T, V, E, P> : ExtendLiteralLeavesInner<T, V, E, P>;
};
type ExtendLiteralLeavesInner<T, V, E, P extends keyof T> = NonNullable<T[P]> extends Array<infer U> ? Array<ExtendLiteralLeaves<U, V, E>> | V : T[P] extends E ? T[P] | V : ExtendLiteralLeaves<T[P], V, E>;
type ThemeParam = keyof AgChartThemeParams;
type PaletteParam = 'type' | 'fills' | 'fillsFallback' | 'fill' | 'fillFallback' | 'strokes' | 'stroke' | 'gradients' | 'gradient' | 'sequentialColors' | 'divergingColors' | 'hierarchyColors' | 'secondSequentialColors' | 'secondDivergingColors' | 'secondHierarchyColors' | 'range2' | 'up.fill' | 'up.stroke' | 'down.fill' | 'down.stroke' | 'altUp.fill' | 'altUp.stroke' | 'altDown.fill' | 'altDown.stroke' | 'neutral.fill' | 'neutral.stroke';
type CacheOperation = {
    $cacheMax: Leaf<number>;
};
type ChartOperation = {
    $hasSeriesType: Leaf<string>;
} | {
    $isChartType: Leaf<string>;
} | {
    $isSeriesType: Leaf<string>;
};
type ColorOperation = {
    $foregroundBackgroundMix: Leaf<number>;
} | {
    $foregroundOpacity: Leaf<number>;
} | {
    $interpolate: [AnyLeaf, Leaf<number>];
} | {
    $isGradient: AnyLeaf;
} | {
    $isImage: AnyLeaf;
} | {
    $isPattern: AnyLeaf;
} | {
    $mix: [Leaf<string>, Leaf<string>, Leaf<number>];
};
type FontOperation = {
    $rem: AnyLeaf;
};
type LocationOperation = {
    $isUserOption: [Leaf<string>, AnyLeaf, AnyLeaf];
} | {
    $isThemeOverride: [Leaf<string>, AnyLeaf, AnyLeaf];
} | {
    $mapPalette: PaletteParam;
} | {
    $palette: PaletteParam;
} | {
    $path: Leaf<string> | [Leaf<string>, AnyLeaf] | [Leaf<string>, AnyLeaf, AnyLeaf];
} | {
    $pathString: Leaf<string>;
} | {
    $ref: ThemeParam;
};
type LogicOperation = {
    $if: [AnyLeaf, AnyLeaf, AnyLeaf];
} | {
    $or: AnyLeaf[];
} | {
    $and: AnyLeaf[];
} | {
    $eq: AnyLeaf[];
} | {
    $not: AnyLeaf;
} | {
    $switch: (AnyLeaf | object)[];
} | {
    $greaterThan: [Leaf<number>, Leaf<number>];
} | {
    $lessThan: [Leaf<number>, Leaf<number>];
};
type NumericOperation = {
    $even: Leaf<number>;
} | {
    $mul: [Leaf<number>, Leaf<number>];
} | {
    $round: Leaf<number>;
};
type TransformOperation = {
    $apply: Leaf<object> | [Leaf<object>, Leaf<object[]>];
} | {
    $applySwitch: any[];
} | {
    $applyCycle: any[];
} | {
    $findFirstSiblingNotOperation: AnyLeaf;
} | {
    $map: [AnyLeaf | object, AnyLeaf];
} | {
    $merge: Leaf<object>[];
} | {
    $omit: [Leaf<string[]>, Leaf<object>];
} | {
    $size: AnyLeaf;
} | {
    $shallow: Leaf<Array<any>>;
} | {
    $shallowSimple: Leaf<Array<any>>;
} | {
    $value: '$1' | '$index';
};
export {};
