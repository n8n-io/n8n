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
import { DocNode, DocNodeKind } from './DocNode';
import { DocExcerpt, ExcerptKind } from './DocExcerpt';
import { StringBuilder } from '../emitters/StringBuilder';
import { TSDocEmitter } from '../emitters/TSDocEmitter';
/**
 * Represents a declaration reference.
 *
 * @remarks
 * Declaration references are TSDoc expressions used by tags such as `{@link}`
 * or `{@inheritDoc}` that need to refer to another declaration.
 */
var DocDeclarationReference = /** @class */ (function (_super) {
    __extends(DocDeclarationReference, _super);
    /**
     * Don't call this directly.  Instead use {@link TSDocParser}
     * @internal
     */
    function DocDeclarationReference(parameters) {
        var _a;
        var _this = _super.call(this, parameters) || this;
        if (DocNode.isParsedParameters(parameters)) {
            if (parameters.packageNameExcerpt) {
                _this._packageNameExcerpt = new DocExcerpt({
                    configuration: _this.configuration,
                    excerptKind: ExcerptKind.DeclarationReference_PackageName,
                    content: parameters.packageNameExcerpt
                });
            }
            if (parameters.importPathExcerpt) {
                _this._importPathExcerpt = new DocExcerpt({
                    configuration: _this.configuration,
                    excerptKind: ExcerptKind.DeclarationReference_ImportPath,
                    content: parameters.importPathExcerpt
                });
            }
            if (parameters.importHashExcerpt) {
                _this._importHashExcerpt = new DocExcerpt({
                    configuration: _this.configuration,
                    excerptKind: ExcerptKind.DeclarationReference_ImportHash,
                    content: parameters.importHashExcerpt
                });
            }
            if (parameters.spacingAfterImportHashExcerpt) {
                _this._spacingAfterImportHashExcerpt = new DocExcerpt({
                    configuration: _this.configuration,
                    excerptKind: ExcerptKind.Spacing,
                    content: parameters.spacingAfterImportHashExcerpt
                });
            }
        }
        else {
            _this._packageName = parameters.packageName;
            _this._importPath = parameters.importPath;
        }
        _this._memberReferences = [];
        if (parameters.memberReferences) {
            (_a = _this._memberReferences).push.apply(_a, parameters.memberReferences);
        }
        return _this;
    }
    Object.defineProperty(DocDeclarationReference.prototype, "kind", {
        /** @override */
        get: function () {
            return DocNodeKind.DeclarationReference;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(DocDeclarationReference.prototype, "packageName", {
        /**
         * The optional package name, which may optionally include an NPM scope.
         *
         * Example: `"@scope/my-package"`
         */
        get: function () {
            if (this._packageName === undefined) {
                if (this._packageNameExcerpt !== undefined) {
                    this._packageName = this._packageNameExcerpt.content.toString();
                }
            }
            return this._packageName;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(DocDeclarationReference.prototype, "importPath", {
        /**
         * The optional import path.  If a package name is provided, then if an import path is provided,
         * the path must start with a "/" delimiter; otherwise paths are resolved relative to the source file
         * containing the reference.
         *
         * Example: `"/path1/path2"`
         * Example: `"./path1/path2"`
         * Example: `"../path2/path2"`
         */
        get: function () {
            if (this._importPath === undefined) {
                if (this._importPathExcerpt !== undefined) {
                    this._importPath = this._importPathExcerpt.content.toString();
                }
            }
            return this._importPath;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(DocDeclarationReference.prototype, "memberReferences", {
        /**
         * The chain of member references that indicate the declaration being referenced.
         * If this list is empty, then either the packageName or importPath must be provided,
         * because the reference refers to a module.
         */
        get: function () {
            return this._memberReferences;
        },
        enumerable: false,
        configurable: true
    });
    /**
     * Generates the TSDoc representation of this declaration reference.
     */
    DocDeclarationReference.prototype.emitAsTsdoc = function () {
        var stringBuilder = new StringBuilder();
        var emitter = new TSDocEmitter();
        emitter.renderDeclarationReference(stringBuilder, this);
        return stringBuilder.toString();
    };
    /** @override */
    DocDeclarationReference.prototype.onGetChildNodes = function () {
        return __spreadArray([
            this._packageNameExcerpt,
            this._importPathExcerpt,
            this._importHashExcerpt,
            this._spacingAfterImportHashExcerpt
        ], this._memberReferences, true);
    };
    return DocDeclarationReference;
}(DocNode));
export { DocDeclarationReference };
//# sourceMappingURL=DocDeclarationReference.js.map