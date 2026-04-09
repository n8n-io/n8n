"use strict";
// Copyright (c) Microsoft Corporation. All rights reserved. Licensed under the MIT license.
// See LICENSE in the project root for license information.
Object.defineProperty(exports, "__esModule", { value: true });
exports.ApiDeclaredItem = void 0;
const DeclarationReference_1 = require("@microsoft/tsdoc/lib-commonjs/beta/DeclarationReference");
const ApiDocumentedItem_1 = require("./ApiDocumentedItem");
const Excerpt_1 = require("../mixins/Excerpt");
const SourceLocation_1 = require("../model/SourceLocation");
/**
 * The base class for API items that have an associated source code excerpt containing a TypeScript declaration.
 *
 * @remarks
 *
 * This is part of the {@link ApiModel} hierarchy of classes, which are serializable representations of
 * API declarations.
 *
 * Most `ApiItem` subclasses have declarations and thus extend `ApiDeclaredItem`.  Counterexamples include
 * `ApiModel` and `ApiPackage`, which do not have any corresponding TypeScript source code.
 *
 * @public
 */
class ApiDeclaredItem extends ApiDocumentedItem_1.ApiDocumentedItem {
    constructor(options) {
        super(options);
        this._excerptTokens = options.excerptTokens.map((token) => {
            const canonicalReference = token.canonicalReference === undefined
                ? undefined
                : DeclarationReference_1.DeclarationReference.parse(token.canonicalReference);
            return new Excerpt_1.ExcerptToken(token.kind, token.text, canonicalReference);
        });
        this._excerpt = new Excerpt_1.Excerpt(this.excerptTokens, { startIndex: 0, endIndex: this.excerptTokens.length });
        this._fileUrlPath = options.fileUrlPath;
    }
    /** @override */
    static onDeserializeInto(options, context, jsonObject) {
        super.onDeserializeInto(options, context, jsonObject);
        options.excerptTokens = jsonObject.excerptTokens;
        options.fileUrlPath = jsonObject.fileUrlPath;
    }
    /**
     * The source code excerpt where the API item is declared.
     */
    get excerpt() {
        return this._excerpt;
    }
    /**
     * The individual source code tokens that comprise the main excerpt.
     */
    get excerptTokens() {
        return this._excerptTokens;
    }
    /**
     * The file URL path relative to the `projectFolder` and `projectFolderURL` fields
     * as defined in the `api-extractor.json` config. Is `undefined` if the path is
     * the same as the parent API item's.
     */
    get fileUrlPath() {
        return this._fileUrlPath;
    }
    /**
     * Returns the source location where the API item is declared.
     */
    get sourceLocation() {
        if (!this._sourceLocation) {
            this._sourceLocation = this._buildSourceLocation();
        }
        return this._sourceLocation;
    }
    /**
     * If the API item has certain important modifier tags such as `@sealed`, `@virtual`, or `@override`,
     * this prepends them as a doc comment above the excerpt.
     */
    getExcerptWithModifiers() {
        const excerpt = this.excerpt.text;
        const modifierTags = [];
        if (excerpt.length > 0) {
            if (this instanceof ApiDocumentedItem_1.ApiDocumentedItem) {
                if (this.tsdocComment) {
                    if (this.tsdocComment.modifierTagSet.isSealed()) {
                        modifierTags.push('@sealed');
                    }
                    if (this.tsdocComment.modifierTagSet.isVirtual()) {
                        modifierTags.push('@virtual');
                    }
                    if (this.tsdocComment.modifierTagSet.isOverride()) {
                        modifierTags.push('@override');
                    }
                }
                if (modifierTags.length > 0) {
                    return '/** ' + modifierTags.join(' ') + ' */\n' + excerpt;
                }
            }
        }
        return excerpt;
    }
    /** @override */
    serializeInto(jsonObject) {
        super.serializeInto(jsonObject);
        jsonObject.excerptTokens = this.excerptTokens.map((x) => {
            const excerptToken = { kind: x.kind, text: x.text };
            if (x.canonicalReference !== undefined) {
                excerptToken.canonicalReference = x.canonicalReference.toString();
            }
            return excerptToken;
        });
        // Only serialize this API item's file URL path if it exists and it's different from its parent's
        // (a little optimization to keep the doc model succinct).
        if (this.fileUrlPath) {
            if (!(this.parent instanceof ApiDeclaredItem) || this.fileUrlPath !== this.parent.fileUrlPath) {
                jsonObject.fileUrlPath = this.fileUrlPath;
            }
        }
    }
    /**
     * Constructs a new {@link Excerpt} corresponding to the provided token range.
     */
    buildExcerpt(tokenRange) {
        return new Excerpt_1.Excerpt(this.excerptTokens, tokenRange);
    }
    /**
     * Builds the cached object used by the `sourceLocation` property.
     */
    _buildSourceLocation() {
        var _a;
        const projectFolderUrl = (_a = this.getAssociatedPackage()) === null || _a === void 0 ? void 0 : _a.projectFolderUrl;
        let fileUrlPath;
        for (let current = this; current !== undefined; current = current.parent) {
            if (current instanceof ApiDeclaredItem && current.fileUrlPath) {
                fileUrlPath = current.fileUrlPath;
                break;
            }
        }
        return new SourceLocation_1.SourceLocation({
            projectFolderUrl: projectFolderUrl,
            fileUrlPath: fileUrlPath
        });
    }
}
exports.ApiDeclaredItem = ApiDeclaredItem;
//# sourceMappingURL=ApiDeclaredItem.js.map