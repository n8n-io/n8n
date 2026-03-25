"use strict";
// Copyright (c) Microsoft Corporation. All rights reserved. Licensed under the MIT license.
// See LICENSE in the project root for license information.
Object.defineProperty(exports, "__esModule", { value: true });
exports.ApiPackage = void 0;
const DeclarationReference_1 = require("@microsoft/tsdoc/lib-commonjs/beta/DeclarationReference");
const ApiItem_1 = require("../items/ApiItem");
const ApiItemContainerMixin_1 = require("../mixins/ApiItemContainerMixin");
const node_core_library_1 = require("@rushstack/node-core-library");
const ApiDocumentedItem_1 = require("../items/ApiDocumentedItem");
const ApiNameMixin_1 = require("../mixins/ApiNameMixin");
const DeserializerContext_1 = require("./DeserializerContext");
const tsdoc_1 = require("@microsoft/tsdoc");
const tsdoc_config_1 = require("@microsoft/tsdoc-config");
/**
 * Represents an NPM package containing API declarations.
 *
 * @remarks
 *
 * This is part of the {@link ApiModel} hierarchy of classes, which are serializable representations of
 * API declarations.
 *
 * @public
 */
class ApiPackage extends (0, ApiItemContainerMixin_1.ApiItemContainerMixin)((0, ApiNameMixin_1.ApiNameMixin)(ApiDocumentedItem_1.ApiDocumentedItem)) {
    constructor(options) {
        super(options);
        this._tsdocConfiguration = options.tsdocConfiguration;
        this._projectFolderUrl = options.projectFolderUrl;
    }
    /** @override */
    static onDeserializeInto(options, context, jsonObject) {
        super.onDeserializeInto(options, context, jsonObject);
        options.projectFolderUrl = jsonObject.projectFolderUrl;
    }
    static loadFromJsonFile(apiJsonFilename) {
        const jsonObject = node_core_library_1.JsonFile.load(apiJsonFilename);
        if (!jsonObject || !jsonObject.metadata || typeof jsonObject.metadata.schemaVersion !== 'number') {
            throw new Error(`Error loading ${apiJsonFilename}:` +
                `\nThe file format is not recognized; the "metadata.schemaVersion" field is missing or invalid`);
        }
        const schemaVersion = jsonObject.metadata.schemaVersion;
        if (schemaVersion < DeserializerContext_1.ApiJsonSchemaVersion.OLDEST_SUPPORTED) {
            throw new Error(`Error loading ${apiJsonFilename}:` +
                `\nThe file format is version ${schemaVersion},` +
                ` whereas ${DeserializerContext_1.ApiJsonSchemaVersion.OLDEST_SUPPORTED} is the oldest version supported by this tool`);
        }
        let oldestForwardsCompatibleVersion = schemaVersion;
        if (jsonObject.metadata.oldestForwardsCompatibleVersion) {
            // Sanity check
            if (jsonObject.metadata.oldestForwardsCompatibleVersion > schemaVersion) {
                throw new Error(`Error loading ${apiJsonFilename}:` +
                    `\nInvalid file format; "oldestForwardsCompatibleVersion" cannot be newer than "schemaVersion"`);
            }
            oldestForwardsCompatibleVersion = jsonObject.metadata.oldestForwardsCompatibleVersion;
        }
        let versionToDeserialize = schemaVersion;
        if (versionToDeserialize > DeserializerContext_1.ApiJsonSchemaVersion.LATEST) {
            // If the file format is too new, can we treat it as some earlier compatible version
            // as indicated by oldestForwardsCompatibleVersion?
            versionToDeserialize = Math.max(oldestForwardsCompatibleVersion, DeserializerContext_1.ApiJsonSchemaVersion.LATEST);
            if (versionToDeserialize > DeserializerContext_1.ApiJsonSchemaVersion.LATEST) {
                // Nope, still too new
                throw new Error(`Error loading ${apiJsonFilename}:` +
                    `\nThe file format version ${schemaVersion} was written by a newer release of` +
                    ` the api-extractor-model library; you may need to upgrade your software`);
            }
        }
        const tsdocConfiguration = new tsdoc_1.TSDocConfiguration();
        if (versionToDeserialize >= DeserializerContext_1.ApiJsonSchemaVersion.V_1004) {
            const tsdocConfigFile = tsdoc_config_1.TSDocConfigFile.loadFromObject(jsonObject.metadata.tsdocConfig);
            if (tsdocConfigFile.hasErrors) {
                throw new Error(`Error loading ${apiJsonFilename}:\n` + tsdocConfigFile.getErrorSummary());
            }
            tsdocConfigFile.configureParser(tsdocConfiguration);
        }
        const context = new DeserializerContext_1.DeserializerContext({
            apiJsonFilename,
            toolPackage: jsonObject.metadata.toolPackage,
            toolVersion: jsonObject.metadata.toolVersion,
            versionToDeserialize: versionToDeserialize,
            tsdocConfiguration
        });
        return ApiItem_1.ApiItem.deserialize(jsonObject, context);
    }
    /** @override */
    get kind() {
        return ApiItem_1.ApiItemKind.Package;
    }
    /** @override */
    get containerKey() {
        // No prefix needed, because ApiPackage is the only possible member of an ApiModel
        return this.name;
    }
    get entryPoints() {
        return this.members;
    }
    /**
     * The TSDoc configuration that was used when analyzing the API for this package.
     *
     * @remarks
     *
     * Normally this configuration is loaded from the project's tsdoc.json file.  It is stored
     * in the .api.json file so that doc comments can be parsed accurately when loading the file.
     */
    get tsdocConfiguration() {
        return this._tsdocConfiguration;
    }
    get projectFolderUrl() {
        return this._projectFolderUrl;
    }
    /** @override */
    addMember(member) {
        if (member.kind !== ApiItem_1.ApiItemKind.EntryPoint) {
            throw new Error('Only items of type ApiEntryPoint may be added to an ApiPackage');
        }
        super.addMember(member);
    }
    findEntryPointsByPath(importPath) {
        return this.findMembersByName(importPath);
    }
    saveToJsonFile(apiJsonFilename, options) {
        if (!options) {
            options = {};
        }
        const packageJson = node_core_library_1.PackageJsonLookup.loadOwnPackageJson(__dirname);
        const tsdocConfigFile = tsdoc_config_1.TSDocConfigFile.loadFromParser(this.tsdocConfiguration);
        const tsdocConfig = tsdocConfigFile.saveToObject();
        const jsonObject = {
            metadata: {
                toolPackage: options.toolPackage || packageJson.name,
                // In test mode, we don't write the real version, since that would cause spurious diffs whenever
                // the version is bumped.  Instead we write a placeholder string.
                toolVersion: options.testMode ? '[test mode]' : options.toolVersion || packageJson.version,
                schemaVersion: DeserializerContext_1.ApiJsonSchemaVersion.LATEST,
                oldestForwardsCompatibleVersion: DeserializerContext_1.ApiJsonSchemaVersion.OLDEST_FORWARDS_COMPATIBLE,
                tsdocConfig
            }
        };
        if (this.projectFolderUrl) {
            jsonObject.projectFolderUrl = this.projectFolderUrl;
        }
        this.serializeInto(jsonObject);
        node_core_library_1.JsonFile.save(jsonObject, apiJsonFilename, options);
    }
    /** @beta @override */
    buildCanonicalReference() {
        return DeclarationReference_1.DeclarationReference.package(this.name);
    }
}
exports.ApiPackage = ApiPackage;
//# sourceMappingURL=ApiPackage.js.map