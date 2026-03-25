import type Chart from '../core/core.controller.js';
import type { ChartEvent } from '../types.js';
/**
 * Note: typedefs are auto-exported, so use a made-up `dom` namespace where
 * necessary to avoid duplicates with `export * from './helpers`; see
 * https://github.com/microsoft/TypeScript/issues/46011
 * @typedef { import('../core/core.controller.js').default } dom.Chart
 * @typedef { import('../../types').ChartEvent } ChartEvent
 */
/**
 * @private
 */
export declare function _isDomSupported(): boolean;
/**
 * @private
 */
export declare function _getParentNode(domNode: HTMLCanvasElement): HTMLCanvasElement;
export declare function getStyle(el: HTMLElement, property: string): string;
/**
 * Gets an event's x, y coordinates, relative to the chart area
 * @param event
 * @param chart
 * @returns x and y coordinates of the event
 */
export declare function getRelativePosition(event: Event | ChartEvent | TouchEvent | MouseEvent, chart: Chart): {
    x: number;
    y: number;
};
export declare function getMaximumSize(canvas: HTMLCanvasElement, bbWidth?: number, bbHeight?: number, aspectRatio?: number): {
    width: number;
    height: number;
};
/**
 * @param chart
 * @param forceRatio
 * @param forceStyle
 * @returns True if the canvas context size or transformation has changed.
 */
export declare function retinaScale(chart: Chart, forceRatio: number, forceStyle?: boolean): boolean | void;
/**
 * Detects support for options object argument in addEventListener.
 * https://developer.mozilla.org/en-US/docs/Web/API/EventTarget/addEventListener#Safely_detecting_option_support
 * @private
 */
export declare const supportsEventListenerOptions: boolean;
/**
 * The "used" size is the final value of a dimension property after all calculations have
 * been performed. This method uses the computed style of `element` but returns undefined
 * if the computed style is not expressed in pixels. That can happen in some cases where
 * `element` has a size relative to its parent and this last one is not yet displayed,
 * for example because of `display: none` on a parent node.
 * @see https://developer.mozilla.org/en-US/docs/Web/CSS/used_value
 * @returns Size in pixels or undefined if unknown.
 */
export declare function readUsedSize(element: HTMLElement, property: 'width' | 'height'): number | undefined;
