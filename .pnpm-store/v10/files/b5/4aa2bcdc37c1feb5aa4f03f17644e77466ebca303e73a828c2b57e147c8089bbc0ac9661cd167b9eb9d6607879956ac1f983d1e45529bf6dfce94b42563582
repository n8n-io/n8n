"use strict";
// Copyright (c) Microsoft Corporation. All rights reserved. Licensed under the MIT license.
// See LICENSE in the project root for license information.
Object.defineProperty(exports, "__esModule", { value: true });
exports.ModelReferenceResolver = void 0;
const tsdoc_1 = require("@microsoft/tsdoc");
const ApiItem_1 = require("../items/ApiItem");
const ApiItemContainerMixin_1 = require("../mixins/ApiItemContainerMixin");
const ApiParameterListMixin_1 = require("../mixins/ApiParameterListMixin");
/**
 * This resolves a TSDoc declaration reference by walking the `ApiModel` hierarchy.
 *
 * @remarks
 *
 * This class is analogous to `AstReferenceResolver` from the `@microsoft/api-extractor` project,
 * which resolves declaration references by walking the compiler state.
 */
class ModelReferenceResolver {
    constructor(apiModel) {
        this._apiModel = apiModel;
    }
    resolve(declarationReference, contextApiItem) {
        const result = {
            resolvedApiItem: undefined,
            errorMessage: undefined
        };
        let apiPackage = undefined;
        // Is this an absolute reference?
        if (declarationReference.packageName !== undefined) {
            apiPackage = this._apiModel.tryGetPackageByName(declarationReference.packageName);
            if (apiPackage === undefined) {
                result.errorMessage = `The package "${declarationReference.packageName}" could not be located`;
                return result;
            }
        }
        else {
            // If the package name is omitted, try to infer it from the context
            if (contextApiItem !== undefined) {
                apiPackage = contextApiItem.getAssociatedPackage();
            }
            if (apiPackage === undefined) {
                result.errorMessage =
                    `The reference does not include a package name, and the package could not be inferred` +
                        ` from the context`;
                return result;
            }
        }
        const importPath = declarationReference.importPath || '';
        const foundEntryPoints = apiPackage.findEntryPointsByPath(importPath);
        if (foundEntryPoints.length !== 1) {
            result.errorMessage = `The import path "${importPath}" could not be resolved`;
            return result;
        }
        let currentItem = foundEntryPoints[0];
        // Now search for the member reference
        for (const memberReference of declarationReference.memberReferences) {
            if (memberReference.memberSymbol !== undefined) {
                result.errorMessage = `Symbols are not yet supported in declaration references`;
                return result;
            }
            if (memberReference.memberIdentifier === undefined) {
                result.errorMessage = `Missing member identifier`;
                return result;
            }
            const identifier = memberReference.memberIdentifier.identifier;
            if (!ApiItemContainerMixin_1.ApiItemContainerMixin.isBaseClassOf(currentItem)) {
                // For example, {@link MyClass.myMethod.X} is invalid because methods cannot contain members
                result.errorMessage = `Unable to resolve ${JSON.stringify(identifier)} because ${currentItem.getScopedNameWithinPackage()} cannot act as a container`;
                return result;
            }
            const foundMembers = currentItem.findMembersByName(identifier);
            if (foundMembers.length === 0) {
                result.errorMessage = `The member reference ${JSON.stringify(identifier)} was not found`;
                return result;
            }
            const memberSelector = memberReference.selector;
            if (memberSelector === undefined) {
                if (foundMembers.length > 1) {
                    result.errorMessage = `The member reference ${JSON.stringify(identifier)} was ambiguous`;
                    return result;
                }
                currentItem = foundMembers[0];
            }
            else {
                let memberSelectorResult;
                switch (memberSelector.selectorKind) {
                    case tsdoc_1.SelectorKind.System:
                        memberSelectorResult = this._selectUsingSystemSelector(foundMembers, memberSelector, identifier);
                        break;
                    case tsdoc_1.SelectorKind.Index:
                        memberSelectorResult = this._selectUsingIndexSelector(foundMembers, memberSelector, identifier);
                        break;
                    default:
                        result.errorMessage = `The selector "${memberSelector.selector}" is not a supported selector type`;
                        return result;
                }
                if (memberSelectorResult.resolvedApiItem === undefined) {
                    return memberSelectorResult;
                }
                currentItem = memberSelectorResult.resolvedApiItem;
            }
        }
        result.resolvedApiItem = currentItem;
        return result;
    }
    _selectUsingSystemSelector(foundMembers, memberSelector, identifier) {
        const result = {
            resolvedApiItem: undefined,
            errorMessage: undefined
        };
        const selectorName = memberSelector.selector;
        let selectorItemKind;
        switch (selectorName) {
            case 'class':
                selectorItemKind = ApiItem_1.ApiItemKind.Class;
                break;
            case 'enum':
                selectorItemKind = ApiItem_1.ApiItemKind.Enum;
                break;
            case 'function':
                selectorItemKind = ApiItem_1.ApiItemKind.Function;
                break;
            case 'interface':
                selectorItemKind = ApiItem_1.ApiItemKind.Interface;
                break;
            case 'namespace':
                selectorItemKind = ApiItem_1.ApiItemKind.Namespace;
                break;
            case 'type':
                selectorItemKind = ApiItem_1.ApiItemKind.TypeAlias;
                break;
            case 'variable':
                selectorItemKind = ApiItem_1.ApiItemKind.Variable;
                break;
            default:
                result.errorMessage = `Unsupported system selector "${selectorName}"`;
                return result;
        }
        const matches = foundMembers.filter((x) => x.kind === selectorItemKind);
        if (matches.length === 0) {
            result.errorMessage =
                `A declaration for "${identifier}" was not found that matches the` +
                    ` TSDoc selector "${selectorName}"`;
            return result;
        }
        if (matches.length > 1) {
            result.errorMessage = `More than one declaration "${identifier}" matches the TSDoc selector "${selectorName}"`;
        }
        result.resolvedApiItem = matches[0];
        return result;
    }
    _selectUsingIndexSelector(foundMembers, memberSelector, identifier) {
        const result = {
            resolvedApiItem: undefined,
            errorMessage: undefined
        };
        const selectedMembers = [];
        const selectorOverloadIndex = parseInt(memberSelector.selector, 10);
        for (const foundMember of foundMembers) {
            if (ApiParameterListMixin_1.ApiParameterListMixin.isBaseClassOf(foundMember)) {
                if (foundMember.overloadIndex === selectorOverloadIndex) {
                    selectedMembers.push(foundMember);
                }
            }
        }
        if (selectedMembers.length === 0) {
            result.errorMessage =
                `An overload for ${JSON.stringify(identifier)} was not found that matches` +
                    ` the TSDoc selector ":${selectorOverloadIndex}"`;
            return result;
        }
        if (selectedMembers.length === 1) {
            result.resolvedApiItem = selectedMembers[0];
            return result;
        }
        result.errorMessage = `The member reference ${JSON.stringify(identifier)} was ambiguous`;
        return result;
    }
}
exports.ModelReferenceResolver = ModelReferenceResolver;
//# sourceMappingURL=ModelReferenceResolver.js.map