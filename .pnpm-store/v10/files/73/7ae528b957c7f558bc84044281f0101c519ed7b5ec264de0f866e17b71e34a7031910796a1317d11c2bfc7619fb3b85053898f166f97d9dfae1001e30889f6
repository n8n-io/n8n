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
exports.DtsEmitHelpers = void 0;
const ts = __importStar(require("typescript"));
const node_core_library_1 = require("@rushstack/node-core-library");
const AstImport_1 = require("../analyzer/AstImport");
const AstDeclaration_1 = require("../analyzer/AstDeclaration");
const SourceFileLocationFormatter_1 = require("../analyzer/SourceFileLocationFormatter");
/**
 * Some common code shared between DtsRollupGenerator and ApiReportGenerator.
 */
class DtsEmitHelpers {
    static emitImport(writer, collectorEntity, astImport) {
        const importPrefix = astImport.isTypeOnlyEverywhere ? 'import type' : 'import';
        switch (astImport.importKind) {
            case AstImport_1.AstImportKind.DefaultImport:
                if (collectorEntity.nameForEmit !== astImport.exportName) {
                    writer.write(`${importPrefix} { default as ${collectorEntity.nameForEmit} }`);
                }
                else {
                    writer.write(`${importPrefix} ${astImport.exportName}`);
                }
                writer.writeLine(` from '${astImport.modulePath}';`);
                break;
            case AstImport_1.AstImportKind.NamedImport:
                if (collectorEntity.nameForEmit === astImport.exportName) {
                    writer.write(`${importPrefix} { ${astImport.exportName} }`);
                }
                else {
                    writer.write(`${importPrefix} { ${astImport.exportName} as ${collectorEntity.nameForEmit} }`);
                }
                writer.writeLine(` from '${astImport.modulePath}';`);
                break;
            case AstImport_1.AstImportKind.StarImport:
                writer.writeLine(`${importPrefix} * as ${collectorEntity.nameForEmit} from '${astImport.modulePath}';`);
                break;
            case AstImport_1.AstImportKind.EqualsImport:
                writer.writeLine(`${importPrefix} ${collectorEntity.nameForEmit} = require('${astImport.modulePath}');`);
                break;
            case AstImport_1.AstImportKind.ImportType:
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
                throw new node_core_library_1.InternalError('Unimplemented AstImportKind');
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
                throw new node_core_library_1.InternalError('referencedEntry.nameForEmit is undefined');
            }
            let typeArgumentsText = '';
            if (node.typeArguments && node.typeArguments.length > 0) {
                // Type arguments have to be processed and written to the document
                const lessThanTokenPos = span.children.findIndex((childSpan) => childSpan.node.kind === ts.SyntaxKind.LessThanToken);
                const greaterThanTokenPos = span.children.findIndex((childSpan) => childSpan.node.kind === ts.SyntaxKind.GreaterThanToken);
                if (lessThanTokenPos < 0 || greaterThanTokenPos <= lessThanTokenPos) {
                    throw new node_core_library_1.InternalError(`Invalid type arguments: ${node.getText()}\n` +
                        SourceFileLocationFormatter_1.SourceFileLocationFormatter.formatDeclaration(node));
                }
                const typeArgumentsSpans = span.children.slice(lessThanTokenPos + 1, greaterThanTokenPos);
                // Apply modifications to Span elements of typeArguments
                typeArgumentsSpans.forEach((childSpan) => {
                    const childAstDeclaration = AstDeclaration_1.AstDeclaration.isSupportedSyntaxKind(childSpan.kind)
                        ? collector.astSymbolTable.getChildAstDeclarationByNode(childSpan.node, astDeclaration)
                        : astDeclaration;
                    modifyNestedSpan(childSpan, childAstDeclaration);
                });
                const typeArgumentsStrings = typeArgumentsSpans.map((childSpan) => childSpan.getModifiedText());
                typeArgumentsText = `<${typeArgumentsStrings.join(', ')}>`;
            }
            const separatorAfter = (_b = (_a = /(\s*)$/.exec(span.getText())) === null || _a === void 0 ? void 0 : _a[1]) !== null && _b !== void 0 ? _b : '';
            if (referencedEntity.astEntity instanceof AstImport_1.AstImport &&
                referencedEntity.astEntity.importKind === AstImport_1.AstImportKind.ImportType &&
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
}
exports.DtsEmitHelpers = DtsEmitHelpers;
//# sourceMappingURL=DtsEmitHelpers.js.map