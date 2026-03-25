declare namespace _default {
    export { evaluateInteractionItems };
    export namespace modes {
        /**
             * Returns items at the same index. If the options.intersect parameter is true, we only return items if we intersect something
             * If the options.intersect mode is false, we find the nearest item and return the items at the same index as that item
             * @function Chart.Interaction.modes.index
             * @since v2.4.0
             * @param {Chart} chart - the chart we are returning items from
             * @param {Event} e - the event we are find things at
             * @param {InteractionOptions} options - options to use
             * @param {boolean} [useFinalPosition] - use final element position (animation target)
             * @return {InteractionItem[]} - items that are found
             */
        function index(chart: import("./core.controller.js").default, e: Event, options: InteractionOptions, useFinalPosition?: boolean): InteractionItem[];
        /**
             * Returns items in the same dataset. If the options.intersect parameter is true, we only return items if we intersect something
             * If the options.intersect is false, we find the nearest item and return the items in that dataset
             * @function Chart.Interaction.modes.dataset
             * @param {Chart} chart - the chart we are returning items from
             * @param {Event} e - the event we are find things at
             * @param {InteractionOptions} options - options to use
             * @param {boolean} [useFinalPosition] - use final element position (animation target)
             * @return {InteractionItem[]} - items that are found
             */
        function dataset(chart: import("./core.controller.js").default, e: Event, options: InteractionOptions, useFinalPosition?: boolean): InteractionItem[];
        /**
             * Point mode returns all elements that hit test based on the event position
             * of the event
             * @function Chart.Interaction.modes.intersect
             * @param {Chart} chart - the chart we are returning items from
             * @param {Event} e - the event we are find things at
             * @param {InteractionOptions} options - options to use
             * @param {boolean} [useFinalPosition] - use final element position (animation target)
             * @return {InteractionItem[]} - items that are found
             */
        function point(chart: import("./core.controller.js").default, e: Event, options: InteractionOptions, useFinalPosition?: boolean): InteractionItem[];
        /**
             * nearest mode returns the element closest to the point
             * @function Chart.Interaction.modes.intersect
             * @param {Chart} chart - the chart we are returning items from
             * @param {Event} e - the event we are find things at
             * @param {InteractionOptions} options - options to use
             * @param {boolean} [useFinalPosition] - use final element position (animation target)
             * @return {InteractionItem[]} - items that are found
             */
        function nearest(chart: import("./core.controller.js").default, e: Event, options: InteractionOptions, useFinalPosition?: boolean): InteractionItem[];
        /**
             * x mode returns the elements that hit-test at the current x coordinate
             * @function Chart.Interaction.modes.x
             * @param {Chart} chart - the chart we are returning items from
             * @param {Event} e - the event we are find things at
             * @param {InteractionOptions} options - options to use
             * @param {boolean} [useFinalPosition] - use final element position (animation target)
             * @return {InteractionItem[]} - items that are found
             */
        function x(chart: import("./core.controller.js").default, e: Event, options: InteractionOptions, useFinalPosition?: boolean): InteractionItem[];
        /**
             * y mode returns the elements that hit-test at the current y coordinate
             * @function Chart.Interaction.modes.y
             * @param {Chart} chart - the chart we are returning items from
             * @param {Event} e - the event we are find things at
             * @param {InteractionOptions} options - options to use
             * @param {boolean} [useFinalPosition] - use final element position (animation target)
             * @return {InteractionItem[]} - items that are found
             */
        function y(chart: import("./core.controller.js").default, e: Event, options: InteractionOptions, useFinalPosition?: boolean): InteractionItem[];
    }
}
export default _default;
export type Chart = import('./core.controller.js').default;
export type ChartEvent = import('../types/index.js').ChartEvent;
export type InteractionOptions = {
    axis?: string;
    intersect?: boolean;
    includeInvisible?: boolean;
};
export type InteractionItem = {
    datasetIndex: number;
    index: number;
    element: import('./core.element.js').default;
};
export type Point = import('../types/index.js').Point;
/**
 * Helper function to select candidate elements for interaction
 * @param {Chart} chart - the chart
 * @param {string} axis - the axis mode. x|y|xy|r
 * @param {Point} position - the point to be nearest to, in relative coordinates
 * @param {function} handler - the callback to execute for each visible item
 * @param {boolean} [intersect] - consider intersecting items
 */
declare function evaluateInteractionItems(chart: Chart, axis: string, position: Point, handler: Function, intersect?: boolean): void;
