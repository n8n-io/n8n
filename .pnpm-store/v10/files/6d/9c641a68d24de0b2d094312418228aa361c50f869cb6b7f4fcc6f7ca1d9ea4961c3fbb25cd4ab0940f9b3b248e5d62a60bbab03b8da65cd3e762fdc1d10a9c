"use strict";
// Copyright (c) Microsoft Corporation. All rights reserved. Licensed under the MIT license.
// See LICENSE in the project root for license information.
Object.defineProperty(exports, "__esModule", { value: true });
exports.DocComment = void 0;
const DocNode_1 = require("./DocNode");
const DocSection_1 = require("./DocSection");
const StandardModifierTagSet_1 = require("../details/StandardModifierTagSet");
const StringBuilder_1 = require("../emitters/StringBuilder");
const TSDocEmitter_1 = require("../emitters/TSDocEmitter");
const DocParamCollection_1 = require("./DocParamCollection");
/**
 * Represents an entire documentation comment conforming to the TSDoc structure.
 * This is the root of the DocNode tree.
 */
class DocComment extends DocNode_1.DocNode {
    /**
     * Don't call this directly.  Instead use {@link TSDocParser}
     * @internal
     */
    constructor(parameters) {
        super(parameters);
        this.summarySection = new DocSection_1.DocSection({ configuration: this.configuration });
        this.remarksBlock = undefined;
        this.privateRemarks = undefined;
        this.deprecatedBlock = undefined;
        this.params = new DocParamCollection_1.DocParamCollection({ configuration: this.configuration });
        this.typeParams = new DocParamCollection_1.DocParamCollection({ configuration: this.configuration });
        this.returnsBlock = undefined;
        this.modifierTagSet = new StandardModifierTagSet_1.StandardModifierTagSet();
        this._seeBlocks = [];
        this._customBlocks = [];
    }
    /** @override */
    get kind() {
        return DocNode_1.DocNodeKind.Comment;
    }
    /**
     * The collection of all `@see` DockBlockTag nodes belonging to this doc comment.
     */
    get seeBlocks() {
        return this._seeBlocks;
    }
    /**
     * The collection of all DocBlock nodes belonging to this doc comment.
     */
    get customBlocks() {
        return this._customBlocks;
    }
    /**
     * Append an item to the seeBlocks collection.
     * @internal
     */
    _appendSeeBlock(block) {
        this._seeBlocks.push(block);
    }
    /**
     * Append an item to the customBlocks collection.
     */
    appendCustomBlock(block) {
        this._customBlocks.push(block);
    }
    /** @override */
    onGetChildNodes() {
        return [
            this.summarySection,
            this.remarksBlock,
            this.privateRemarks,
            this.deprecatedBlock,
            this.params.count > 0 ? this.params : undefined,
            this.typeParams.count > 0 ? this.typeParams : undefined,
            this.returnsBlock,
            ...this.customBlocks,
            ...this.seeBlocks,
            this.inheritDocTag,
            ...this.modifierTagSet.nodes
        ];
    }
    /**
     * Generates a doc comment corresponding to the `DocComment` tree.  The output is in a normalized form,
     * and may ignore formatting/spacing from the original input.
     *
     * @remarks
     * After parsing a string, and possibly modifying the result, `emitAsTsdoc()` can be used to render the result
     * as a doc comment in a normalized format.  It can also be used to emit a `DocComment` tree that was constructed
     * manually.
     *
     * This method is provided as convenience for simple use cases.  To customize the output, or if you need
     * to render into a `StringBuilder`, use the {@link TSDocEmitter} class instead.
     */
    emitAsTsdoc() {
        const stringBuilder = new StringBuilder_1.StringBuilder();
        const emitter = new TSDocEmitter_1.TSDocEmitter();
        emitter.renderComment(stringBuilder, this);
        return stringBuilder.toString();
    }
}
exports.DocComment = DocComment;
//# sourceMappingURL=DocComment.js.map