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
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DocComment = void 0;
var DocNode_1 = require("./DocNode");
var DocSection_1 = require("./DocSection");
var StandardModifierTagSet_1 = require("../details/StandardModifierTagSet");
var StringBuilder_1 = require("../emitters/StringBuilder");
var TSDocEmitter_1 = require("../emitters/TSDocEmitter");
var DocParamCollection_1 = require("./DocParamCollection");
/**
 * Represents an entire documentation comment conforming to the TSDoc structure.
 * This is the root of the DocNode tree.
 */
var DocComment = /** @class */ (function (_super) {
    __extends(DocComment, _super);
    /**
     * Don't call this directly.  Instead use {@link TSDocParser}
     * @internal
     */
    function DocComment(parameters) {
        var _this = _super.call(this, parameters) || this;
        _this.summarySection = new DocSection_1.DocSection({ configuration: _this.configuration });
        _this.remarksBlock = undefined;
        _this.privateRemarks = undefined;
        _this.deprecatedBlock = undefined;
        _this.params = new DocParamCollection_1.DocParamCollection({ configuration: _this.configuration });
        _this.typeParams = new DocParamCollection_1.DocParamCollection({ configuration: _this.configuration });
        _this.returnsBlock = undefined;
        _this.modifierTagSet = new StandardModifierTagSet_1.StandardModifierTagSet();
        _this._seeBlocks = [];
        _this._customBlocks = [];
        return _this;
    }
    Object.defineProperty(DocComment.prototype, "kind", {
        /** @override */
        get: function () {
            return DocNode_1.DocNodeKind.Comment;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(DocComment.prototype, "seeBlocks", {
        /**
         * The collection of all `@see` DockBlockTag nodes belonging to this doc comment.
         */
        get: function () {
            return this._seeBlocks;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(DocComment.prototype, "customBlocks", {
        /**
         * The collection of all DocBlock nodes belonging to this doc comment.
         */
        get: function () {
            return this._customBlocks;
        },
        enumerable: false,
        configurable: true
    });
    /**
     * Append an item to the seeBlocks collection.
     * @internal
     */
    DocComment.prototype._appendSeeBlock = function (block) {
        this._seeBlocks.push(block);
    };
    /**
     * Append an item to the customBlocks collection.
     */
    DocComment.prototype.appendCustomBlock = function (block) {
        this._customBlocks.push(block);
    };
    /** @override */
    DocComment.prototype.onGetChildNodes = function () {
        return __spreadArray(__spreadArray(__spreadArray(__spreadArray([
            this.summarySection,
            this.remarksBlock,
            this.privateRemarks,
            this.deprecatedBlock,
            this.params.count > 0 ? this.params : undefined,
            this.typeParams.count > 0 ? this.typeParams : undefined,
            this.returnsBlock
        ], this.customBlocks, true), this.seeBlocks, true), [
            this.inheritDocTag
        ], false), this.modifierTagSet.nodes, true);
    };
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
    DocComment.prototype.emitAsTsdoc = function () {
        var stringBuilder = new StringBuilder_1.StringBuilder();
        var emitter = new TSDocEmitter_1.TSDocEmitter();
        emitter.renderComment(stringBuilder, this);
        return stringBuilder.toString();
    };
    return DocComment;
}(DocNode_1.DocNode));
exports.DocComment = DocComment;
//# sourceMappingURL=DocComment.js.map