export class Legend extends Element<import("../types/basic.js").AnyObject, import("../types/basic.js").AnyObject> {
    /**
       * @param {{ ctx: any; options: any; chart: any; }} config
       */
    constructor(config: {
        ctx: any;
        options: any;
        chart: any;
    });
    _added: boolean;
    legendHitBoxes: any[];
    /**
         * @private
         */
    private _hoveredItem;
    doughnutMode: boolean;
    chart: any;
    options: any;
    ctx: any;
    legendItems: any;
    columnSizes: any[];
    lineWidths: number[];
    maxHeight: any;
    maxWidth: any;
    top: any;
    bottom: any;
    left: any;
    right: any;
    height: any;
    width: any;
    _margins: any;
    position: any;
    weight: any;
    fullSize: any;
    update(maxWidth: any, maxHeight: any, margins: any): void;
    setDimensions(): void;
    buildLabels(): void;
    fit(): void;
    /**
       * @private
       */
    private _fitRows;
    _fitCols(titleHeight: any, labelFont: any, boxWidth: any, _itemHeight: any): any;
    adjustHitBoxes(): void;
    isHorizontal(): boolean;
    draw(): void;
    /**
       * @private
       */
    private _draw;
    /**
       * @protected
       */
    protected drawTitle(): void;
    /**
       * @private
       */
    private _computeTitleHeight;
    /**
       * @private
       */
    private _getLegendItemAt;
    /**
       * Handle an event
       * @param {ChartEvent} e - The event to handle
       */
    handleEvent(e: ChartEvent): void;
}
declare namespace _default {
    export const id: string;
    export { Legend as _element };
    export function start(chart: any, _args: any, options: any): void;
    export function stop(chart: any): void;
    export function beforeUpdate(chart: any, _args: any, options: any): void;
    export function afterUpdate(chart: any): void;
    export function afterEvent(chart: any, args: any): void;
    export namespace defaults {
        const display: boolean;
        const position: string;
        const align: string;
        const fullSize: boolean;
        const reverse: boolean;
        const weight: number;
        function onClick(e: any, legendItem: any, legend: any): void;
        const onHover: any;
        const onLeave: any;
        namespace labels {
            function color(ctx: any): any;
            const boxWidth: number;
            const padding: number;
            function generateLabels(chart: any): any;
        }
        namespace title {
            export function color_1(ctx: any): any;
            export { color_1 as color };
            const display_1: boolean;
            export { display_1 as display };
            const position_1: string;
            export { position_1 as position };
            export const text: string;
        }
    }
    export namespace descriptors {
        export function _scriptable(name: any): boolean;
        export namespace labels_1 {
            export function _scriptable_1(name: any): boolean;
            export { _scriptable_1 as _scriptable };
        }
        export { labels_1 as labels };
    }
}
export default _default;
export type ChartEvent = import('../types/index.js').ChartEvent;
import Element from "../core/core.element.js";
