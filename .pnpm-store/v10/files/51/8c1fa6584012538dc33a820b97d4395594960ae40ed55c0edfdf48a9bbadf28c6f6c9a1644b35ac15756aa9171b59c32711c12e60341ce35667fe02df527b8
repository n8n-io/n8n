// Copyright (c) Microsoft Corporation. All rights reserved. Licensed under the MIT license.
// See LICENSE in the project root for license information.
/* eslint-disable no-bitwise */
import * as path from 'node:path';
import * as ts from 'typescript';
import { ApiModel, ApiClass, ApiPackage, ApiEntryPoint, ApiMethod, ApiNamespace, ApiInterface, ApiPropertySignature, ReleaseTag, ApiProperty, ApiMethodSignature, ApiEnum, ApiEnumMember, ApiConstructor, ApiConstructSignature, ApiFunction, ApiIndexSignature, ApiVariable, ApiTypeAlias, ApiCallSignature, EnumMemberOrder } from '@microsoft/api-extractor-model';
import { Path } from '@rushstack/node-core-library';
import { ExcerptBuilder } from './ExcerptBuilder';
import { AstSymbol } from '../analyzer/AstSymbol';
import { DeclarationReferenceGenerator } from './DeclarationReferenceGenerator';
import { AstNamespaceImport } from '../analyzer/AstNamespaceImport';
import { TypeScriptInternals } from '../analyzer/TypeScriptInternals';
import { DtsEmitHelpers } from './DtsEmitHelpers';
export class ApiModelGenerator {
    constructor(collector, extractorConfig) {
        this._collector = collector;
        this._apiModel = new ApiModel();
        this._referenceGenerator = new DeclarationReferenceGenerator(collector);
        const apiModelGenerationOptions = extractorConfig.docModelGenerationOptions;
        if (apiModelGenerationOptions) {
            this._releaseTagsToTrim = apiModelGenerationOptions.releaseTagsToTrim;
            this.docModelEnabled = true;
        }
        else {
            this.docModelEnabled = false;
        }
    }
    get apiModel() {
        return this._apiModel;
    }
    buildApiPackage() {
        const packageDocComment = this._collector.workingPackage.tsdocComment;
        const apiPackage = new ApiPackage({
            name: this._collector.workingPackage.name,
            docComment: packageDocComment,
            tsdocConfiguration: this._collector.extractorConfig.tsdocConfiguration,
            projectFolderUrl: this._collector.extractorConfig.projectFolderUrl
        });
        this._apiModel.addMember(apiPackage);
        const apiEntryPoint = new ApiEntryPoint({ name: '' });
        apiPackage.addMember(apiEntryPoint);
        for (const entity of this._collector.entities) {
            // Only process entities that are exported from the entry point. Entities that are exported from
            // `AstNamespaceImport` entities will be processed by `_processAstNamespaceImport`. However, if
            // we are including forgotten exports, then process everything.
            if (entity.exportedFromEntryPoint || this._collector.extractorConfig.docModelIncludeForgottenExports) {
                this._processAstEntity(entity.astEntity, {
                    name: entity.nameForEmit,
                    isExported: entity.exportedFromEntryPoint,
                    parentApiItem: apiEntryPoint
                });
            }
        }
        return apiPackage;
    }
    _processAstEntity(astEntity, context) {
        if (astEntity instanceof AstSymbol) {
            // Skip ancillary declarations; we will process them with the main declaration
            for (const astDeclaration of this._collector.getNonAncillaryDeclarations(astEntity)) {
                this._processDeclaration(astDeclaration, context);
            }
            return;
        }
        if (astEntity instanceof AstNamespaceImport) {
            // Note that a single API item can belong to two different AstNamespaceImport namespaces.  For example:
            //
            //   // file.ts defines "thing()"
            //   import * as example1 from "./file";
            //   import * as example2 from "./file";
            //
            //   // ...so here we end up with example1.thing() and example2.thing()
            //   export { example1, example2 }
            //
            // The current logic does not try to associate "thing()" with a specific parent.  Instead
            // the API documentation will show duplicated entries for example1.thing() and example2.thing().
            //
            // This could be improved in the future, but it requires a stable mechanism for choosing an associated parent.
            // For thoughts about this:  https://github.com/microsoft/rushstack/issues/1308
            this._processAstNamespaceImport(astEntity, context);
            return;
        }
        // TODO: Figure out how to represent reexported AstImport objects.  Basically we need to introduce a new
        // ApiItem subclass for "export alias", similar to a type alias, but representing declarations of the
        // form "export { X } from 'external-package'".  We can also use this to solve GitHub issue #950.
    }
    _processAstNamespaceImport(astNamespaceImport, context) {
        const astModule = astNamespaceImport.astModule;
        const { name, isExported, parentApiItem } = context;
        const containerKey = ApiNamespace.getContainerKey(name);
        const fileUrlPath = this._getFileUrlPath(astNamespaceImport.declaration);
        let apiNamespace = parentApiItem.tryGetMemberByKey(containerKey);
        if (apiNamespace === undefined) {
            apiNamespace = new ApiNamespace({
                name,
                docComment: undefined,
                releaseTag: ReleaseTag.None,
                excerptTokens: [],
                isExported,
                fileUrlPath
            });
            parentApiItem.addMember(apiNamespace);
        }
        astModule.astModuleExportInfo.exportedLocalEntities.forEach((exportedEntity, exportedName) => {
            this._processAstEntity(exportedEntity, {
                name: exportedName,
                isExported: true,
                parentApiItem: apiNamespace
            });
        });
    }
    _processDeclaration(astDeclaration, context) {
        var _a;
        if ((astDeclaration.modifierFlags & ts.ModifierFlags.Private) !== 0) {
            return; // trim out private declarations
        }
        const apiItemMetadata = this._collector.fetchApiItemMetadata(astDeclaration);
        const releaseTag = apiItemMetadata.effectiveReleaseTag;
        if ((_a = this._releaseTagsToTrim) === null || _a === void 0 ? void 0 : _a.has(releaseTag)) {
            return;
        }
        switch (astDeclaration.declaration.kind) {
            case ts.SyntaxKind.CallSignature:
                this._processApiCallSignature(astDeclaration, context);
                break;
            case ts.SyntaxKind.Constructor:
                this._processApiConstructor(astDeclaration, context);
                break;
            case ts.SyntaxKind.ConstructSignature:
                this._processApiConstructSignature(astDeclaration, context);
                break;
            case ts.SyntaxKind.ClassDeclaration:
                this._processApiClass(astDeclaration, context);
                break;
            case ts.SyntaxKind.EnumDeclaration:
                this._processApiEnum(astDeclaration, context);
                break;
            case ts.SyntaxKind.EnumMember:
                this._processApiEnumMember(astDeclaration, context);
                break;
            case ts.SyntaxKind.FunctionDeclaration:
                this._processApiFunction(astDeclaration, context);
                break;
            case ts.SyntaxKind.GetAccessor:
                this._processApiProperty(astDeclaration, context);
                break;
            case ts.SyntaxKind.SetAccessor:
                this._processApiProperty(astDeclaration, context);
                break;
            case ts.SyntaxKind.IndexSignature:
                this._processApiIndexSignature(astDeclaration, context);
                break;
            case ts.SyntaxKind.InterfaceDeclaration:
                this._processApiInterface(astDeclaration, context);
                break;
            case ts.SyntaxKind.MethodDeclaration:
                this._processApiMethod(astDeclaration, context);
                break;
            case ts.SyntaxKind.MethodSignature:
                this._processApiMethodSignature(astDeclaration, context);
                break;
            case ts.SyntaxKind.ModuleDeclaration:
                this._processApiNamespace(astDeclaration, context);
                break;
            case ts.SyntaxKind.PropertyDeclaration:
                this._processApiProperty(astDeclaration, context);
                break;
            case ts.SyntaxKind.PropertySignature:
                this._processApiPropertySignature(astDeclaration, context);
                break;
            case ts.SyntaxKind.TypeAliasDeclaration:
                this._processApiTypeAlias(astDeclaration, context);
                break;
            case ts.SyntaxKind.VariableDeclaration:
                // check for arrow functions in variable declaration
                const functionDeclaration = this._tryFindFunctionDeclaration(astDeclaration);
                if (functionDeclaration) {
                    this._processApiFunction(astDeclaration, context, functionDeclaration);
                }
                else {
                    this._processApiVariable(astDeclaration, context);
                }
                break;
            default:
            // ignore unknown types
        }
    }
    _tryFindFunctionDeclaration(astDeclaration) {
        const children = astDeclaration.declaration.getChildren(astDeclaration.declaration.getSourceFile());
        return children.find(ts.isFunctionTypeNode);
    }
    _processChildDeclarations(astDeclaration, context) {
        for (const childDeclaration of astDeclaration.children) {
            this._processDeclaration(childDeclaration, {
                ...context,
                name: childDeclaration.astSymbol.localName
            });
        }
    }
    _processApiCallSignature(astDeclaration, context) {
        const { parentApiItem } = context;
        const overloadIndex = this._collector.getOverloadIndex(astDeclaration);
        const containerKey = ApiCallSignature.getContainerKey(overloadIndex);
        let apiCallSignature = parentApiItem.tryGetMemberByKey(containerKey);
        if (apiCallSignature === undefined) {
            const callSignature = astDeclaration.declaration;
            const nodeTransforms = [];
            const returnTypeTokenRange = ExcerptBuilder.createEmptyTokenRange();
            if (callSignature.type) {
                nodeTransforms.push({ node: callSignature.type, captureTokenRange: returnTypeTokenRange });
            }
            const typeParameters = this._captureTypeParameters(nodeTransforms, callSignature.typeParameters);
            const parameters = this._captureParameters(nodeTransforms, callSignature.parameters);
            const excerptTokens = this._buildExcerptTokens(astDeclaration, nodeTransforms);
            const apiItemMetadata = this._collector.fetchApiItemMetadata(astDeclaration);
            const docComment = apiItemMetadata.tsdocComment;
            const releaseTag = apiItemMetadata.effectiveReleaseTag;
            const fileUrlPath = this._getFileUrlPath(callSignature);
            apiCallSignature = new ApiCallSignature({
                docComment,
                releaseTag,
                typeParameters,
                parameters,
                overloadIndex,
                excerptTokens,
                returnTypeTokenRange,
                fileUrlPath
            });
            parentApiItem.addMember(apiCallSignature);
        }
    }
    _processApiConstructor(astDeclaration, context) {
        const { parentApiItem } = context;
        const overloadIndex = this._collector.getOverloadIndex(astDeclaration);
        const containerKey = ApiConstructor.getContainerKey(overloadIndex);
        let apiConstructor = parentApiItem.tryGetMemberByKey(containerKey);
        if (apiConstructor === undefined) {
            const constructorDeclaration = astDeclaration.declaration;
            const nodeTransforms = [];
            const parameters = this._captureParameters(nodeTransforms, constructorDeclaration.parameters);
            const excerptTokens = this._buildExcerptTokens(astDeclaration, nodeTransforms);
            const apiItemMetadata = this._collector.fetchApiItemMetadata(astDeclaration);
            const docComment = apiItemMetadata.tsdocComment;
            const releaseTag = apiItemMetadata.effectiveReleaseTag;
            const isProtected = (astDeclaration.modifierFlags & ts.ModifierFlags.Protected) !== 0;
            const fileUrlPath = this._getFileUrlPath(constructorDeclaration);
            apiConstructor = new ApiConstructor({
                docComment,
                releaseTag,
                isProtected,
                parameters,
                overloadIndex,
                excerptTokens,
                fileUrlPath
            });
            parentApiItem.addMember(apiConstructor);
        }
    }
    _processApiClass(astDeclaration, context) {
        const { name, isExported, parentApiItem } = context;
        const containerKey = ApiClass.getContainerKey(name);
        let apiClass = parentApiItem.tryGetMemberByKey(containerKey);
        if (apiClass === undefined) {
            const classDeclaration = astDeclaration.declaration;
            const nodeTransforms = [];
            const typeParameters = this._captureTypeParameters(nodeTransforms, classDeclaration.typeParameters);
            let extendsTokenRange = undefined;
            const implementsTokenRanges = [];
            for (const heritageClause of classDeclaration.heritageClauses || []) {
                if (heritageClause.token === ts.SyntaxKind.ExtendsKeyword) {
                    extendsTokenRange = ExcerptBuilder.createEmptyTokenRange();
                    if (heritageClause.types.length > 0) {
                        nodeTransforms.push({ node: heritageClause.types[0], captureTokenRange: extendsTokenRange });
                    }
                }
                else if (heritageClause.token === ts.SyntaxKind.ImplementsKeyword) {
                    for (const heritageType of heritageClause.types) {
                        const implementsTokenRange = ExcerptBuilder.createEmptyTokenRange();
                        implementsTokenRanges.push(implementsTokenRange);
                        nodeTransforms.push({ node: heritageType, captureTokenRange: implementsTokenRange });
                    }
                }
            }
            const excerptTokens = this._buildExcerptTokens(astDeclaration, nodeTransforms);
            const apiItemMetadata = this._collector.fetchApiItemMetadata(astDeclaration);
            const docComment = apiItemMetadata.tsdocComment;
            const releaseTag = apiItemMetadata.effectiveReleaseTag;
            const isAbstract = (ts.getCombinedModifierFlags(classDeclaration) & ts.ModifierFlags.Abstract) !== 0;
            const fileUrlPath = this._getFileUrlPath(classDeclaration);
            apiClass = new ApiClass({
                name,
                isAbstract,
                docComment,
                releaseTag,
                excerptTokens,
                typeParameters,
                extendsTokenRange,
                implementsTokenRanges,
                isExported,
                fileUrlPath
            });
            parentApiItem.addMember(apiClass);
        }
        this._processChildDeclarations(astDeclaration, {
            ...context,
            parentApiItem: apiClass
        });
    }
    _processApiConstructSignature(astDeclaration, context) {
        const { parentApiItem } = context;
        const overloadIndex = this._collector.getOverloadIndex(astDeclaration);
        const containerKey = ApiConstructSignature.getContainerKey(overloadIndex);
        let apiConstructSignature = parentApiItem.tryGetMemberByKey(containerKey);
        if (apiConstructSignature === undefined) {
            const constructSignature = astDeclaration.declaration;
            const nodeTransforms = [];
            const returnTypeTokenRange = ExcerptBuilder.createEmptyTokenRange();
            if (constructSignature.type) {
                nodeTransforms.push({ node: constructSignature.type, captureTokenRange: returnTypeTokenRange });
            }
            const typeParameters = this._captureTypeParameters(nodeTransforms, constructSignature.typeParameters);
            const parameters = this._captureParameters(nodeTransforms, constructSignature.parameters);
            const excerptTokens = this._buildExcerptTokens(astDeclaration, nodeTransforms);
            const apiItemMetadata = this._collector.fetchApiItemMetadata(astDeclaration);
            const docComment = apiItemMetadata.tsdocComment;
            const releaseTag = apiItemMetadata.effectiveReleaseTag;
            const fileUrlPath = this._getFileUrlPath(constructSignature);
            apiConstructSignature = new ApiConstructSignature({
                docComment,
                releaseTag,
                typeParameters,
                parameters,
                overloadIndex,
                excerptTokens,
                returnTypeTokenRange,
                fileUrlPath
            });
            parentApiItem.addMember(apiConstructSignature);
        }
    }
    _processApiEnum(astDeclaration, context) {
        const { name, isExported, parentApiItem } = context;
        const containerKey = ApiEnum.getContainerKey(name);
        let apiEnum = parentApiItem.tryGetMemberByKey(containerKey);
        if (apiEnum === undefined) {
            const excerptTokens = this._buildExcerptTokens(astDeclaration, []);
            const apiItemMetadata = this._collector.fetchApiItemMetadata(astDeclaration);
            const docComment = apiItemMetadata.tsdocComment;
            const releaseTag = apiItemMetadata.effectiveReleaseTag;
            const preserveMemberOrder = this._collector.extractorConfig.enumMemberOrder === EnumMemberOrder.Preserve;
            const fileUrlPath = this._getFileUrlPath(astDeclaration.declaration);
            apiEnum = new ApiEnum({
                name,
                docComment,
                releaseTag,
                excerptTokens,
                preserveMemberOrder,
                isExported,
                fileUrlPath
            });
            parentApiItem.addMember(apiEnum);
        }
        this._processChildDeclarations(astDeclaration, {
            ...context,
            parentApiItem: apiEnum
        });
    }
    _processApiEnumMember(astDeclaration, context) {
        const { name, parentApiItem } = context;
        const containerKey = ApiEnumMember.getContainerKey(name);
        let apiEnumMember = parentApiItem.tryGetMemberByKey(containerKey);
        if (apiEnumMember === undefined) {
            const enumMember = astDeclaration.declaration;
            const nodeTransforms = [];
            let initializerTokenRange = undefined;
            if (enumMember.initializer) {
                initializerTokenRange = ExcerptBuilder.createEmptyTokenRange();
                nodeTransforms.push({ node: enumMember.initializer, captureTokenRange: initializerTokenRange });
            }
            const excerptTokens = this._buildExcerptTokens(astDeclaration, nodeTransforms);
            const apiItemMetadata = this._collector.fetchApiItemMetadata(astDeclaration);
            const docComment = apiItemMetadata.tsdocComment;
            const releaseTag = apiItemMetadata.effectiveReleaseTag;
            const fileUrlPath = this._getFileUrlPath(enumMember);
            apiEnumMember = new ApiEnumMember({
                name,
                docComment,
                releaseTag,
                excerptTokens,
                initializerTokenRange,
                fileUrlPath
            });
            parentApiItem.addMember(apiEnumMember);
        }
    }
    _processApiFunction(astDeclaration, context, altFunctionDeclaration) {
        const { name, isExported, parentApiItem } = context;
        const overloadIndex = this._collector.getOverloadIndex(astDeclaration);
        const containerKey = ApiFunction.getContainerKey(name, overloadIndex);
        let apiFunction = parentApiItem.tryGetMemberByKey(containerKey);
        if (apiFunction === undefined) {
            const functionDeclaration = altFunctionDeclaration !== null && altFunctionDeclaration !== void 0 ? altFunctionDeclaration : astDeclaration.declaration;
            const nodeTransforms = [];
            const returnTypeTokenRange = ExcerptBuilder.createEmptyTokenRange();
            if (functionDeclaration.type) {
                nodeTransforms.push({ node: functionDeclaration.type, captureTokenRange: returnTypeTokenRange });
            }
            const typeParameters = this._captureTypeParameters(nodeTransforms, functionDeclaration.typeParameters);
            const parameters = this._captureParameters(nodeTransforms, functionDeclaration.parameters);
            const excerptTokens = this._buildExcerptTokens(astDeclaration, nodeTransforms);
            const apiItemMetadata = this._collector.fetchApiItemMetadata(astDeclaration);
            const docComment = apiItemMetadata.tsdocComment;
            const releaseTag = apiItemMetadata.effectiveReleaseTag;
            const fileUrlPath = this._getFileUrlPath(functionDeclaration);
            apiFunction = new ApiFunction({
                name,
                docComment,
                releaseTag,
                typeParameters,
                parameters,
                overloadIndex,
                excerptTokens,
                returnTypeTokenRange,
                isExported,
                fileUrlPath
            });
            parentApiItem.addMember(apiFunction);
        }
    }
    _processApiIndexSignature(astDeclaration, context) {
        const { parentApiItem } = context;
        const overloadIndex = this._collector.getOverloadIndex(astDeclaration);
        const containerKey = ApiIndexSignature.getContainerKey(overloadIndex);
        let apiIndexSignature = parentApiItem.tryGetMemberByKey(containerKey);
        if (apiIndexSignature === undefined) {
            const indexSignature = astDeclaration.declaration;
            const nodeTransforms = [];
            const returnTypeTokenRange = ExcerptBuilder.createEmptyTokenRange();
            nodeTransforms.push({ node: indexSignature.type, captureTokenRange: returnTypeTokenRange });
            const parameters = this._captureParameters(nodeTransforms, indexSignature.parameters);
            const excerptTokens = this._buildExcerptTokens(astDeclaration, nodeTransforms);
            const apiItemMetadata = this._collector.fetchApiItemMetadata(astDeclaration);
            const docComment = apiItemMetadata.tsdocComment;
            const releaseTag = apiItemMetadata.effectiveReleaseTag;
            const isReadonly = this._isReadonly(astDeclaration);
            const fileUrlPath = this._getFileUrlPath(indexSignature);
            apiIndexSignature = new ApiIndexSignature({
                docComment,
                releaseTag,
                parameters,
                overloadIndex,
                excerptTokens,
                returnTypeTokenRange,
                isReadonly,
                fileUrlPath
            });
            parentApiItem.addMember(apiIndexSignature);
        }
    }
    _processApiInterface(astDeclaration, context) {
        const { name, isExported, parentApiItem } = context;
        const containerKey = ApiInterface.getContainerKey(name);
        let apiInterface = parentApiItem.tryGetMemberByKey(containerKey);
        if (apiInterface === undefined) {
            const interfaceDeclaration = astDeclaration.declaration;
            const nodeTransforms = [];
            const typeParameters = this._captureTypeParameters(nodeTransforms, interfaceDeclaration.typeParameters);
            const extendsTokenRanges = [];
            for (const heritageClause of interfaceDeclaration.heritageClauses || []) {
                if (heritageClause.token === ts.SyntaxKind.ExtendsKeyword) {
                    for (const heritageType of heritageClause.types) {
                        const extendsTokenRange = ExcerptBuilder.createEmptyTokenRange();
                        extendsTokenRanges.push(extendsTokenRange);
                        nodeTransforms.push({ node: heritageType, captureTokenRange: extendsTokenRange });
                    }
                }
            }
            const excerptTokens = this._buildExcerptTokens(astDeclaration, nodeTransforms);
            const apiItemMetadata = this._collector.fetchApiItemMetadata(astDeclaration);
            const docComment = apiItemMetadata.tsdocComment;
            const releaseTag = apiItemMetadata.effectiveReleaseTag;
            const fileUrlPath = this._getFileUrlPath(interfaceDeclaration);
            apiInterface = new ApiInterface({
                name,
                docComment,
                releaseTag,
                excerptTokens,
                typeParameters,
                extendsTokenRanges,
                isExported,
                fileUrlPath
            });
            parentApiItem.addMember(apiInterface);
        }
        this._processChildDeclarations(astDeclaration, {
            ...context,
            parentApiItem: apiInterface
        });
    }
    _processApiMethod(astDeclaration, context) {
        const { name, parentApiItem } = context;
        const isStatic = (astDeclaration.modifierFlags & ts.ModifierFlags.Static) !== 0;
        const overloadIndex = this._collector.getOverloadIndex(astDeclaration);
        const containerKey = ApiMethod.getContainerKey(name, isStatic, overloadIndex);
        let apiMethod = parentApiItem.tryGetMemberByKey(containerKey);
        if (apiMethod === undefined) {
            const methodDeclaration = astDeclaration.declaration;
            const nodeTransforms = [];
            const returnTypeTokenRange = ExcerptBuilder.createEmptyTokenRange();
            if (methodDeclaration.type) {
                nodeTransforms.push({ node: methodDeclaration.type, captureTokenRange: returnTypeTokenRange });
            }
            const typeParameters = this._captureTypeParameters(nodeTransforms, methodDeclaration.typeParameters);
            const parameters = this._captureParameters(nodeTransforms, methodDeclaration.parameters);
            const excerptTokens = this._buildExcerptTokens(astDeclaration, nodeTransforms);
            const apiItemMetadata = this._collector.fetchApiItemMetadata(astDeclaration);
            const docComment = apiItemMetadata.tsdocComment;
            const releaseTag = apiItemMetadata.effectiveReleaseTag;
            if (releaseTag === ReleaseTag.Internal || releaseTag === ReleaseTag.Alpha) {
                return; // trim out items marked as "@internal" or "@alpha"
            }
            const isOptional = (astDeclaration.astSymbol.followedSymbol.flags & ts.SymbolFlags.Optional) !== 0;
            const isProtected = (astDeclaration.modifierFlags & ts.ModifierFlags.Protected) !== 0;
            const isAbstract = (astDeclaration.modifierFlags & ts.ModifierFlags.Abstract) !== 0;
            const fileUrlPath = this._getFileUrlPath(methodDeclaration);
            apiMethod = new ApiMethod({
                name,
                isAbstract,
                docComment,
                releaseTag,
                isProtected,
                isStatic,
                isOptional,
                typeParameters,
                parameters,
                overloadIndex,
                excerptTokens,
                returnTypeTokenRange,
                fileUrlPath
            });
            parentApiItem.addMember(apiMethod);
        }
    }
    _processApiMethodSignature(astDeclaration, context) {
        const { name, parentApiItem } = context;
        const overloadIndex = this._collector.getOverloadIndex(astDeclaration);
        const containerKey = ApiMethodSignature.getContainerKey(name, overloadIndex);
        let apiMethodSignature = parentApiItem.tryGetMemberByKey(containerKey);
        if (apiMethodSignature === undefined) {
            const methodSignature = astDeclaration.declaration;
            const nodeTransforms = [];
            const returnTypeTokenRange = ExcerptBuilder.createEmptyTokenRange();
            if (methodSignature.type) {
                nodeTransforms.push({ node: methodSignature.type, captureTokenRange: returnTypeTokenRange });
            }
            const typeParameters = this._captureTypeParameters(nodeTransforms, methodSignature.typeParameters);
            const parameters = this._captureParameters(nodeTransforms, methodSignature.parameters);
            const excerptTokens = this._buildExcerptTokens(astDeclaration, nodeTransforms);
            const apiItemMetadata = this._collector.fetchApiItemMetadata(astDeclaration);
            const docComment = apiItemMetadata.tsdocComment;
            const releaseTag = apiItemMetadata.effectiveReleaseTag;
            const isOptional = (astDeclaration.astSymbol.followedSymbol.flags & ts.SymbolFlags.Optional) !== 0;
            const fileUrlPath = this._getFileUrlPath(methodSignature);
            apiMethodSignature = new ApiMethodSignature({
                name,
                docComment,
                releaseTag,
                isOptional,
                typeParameters,
                parameters,
                overloadIndex,
                excerptTokens,
                returnTypeTokenRange,
                fileUrlPath
            });
            parentApiItem.addMember(apiMethodSignature);
        }
    }
    _processApiNamespace(astDeclaration, context) {
        const { name, isExported, parentApiItem } = context;
        const containerKey = ApiNamespace.getContainerKey(name);
        let apiNamespace = parentApiItem.tryGetMemberByKey(containerKey);
        if (apiNamespace === undefined) {
            const excerptTokens = this._buildExcerptTokens(astDeclaration, []);
            const apiItemMetadata = this._collector.fetchApiItemMetadata(astDeclaration);
            const docComment = apiItemMetadata.tsdocComment;
            const releaseTag = apiItemMetadata.effectiveReleaseTag;
            const fileUrlPath = this._getFileUrlPath(astDeclaration.declaration);
            apiNamespace = new ApiNamespace({
                name,
                docComment,
                releaseTag,
                excerptTokens,
                isExported,
                fileUrlPath
            });
            parentApiItem.addMember(apiNamespace);
        }
        this._processChildDeclarations(astDeclaration, {
            ...context,
            parentApiItem: apiNamespace
        });
    }
    _processApiProperty(astDeclaration, context) {
        const { name, parentApiItem } = context;
        const isStatic = (astDeclaration.modifierFlags & ts.ModifierFlags.Static) !== 0;
        const containerKey = ApiProperty.getContainerKey(name, isStatic);
        let apiProperty = parentApiItem.tryGetMemberByKey(containerKey);
        if (apiProperty === undefined) {
            const declaration = astDeclaration.declaration;
            const nodeTransforms = [];
            const propertyTypeTokenRange = ExcerptBuilder.createEmptyTokenRange();
            let propertyTypeNode;
            if (ts.isPropertyDeclaration(declaration) || ts.isGetAccessorDeclaration(declaration)) {
                propertyTypeNode = declaration.type;
            }
            if (ts.isSetAccessorDeclaration(declaration)) {
                // Note that TypeScript always reports an error if a setter does not have exactly one parameter.
                propertyTypeNode = declaration.parameters[0].type;
            }
            if (propertyTypeNode) {
                nodeTransforms.push({ node: propertyTypeNode, captureTokenRange: propertyTypeTokenRange });
            }
            let initializerTokenRange = undefined;
            if (ts.isPropertyDeclaration(declaration) && declaration.initializer) {
                initializerTokenRange = ExcerptBuilder.createEmptyTokenRange();
                nodeTransforms.push({ node: declaration.initializer, captureTokenRange: initializerTokenRange });
            }
            const excerptTokens = this._buildExcerptTokens(astDeclaration, nodeTransforms);
            const apiItemMetadata = this._collector.fetchApiItemMetadata(astDeclaration);
            const docComment = apiItemMetadata.tsdocComment;
            const releaseTag = apiItemMetadata.effectiveReleaseTag;
            const isOptional = (astDeclaration.astSymbol.followedSymbol.flags & ts.SymbolFlags.Optional) !== 0;
            const isProtected = (astDeclaration.modifierFlags & ts.ModifierFlags.Protected) !== 0;
            const isAbstract = (astDeclaration.modifierFlags & ts.ModifierFlags.Abstract) !== 0;
            const isReadonly = this._isReadonly(astDeclaration);
            const fileUrlPath = this._getFileUrlPath(declaration);
            apiProperty = new ApiProperty({
                name,
                docComment,
                releaseTag,
                isAbstract,
                isProtected,
                isStatic,
                isOptional,
                isReadonly,
                excerptTokens,
                propertyTypeTokenRange,
                initializerTokenRange,
                fileUrlPath
            });
            parentApiItem.addMember(apiProperty);
        }
        else {
            // If the property was already declared before (via a merged interface declaration),
            // we assume its signature is identical, because the language requires that.
        }
    }
    _processApiPropertySignature(astDeclaration, context) {
        const { name, parentApiItem } = context;
        const containerKey = ApiPropertySignature.getContainerKey(name);
        let apiPropertySignature = parentApiItem.tryGetMemberByKey(containerKey);
        if (apiPropertySignature === undefined) {
            const propertySignature = astDeclaration.declaration;
            const nodeTransforms = [];
            const propertyTypeTokenRange = ExcerptBuilder.createEmptyTokenRange();
            if (propertySignature.type) {
                nodeTransforms.push({ node: propertySignature.type, captureTokenRange: propertyTypeTokenRange });
            }
            const excerptTokens = this._buildExcerptTokens(astDeclaration, nodeTransforms);
            const apiItemMetadata = this._collector.fetchApiItemMetadata(astDeclaration);
            const docComment = apiItemMetadata.tsdocComment;
            const releaseTag = apiItemMetadata.effectiveReleaseTag;
            const isOptional = (astDeclaration.astSymbol.followedSymbol.flags & ts.SymbolFlags.Optional) !== 0;
            const isReadonly = this._isReadonly(astDeclaration);
            const fileUrlPath = this._getFileUrlPath(propertySignature);
            apiPropertySignature = new ApiPropertySignature({
                name,
                docComment,
                releaseTag,
                isOptional,
                excerptTokens,
                propertyTypeTokenRange,
                isReadonly,
                fileUrlPath
            });
            parentApiItem.addMember(apiPropertySignature);
        }
        else {
            // If the property was already declared before (via a merged interface declaration),
            // we assume its signature is identical, because the language requires that.
        }
    }
    _processApiTypeAlias(astDeclaration, context) {
        const { name, isExported, parentApiItem } = context;
        const containerKey = ApiTypeAlias.getContainerKey(name);
        let apiTypeAlias = parentApiItem.tryGetMemberByKey(containerKey);
        if (apiTypeAlias === undefined) {
            const typeAliasDeclaration = astDeclaration.declaration;
            const nodeTransforms = [];
            const typeParameters = this._captureTypeParameters(nodeTransforms, typeAliasDeclaration.typeParameters);
            const typeTokenRange = ExcerptBuilder.createEmptyTokenRange();
            nodeTransforms.push({ node: typeAliasDeclaration.type, captureTokenRange: typeTokenRange });
            const excerptTokens = this._buildExcerptTokens(astDeclaration, nodeTransforms);
            const apiItemMetadata = this._collector.fetchApiItemMetadata(astDeclaration);
            const docComment = apiItemMetadata.tsdocComment;
            const releaseTag = apiItemMetadata.effectiveReleaseTag;
            const fileUrlPath = this._getFileUrlPath(typeAliasDeclaration);
            apiTypeAlias = new ApiTypeAlias({
                name,
                docComment,
                typeParameters,
                releaseTag,
                excerptTokens,
                typeTokenRange,
                isExported,
                fileUrlPath
            });
            parentApiItem.addMember(apiTypeAlias);
        }
    }
    _processApiVariable(astDeclaration, context) {
        const { name, isExported, parentApiItem } = context;
        const containerKey = ApiVariable.getContainerKey(name);
        let apiVariable = parentApiItem.tryGetMemberByKey(containerKey);
        if (apiVariable === undefined) {
            const variableDeclaration = astDeclaration.declaration;
            const nodeTransforms = [];
            const variableTypeTokenRange = ExcerptBuilder.createEmptyTokenRange();
            if (variableDeclaration.type) {
                nodeTransforms.push({ node: variableDeclaration.type, captureTokenRange: variableTypeTokenRange });
            }
            let initializerTokenRange = undefined;
            if (variableDeclaration.initializer) {
                initializerTokenRange = ExcerptBuilder.createEmptyTokenRange();
                nodeTransforms.push({
                    node: variableDeclaration.initializer,
                    captureTokenRange: initializerTokenRange
                });
            }
            const excerptTokens = this._buildExcerptTokens(astDeclaration, nodeTransforms);
            const apiItemMetadata = this._collector.fetchApiItemMetadata(astDeclaration);
            const docComment = apiItemMetadata.tsdocComment;
            const releaseTag = apiItemMetadata.effectiveReleaseTag;
            const isReadonly = this._isReadonly(astDeclaration);
            const fileUrlPath = this._getFileUrlPath(variableDeclaration);
            apiVariable = new ApiVariable({
                name,
                docComment,
                releaseTag,
                excerptTokens,
                variableTypeTokenRange,
                initializerTokenRange,
                isReadonly,
                isExported,
                fileUrlPath
            });
            parentApiItem.addMember(apiVariable);
        }
    }
    /**
     * @param nodeTransforms - A list of child nodes whose token ranges we want to capture
     */
    _buildExcerptTokens(astDeclaration, nodeTransforms) {
        const excerptTokens = [];
        // Build the main declaration
        ExcerptBuilder.addDeclaration(excerptTokens, astDeclaration, nodeTransforms, this._referenceGenerator);
        const declarationMetadata = this._collector.fetchDeclarationMetadata(astDeclaration);
        // Add any ancillary declarations
        for (const ancillaryDeclaration of declarationMetadata.ancillaryDeclarations) {
            ExcerptBuilder.addBlankLine(excerptTokens);
            ExcerptBuilder.addDeclaration(excerptTokens, ancillaryDeclaration, nodeTransforms, this._referenceGenerator);
        }
        return excerptTokens;
    }
    _captureTypeParameters(nodeTransforms, typeParameterNodes) {
        const typeParameters = [];
        if (typeParameterNodes) {
            for (const typeParameter of typeParameterNodes) {
                const constraintTokenRange = ExcerptBuilder.createEmptyTokenRange();
                if (typeParameter.constraint) {
                    nodeTransforms.push({ node: typeParameter.constraint, captureTokenRange: constraintTokenRange });
                }
                const defaultTypeTokenRange = ExcerptBuilder.createEmptyTokenRange();
                if (typeParameter.default) {
                    nodeTransforms.push({ node: typeParameter.default, captureTokenRange: defaultTypeTokenRange });
                }
                typeParameters.push({
                    typeParameterName: typeParameter.name.getText().trim(),
                    constraintTokenRange,
                    defaultTypeTokenRange
                });
            }
        }
        return typeParameters;
    }
    _captureParameters(nodeTransforms, parameterNodes) {
        const parameters = [];
        DtsEmitHelpers.forEachParameterToNormalize(parameterNodes, (parameter, syntheticName) => {
            const parameterTypeTokenRange = ExcerptBuilder.createEmptyTokenRange();
            if (parameter.type) {
                nodeTransforms.push({ node: parameter.type, captureTokenRange: parameterTypeTokenRange });
            }
            parameters.push({
                parameterName: syntheticName !== null && syntheticName !== void 0 ? syntheticName : parameter.name.getText().trim(),
                parameterTypeTokenRange,
                isOptional: this._collector.typeChecker.isOptionalParameter(parameter)
            });
            if (syntheticName !== undefined) {
                // Replace the subexpression like "{ y, z }" with the synthesized parameter name
                nodeTransforms.push({ node: parameter.name, replacementText: syntheticName });
            }
        });
        return parameters;
    }
    _isReadonly(astDeclaration) {
        var _a;
        switch (astDeclaration.declaration.kind) {
            case ts.SyntaxKind.GetAccessor:
            case ts.SyntaxKind.IndexSignature:
            case ts.SyntaxKind.PropertyDeclaration:
            case ts.SyntaxKind.PropertySignature:
            case ts.SyntaxKind.SetAccessor:
            case ts.SyntaxKind.VariableDeclaration: {
                const apiItemMetadata = this._collector.fetchApiItemMetadata(astDeclaration);
                const docComment = apiItemMetadata.tsdocComment;
                const declarationMetadata = this._collector.fetchDeclarationMetadata(astDeclaration);
                const hasReadonlyModifier = (astDeclaration.modifierFlags & ts.ModifierFlags.Readonly) !== 0;
                const hasReadonlyDocTag = !!((_a = docComment === null || docComment === void 0 ? void 0 : docComment.modifierTagSet) === null || _a === void 0 ? void 0 : _a.hasTagName('@readonly'));
                const isGetterWithNoSetter = ts.isGetAccessorDeclaration(astDeclaration.declaration) &&
                    declarationMetadata.ancillaryDeclarations.length === 0;
                const isVarConst = ts.isVariableDeclaration(astDeclaration.declaration) &&
                    TypeScriptInternals.isVarConst(astDeclaration.declaration);
                return hasReadonlyModifier || hasReadonlyDocTag || isGetterWithNoSetter || isVarConst;
            }
            default: {
                // Readonly-ness does not make sense for any other declaration kind.
                return false;
            }
        }
    }
    _getFileUrlPath(declaration) {
        const sourceFile = declaration.getSourceFile();
        const sourceLocation = this._collector.sourceMapper.getSourceLocation({
            sourceFile,
            pos: declaration.pos
        });
        let result = path.relative(this._collector.extractorConfig.projectFolder, sourceLocation.sourceFilePath);
        result = Path.convertToSlashes(result);
        return result;
    }
}
//# sourceMappingURL=ApiModelGenerator.js.map