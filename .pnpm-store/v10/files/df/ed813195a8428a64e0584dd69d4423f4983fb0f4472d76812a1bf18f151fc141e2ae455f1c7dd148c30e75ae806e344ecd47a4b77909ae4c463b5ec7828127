"use strict";
// Copyright (c) Microsoft Corporation. All rights reserved. Licensed under the MIT license.
// See LICENSE in the project root for license information.
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.ValidationEnhancer = void 0;
const path = __importStar(require("node:path"));
const ts = __importStar(require("typescript"));
const api_extractor_model_1 = require("@microsoft/api-extractor-model");
const AstSymbol_1 = require("../analyzer/AstSymbol");
const ExtractorMessageId_1 = require("../api/ExtractorMessageId");
const AstNamespaceImport_1 = require("../analyzer/AstNamespaceImport");
class ValidationEnhancer {
    static analyze(collector) {
        const alreadyWarnedEntities = new Set();
        for (const entity of collector.entities) {
            if (!(entity.consumable ||
                collector.extractorConfig.apiReportIncludeForgottenExports ||
                collector.extractorConfig.docModelIncludeForgottenExports)) {
                continue;
            }
            if (entity.astEntity instanceof AstSymbol_1.AstSymbol) {
                // A regular exported AstSymbol
                const astSymbol = entity.astEntity;
                astSymbol.forEachDeclarationRecursive((astDeclaration) => {
                    ValidationEnhancer._checkReferences(collector, astDeclaration, alreadyWarnedEntities);
                });
                const symbolMetadata = collector.fetchSymbolMetadata(astSymbol);
                ValidationEnhancer._checkForInternalUnderscore(collector, entity, astSymbol, symbolMetadata);
                ValidationEnhancer._checkForInconsistentReleaseTags(collector, astSymbol, symbolMetadata);
            }
            else if (entity.astEntity instanceof AstNamespaceImport_1.AstNamespaceImport) {
                // A namespace created using "import * as ___ from ___"
                const astNamespaceImport = entity.astEntity;
                const astModuleExportInfo = astNamespaceImport.fetchAstModuleExportInfo(collector);
                for (const namespaceMemberAstEntity of astModuleExportInfo.exportedLocalEntities.values()) {
                    if (namespaceMemberAstEntity instanceof AstSymbol_1.AstSymbol) {
                        const astSymbol = namespaceMemberAstEntity;
                        astSymbol.forEachDeclarationRecursive((astDeclaration) => {
                            ValidationEnhancer._checkReferences(collector, astDeclaration, alreadyWarnedEntities);
                        });
                        const symbolMetadata = collector.fetchSymbolMetadata(astSymbol);
                        // (Don't apply ValidationEnhancer._checkForInternalUnderscore() for AstNamespaceImport members)
                        ValidationEnhancer._checkForInconsistentReleaseTags(collector, astSymbol, symbolMetadata);
                    }
                }
            }
        }
    }
    static _checkForInternalUnderscore(collector, collectorEntity, astSymbol, symbolMetadata) {
        let needsUnderscore = false;
        if (symbolMetadata.maxEffectiveReleaseTag === api_extractor_model_1.ReleaseTag.Internal) {
            if (!astSymbol.parentAstSymbol) {
                // If it's marked as @internal and has no parent, then it needs an underscore.
                // We use maxEffectiveReleaseTag because a merged declaration would NOT need an underscore in a case like this:
                //
                //   /** @public */
                //   export enum X { }
                //
                //   /** @internal */
                //   export namespace X { }
                //
                // (The above normally reports an error "ae-different-release-tags", but that may be suppressed.)
                needsUnderscore = true;
            }
            else {
                // If it's marked as @internal and the parent isn't obviously already @internal, then it needs an underscore.
                //
                // For example, we WOULD need an underscore for a merged declaration like this:
                //
                //   /** @internal */
                //   export namespace X {
                //     export interface _Y { }
                //   }
                //
                //   /** @public */
                //   export class X {
                //     /** @internal */
                //     public static _Y(): void { }   // <==== different from parent
                //   }
                const parentSymbolMetadata = collector.fetchSymbolMetadata(astSymbol);
                if (parentSymbolMetadata.maxEffectiveReleaseTag > api_extractor_model_1.ReleaseTag.Internal) {
                    needsUnderscore = true;
                }
            }
        }
        if (needsUnderscore) {
            for (const exportName of collectorEntity.exportNames) {
                if (exportName[0] !== '_') {
                    collector.messageRouter.addAnalyzerIssue(ExtractorMessageId_1.ExtractorMessageId.InternalMissingUnderscore, `The name "${exportName}" should be prefixed with an underscore` +
                        ` because the declaration is marked as @internal`, astSymbol, { exportName });
                }
            }
        }
    }
    static _checkForInconsistentReleaseTags(collector, astSymbol, symbolMetadata) {
        if (astSymbol.isExternal) {
            // For now, don't report errors for external code.  If the developer cares about it, they should run
            // API Extractor separately on the external project
            return;
        }
        // Normally we will expect all release tags to be the same.  Arbitrarily we choose the maxEffectiveReleaseTag
        // as the thing they should all match.
        const expectedEffectiveReleaseTag = symbolMetadata.maxEffectiveReleaseTag;
        // This is set to true if we find a declaration whose release tag is different from expectedEffectiveReleaseTag
        let mixedReleaseTags = false;
        // This is set to false if we find a declaration that is not a function/method overload
        let onlyFunctionOverloads = true;
        // This is set to true if we find a declaration that is @internal
        let anyInternalReleaseTags = false;
        for (const astDeclaration of astSymbol.astDeclarations) {
            const apiItemMetadata = collector.fetchApiItemMetadata(astDeclaration);
            const effectiveReleaseTag = apiItemMetadata.effectiveReleaseTag;
            switch (astDeclaration.declaration.kind) {
                case ts.SyntaxKind.FunctionDeclaration:
                case ts.SyntaxKind.MethodDeclaration:
                    break;
                default:
                    onlyFunctionOverloads = false;
            }
            if (effectiveReleaseTag !== expectedEffectiveReleaseTag) {
                mixedReleaseTags = true;
            }
            if (effectiveReleaseTag === api_extractor_model_1.ReleaseTag.Internal) {
                anyInternalReleaseTags = true;
            }
        }
        if (mixedReleaseTags) {
            if (!onlyFunctionOverloads) {
                collector.messageRouter.addAnalyzerIssue(ExtractorMessageId_1.ExtractorMessageId.DifferentReleaseTags, 'This symbol has another declaration with a different release tag', astSymbol);
            }
            if (anyInternalReleaseTags) {
                collector.messageRouter.addAnalyzerIssue(ExtractorMessageId_1.ExtractorMessageId.InternalMixedReleaseTag, `Mixed release tags are not allowed for "${astSymbol.localName}" because one of its declarations` +
                    ` is marked as @internal`, astSymbol);
            }
        }
    }
    static _checkReferences(collector, astDeclaration, alreadyWarnedEntities) {
        const apiItemMetadata = collector.fetchApiItemMetadata(astDeclaration);
        const declarationReleaseTag = apiItemMetadata.effectiveReleaseTag;
        for (const referencedEntity of astDeclaration.referencedAstEntities) {
            let collectorEntity;
            let referencedReleaseTag;
            let localName;
            if (referencedEntity instanceof AstSymbol_1.AstSymbol) {
                // If this is e.g. a member of a namespace, then we need to be checking the top-level scope to see
                // whether it's exported.
                //
                // TODO: Technically we should also check each of the nested scopes along the way.
                const rootSymbol = referencedEntity.rootAstSymbol;
                if (rootSymbol.isExternal) {
                    continue;
                }
                collectorEntity = collector.tryGetCollectorEntity(rootSymbol);
                localName = (collectorEntity === null || collectorEntity === void 0 ? void 0 : collectorEntity.nameForEmit) || rootSymbol.localName;
                const referencedMetadata = collector.fetchSymbolMetadata(referencedEntity);
                referencedReleaseTag = referencedMetadata.maxEffectiveReleaseTag;
            }
            else if (referencedEntity instanceof AstNamespaceImport_1.AstNamespaceImport) {
                collectorEntity = collector.tryGetCollectorEntity(referencedEntity);
                // TODO: Currently the "import * as ___ from ___" syntax does not yet support doc comments
                referencedReleaseTag = api_extractor_model_1.ReleaseTag.Public;
                localName = (collectorEntity === null || collectorEntity === void 0 ? void 0 : collectorEntity.nameForEmit) || referencedEntity.localName;
            }
            else {
                continue;
            }
            if (collectorEntity && collectorEntity.consumable) {
                if (api_extractor_model_1.ReleaseTag.compare(declarationReleaseTag, referencedReleaseTag) > 0) {
                    collector.messageRouter.addAnalyzerIssue(ExtractorMessageId_1.ExtractorMessageId.IncompatibleReleaseTags, `The symbol "${astDeclaration.astSymbol.localName}"` +
                        ` is marked as ${api_extractor_model_1.ReleaseTag.getTagName(declarationReleaseTag)},` +
                        ` but its signature references "${localName}"` +
                        ` which is marked as ${api_extractor_model_1.ReleaseTag.getTagName(referencedReleaseTag)}`, astDeclaration);
                }
            }
            else {
                const entryPointFilename = path.basename(collector.workingPackage.entryPointSourceFile.fileName);
                if (!alreadyWarnedEntities.has(referencedEntity)) {
                    alreadyWarnedEntities.add(referencedEntity);
                    if (referencedEntity instanceof AstSymbol_1.AstSymbol &&
                        ValidationEnhancer._isEcmaScriptSymbol(referencedEntity)) {
                        // The main usage scenario for ECMAScript symbols is to attach private data to a JavaScript object,
                        // so as a special case, we do NOT report them as forgotten exports.
                    }
                    else {
                        collector.messageRouter.addAnalyzerIssue(ExtractorMessageId_1.ExtractorMessageId.ForgottenExport, `The symbol "${localName}" needs to be exported by the entry point ${entryPointFilename}`, astDeclaration);
                    }
                }
            }
        }
    }
    // Detect an AstSymbol that refers to an ECMAScript symbol declaration such as:
    //
    // const mySymbol: unique symbol = Symbol('mySymbol');
    static _isEcmaScriptSymbol(astSymbol) {
        if (astSymbol.astDeclarations.length !== 1) {
            return false;
        }
        // We are matching a form like this:
        //
        // - VariableDeclaration:
        //   - Identifier:  pre=[mySymbol]
        //   - ColonToken:  pre=[:] sep=[ ]
        //   - TypeOperator:
        //     - UniqueKeyword:  pre=[unique] sep=[ ]
        //     - SymbolKeyword:  pre=[symbol]
        const astDeclaration = astSymbol.astDeclarations[0];
        if (ts.isVariableDeclaration(astDeclaration.declaration)) {
            const variableTypeNode = astDeclaration.declaration.type;
            if (variableTypeNode) {
                for (const token of variableTypeNode.getChildren()) {
                    if (token.kind === ts.SyntaxKind.SymbolKeyword) {
                        return true;
                    }
                }
            }
        }
        return false;
    }
}
exports.ValidationEnhancer = ValidationEnhancer;
//# sourceMappingURL=ValidationEnhancer.js.map