import type { GridOptions } from './entities/gridOptions';
export declare class GlobalGridOptions {
    static gridOptions: GridOptions | undefined;
    static mergeStrategy: GlobalGridOptionsMergeStrategy;
    /**
     * @param providedOptions
     * @returns Shallow copy of the provided options with global options merged in.
     */
    static applyGlobalGridOptions(providedOptions: GridOptions): GridOptions;
    /**
     * Apply global grid option for a specific option key.
     * If the merge strategy is 'deep' and both global and provided values are objects, they will be merged deeply.
     * Otherwise, the provided value is returned as is.
     * @param optionKey - The key of the grid option to apply.
     * @param providedValue - The value provided to the grid instance.
     * @returns The merged value if applicable, otherwise the provided value.
     */
    static applyGlobalGridOption<K extends keyof GridOptions>(optionKey: K, providedValue: GridOptions[K]): GridOptions[K];
}
/**
 * When providing global grid options, specify how they should be merged with the grid options provided to individual grids.
 * - `deep` will merge the global options into the provided options deeply, with provided options taking precedence.
 * - `shallow` will merge the global options with the provided options shallowly, with provided options taking precedence.
 * @default 'shallow'
 * @param gridOptions - global grid options
 */
export type GlobalGridOptionsMergeStrategy = 'deep' | 'shallow';
/**
 * Provide gridOptions that will be shared by all grid instances.
 * Individually defined GridOptions will take precedence over global options.
 * @param gridOptions - global grid options
 */
export declare function provideGlobalGridOptions(gridOptions: GridOptions, mergeStrategy?: GlobalGridOptionsMergeStrategy): void;
export declare function _getGlobalGridOption<K extends keyof GridOptions>(gridOption: K): GridOptions[K];
