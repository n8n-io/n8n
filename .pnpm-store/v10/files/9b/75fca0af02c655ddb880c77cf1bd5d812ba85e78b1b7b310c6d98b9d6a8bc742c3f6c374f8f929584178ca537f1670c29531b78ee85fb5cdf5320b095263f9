// Copyright (c) Microsoft Corporation. All rights reserved. Licensed under the MIT license.
// See LICENSE in the project root for license information.
import { ApiDocumentedItem } from '../items/ApiDocumentedItem';
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
export class Parameter {
    constructor(options) {
        this.name = options.name;
        this.parameterTypeExcerpt = options.parameterTypeExcerpt;
        this.isOptional = options.isOptional;
        this._parent = options.parent;
    }
    /**
     * Returns the `@param` documentation for this parameter, if present.
     */
    get tsdocParamBlock() {
        if (this._parent instanceof ApiDocumentedItem) {
            if (this._parent.tsdocComment) {
                return this._parent.tsdocComment.params.tryGetBlockByName(this.name);
            }
        }
    }
}
//# sourceMappingURL=Parameter.js.map