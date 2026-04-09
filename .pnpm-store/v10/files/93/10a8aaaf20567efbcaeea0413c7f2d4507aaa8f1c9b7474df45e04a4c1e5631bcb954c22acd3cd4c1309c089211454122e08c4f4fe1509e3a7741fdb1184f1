// Copyright (c) Microsoft Corporation. All rights reserved. Licensed under the MIT license.
// See LICENSE in the project root for license information.
import { TSDocConfiguration, TSDocTagDefinition, TSDocTagSyntaxKind, StandardTags } from '@microsoft/tsdoc';
/**
 * @internal
 * @deprecated - tsdoc configuration is now constructed from tsdoc.json files associated with each package.
 */
export class AedocDefinitions {
    static get tsdocConfiguration() {
        if (!AedocDefinitions._tsdocConfiguration) {
            const configuration = new TSDocConfiguration();
            configuration.addTagDefinitions([
                AedocDefinitions.betaDocumentation,
                AedocDefinitions.internalRemarks,
                AedocDefinitions.preapprovedTag
            ], true);
            configuration.setSupportForTags([
                StandardTags.alpha,
                StandardTags.beta,
                StandardTags.decorator,
                StandardTags.defaultValue,
                StandardTags.deprecated,
                StandardTags.eventProperty,
                StandardTags.example,
                StandardTags.inheritDoc,
                StandardTags.internal,
                StandardTags.link,
                StandardTags.override,
                StandardTags.packageDocumentation,
                StandardTags.param,
                StandardTags.privateRemarks,
                StandardTags.public,
                StandardTags.readonly,
                StandardTags.remarks,
                StandardTags.returns,
                StandardTags.sealed,
                StandardTags.throws,
                StandardTags.virtual
            ], true);
            AedocDefinitions._tsdocConfiguration = configuration;
        }
        return AedocDefinitions._tsdocConfiguration;
    }
}
AedocDefinitions.betaDocumentation = new TSDocTagDefinition({
    tagName: '@betaDocumentation',
    syntaxKind: TSDocTagSyntaxKind.ModifierTag
});
AedocDefinitions.internalRemarks = new TSDocTagDefinition({
    tagName: '@internalRemarks',
    syntaxKind: TSDocTagSyntaxKind.BlockTag
});
AedocDefinitions.preapprovedTag = new TSDocTagDefinition({
    tagName: '@preapproved',
    syntaxKind: TSDocTagSyntaxKind.ModifierTag
});
//# sourceMappingURL=AedocDefinitions.js.map