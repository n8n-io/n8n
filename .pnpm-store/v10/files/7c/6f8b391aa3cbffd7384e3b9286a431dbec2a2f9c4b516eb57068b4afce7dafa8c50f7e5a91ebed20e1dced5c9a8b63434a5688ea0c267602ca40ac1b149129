"use strict";
// Copyright (c) Microsoft Corporation. All rights reserved. Licensed under the MIT license.
// See LICENSE in the project root for license information.
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        if (typeof b !== "function" && b !== null)
            throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.DocParamCollection = void 0;
var DocNode_1 = require("./DocNode");
/**
 * Represents a collection of DocParamBlock objects and provides efficient operations for looking up the
 * documentation for a specified parameter name.
 */
var DocParamCollection = /** @class */ (function (_super) {
    __extends(DocParamCollection, _super);
    /**
     * Don't call this directly.  Instead use {@link TSDocParser}
     * @internal
     */
    function DocParamCollection(parameters) {
        var _this = _super.call(this, parameters) || this;
        _this._blocks = [];
        return _this;
    }
    Object.defineProperty(DocParamCollection.prototype, "kind", {
        /** @override */
        get: function () {
            return DocNode_1.DocNodeKind.ParamCollection;
        },
        enumerable: false,
        configurable: true
    });
    /**
     * Provide an iterator for callers that support it.
     */
    DocParamCollection.prototype[Symbol.iterator] = function () {
        return this._blocks[Symbol.iterator]();
    };
    Object.defineProperty(DocParamCollection.prototype, "blocks", {
        /**
         * Returns the blocks in this collection.
         */
        get: function () {
            return this._blocks;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(DocParamCollection.prototype, "count", {
        /**
         * Returns the number of blocks in this collection.
         */
        get: function () {
            return this._blocks.length;
        },
        enumerable: false,
        configurable: true
    });
    /**
     * Adds a new block to the collection.
     */
    DocParamCollection.prototype.add = function (docParamBlock) {
        this._blocks.push(docParamBlock);
        // Allocate the map on demand, since most DocComment parameter collections will be empty
        if (this._blocksByName === undefined) {
            this._blocksByName = new Map();
        }
        // The first block to be added takes precedence
        if (!this._blocksByName.has(docParamBlock.parameterName)) {
            this._blocksByName.set(docParamBlock.parameterName, docParamBlock);
        }
    };
    /**
     * Removes all blocks from the collection
     */
    DocParamCollection.prototype.clear = function () {
        this._blocks.length = 0;
        this._blocksByName = undefined;
    };
    /**
     * Returns the first block whose `parameterName` matches the specified string.
     *
     * @remarks
     * If the collection was parsed from an input containing errors, there could potentially be more than
     * one DocParamBlock with the same name.  In this situation, tryGetBlockByName() will return the first match
     * that it finds.
     *
     * This lookup is optimized using a dictionary.
     */
    DocParamCollection.prototype.tryGetBlockByName = function (parameterName) {
        if (this._blocksByName) {
            return this._blocksByName.get(parameterName);
        }
        return undefined;
    };
    /** @override */
    DocParamCollection.prototype.onGetChildNodes = function () {
        return this._blocks;
    };
    return DocParamCollection;
}(DocNode_1.DocNode));
exports.DocParamCollection = DocParamCollection;
//# sourceMappingURL=DocParamCollection.js.map