"use strict";
// Copyright (c) Microsoft Corporation. All rights reserved. Licensed under the MIT license.
// See LICENSE in the project root for license information.
Object.defineProperty(exports, "__esModule", { value: true });
exports.DocDeclarationReference = void 0;
const DocNode_1 = require("./DocNode");
const DocExcerpt_1 = require("./DocExcerpt");
const StringBuilder_1 = require("../emitters/StringBuilder");
const TSDocEmitter_1 = require("../emitters/TSDocEmitter");
/**
 * Represents a declaration reference.
 *
 * @remarks
 * Declaration references are TSDoc expressions used by tags such as `{@link}`
 * or `{@inheritDoc}` that need to refer to another declaration.
 */
class DocDeclarationReference extends DocNode_1.DocNode {
    /**
     * Don't call this directly.  Instead use {@link TSDocParser}
     * @internal
     */
    constructor(parameters) {
        super(parameters);
        if (DocNode_1.DocNode.isParsedParameters(parameters)) {
            if (parameters.packageNameExcerpt) {
                this._packageNameExcerpt = new DocExcerpt_1.DocExcerpt({
                    configuration: this.configuration,
                    excerptKind: DocExcerpt_1.ExcerptKind.DeclarationReference_PackageName,
                    content: parameters.packageNameExcerpt
                });
            }
            if (parameters.importPathExcerpt) {
                this._importPathExcerpt = new DocExcerpt_1.DocExcerpt({
                    configuration: this.configuration,
                    excerptKind: DocExcerpt_1.ExcerptKind.DeclarationReference_ImportPath,
                    content: parameters.importPathExcerpt
                });
            }
            if (parameters.importHashExcerpt) {
                this._importHashExcerpt = new DocExcerpt_1.DocExcerpt({
                    configuration: this.configuration,
                    excerptKind: DocExcerpt_1.ExcerptKind.DeclarationReference_ImportHash,
                    content: parameters.importHashExcerpt
                });
            }
            if (parameters.spacingAfterImportHashExcerpt) {
                this._spacingAfterImportHashExcerpt = new DocExcerpt_1.DocExcerpt({
                    configuration: this.configuration,
                    excerptKind: DocExcerpt_1.ExcerptKind.Spacing,
                    content: parameters.spacingAfterImportHashExcerpt
                });
            }
        }
        else {
            this._packageName = parameters.packageName;
            this._importPath = parameters.importPath;
        }
        this._memberReferences = [];
        if (parameters.memberReferences) {
            this._memberReferences.push(...parameters.memberReferences);
        }
    }
    /** @override */
    get kind() {
        return DocNode_1.DocNodeKind.DeclarationReference;
    }
    /**
     * The optional package name, which may optionally include an NPM scope.
     *
     * Example: `"@scope/my-package"`
     */
    get packageName() {
        if (this._packageName === undefined) {
            if (this._packageNameExcerpt !== undefined) {
                this._packageName = this._packageNameExcerpt.content.toString();
            }
        }
        return this._packageName;
    }
    /**
     * The optional import path.  If a package name is provided, then if an import path is provided,
     * the path must start with a "/" delimiter; otherwise paths are resolved relative to the source file
     * containing the reference.
     *
     * Example: `"/path1/path2"`
     * Example: `"./path1/path2"`
     * Example: `"../path2/path2"`
     */
    get importPath() {
        if (this._importPath === undefined) {
            if (this._importPathExcerpt !== undefined) {
                this._importPath = this._importPathExcerpt.content.toString();
            }
        }
        return this._importPath;
    }
    /**
     * The chain of member references that indicate the declaration being referenced.
     * If this list is empty, then either the packageName or importPath must be provided,
     * because the reference refers to a module.
     */
    get memberReferences() {
        return this._memberReferences;
    }
    /**
     * Generates the TSDoc representation of this declaration reference.
     */
    emitAsTsdoc() {
        const stringBuilder = new StringBuilder_1.StringBuilder();
        const emitter = new TSDocEmitter_1.TSDocEmitter();
        emitter.renderDeclarationReference(stringBuilder, this);
        return stringBuilder.toString();
    }
    /** @override */
    onGetChildNodes() {
        return [
            this._packageNameExcerpt,
            this._importPathExcerpt,
            this._importHashExcerpt,
            this._spacingAfterImportHashExcerpt,
            ...this._memberReferences
        ];
    }
}
exports.DocDeclarationReference = DocDeclarationReference;
//# sourceMappingURL=DocDeclarationReference.js.map