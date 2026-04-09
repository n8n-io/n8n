// Copyright (c) Microsoft Corporation. All rights reserved. Licensed under the MIT license.
// See LICENSE in the project root for license information.
import * as ts from 'typescript';
import { InternalError } from '@rushstack/node-core-library';
import { AstImport, AstImportKind } from '../analyzer/AstImport';
import { AstDeclaration } from '../analyzer/AstDeclaration';
import { SourceFileLocationFormatter } from '../analyzer/SourceFileLocationFormatter';
import { TypeScriptHelpers } from '../analyzer/TypeScriptHelpers';
/**
 * Some common code shared between DtsRollupGenerator and ApiReportGenerator.
 */
export class DtsEmitHelpers {
    static emitImport(writer, collectorEntity, astImport) {
        const importPrefix = astImport.isTypeOnlyEverywhere ? 'import type' : 'import';
        switch (astImport.importKind) {
            case AstImportKind.DefaultImport:
                if (collectorEntity.nameForEmit !== astImport.exportName) {
                    writer.write(`${importPrefix} { default as ${collectorEntity.nameForEmit} }`);
                }
                else {
                    writer.write(`${importPrefix} ${astImport.exportName}`);
                }
                writer.writeLine(` from '${astImport.modulePath}';`);
                break;
            case AstImportKind.NamedImport:
                if (collectorEntity.nameForEmit === astImport.exportName) {
                    writer.write(`${importPrefix} { ${astImport.exportName} }`);
                }
                else {
                    writer.write(`${importPrefix} { ${astImport.exportName} as ${collectorEntity.nameForEmit} }`);
                }
                writer.writeLine(` from '${astImport.modulePath}';`);
                break;
            case AstImportKind.StarImport:
                writer.writeLine(`${importPrefix} * as ${collectorEntity.nameForEmit} from '${astImport.modulePath}';`);
                break;
            case AstImportKind.EqualsImport:
                writer.writeLine(`${importPrefix} ${collectorEntity.nameForEmit} = require('${astImport.modulePath}');`);
                break;
            case AstImportKind.ImportType:
                if (!astImport.exportName) {
                    writer.writeLine(`${importPrefix} * as ${collectorEntity.nameForEmit} from '${astImport.modulePath}';`);
                }
                else {
                    const topExportName = astImport.exportName.split('.')[0];
                    if (collectorEntity.nameForEmit === topExportName) {
                        writer.write(`${importPrefix} { ${topExportName} }`);
                    }
                    else {
                        writer.write(`${importPrefix} { ${topExportName} as ${collectorEntity.nameForEmit} }`);
                    }
                    writer.writeLine(` from '${astImport.modulePath}';`);
                }
                break;
            default:
                throw new InternalError('Unimplemented AstImportKind');
        }
    }
    static emitNamedExport(writer, exportName, collectorEntity) {
        if (exportName === ts.InternalSymbolName.Default) {
            writer.writeLine(`export default ${collectorEntity.nameForEmit};`);
        }
        else if (collectorEntity.nameForEmit !== exportName) {
            writer.writeLine(`export { ${collectorEntity.nameForEmit} as ${exportName} }`);
        }
        else {
            writer.writeLine(`export { ${exportName} }`);
        }
    }
    static emitStarExports(writer, collector) {
        if (collector.starExportedExternalModulePaths.length > 0) {
            writer.writeLine();
            for (const starExportedExternalModulePath of collector.starExportedExternalModulePaths) {
                writer.writeLine(`export * from "${starExportedExternalModulePath}";`);
            }
        }
    }
    static modifyImportTypeSpan(collector, span, astDeclaration, modifyNestedSpan) {
        var _a, _b, _c, _d;
        const node = span.node;
        const referencedEntity = collector.tryGetEntityForNode(node);
        if (referencedEntity) {
            if (!referencedEntity.nameForEmit) {
                // This should never happen
                throw new InternalError('referencedEntry.nameForEmit is undefined');
            }
            let typeArgumentsText = '';
            if (node.typeArguments && node.typeArguments.length > 0) {
                // Type arguments have to be processed and written to the document
                const lessThanTokenPos = span.children.findIndex((childSpan) => childSpan.node.kind === ts.SyntaxKind.LessThanToken);
                const greaterThanTokenPos = span.children.findIndex((childSpan) => childSpan.node.kind === ts.SyntaxKind.GreaterThanToken);
                if (lessThanTokenPos < 0 || greaterThanTokenPos <= lessThanTokenPos) {
                    throw new InternalError(`Invalid type arguments: ${node.getText()}\n` +
                        SourceFileLocationFormatter.formatDeclaration(node));
                }
                const typeArgumentsSpans = span.children.slice(lessThanTokenPos + 1, greaterThanTokenPos);
                // Apply modifications to Span elements of typeArguments
                typeArgumentsSpans.forEach((childSpan) => {
                    const childAstDeclaration = AstDeclaration.isSupportedSyntaxKind(childSpan.kind)
                        ? collector.astSymbolTable.getChildAstDeclarationByNode(childSpan.node, astDeclaration)
                        : astDeclaration;
                    modifyNestedSpan(childSpan, childAstDeclaration);
                });
                const typeArgumentsStrings = typeArgumentsSpans.map((childSpan) => childSpan.getModifiedText());
                typeArgumentsText = `<${typeArgumentsStrings.join(', ')}>`;
            }
            const separatorAfter = (_b = (_a = /(\s*)$/.exec(span.getText())) === null || _a === void 0 ? void 0 : _a[1]) !== null && _b !== void 0 ? _b : '';
            if (referencedEntity.astEntity instanceof AstImport &&
                referencedEntity.astEntity.importKind === AstImportKind.ImportType &&
                referencedEntity.astEntity.exportName) {
                // For an ImportType with a namespace chain, only the top namespace is imported.
                // Must add the original nested qualifiers to the rolled up import.
                const qualifiersText = (_d = (_c = node.qualifier) === null || _c === void 0 ? void 0 : _c.getText()) !== null && _d !== void 0 ? _d : '';
                const nestedQualifiersStart = qualifiersText.indexOf('.');
                // Including the leading "."
                const nestedQualifiersText = nestedQualifiersStart >= 0 ? qualifiersText.substring(nestedQualifiersStart) : '';
                const replacement = `${referencedEntity.nameForEmit}${nestedQualifiersText}${typeArgumentsText}${separatorAfter}`;
                span.modification.skipAll();
                span.modification.prefix = replacement;
            }
            else {
                // Replace with internal symbol or AstImport
                span.modification.skipAll();
                span.modification.prefix = `${referencedEntity.nameForEmit}${typeArgumentsText}${separatorAfter}`;
            }
        }
    }
    /**
     * Checks if an export keyword is part of an ExportDeclaration inside a namespace
     * (e.g., "export { Foo, Bar };" inside "declare namespace SDK { ... }").
     * In that case, the export keyword must be preserved, otherwise the output is invalid TypeScript.
     */
    static isExportKeywordInNamespaceExportDeclaration(node) {
        if (node.parent && ts.isExportDeclaration(node.parent)) {
            const moduleBlock = TypeScriptHelpers.findFirstParent(node, ts.SyntaxKind.ModuleBlock);
            if (moduleBlock) {
                return true;
            }
        }
        return false;
    }
    /**
     * Given an array that includes some parameter nodes, this returns an array of the same length;
     * elements that are not undefined correspond to a parameter that should be renamed.
     */
    static forEachParameterToNormalize(nodes, action) {
        let actionIndex = 0;
        // Optimistically assume that no parameters need to be normalized
        for (actionIndex = 0; actionIndex < nodes.length; ++actionIndex) {
            const parameter = nodes[actionIndex];
            if (!ts.isParameter(parameter)) {
                continue;
            }
            action(parameter, undefined);
            if (ts.isObjectBindingPattern(parameter.name) || ts.isArrayBindingPattern(parameter.name)) {
                // Our optimistic assumption was not true; we'll need to stop and calculate alreadyUsedNames
                break;
            }
        }
        if (actionIndex === nodes.length) {
            // Our optimistic assumption was true
            return;
        }
        // First, calculate alreadyUsedNames
        const alreadyUsedNames = [];
        for (let index = 0; index < nodes.length; ++index) {
            const parameter = nodes[index];
            if (!ts.isParameter(parameter)) {
                continue;
            }
            if (!(ts.isObjectBindingPattern(parameter.name) || ts.isArrayBindingPattern(parameter.name))) {
                alreadyUsedNames.push(parameter.name.text.trim());
            }
        }
        // Now continue with the rest of the actions
        for (; actionIndex < nodes.length; ++actionIndex) {
            const parameter = nodes[actionIndex];
            if (!ts.isParameter(parameter)) {
                continue;
            }
            if (ts.isObjectBindingPattern(parameter.name) || ts.isArrayBindingPattern(parameter.name)) {
                // Examples:
                //
                //      function f({ y, z }: { y: string, z: string })
                // ---> function f(input: { y: string, z: string })
                //
                //      function f(x: number, [a, b]: [number, number])
                // ---> function f(x: number, input: [number, number])
                //
                // Example of a naming collision:
                //
                //      function f({ a }: { a: string }, { b }: { b: string }, input2: string)
                // ---> function f(input: { a: string }, input3: { b: string }, input2: string)
                const baseName = 'input';
                let counter = 2;
                let syntheticName = baseName;
                while (alreadyUsedNames.includes(syntheticName)) {
                    syntheticName = `${baseName}${counter++}`;
                }
                alreadyUsedNames.push(syntheticName);
                action(parameter, syntheticName);
            }
            else {
                action(parameter, undefined);
            }
        }
    }
    static normalizeParameterNames(signatureSpan) {
        const syntheticNamesByNode = new Map();
        DtsEmitHelpers.forEachParameterToNormalize(signatureSpan.node.getChildren(), (parameter, syntheticName) => {
            if (syntheticName !== undefined) {
                syntheticNamesByNode.set(parameter.name, syntheticName);
            }
        });
        if (syntheticNamesByNode.size > 0) {
            signatureSpan.forEach((childSpan) => {
                const syntheticName = syntheticNamesByNode.get(childSpan.node);
                if (syntheticName !== undefined) {
                    childSpan.modification.prefix = syntheticName;
                    childSpan.modification.suffix = '';
                    childSpan.modification.omitChildren = true;
                }
            });
        }
    }
}
//# sourceMappingURL=DtsEmitHelpers.js.map