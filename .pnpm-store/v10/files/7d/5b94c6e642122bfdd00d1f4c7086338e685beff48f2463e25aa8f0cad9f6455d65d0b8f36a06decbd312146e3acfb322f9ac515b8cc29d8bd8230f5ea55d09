"use strict";
// Copyright (c) Microsoft Corporation. All rights reserved. Licensed under the MIT license.
// See LICENSE in the project root for license information.
Object.defineProperty(exports, "__esModule", { value: true });
exports.Parameter = void 0;
const ApiDocumentedItem_1 = require("../items/ApiDocumentedItem");
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
class Parameter {
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
        if (this._parent instanceof ApiDocumentedItem_1.ApiDocumentedItem) {
            if (this._parent.tsdocComment) {
                return this._parent.tsdocComment.params.tryGetBlockByName(this.name);
            }
        }
    }
}
exports.Parameter = Parameter;
//# sourceMappingURL=Parameter.js.map