import type { ChartArea } from '../types/index.js';
import type { SplinePoint } from '../types/geometric.js';
export declare function splineCurve(firstPoint: SplinePoint, middlePoint: SplinePoint, afterPoint: SplinePoint, t: number): {
    previous: SplinePoint;
    next: SplinePoint;
};
/**
 * This function calculates Bézier control points in a similar way than |splineCurve|,
 * but preserves monotonicity of the provided data and ensures no local extremums are added
 * between the dataset discrete points due to the interpolation.
 * See : https://en.wikipedia.org/wiki/Monotone_cubic_interpolation
 */
export declare function splineCurveMonotone(points: SplinePoint[], indexAxis?: 'x' | 'y'): void;
/**
 * @private
 */
export declare function _updateBezierControlPoints(points: SplinePoint[], options: any, area: ChartArea, loop: boolean, indexAxis: 'x' | 'y'): void;
