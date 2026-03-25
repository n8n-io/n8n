export default class RadialLinearScale extends LinearScaleBase {
    static id: string;
    /**
     * @type {any}
     */
    static defaults: any;
    static defaultRoutes: {
        'angleLines.color': string;
        'pointLabels.color': string;
        'ticks.color': string;
    };
    static descriptors: {
        angleLines: {
            _fallback: string;
        };
    };
    /** @type {number} */
    xCenter: number;
    /** @type {number} */
    yCenter: number;
    /** @type {number} */
    drawingArea: number;
    /** @type {string[]} */
    _pointLabels: string[];
    _pointLabelItems: any[];
    _padding: import("../types.js").ChartArea;
    generateTickLabels(ticks: any): void;
    setCenterPoint(leftMovement: any, rightMovement: any, topMovement: any, bottomMovement: any): void;
    getIndexAngle(index: any): number;
    getDistanceFromCenterForValue(value: any): number;
    getValueForDistanceFromCenter(distance: any): any;
    getPointLabelContext(index: any): any;
    getPointPosition(index: any, distanceFromCenter: any, additionalAngle?: number): {
        x: number;
        y: number;
        angle: number;
    };
    getPointPositionForValue(index: any, value: any): {
        x: number;
        y: number;
        angle: number;
    };
    getBasePosition(index: any): {
        x: number;
        y: number;
        angle: number;
    };
    getPointLabelPosition(index: any): {
        left: any;
        top: any;
        right: any;
        bottom: any;
    };
    /**
       * @protected
       */
    protected drawGrid(): void;
    /**
       * @protected
       */
    protected drawLabels(): void;
}
import LinearScaleBase from "./scale.linearbase.js";
