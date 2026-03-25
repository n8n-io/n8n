export class Tooltip extends Element<import("../types/basic.js").AnyObject, import("../types/basic.js").AnyObject> {
    /**
     * @namespace Chart.Tooltip.positioners
     */
    static positioners: {
        /**
           * Average mode places the tooltip at the average position of the elements shown
           */
        average(items: any): false | {
            x: number;
            y: number;
        };
        /**
           * Gets the tooltip position nearest of the item nearest to the event position
           */
        nearest(items: any, eventPosition: any): false | {
            x: any;
            y: any;
        };
    };
    constructor(config: any);
    opacity: number;
    _active: any[];
    _eventPosition: any;
    _size: {
        width: number;
        height: number;
    };
    _cachedAnimations: Readonly<Animations>;
    _tooltipItems: any[];
    $animations: any;
    $context: any;
    chart: any;
    options: any;
    dataPoints: {
        chart: import("../core/core.controller.js").default;
        label: any;
        parsed: any;
        raw: any;
        formattedValue: any;
        dataset: any;
        dataIndex: number;
        datasetIndex: number;
        element: Element<import("../types/basic.js").AnyObject, import("../types/basic.js").AnyObject>;
    }[];
    title: any;
    beforeBody: any;
    body: any[];
    afterBody: any;
    footer: any;
    xAlign: any;
    yAlign: any;
    x: any;
    y: any;
    height: number;
    width: number;
    caretX: any;
    caretY: any;
    labelColors: any[];
    labelPointStyles: any[];
    labelTextColors: any[];
    initialize(options: any): void;
    /**
       * @private
       */
    private _resolveAnimations;
    /**
       * @protected
       */
    protected getContext(): any;
    getTitle(context: any, options: any): any;
    getBeforeBody(tooltipItems: any, options: any): any;
    getBody(tooltipItems: any, options: any): any[];
    getAfterBody(tooltipItems: any, options: any): any;
    getFooter(tooltipItems: any, options: any): any;
    /**
       * @private
       */
    private _createItems;
    update(changed: any, replay: any): void;
    drawCaret(tooltipPoint: any, ctx: any, size: any, options: any): void;
    getCaretPosition(tooltipPoint: any, size: any, options: any): {
        x1: any;
        x2: any;
        x3: any;
        y1: any;
        y2: any;
        y3: any;
    };
    drawTitle(pt: any, ctx: any, options: any): void;
    /**
       * @private
       */
    private _drawColorBox;
    drawBody(pt: any, ctx: any, options: any): void;
    drawFooter(pt: any, ctx: any, options: any): void;
    drawBackground(pt: any, ctx: any, tooltipSize: any, options: any): void;
    /**
       * Update x/y animation targets when _active elements are animating too
       * @private
       */
    private _updateAnimationTarget;
    /**
     * Determine if the tooltip will draw anything
     * @returns {boolean} True if the tooltip will render
     */
    _willRender(): boolean;
    draw(ctx: any): void;
    /**
       * Get active elements in the tooltip
       * @returns {Array} Array of elements that are active in the tooltip
       */
    getActiveElements(): any[];
    /**
       * Set active elements in the tooltip
       * @param {array} activeElements Array of active datasetIndex/index pairs.
       * @param {object} eventPosition Synthetic event position used in positioning
       */
    setActiveElements(activeElements: any[], eventPosition: object): void;
    _ignoreReplayEvents: boolean;
    /**
       * Handle an event
       * @param {ChartEvent} e - The event to handle
       * @param {boolean} [replay] - This is a replayed event (from update)
       * @param {boolean} [inChartArea] - The event is inside chartArea
       * @returns {boolean} true if the tooltip changed
       */
    handleEvent(e: ChartEvent, replay?: boolean, inChartArea?: boolean): boolean;
    /**
       * Helper for determining the active elements for event
       * @param {ChartEvent} e - The event to handle
       * @param {InteractionItem[]} lastActive - Previously active elements
       * @param {boolean} [replay] - This is a replayed event (from update)
       * @param {boolean} [inChartArea] - The event is inside chartArea
       * @returns {InteractionItem[]} - Active elements
       * @private
       */
    private _getActiveElements;
    /**
       * Determine if the active elements + event combination changes the
       * tooltip position
       * @param {array} active - Active elements
       * @param {ChartEvent} e - Event that triggered the position change
       * @returns {boolean} True if the position has changed
       */
    _positionChanged(active: any[], e: ChartEvent): boolean;
}
declare namespace _default {
    export const id: string;
    export { Tooltip as _element };
    export { positioners };
    export function afterInit(chart: any, _args: any, options: any): void;
    export function beforeUpdate(chart: any, _args: any, options: any): void;
    export function reset(chart: any, _args: any, options: any): void;
    export function afterDraw(chart: any): void;
    export function afterEvent(chart: any, args: any): void;
    export namespace defaults {
        export const enabled: boolean;
        export const external: any;
        export const position: string;
        export const backgroundColor: string;
        export const titleColor: string;
        export namespace titleFont {
            const weight: string;
        }
        export const titleSpacing: number;
        export const titleMarginBottom: number;
        export const titleAlign: string;
        export const bodyColor: string;
        export const bodySpacing: number;
        export const bodyFont: {};
        export const bodyAlign: string;
        export const footerColor: string;
        export const footerSpacing: number;
        export const footerMarginTop: number;
        export namespace footerFont {
            const weight_1: string;
            export { weight_1 as weight };
        }
        export const footerAlign: string;
        export const padding: number;
        export const caretPadding: number;
        export const caretSize: number;
        export const cornerRadius: number;
        export function boxHeight(ctx: any, opts: any): any;
        export function boxWidth(ctx: any, opts: any): any;
        export const multiKeyBackground: string;
        export const displayColors: boolean;
        export const boxPadding: number;
        export const borderColor: string;
        export const borderWidth: number;
        export namespace animation {
            const duration: number;
            const easing: string;
        }
        export namespace animations {
            namespace numbers {
                const type: string;
                const properties: string[];
            }
            namespace opacity {
                const easing_1: string;
                export { easing_1 as easing };
                const duration_1: number;
                export { duration_1 as duration };
            }
        }
        export { defaultCallbacks as callbacks };
    }
    export namespace defaultRoutes {
        const bodyFont_1: string;
        export { bodyFont_1 as bodyFont };
        const footerFont_1: string;
        export { footerFont_1 as footerFont };
        const titleFont_1: string;
        export { titleFont_1 as titleFont };
    }
    export namespace descriptors {
        export function _scriptable(name: any): boolean;
        export const _indexable: boolean;
        export namespace callbacks {
            const _scriptable_1: boolean;
            export { _scriptable_1 as _scriptable };
            const _indexable_1: boolean;
            export { _indexable_1 as _indexable };
        }
        export namespace animation_1 {
            const _fallback: boolean;
        }
        export { animation_1 as animation };
        export namespace animations_1 {
            const _fallback_1: string;
            export { _fallback_1 as _fallback };
        }
        export { animations_1 as animations };
    }
    export const additionalOptionScopes: string[];
}
export default _default;
export type Chart = import('../platform/platform.base.js').Chart;
export type ChartEvent = import('../types/index.js').ChartEvent;
export type ActiveElement = import('../types/index.js').ActiveElement;
export type InteractionItem = import('../core/core.interaction.js').InteractionItem;
import Element from "../core/core.element.js";
import Animations from "../core/core.animations.js";
declare namespace positioners {
    /**
       * Average mode places the tooltip at the average position of the elements shown
       */
    function average(items: any): false | {
        x: number;
        y: number;
    };
    /**
       * Gets the tooltip position nearest of the item nearest to the event position
       */
    function nearest(items: any, eventPosition: any): false | {
        x: any;
        y: any;
    };
}
declare namespace defaultCallbacks {
    export { noop as beforeTitle };
    export function title(tooltipItems: any): any;
    export { noop as afterTitle };
    export { noop as beforeBody };
    export { noop as beforeLabel };
    export function label(tooltipItem: any): any;
    export function labelColor(tooltipItem: any): {
        borderColor: any;
        backgroundColor: any;
        borderWidth: any;
        borderDash: any;
        borderDashOffset: any;
        borderRadius: number;
    };
    export function labelTextColor(): any;
    export function labelPointStyle(tooltipItem: any): {
        pointStyle: any;
        rotation: any;
    };
    export { noop as afterLabel };
    export { noop as afterBody };
    export { noop as beforeFooter };
    export { noop as footer };
    export { noop as afterFooter };
}
import { noop } from "../helpers/helpers.core.js";
