declare namespace _default {
    /**
       * Register a box to a chart.
       * A box is simply a reference to an object that requires layout. eg. Scales, Legend, Title.
       * @param {Chart} chart - the chart to use
       * @param {LayoutItem} item - the item to add to be laid out
       */
    function addBox(chart: import("./core.controller.js").default, item: LayoutItem): void;
    /**
       * Remove a layoutItem from a chart
       * @param {Chart} chart - the chart to remove the box from
       * @param {LayoutItem} layoutItem - the item to remove from the layout
       */
    function removeBox(chart: import("./core.controller.js").default, layoutItem: LayoutItem): void;
    /**
       * Sets (or updates) options on the given `item`.
       * @param {Chart} chart - the chart in which the item lives (or will be added to)
       * @param {LayoutItem} item - the item to configure with the given options
       * @param {object} options - the new item options.
       */
    function configure(chart: import("./core.controller.js").default, item: LayoutItem, options: any): void;
    /**
       * Fits boxes of the given chart into the given size by having each box measure itself
       * then running a fitting algorithm
       * @param {Chart} chart - the chart
       * @param {number} width - the width to fit into
       * @param {number} height - the height to fit into
     * @param {number} minPadding - minimum padding required for each side of chart area
       */
    function update(chart: import("./core.controller.js").default, width: number, height: number, minPadding: number): void;
}
export default _default;
export type Chart = import('./core.controller.js').default;
export type LayoutItem = {
    /**
     * - The position of the item in the chart layout. Possible values are
     * 'left', 'top', 'right', 'bottom', and 'chartArea'
     */
    position: string;
    /**
     * - The weight used to sort the item. Higher weights are further away from the chart area
     */
    weight: number;
    /**
     * - if true, and the item is horizontal, then push vertical boxes down
     */
    fullSize: boolean;
    /**
     * - returns true if the layout item is horizontal (ie. top or bottom)
     */
    isHorizontal: Function;
    /**
     * - Takes two parameters: width and height. Returns size of item
     */
    update: Function;
    /**
     * - Draws the element
     */
    draw: Function;
    /**
     * -  Returns an object with padding on the edges
     */
    getPadding?: Function;
    /**
     * - Width of item. Must be valid after update()
     */
    width: number;
    /**
     * - Height of item. Must be valid after update()
     */
    height: number;
    /**
     * - Left edge of the item. Set by layout system and cannot be used in update
     */
    left: number;
    /**
     * - Top edge of the item. Set by layout system and cannot be used in update
     */
    top: number;
    /**
     * - Right edge of the item. Set by layout system and cannot be used in update
     */
    right: number;
    /**
     * - Bottom edge of the item. Set by layout system and cannot be used in update
     */
    bottom: number;
};
