import type * as tsdoc from '@microsoft/tsdoc';
import type { Excerpt } from '../mixins/Excerpt';
import type { ApiParameterListMixin } from '../mixins/ApiParameterListMixin';
/**
 * Constructor options for {@link Parameter}.
 * @public
 */
export interface IParameterOptions {
    name: string;
    parameterTypeExcerpt: Excerpt;
    isOptional: boolean;
    parent: ApiParameterListMixin;
}
/**
 * Represents a named parameter for a function-like declaration.
 *
 * @remarks
 *
 * `Parameter` represents a TypeScript declaration such as `x: number` in this example:
 *
 * ```ts
 * export function add(x: number, y: number): number {
 *   return x + y;
 * }
 * ```
 *
 * `Parameter` objects belong to the {@link (ApiParameterListMixin:interface).parameters} collection.
 *
 * @public
 */
export declare class Parameter {
    /**
     * An {@link Excerpt} that describes the type of the parameter.
     */
    readonly parameterTypeExcerpt: Excerpt;
    /**
     * The parameter name.
     */
    name: string;
    /**
     * Whether the parameter is optional.
     */
    isOptional: boolean;
    private _parent;
    constructor(options: IParameterOptions);
    /**
     * Returns the `@param` documentation for this parameter, if present.
     */
    get tsdocParamBlock(): tsdoc.DocParamBlock | undefined;
}
//# sourceMappingURL=Parameter.d.ts.map