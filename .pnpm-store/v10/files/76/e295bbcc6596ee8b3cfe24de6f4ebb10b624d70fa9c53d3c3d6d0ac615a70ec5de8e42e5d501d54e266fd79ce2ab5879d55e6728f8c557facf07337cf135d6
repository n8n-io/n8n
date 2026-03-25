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
exports.AstReferenceResolver = exports.ResolverFailure = void 0;
const ts = __importStar(require("typescript"));
const tsdoc = __importStar(require("@microsoft/tsdoc"));
const AstSymbol_1 = require("./AstSymbol");
/**
 * Used by `AstReferenceResolver` to report a failed resolution.
 *
 * @privateRemarks
 * This class is similar to an `Error` object, but the intent of `ResolverFailure` is to describe
 * why a reference could not be resolved.  This information could be used to throw an actual `Error` object,
 * but normally it is handed off to the `MessageRouter` instead.
 */
class ResolverFailure {
    constructor(reason) {
        this.reason = reason;
    }
}
exports.ResolverFailure = ResolverFailure;
/**
 * This resolves a TSDoc declaration reference by walking the `AstSymbolTable` compiler state.
 *
 * @remarks
 *
 * This class is analogous to `ModelReferenceResolver` from the `@microsoft/api-extractor-model` project,
 * which resolves declaration references by walking the hierarchy loaded from an .api.json file.
 */
