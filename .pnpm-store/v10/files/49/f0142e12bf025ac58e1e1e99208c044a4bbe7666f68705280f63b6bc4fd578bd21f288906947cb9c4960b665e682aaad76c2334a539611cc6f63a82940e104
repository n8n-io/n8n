export const overrides: any;
export const descriptors: any;
/**
 * Please use the module's default export which provides a singleton instance
 * Note: class is exported for typedoc
 */
export class Defaults {
    constructor(_descriptors: any, _appliers: any);
    animation: any;
    backgroundColor: string;
    borderColor: string;
    color: string;
    datasets: {};
    devicePixelRatio: (context: any) => any;
    elements: {};
    events: string[];
    font: {
        family: string;
        size: number;
        style: string;
        lineHeight: number;
        weight: any;
    };
    hover: {};
    hoverBackgroundColor: (ctx: any, options: any) => CanvasGradient;
    hoverBorderColor: (ctx: any, options: any) => CanvasGradient;
    hoverColor: (ctx: any, options: any) => CanvasGradient;
    indexAxis: string;
    interaction: {
        mode: string;
        intersect: boolean;
        includeInvisible: boolean;
    };
    maintainAspectRatio: boolean;
    onHover: any;
    onClick: any;
    parsing: boolean;
    plugins: {};
    responsive: boolean;
    scale: any;
    scales: {};
    showLine: boolean;
    drawActiveElementsOnTop: boolean;
    /**
       * @param {string|object} scope
       * @param {object} [values]
       */
    set(scope: string | object, values?: object): any;
    /**
       * @param {string} scope
       */
    get(scope: string): any;
    /**
       * @param {string|object} scope
       * @param {object} [values]
       */
    describe(scope: string | object, values?: object): any;
    override(scope: any, values: any): any;
    /**
       * Routes the named defaults to fallback to another scope/name.
       * This routing is useful when those target values, like defaults.color, are changed runtime.
       * If the values would be copied, the runtime change would not take effect. By routing, the
       * fallback is evaluated at each access, so its always up to date.
       *
       * Example:
       *
       * 	defaults.route('elements.arc', 'backgroundColor', '', 'color')
       *   - reads the backgroundColor from defaults.color when undefined locally
       *
       * @param {string} scope Scope this route applies to.
       * @param {string} name Property name that should be routed to different namespace when not defined here.
       * @param {string} targetScope The namespace where those properties should be routed to.
       * Empty string ('') is the root of defaults.
       * @param {string} targetName The target name in the target scope the property should be routed to.
       */
    route(scope: string, name: string, targetScope: string, targetName: string): void;
    apply(appliers: any): void;
}
declare const _default: Defaults;
export default _default;
