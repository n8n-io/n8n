import Element from '../core/core.element.js';
import type { ArcOptions, Point } from '../types/index.js';
export interface ArcProps extends Point {
    startAngle: number;
    endAngle: number;
    innerRadius: number;
    outerRadius: number;
    circumference: number;
}
export default class ArcElement extends Element<ArcProps, ArcOptions> {
    static id: string;
    static defaults: {
        borderAlign: string;
        borderColor: string;
        borderDash: any[];
        borderDashOffset: number;
        borderJoinStyle: any;
        borderRadius: number;
        borderWidth: number;
        offset: number;
        spacing: number;
        angle: any;
        circular: boolean;
    };
    static defaultRoutes: {
        backgroundColor: string;
    };
    static descriptors: {
        _scriptable: boolean;
        _indexable: (name: any) => boolean;
    };
    circumference: number;
    endAngle: number;
    fullCircles: number;
    innerRadius: number;
    outerRadius: number;
    pixelMargin: number;
    startAngle: number;
    constructor(cfg: any);
    inRange(chartX: number, chartY: number, useFinalPosition: boolean): boolean;
    getCenterPoint(useFinalPosition: boolean): {
        x: number;
        y: number;
    };
    tooltipPosition(useFinalPosition: boolean): {
        x: number;
        y: number;
    };
    draw(ctx: CanvasRenderingContext2D): void;
}
