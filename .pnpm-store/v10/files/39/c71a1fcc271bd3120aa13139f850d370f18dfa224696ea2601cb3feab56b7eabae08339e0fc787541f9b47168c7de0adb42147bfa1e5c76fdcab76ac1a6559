import type { Part } from './part';
import type { Feature, WithParamTypes } from './themeTypes';
type AnyString = string & {};
type ExpandTypeKeys<T> = T extends infer O ? {
    [K in keyof O]: O[K];
} : never;
type CreatePartArgs<T> = {
    /**
     * A string feature, e.g. 'iconSet'. Adding a part to a theme will remove
     * any existing part with the same feature.
     */
    feature?: Feature | AnyString;
    /**
     * Default parameters for the part.
     */
    params?: WithParamTypes<T>;
    /**
     * Parameters for different theme modes, e.g. 'dark' or 'light'. Setting
     * `modeParams: {myMode: {myColor: 'red'}}` on a theme part is the equivalent
     * of `theme.withParams({myColor: 'red'}, 'myMode')`.
     */
    modeParams?: Record<string, WithParamTypes<T>>;
    /**
     * CSS styles associated with this part. The CSS will be injected into the
     * page when the theme is used by a grid.
     *
     * The grid uses CSS nested to wrap this CSS in a selector that ensures it
     * only applies to grids that are using a theme containing this part.
     */
    css?: string | (() => string);
    /**
     * URLs of CSS files to import before the part's CSS.
     */
    cssImports?: string[];
};
/**
 * Create a new empty part.
 *
 * @param feature an The part feature, e.g. 'iconSet'. Adding a part to a theme will remove any existing part with the same feature.
 * @param variant an optional identifier for debugging, if omitted one will be generated
 */
export declare const createPart: <T = unknown>(args: CreatePartArgs<T>) => Part<ExpandTypeKeys<WithParamTypes<T>>>;
export declare const defaultModeName = "$default";
export declare class PartImpl implements Part {
    feature?: string;
    modeParams: Record<string, Record<string, unknown>>;
    css?: string | (() => string);
    cssImports?: string[];
    _inject?: {
        css: string;
        class: string;
    } | false;
    constructor({ feature, params, modeParams, css, cssImports }: CreatePartArgs<unknown>);
    use(styleContainer: HTMLElement | undefined, layer: string | undefined, nonce: string | undefined): string | false;
}
export {};
