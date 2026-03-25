/**
 * @typedef { import('../core/core.controller.js').default } Chart
 */
/**
 * Abstract class that allows abstracting platform dependencies away from the chart.
 */
export default class BasePlatform {
    /**
       * Called at chart construction time, returns a context2d instance implementing
       * the [W3C Canvas 2D Context API standard]{@link https://www.w3.org/TR/2dcontext/}.
       * @param {HTMLCanvasElement} canvas - The canvas from which to acquire context (platform specific)
       * @param {number} [aspectRatio] - The chart options
       */
    acquireContext(canvas: HTMLCanvasElement, aspectRatio?: number): void;
    /**
       * Called at chart destruction time, releases any resources associated to the context
       * previously returned by the acquireContext() method.
       * @param {CanvasRenderingContext2D} context - The context2d instance
       * @returns {boolean} true if the method succeeded, else false
       */
    releaseContext(context: CanvasRenderingContext2D): boolean;
    /**
       * Registers the specified listener on the given chart.
       * @param {Chart} chart - Chart from which to listen for event
       * @param {string} type - The ({@link ChartEvent}) type to listen for
       * @param {function} listener - Receives a notification (an object that implements
       * the {@link ChartEvent} interface) when an event of the specified type occurs.
       */
    addEventListener(chart: Chart, type: string, listener: Function): void;
    /**
       * Removes the specified listener previously registered with addEventListener.
       * @param {Chart} chart - Chart from which to remove the listener
       * @param {string} type - The ({@link ChartEvent}) type to remove
       * @param {function} listener - The listener function to remove from the event target.
       */
    removeEventListener(chart: Chart, type: string, listener: Function): void;
    /**
       * @returns {number} the current devicePixelRatio of the device this platform is connected to.
       */
    getDevicePixelRatio(): number;
    /**
       * Returns the maximum size in pixels of given canvas element.
       * @param {HTMLCanvasElement} element
       * @param {number} [width] - content width of parent element
       * @param {number} [height] - content height of parent element
       * @param {number} [aspectRatio] - aspect ratio to maintain
       */
    getMaximumSize(element: HTMLCanvasElement, width?: number, height?: number, aspectRatio?: number): {
        width: number;
        height: number;
    };
    /**
       * @param {HTMLCanvasElement} canvas
       * @returns {boolean} true if the canvas is attached to the platform, false if not.
       */
    isAttached(canvas: HTMLCanvasElement): boolean;
    /**
     * Updates config with platform specific requirements
     * @param {import('../core/core.config.js').default} config
     */
    updateConfig(config: import('../core/core.config.js').default): void;
}
export type Chart = import('../core/core.controller.js').default;
