// Copyright (c) Microsoft Corporation. All rights reserved. Licensed under the MIT license.
// See LICENSE in the project root for license information.
import * as ts from 'typescript';
import { ReleaseTag } from '@microsoft/api-extractor-model';
import { FileSystem, InternalError } from '@rushstack/node-core-library';
import { TypeScriptHelpers } from '../analyzer/TypeScriptHelpers';
import { IndentDocCommentScope, Span } from '../analyzer/Span';
import { AstImport } from '../analyzer/AstImport';
import { AstDeclaration } from '../analyzer/AstDeclaration';
import { AstSymbol } from '../analyzer/AstSymbol';
import { IndentedWriter } from './IndentedWriter';
import { DtsEmitHelpers } from './DtsEmitHelpers';
import { AstNamespaceImport } from '../analyzer/AstNamespaceImport';
import { SourceFileLocationFormatter } from '../analyzer/SourceFileLocationFormatter';
/**
 * Used with DtsRollupGenerator.writeTypingsFile()
 */
export var DtsRollupKind;
(function (DtsRollupKind) {
    /**
     * Generate a *.d.ts file for an internal release, or for the trimming=false mode.
     * This output file will contain all definitions that are reachable from the entry point.
     */
    DtsRollupKind[DtsRollupKind["InternalRelease"] = 0] = "InternalRelease";
    /**
     * Generate a *.d.ts file for a preview release.
     * This output file will contain all definitions that are reachable from the entry point,
     * except definitions marked as \@internal.
     */
    DtsRollupKind[DtsRollupKind["AlphaRelease"] = 1] = "AlphaRelease";
    /**
     * Generate a *.d.ts file for a preview release.
     * This output file will contain all definitions that are reachable from the entry point,
     * except definitions marked as \@alpha or \@internal.
     */
    DtsRollupKind[DtsRollupKind["BetaRelease"] = 2] = "BetaRelease";
    /**
     * Generate a *.d.ts file for a public release.
     * This output file will contain all definitions that are reachable from the entry point,
     * except definitions marked as \@beta, \@alpha, or \@internal.
     */
    DtsRollupKind[DtsRollupKind["PublicRelease"] = 3] = "PublicRelease";
})(DtsRollupKind || (DtsRollupKind = {}));
export class DtsRollupGenerator {
    /**
     * Generates the typings file and writes it to disk.
     *
     * @param dtsFilename    - The *.d.ts output filename
     */
    static writeTypingsFile(collector, dtsFilename, dtsKind, newlineKind) {
        const writer = new IndentedWriter();
        writer.trimLeadingSpaces = true;
        DtsRollupGenerator._generateTypingsFileContent(collector, writer, dtsKind);
        FileSystem.writeFile(dtsFilename, writer.toString(), {
            convertLineEndings: newlineKind,
            ensureFolderExists: true
        });
    }
    static _generateTypingsFileContent(collector, writer, dtsKind) {
        // Emit the @packageDocumentation comment at the top of the file
        if (collector.workingPackage.tsdocParserContext) {
            writer.trimLeadingSpaces = false;
            writer.writeLine(collector.workingPackage.tsdocParserContext.sourceRange.toString());
            writer.trimLeadingSpaces = true;
            writer.ensureSkippedLine();
        }
        // Emit the triple slash directives
        for (const typeDirectiveReference of collector.dtsTypeReferenceDirectives) {
            // https://github.com/microsoft/TypeScript/blob/611ebc7aadd7a44a4c0447698bfda9222a78cb66/src/compiler/declarationEmitter.ts#L162
            writer.writeLine(`/// <reference types="${typeDirectiveReference}" />`);
        }
        for (const libDirectiveReference of collector.dtsLibReferenceDirectives) {
            writer.writeLine(`/// <reference lib="${libDirectiveReference}" />`);
        }
        writer.ensureSkippedLine();
        // Emit the imports
        for (const entity of collector.entities) {
            if (entity.astEntity instanceof AstImport) {
                // Note: it isn't valid to trim imports based on their release tags.
                // E.g. class Foo (`@public`) extends interface Bar (`@beta`) from some external library.
                // API-Extractor cannot trim `import { Bar } from "external-library"` when generating its public rollup,
                // or the export of `Foo` would include a broken reference to `Bar`.
                const astImport = entity.astEntity;
                DtsEmitHelpers.emitImport(writer, entity, astImport);
            }
        }
        writer.ensureSkippedLine();
        // Emit the regular declarations
        for (const entity of collector.entities) {
            const astEntity = entity.astEntity;
            const symbolMetadata = collector.tryFetchMetadataForAstEntity(astEntity);
            const maxEffectiveReleaseTag = symbolMetadata
                ? symbolMetadata.maxEffectiveReleaseTag
                : ReleaseTag.None;
            if (!this._shouldIncludeReleaseTag(maxEffectiveReleaseTag, dtsKind)) {
                if (!collector.extractorConfig.omitTrimmingComments) {
                    writer.ensureSkippedLine();
                    writer.writeLine(`/* Excluded from this release type: ${entity.nameForEmit} */`);
                }
                continue;
            }
            if (astEntity instanceof AstSymbol) {
                // Emit all the declarations for this entry
                for (const astDeclaration of astEntity.astDeclarations || []) {
                    const apiItemMetadata = collector.fetchApiItemMetadata(astDeclaration);
                    if (!this._shouldIncludeReleaseTag(apiItemMetadata.effectiveReleaseTag, dtsKind)) {
                        if (!collector.extractorConfig.omitTrimmingComments) {
                            writer.ensureSkippedLine();
                            writer.writeLine(`/* Excluded declaration from this release type: ${entity.nameForEmit} */`);
                        }
                        continue;
                    }
                    else {
                        const span = new Span(astDeclaration.declaration);
                        DtsRollupGenerator._modifySpan(collector, span, entity, astDeclaration, dtsKind);
                        writer.ensureSkippedLine();
                        span.writeModifiedText(writer);
                        writer.ensureNewLine();
                    }
                }
            }
            if (astEntity instanceof AstNamespaceImport) {
                const astModuleExportInfo = astEntity.fetchAstModuleExportInfo(collector);
                if (entity.nameForEmit === undefined) {
                    // This should never happen
                    throw new InternalError('referencedEntry.nameForEmit is undefined');
                }
                if (astModuleExportInfo.starExportedExternalModules.size > 0) {
                    // We could support this, but we would need to find a way to safely represent it.
                    throw new Error(`The ${entity.nameForEmit} namespace import includes a start export, which is not supported:\n` +
                        SourceFileLocationFormatter.formatDeclaration(astEntity.declaration));
                }
                // Emit a synthetic declaration for the namespace.  It will look like this:
                //
                //    declare namespace example {
                //      export {
                //        f1,
                //        f2
                //      }
                //    }
                //
                // Note that we do not try to relocate f1()/f2() to be inside the namespace because other type
                // signatures may reference them directly (without using the namespace qualifier).
                writer.ensureSkippedLine();
                if (entity.shouldInlineExport) {
                    writer.write('export ');
                }
                writer.writeLine(`declare namespace ${entity.nameForEmit} {`);
                // all local exports of local imported module are just references to top-level declarations
                writer.increaseIndent();
                writer.writeLine('export {');
                writer.increaseIndent();
                const exportClauses = [];
                for (const [exportedName, exportedEntity] of astModuleExportInfo.exportedLocalEntities) {
                    const collectorEntity = collector.tryGetCollectorEntity(exportedEntity);
                    if (collectorEntity === undefined) {
                        // This should never happen
                        // top-level exports of local imported module should be added as collector entities before
                        throw new InternalError(`Cannot find collector entity for ${entity.nameForEmit}.${exportedEntity.localName}`);
                    }
                    // If the entity's declaration won't be included, then neither should the namespace export it
                    // This fixes the issue encountered here: https://github.com/microsoft/rushstack/issues/2791
                    const exportedSymbolMetadata = collector.tryFetchMetadataForAstEntity(exportedEntity);
                    const exportedMaxEffectiveReleaseTag = exportedSymbolMetadata
                        ? exportedSymbolMetadata.maxEffectiveReleaseTag
                        : ReleaseTag.None;
                    if (!this._shouldIncludeReleaseTag(exportedMaxEffectiveReleaseTag, dtsKind)) {
                        continue;
                    }
                    if (collectorEntity.nameForEmit === exportedName) {
                        exportClauses.push(collectorEntity.nameForEmit);
                    }
                    else {
                        exportClauses.push(`${collectorEntity.nameForEmit} as ${exportedName}`);
                    }
                }
                writer.writeLine(exportClauses.join(',\n'));
                writer.decreaseIndent();
                writer.writeLine('}'); // end of "export { ... }"
                writer.decreaseIndent();
                writer.writeLine('}'); // end of "declare namespace { ... }"
            }
            if (!entity.shouldInlineExport) {
                for (const exportName of entity.exportNames) {
                    DtsEmitHelpers.emitNamedExport(writer, exportName, entity);
                }
            }
            writer.ensureSkippedLine();
        }
        DtsEmitHelpers.emitStarExports(writer, collector);
        // Emit "export { }" which is a special directive that prevents consumers from importing declarations
        // that don't have an explicit "export" modifier.
        writer.ensureSkippedLine();
        writer.writeLine('export { }');
    }
    /**
     * Before writing out a declaration, _modifySpan() applies various fixups to make it nice.
     */
    static _modifySpan(collector, span, entity, astDeclaration, dtsKind) {
        const previousSpan = span.previousSibling;
        let recurseChildren = true;
        switch (span.kind) {
            case ts.SyntaxKind.JSDocComment:
                // If the @packageDocumentation comment seems to be attached to one of the regular API items,
                // omit it.  It gets explictly emitted at the top of the file.
                if (span.node.getText().match(/(?:\s|\*)@packageDocumentation(?:\s|\*)/gi)) {
                    span.modification.skipAll();
                }
                // For now, we don't transform JSDoc comment nodes at all
                recurseChildren = false;
                break;
            case ts.SyntaxKind.ExportKeyword:
                if (DtsEmitHelpers.isExportKeywordInNamespaceExportDeclaration(span.node)) {
                    // This is an export declaration inside a namespace - preserve the export keyword
                    break;
                }
                // Otherwise, delete the export keyword -- we will re-add it below
                span.modification.skipAll();
                break;
            case ts.SyntaxKind.DefaultKeyword:
            case ts.SyntaxKind.DeclareKeyword:
                // Delete any explicit "export" or "declare" keywords -- we will re-add them below
                span.modification.skipAll();
                break;
            case ts.SyntaxKind.InterfaceKeyword:
            case ts.SyntaxKind.ClassKeyword:
            case ts.SyntaxKind.EnumKeyword:
            case ts.SyntaxKind.NamespaceKeyword:
            case ts.SyntaxKind.ModuleKeyword:
            case ts.SyntaxKind.TypeKeyword:
            case ts.SyntaxKind.FunctionKeyword:
                // Replace the stuff we possibly deleted above
                let replacedModifiers = '';
                // Add a declare statement for root declarations (but not for nested declarations)
                if (!astDeclaration.parent) {
                    replacedModifiers += 'declare ';
                }
                if (entity.shouldInlineExport) {
                    replacedModifiers = 'export ' + replacedModifiers;
                }
                if (previousSpan && previousSpan.kind === ts.SyntaxKind.SyntaxList) {
                    // If there is a previous span of type SyntaxList, then apply it before any other modifiers
                    // (e.g. "abstract") that appear there.
                    previousSpan.modification.prefix = replacedModifiers + previousSpan.modification.prefix;
                }
                else {
                    // Otherwise just stick it in front of this span
                    span.modification.prefix = replacedModifiers + span.modification.prefix;
                }
                break;
            case ts.SyntaxKind.VariableDeclaration:
                // Is this a top-level variable declaration?
                // (The logic below does not apply to variable declarations that are part of an explicit "namespace" block,
                // since the compiler prefers not to emit "declare" or "export" keywords for those declarations.)
                if (!span.parent) {
                    // The VariableDeclaration node is part of a VariableDeclarationList, however
                    // the Entry.followedSymbol points to the VariableDeclaration part because
                    // multiple definitions might share the same VariableDeclarationList.
                    //
                    // Since we are emitting a separate declaration for each one, we need to look upwards
                    // in the ts.Node tree and write a copy of the enclosing VariableDeclarationList
                    // content (e.g. "var" from "var x=1, y=2").
                    const list = TypeScriptHelpers.matchAncestor(span.node, [
                        ts.SyntaxKind.VariableDeclarationList,
                        ts.SyntaxKind.VariableDeclaration
                    ]);
                    if (!list) {
                        // This should not happen unless the compiler API changes somehow
                        throw new InternalError('Unsupported variable declaration');
                    }
                    const listPrefix = list
                        .getSourceFile()
                        .text.substring(list.getStart(), list.declarations[0].getStart());
                    span.modification.prefix = 'declare ' + listPrefix + span.modification.prefix;
                    span.modification.suffix = ';';
                    if (entity.shouldInlineExport) {
                        span.modification.prefix = 'export ' + span.modification.prefix;
                    }
                    const declarationMetadata = collector.fetchDeclarationMetadata(astDeclaration);
                    if (declarationMetadata.tsdocParserContext) {
                        // Typically the comment for a variable declaration is attached to the outer variable statement
                        // (which may possibly contain multiple variable declarations), so it's not part of the Span.
                        // Instead we need to manually inject it.
                        let originalComment = declarationMetadata.tsdocParserContext.sourceRange.toString();
                        if (!/\r?\n\s*$/.test(originalComment)) {
                            originalComment += '\n';
                        }
                        span.modification.indentDocComment = IndentDocCommentScope.PrefixOnly;
                        span.modification.prefix = originalComment + span.modification.prefix;
                    }
                }
                break;
            case ts.SyntaxKind.Identifier:
                {
                    const referencedEntity = collector.tryGetEntityForNode(span.node);
                    if (referencedEntity) {
                        if (!referencedEntity.nameForEmit) {
                            // This should never happen
                            throw new InternalError('referencedEntry.nameForEmit is undefined');
                        }
                        span.modification.prefix = referencedEntity.nameForEmit;
                        // For debugging:
                        // span.modification.prefix += '/*R=FIX*/';
                    }
                    else {
                        // For debugging:
                        // span.modification.prefix += '/*R=KEEP*/';
                    }
                }
                break;
            case ts.SyntaxKind.ImportType:
                DtsEmitHelpers.modifyImportTypeSpan(collector, span, astDeclaration, (childSpan, childAstDeclaration) => {
                    DtsRollupGenerator._modifySpan(collector, childSpan, entity, childAstDeclaration, dtsKind);
                });
                break;
        }
        if (recurseChildren) {
            for (const child of span.children) {
                let childAstDeclaration = astDeclaration;
                // Should we trim this node?
                let trimmed = false;
                if (AstDeclaration.isSupportedSyntaxKind(child.kind)) {
                    childAstDeclaration = collector.astSymbolTable.getChildAstDeclarationByNode(child.node, astDeclaration);
                    const releaseTag = collector.fetchApiItemMetadata(childAstDeclaration).effectiveReleaseTag;
                    if (!this._shouldIncludeReleaseTag(releaseTag, dtsKind)) {
                        let nodeToTrim = child;
                        // If we are trimming a variable statement, then we need to trim the outer VariableDeclarationList
                        // as well.
                        if (child.kind === ts.SyntaxKind.VariableDeclaration) {
                            const variableStatement = child.findFirstParent(ts.SyntaxKind.VariableStatement);
                            if (variableStatement !== undefined) {
                                nodeToTrim = variableStatement;
                            }
                        }
                        const modification = nodeToTrim.modification;
                        // Yes, trim it and stop here
                        const name = childAstDeclaration.astSymbol.localName;
                        modification.omitChildren = true;
                        if (!collector.extractorConfig.omitTrimmingComments) {
                            modification.prefix = `/* Excluded from this release type: ${name} */`;
                        }
                        else {
                            modification.prefix = '';
                        }
                        modification.suffix = '';
                        if (nodeToTrim.children.length > 0) {
                            // If there are grandchildren, then keep the last grandchild's separator,
                            // since it often has useful whitespace
                            modification.suffix = nodeToTrim.children[nodeToTrim.children.length - 1].separator;
                        }
                        if (nodeToTrim.nextSibling) {
                            // If the thing we are trimming is followed by a comma, then trim the comma also.
                            // An example would be an enum member.
                            if (nodeToTrim.nextSibling.kind === ts.SyntaxKind.CommaToken) {
                                // Keep its separator since it often has useful whitespace
                                modification.suffix += nodeToTrim.nextSibling.separator;
                                nodeToTrim.nextSibling.modification.skipAll();
                            }
                        }
                        trimmed = true;
                    }
                }
                if (!trimmed) {
                    DtsRollupGenerator._modifySpan(collector, child, entity, childAstDeclaration, dtsKind);
                }
            }
        }
    }
    static _shouldIncludeReleaseTag(releaseTag, dtsKind) {
        switch (dtsKind) {
            case DtsRollupKind.InternalRelease:
                return true;
            case DtsRollupKind.AlphaRelease:
                return (releaseTag === ReleaseTag.Alpha ||
                    releaseTag === ReleaseTag.Beta ||
                    releaseTag === ReleaseTag.Public ||
                    // NOTE: If the release tag is "None", then we don't have enough information to trim it
                    releaseTag === ReleaseTag.None);
            case DtsRollupKind.BetaRelease:
                return (releaseTag === ReleaseTag.Beta ||
                    releaseTag === ReleaseTag.Public ||
                    // NOTE: If the release tag is "None", then we don't have enough information to trim it
                    releaseTag === ReleaseTag.None);
            case DtsRollupKind.PublicRelease:
                return releaseTag === ReleaseTag.Public || releaseTag === ReleaseTag.None;
            default:
                throw new Error(`${DtsRollupKind[dtsKind]} is not implemented`);
        }
    }
}
//# sourceMappingURL=DtsRollupGenerator.js.map