class AstReferenceResolver {
    constructor(collector) {
        this._collector = collector;
        this._astSymbolTable = collector.astSymbolTable;
        this._workingPackage = collector.workingPackage;
    }
    resolve(declarationReference) {
        // Is it referring to the working package?
        if (declarationReference.packageName !== undefined &&
            declarationReference.packageName !== this._workingPackage.name) {
            return new ResolverFailure('External package references are not supported');
        }
        // Is it a path-based import?
        if (declarationReference.importPath) {
            return new ResolverFailure('Import paths are not supported');
        }
        const astModule = this._astSymbolTable.fetchAstModuleFromWorkingPackage(this._workingPackage.entryPointSourceFile);
        if (declarationReference.memberReferences.length === 0) {
            return new ResolverFailure('Package references are not supported');
        }
        const rootMemberReference = declarationReference.memberReferences[0];
        const exportName = this._getMemberReferenceIdentifier(rootMemberReference);
        if (exportName instanceof ResolverFailure) {
            return exportName;
        }
        const rootAstEntity = this._astSymbolTable.tryGetExportOfAstModule(exportName, astModule);
        if (rootAstEntity === undefined) {
            return new ResolverFailure(`The package "${this._workingPackage.name}" does not have an export "${exportName}"`);
        }
        if (!(rootAstEntity instanceof AstSymbol_1.AstSymbol)) {
            return new ResolverFailure('This type of declaration is not supported yet by the resolver');
        }
        let currentDeclaration = this._selectDeclaration(rootAstEntity.astDeclarations, rootMemberReference, rootAstEntity.localName);
        if (currentDeclaration instanceof ResolverFailure) {
            return currentDeclaration;
        }
        for (let index = 1; index < declarationReference.memberReferences.length; ++index) {
            const memberReference = declarationReference.memberReferences[index];
            const memberName = this._getMemberReferenceIdentifier(memberReference);
            if (memberName instanceof ResolverFailure) {
                return memberName;
            }
            const matchingChildren = currentDeclaration.findChildrenWithName(memberName);
            if (matchingChildren.length === 0) {
                return new ResolverFailure(`No member was found with name "${memberName}"`);
            }
            const selectedDeclaration = this._selectDeclaration(matchingChildren, memberReference, memberName);
            if (selectedDeclaration instanceof ResolverFailure) {
                return selectedDeclaration;
            }
            currentDeclaration = selectedDeclaration;
        }
        return currentDeclaration;
    }
    _getMemberReferenceIdentifier(memberReference) {
        if (memberReference.memberSymbol !== undefined) {
            return new ResolverFailure('ECMAScript symbol selectors are not supported');
        }
        if (memberReference.memberIdentifier === undefined) {
            return new ResolverFailure('The member identifier is missing in the root member reference');
        }
        return memberReference.memberIdentifier.identifier;
    }
    _selectDeclaration(astDeclarations, memberReference, astSymbolName) {
        const memberSelector = memberReference.selector;
        if (memberSelector === undefined) {
            if (astDeclarations.length === 1) {
                return astDeclarations[0];
            }
            else {
                // If we found multiple matches, but the extra ones are all ancillary declarations,
                // then return the main declaration.
                const nonAncillaryMatch = this._tryDisambiguateAncillaryMatches(astDeclarations);
                if (nonAncillaryMatch) {
                    return nonAncillaryMatch;
                }
                return new ResolverFailure(`The reference is ambiguous because "${astSymbolName}"` +
                    ` has more than one declaration; you need to add a TSDoc member reference selector`);
            }
        }
        switch (memberSelector.selectorKind) {
            case tsdoc.SelectorKind.System:
                return this._selectUsingSystemSelector(astDeclarations, memberSelector, astSymbolName);
            case tsdoc.SelectorKind.Index:
                return this._selectUsingIndexSelector(astDeclarations, memberSelector, astSymbolName);
        }
        return new ResolverFailure(`The selector "${memberSelector.selector}" is not a supported selector type`);
    }
    _selectUsingSystemSelector(astDeclarations, memberSelector, astSymbolName) {
        const selectorName = memberSelector.selector;
        let selectorSyntaxKind;
        switch (selectorName) {
            case 'class':
                selectorSyntaxKind = ts.SyntaxKind.ClassDeclaration;
                break;
            case 'enum':
                selectorSyntaxKind = ts.SyntaxKind.EnumDeclaration;
                break;
            case 'function':
                selectorSyntaxKind = ts.SyntaxKind.FunctionDeclaration;
                break;
            case 'interface':
                selectorSyntaxKind = ts.SyntaxKind.InterfaceDeclaration;
                break;
            case 'namespace':
                selectorSyntaxKind = ts.SyntaxKind.ModuleDeclaration;
                break;
            case 'type':
                selectorSyntaxKind = ts.SyntaxKind.TypeAliasDeclaration;
                break;
            case 'variable':
                selectorSyntaxKind = ts.SyntaxKind.VariableDeclaration;
                break;
            default:
                return new ResolverFailure(`Unsupported system selector "${selectorName}"`);
        }
        const matches = astDeclarations.filter((x) => x.declaration.kind === selectorSyntaxKind);
        if (matches.length === 0) {
            return new ResolverFailure(`A declaration for "${astSymbolName}" was not found that matches the` +
                ` TSDoc selector "${selectorName}"`);
        }
        if (matches.length > 1) {
            // If we found multiple matches, but the extra ones are all ancillary declarations,
            // then return the main declaration.
            const nonAncillaryMatch = this._tryDisambiguateAncillaryMatches(matches);
            if (nonAncillaryMatch) {
                return nonAncillaryMatch;
            }
            return new ResolverFailure(`More than one declaration "${astSymbolName}" matches the TSDoc selector "${selectorName}"`);
        }
        return matches[0];
    }
    _selectUsingIndexSelector(astDeclarations, memberSelector, astSymbolName) {
        const selectorOverloadIndex = parseInt(memberSelector.selector, 10);
        const matches = [];
        for (const astDeclaration of astDeclarations) {
            const overloadIndex = this._collector.getOverloadIndex(astDeclaration);
            if (overloadIndex === selectorOverloadIndex) {
                matches.push(astDeclaration);
            }
        }
        if (matches.length === 0) {
            return new ResolverFailure(`An overload for "${astSymbolName}" was not found that matches the` +
                ` TSDoc selector ":${selectorOverloadIndex}"`);
        }
        if (matches.length > 1) {
            // If we found multiple matches, but the extra ones are all ancillary declarations,
            // then return the main declaration.
            const nonAncillaryMatch = this._tryDisambiguateAncillaryMatches(matches);
            if (nonAncillaryMatch) {
                return nonAncillaryMatch;
            }
            return new ResolverFailure(`More than one declaration for "${astSymbolName}" matches the` +
                ` TSDoc selector ":${selectorOverloadIndex}"`);
        }
        return matches[0];
    }
    /**
     * This resolves an ambiguous match in the case where the extra matches are all ancillary declarations,
     * except for one match that is the main declaration.
     */
    _tryDisambiguateAncillaryMatches(matches) {
        let result = undefined;
        for (const match of matches) {
            const declarationMetadata = this._collector.fetchDeclarationMetadata(match);
            if (!declarationMetadata.isAncillary) {
                if (result) {
                    return undefined; // more than one match
                }
                result = match;
            }
        }
        return result;
    }
}
exports.AstReferenceResolver = AstReferenceResolver;
//# sourceMappingURL=AstReferenceResolver.js.map