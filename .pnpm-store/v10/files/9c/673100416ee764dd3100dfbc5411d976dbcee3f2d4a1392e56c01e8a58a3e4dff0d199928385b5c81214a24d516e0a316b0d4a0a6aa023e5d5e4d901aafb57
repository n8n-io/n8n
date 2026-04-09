import type { GridApi } from './api/gridApi';
import type { Context } from './context/context';
import type { GridOptions } from './entities/gridOptions';
import type { IFrameworkOverrides } from './interfaces/iFrameworkOverrides';
import type { Module } from './interfaces/iModule';
export interface GridParams {
    globalListener?: (...args: any[]) => any;
    globalSyncListener?: (...args: any[]) => any;
    frameworkOverrides?: IFrameworkOverrides;
    providedBeanInstances?: {
        [key: string]: any;
    };
    setThemeOnGridDiv?: boolean;
    /**
     * Modules to be registered directly with this grid instance.
     */
    modules?: Module[];
}
export interface Params {
    /**
     * Modules to be registered directly with this grid instance.
     */
    modules?: Module[];
}
/**
 * Creates a grid inside the provided HTML element.
 * @param eGridDiv Parent element to contain the grid.
 * @param gridOptions Configuration for the grid.
 * @param params Individually register AG Grid Modules to this grid.
 * @returns api to be used to interact with the grid.
 */
export declare function createGrid<TData>(eGridDiv: HTMLElement, gridOptions: GridOptions<TData>, params?: Params): GridApi<TData>;
export declare class GridCoreCreator {
    create(eGridDiv: HTMLElement, providedOptions: GridOptions, createUi: (context: Context) => void, acceptChanges?: (context: Context) => void, params?: GridParams, _destroyCallback?: () => void): GridApi;
    private getRegisteredModules;
    private registerModuleFeatures;
    private createProvidedBeans;
    private createBeansList;
}
/**
 * Returns a `GridApi` instance that is associated with the grid rendered in `gridElement`.
 *
 * The `gridElement` argument can be one of the following:
 * - a DOM node
 * - the grid ID as determined by the `gridId` grid option.
 * - CSS selector string
 *
 * When using a CSS selector, it must refer to the element passed to `createGrid`.
 *
 * If passing a DOM node as an argument, this DOM node must be an immediate child of the element passed
 * to `createGrid`. This is to support the case where multiple grids are instantiated in a single element.
 */
export declare function getGridApi(gridElement: Element | string | null | undefined): GridApi | undefined;
/**
 * Returns the `Element` instance associated with the grid instance referred to by `GridApi`
 */
export declare function getGridElement(api: GridApi): Element | undefined;
