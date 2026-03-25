"use strict";
// Copyright (c) Microsoft Corporation. All rights reserved. Licensed under the MIT license.
// See LICENSE in the project root for license information.
Object.defineProperty(exports, "__esModule", { value: true });
exports.TypeParameter = void 0;
const ApiDocumentedItem_1 = require("../items/ApiDocumentedItem");
/**
 * Represents a named type parameter for a generic declaration.
 *
 * @remarks
 *
 * `TypeParameter` represents a TypeScript declaration such as `T` in this example:
 *
 * ```ts
 * interface IIdentifier {
 *     getCode(): string;
 * }
 *
 * class BarCode implements IIdentifier {
 *     private _value: number;
 *     public getCode(): string { return this._value.toString(); }
 * }
 *
 * class Book<TIdentifier extends IIdentifier = BarCode> {
 *     public identifier: TIdentifier;
 * }
 * ```
 *
 * `TypeParameter` objects belong to the {@link (ApiTypeParameterListMixin:interface).typeParameters} collection.
 *
 * @public
 */
class TypeParameter {
    constructor(options) {
        this.name = options.name;
        this.constraintExcerpt = options.constraintExcerpt;
        this.defaultTypeExcerpt = options.defaultTypeExcerpt;
        this.isOptional = options.isOptional;
        this._parent = options.parent;
    }
    /**
     * Returns the `@typeParam` documentation for this parameter, if present.
     */
    get tsdocTypeParamBlock() {
        if (this._parent instanceof ApiDocumentedItem_1.ApiDocumentedItem) {
            if (this._parent.tsdocComment) {
                return this._parent.tsdocComment.typeParams.tryGetBlockByName(this.name);
            }
        }
    }
}
exports.TypeParameter = TypeParameter;
//# sourceMappingURL=TypeParameter.js.map