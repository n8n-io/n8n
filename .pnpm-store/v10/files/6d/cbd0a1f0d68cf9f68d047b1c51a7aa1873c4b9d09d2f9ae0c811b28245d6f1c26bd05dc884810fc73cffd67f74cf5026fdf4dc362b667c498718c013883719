// Copyright (c) Microsoft Corporation. All rights reserved. Licensed under the MIT license.
// See LICENSE in the project root for license information.
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
export class DocDeclarationReference extends DocNode {
    /**
     * Don't call this directly.  Instead use {@link TSDocParser}
     * @internal
     */
    constructor(parameters) {
        super(parameters);
        if (DocNode.isParsedParameters(parameters)) {
            if (parameters.packageNameExcerpt) {
                this._packageNameExcerpt = new DocExcerpt({
                    configuration: this.configuration,
                    excerptKind: ExcerptKind.DeclarationReference_PackageName,
                    content: parameters.packageNameExcerpt
                });
            }
            if (parameters.importPathExcerpt) {
                this._importPathExcerpt = new DocExcerpt({
                    configuration: this.configuration,
                    excerptKind: ExcerptKind.DeclarationReference_ImportPath,
                    content: parameters.importPathExcerpt
                });
            }
            if (parameters.importHashExcerpt) {
                this._importHashExcerpt = new DocExcerpt({
                    configuration: this.configuration,
                    excerptKind: ExcerptKind.DeclarationReference_ImportHash,
                    content: parameters.importHashExcerpt
                });
            }
            if (parameters.spacingAfterImportHashExcerpt) {
                this._spacingAfterImportHashExcerpt = new DocExcerpt({
                    configuration: this.configuration,
                    excerptKind: ExcerptKind.Spacing,
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
        return DocNodeKind.DeclarationReference;
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
        const stringBuilder = new StringBuilder();
        const emitter = new TSDocEmitter();
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
//# sourceMappingURL=DocDeclarationReference.js.map