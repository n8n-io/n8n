"use strict";
// Copyright (c) Microsoft Corporation. All rights reserved. Licensed under the MIT license.
// See LICENSE in the project root for license information.
Object.defineProperty(exports, "__esModule", { value: true });
exports.DocParamCollection = void 0;
const DocNode_1 = require("./DocNode");
/**
 * Represents a collection of DocParamBlock objects and provides efficient operations for looking up the
 * documentation for a specified parameter name.
 */
class DocParamCollection extends DocNode_1.DocNode {
    /**
     * Don't call this directly.  Instead use {@link TSDocParser}
     * @internal
     */
    constructor(parameters) {
        super(parameters);
        this._blocks = [];
    }
    /** @override */
    get kind() {
        return DocNode_1.DocNodeKind.ParamCollection;
    }
    /**
     * Provide an iterator for callers that support it.
     */
    [Symbol.iterator]() {
        return this._blocks[Symbol.iterator]();
    }
    /**
     * Returns the blocks in this collection.
     */
    get blocks() {
        return this._blocks;
    }
    /**
     * Returns the number of blocks in this collection.
     */
    get count() {
        return this._blocks.length;
    }
    /**
     * Adds a new block to the collection.
     */
    add(docParamBlock) {
        this._blocks.push(docParamBlock);
        // Allocate the map on demand, since most DocComment parameter collections will be empty
        if (this._blocksByName === undefined) {
            this._blocksByName = new Map();
        }
        // The first block to be added takes precedence
        if (!this._blocksByName.has(docParamBlock.parameterName)) {
            this._blocksByName.set(docParamBlock.parameterName, docParamBlock);
        }
    }
    /**
     * Removes all blocks from the collection
     */
    clear() {
        this._blocks.length = 0;
        this._blocksByName = undefined;
    }
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
    tryGetBlockByName(parameterName) {
        if (this._blocksByName) {
            return this._blocksByName.get(parameterName);
        }
        return undefined;
    }
    /** @override */
    onGetChildNodes() {
        return this._blocks;
    }
}
exports.DocParamCollection = DocParamCollection;
//# sourceMappingURL=DocParamCollection.js.map