"use strict";
// Copyright (c) Microsoft Corporation. All rights reserved. Licensed under the MIT license.
// See LICENSE in the project root for license information.
Object.defineProperty(exports, "__esModule", { value: true });
exports.AedocDefinitions = void 0;
const tsdoc_1 = require("@microsoft/tsdoc");
/**
 * @internal
 * @deprecated - tsdoc configuration is now constructed from tsdoc.json files associated with each package.
 */
class AedocDefinitions {
    static get tsdocConfiguration() {
        if (!AedocDefinitions._tsdocConfiguration) {
            const configuration = new tsdoc_1.TSDocConfiguration();
            configuration.addTagDefinitions([
                AedocDefinitions.betaDocumentation,
                AedocDefinitions.internalRemarks,
                AedocDefinitions.preapprovedTag
            ], true);
            configuration.setSupportForTags([
                tsdoc_1.StandardTags.alpha,
                tsdoc_1.StandardTags.beta,
                tsdoc_1.StandardTags.decorator,
                tsdoc_1.StandardTags.defaultValue,
                tsdoc_1.StandardTags.deprecated,
                tsdoc_1.StandardTags.eventProperty,
                tsdoc_1.StandardTags.example,
                tsdoc_1.StandardTags.inheritDoc,
                tsdoc_1.StandardTags.internal,
                tsdoc_1.StandardTags.link,
                tsdoc_1.StandardTags.override,
                tsdoc_1.StandardTags.packageDocumentation,
                tsdoc_1.StandardTags.param,
                tsdoc_1.StandardTags.privateRemarks,
                tsdoc_1.StandardTags.public,
                tsdoc_1.StandardTags.readonly,
                tsdoc_1.StandardTags.remarks,
                tsdoc_1.StandardTags.returns,
                tsdoc_1.StandardTags.sealed,
                tsdoc_1.StandardTags.throws,
                tsdoc_1.StandardTags.virtual
            ], true);
            AedocDefinitions._tsdocConfiguration = configuration;
        }
        return AedocDefinitions._tsdocConfiguration;
    }
}
exports.AedocDefinitions = AedocDefinitions;
AedocDefinitions.betaDocumentation = new tsdoc_1.TSDocTagDefinition({
    tagName: '@betaDocumentation',
    syntaxKind: tsdoc_1.TSDocTagSyntaxKind.ModifierTag
});
AedocDefinitions.internalRemarks = new tsdoc_1.TSDocTagDefinition({
    tagName: '@internalRemarks',
    syntaxKind: tsdoc_1.TSDocTagSyntaxKind.BlockTag
});
AedocDefinitions.preapprovedTag = new tsdoc_1.TSDocTagDefinition({
    tagName: '@preapproved',
    syntaxKind: tsdoc_1.TSDocTagSyntaxKind.ModifierTag
});
//# sourceMappingURL=AedocDefinitions.js.map