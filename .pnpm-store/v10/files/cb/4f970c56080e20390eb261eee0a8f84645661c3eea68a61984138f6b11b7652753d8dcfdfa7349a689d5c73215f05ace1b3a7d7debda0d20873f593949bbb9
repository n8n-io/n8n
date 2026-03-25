/**
 * Please use the module's default export which provides a singleton instance
 * Note: class is exported for typedoc
 */
export class Registry {
    controllers: TypedRegistry;
    elements: TypedRegistry;
    plugins: TypedRegistry;
    scales: TypedRegistry;
    _typedRegistries: TypedRegistry[];
    /**
       * @param  {...any} args
       */
    add(...args: any[]): void;
    remove(...args: any[]): void;
    /**
       * @param  {...typeof DatasetController} args
       */
    addControllers(...args: (typeof DatasetController)[]): void;
    /**
       * @param  {...typeof Element} args
       */
    addElements(...args: (typeof Element)[]): void;
    /**
       * @param  {...any} args
       */
    addPlugins(...args: any[]): void;
    /**
       * @param  {...typeof Scale} args
       */
    addScales(...args: (typeof Scale)[]): void;
    /**
       * @param {string} id
       * @returns {typeof DatasetController}
       */
    getController(id: string): typeof DatasetController;
    /**
       * @param {string} id
       * @returns {typeof Element}
       */
    getElement(id: string): typeof Element;
    /**
       * @param {string} id
       * @returns {object}
       */
    getPlugin(id: string): object;
    /**
       * @param {string} id
       * @returns {typeof Scale}
       */
    getScale(id: string): typeof Scale;
    /**
       * @param  {...typeof DatasetController} args
       */
    removeControllers(...args: (typeof DatasetController)[]): void;
    /**
       * @param  {...typeof Element} args
       */
    removeElements(...args: (typeof Element)[]): void;
    /**
       * @param  {...any} args
       */
    removePlugins(...args: any[]): void;
    /**
       * @param  {...typeof Scale} args
       */
    removeScales(...args: (typeof Scale)[]): void;
    /**
       * @private
       */
    private _each;
    /**
       * @private
       */
    private _exec;
    /**
       * @private
       */
    private _getRegistryForType;
    /**
       * @private
       */
    private _get;
}
declare const _default: Registry;
export default _default;
import TypedRegistry from "./core.typedRegistry.js";
import DatasetController from "./core.datasetController.js";
import Element from "./core.element.js";
import Scale from "./core.scale.js";
