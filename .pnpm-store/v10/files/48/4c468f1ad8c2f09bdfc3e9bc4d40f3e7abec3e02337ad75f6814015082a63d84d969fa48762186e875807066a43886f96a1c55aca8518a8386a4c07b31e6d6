"use strict";
// Copyright (c) Microsoft Corporation. All rights reserved. Licensed under the MIT license.
// See LICENSE in the project root for license information.
Object.defineProperty(exports, "__esModule", { value: true });
exports.ApiModel = void 0;
const DeclarationReference_1 = require("@microsoft/tsdoc/lib-commonjs/beta/DeclarationReference");
const ApiItem_1 = require("../items/ApiItem");
const ApiItemContainerMixin_1 = require("../mixins/ApiItemContainerMixin");
const ApiPackage_1 = require("./ApiPackage");
const node_core_library_1 = require("@rushstack/node-core-library");
const ModelReferenceResolver_1 = require("./ModelReferenceResolver");
const tsdoc_1 = require("@microsoft/tsdoc");
/**
 * A serializable representation of a collection of API declarations.
 *
 * @remarks
 *
 * An `ApiModel` represents a collection of API declarations that can be serialized to disk.  It captures all the
 * important information needed to generate documentation, without any reliance on the TypeScript compiler engine.
 *
 * An `ApiModel` acts as the root of a tree of objects that all inherit from the `ApiItem` base class.
 * The tree children are determined by the {@link (ApiItemContainerMixin:interface)} mixin base class.  The model
 * contains packages.  Packages have an entry point (today, only one).  And the entry point can contain various types
 * of API declarations.  The container relationships might look like this:
 *
 * ```
 * Things that can contain other things:
 *
 * - ApiModel
 *   - ApiPackage
 *     - ApiEntryPoint
 *       - ApiClass
 *         - ApiMethod
 *         - ApiProperty
 *       - ApiEnum
 *         - ApiEnumMember
 *       - ApiInterface
 *         - ApiMethodSignature
 *         - ApiPropertySignature
 *       - ApiNamespace
 *         - (ApiClass, ApiEnum, ApiInterace, ...)
 *
 * ```
 *
 * Normally, API Extractor writes an .api.json file to disk for each project that it builds.  Then, a tool like
 * API Documenter can load the various `ApiPackage` objects into a single `ApiModel` and process them as a group.
 * This is useful because compilation generally occurs separately (e.g. because projects may reside in different
 * Git repos, or because they build with different TypeScript compiler configurations that may be incompatible),
 * whereas API Documenter cannot detect broken hyperlinks without seeing the entire documentation set.
 *
 * @public
 */
class ApiModel extends (0, ApiItemContainerMixin_1.ApiItemContainerMixin)(ApiItem_1.ApiItem) {
    constructor() {
        super({});
        this._packagesByName = undefined;
        this._apiItemsByCanonicalReference = undefined;
        this._resolver = new ModelReferenceResolver_1.ModelReferenceResolver(this);
    }
    loadPackage(apiJsonFilename) {
        const apiPackage = ApiPackage_1.ApiPackage.loadFromJsonFile(apiJsonFilename);
        this.addMember(apiPackage);
        return apiPackage;
    }
    /** @override */
    get kind() {
        return ApiItem_1.ApiItemKind.Model;
    }
    /** @override */
    get containerKey() {
        return '';
    }
    get packages() {
        return this.members;
    }
    /** @override */
    addMember(member) {
        if (member.kind !== ApiItem_1.ApiItemKind.Package) {
            throw new Error('Only items of type ApiPackage may be added to an ApiModel');
        }
        super.addMember(member);
        this._packagesByName = undefined; // invalidate the cache
        this._apiItemsByCanonicalReference = undefined; // invalidate the cache
    }
    /**
     * Efficiently finds a package by the NPM package name.
     *
     * @remarks
     *
     * If the NPM scope is omitted in the package name, it will still be found provided that it is an unambiguous match.
     * For example, it's often convenient to write `{@link node-core-library#JsonFile}` instead of
     * `{@link @rushstack/node-core-library#JsonFile}`.
     */
    tryGetPackageByName(packageName) {
        // Build the lookup on demand
        if (this._packagesByName === undefined) {
            this._packagesByName = new Map();
            const unscopedMap = new Map();
            for (const apiPackage of this.packages) {
                if (this._packagesByName.get(apiPackage.name)) {
                    // This should not happen
                    throw new Error(`The model contains multiple packages with the name ${apiPackage.name}`);
                }
                this._packagesByName.set(apiPackage.name, apiPackage);
                const unscopedName = node_core_library_1.PackageName.parse(apiPackage.name).unscopedName;
                if (unscopedMap.has(unscopedName)) {
                    // If another package has the same unscoped name, then we won't register it
                    unscopedMap.set(unscopedName, undefined);
                }
                else {
                    unscopedMap.set(unscopedName, apiPackage);
                }
            }
            for (const [unscopedName, apiPackage] of unscopedMap) {
                if (apiPackage) {
                    if (!this._packagesByName.has(unscopedName)) {
                        // If the unscoped name is unambiguous, then we can also use it as a lookup
                        this._packagesByName.set(unscopedName, apiPackage);
                    }
                }
            }
        }
        return this._packagesByName.get(packageName);
    }
    resolveDeclarationReference(declarationReference, contextApiItem) {
        if (declarationReference instanceof tsdoc_1.DocDeclarationReference) {
            return this._resolver.resolve(declarationReference, contextApiItem);
        }
        else if (declarationReference instanceof DeclarationReference_1.DeclarationReference) {
            // use this._apiItemsByCanonicalReference to look up ApiItem
            // Build the lookup on demand
            if (!this._apiItemsByCanonicalReference) {
                this._apiItemsByCanonicalReference = new Map();
                for (const apiPackage of this.packages) {
                    this._initApiItemsRecursive(apiPackage, this._apiItemsByCanonicalReference);
                }
            }
            const result = {
                resolvedApiItem: undefined,
                errorMessage: undefined
            };
            const apiItem = this._apiItemsByCanonicalReference.get(declarationReference.toString());
            if (!apiItem) {
                result.errorMessage = `${declarationReference.toString()} can not be located`;
            }
            else {
                result.resolvedApiItem = apiItem;
            }
            return result;
        }
        else {
            // NOTE: The "instanceof DeclarationReference" test assumes a specific version of the @microsoft/tsdoc package.
            throw new Error('The "declarationReference" parameter must be an instance of' +
                ' DocDeclarationReference or DeclarationReference');
        }
    }
    _initApiItemsRecursive(apiItem, apiItemsByCanonicalReference) {
        if (apiItem.canonicalReference && !apiItem.canonicalReference.isEmpty) {
            apiItemsByCanonicalReference.set(apiItem.canonicalReference.toString(), apiItem);
        }
        // Recurse container members
        if (ApiItemContainerMixin_1.ApiItemContainerMixin.isBaseClassOf(apiItem)) {
            for (const apiMember of apiItem.members) {
                this._initApiItemsRecursive(apiMember, apiItemsByCanonicalReference);
            }
        }
    }
    /** @beta @override */
    buildCanonicalReference() {
        return DeclarationReference_1.DeclarationReference.empty();
    }
}
exports.ApiModel = ApiModel;
//# sourceMappingURL=ApiModel.js.map