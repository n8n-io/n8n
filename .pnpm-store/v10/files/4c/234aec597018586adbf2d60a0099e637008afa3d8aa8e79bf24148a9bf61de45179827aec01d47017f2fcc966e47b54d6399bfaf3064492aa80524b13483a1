import * as ts from 'typescript';
import { DeclarationReference } from '@microsoft/tsdoc/lib-commonjs/beta/DeclarationReference';
import type { Collector } from '../collector/Collector';
export declare class DeclarationReferenceGenerator {
    static readonly unknownReference: string;
    private _collector;
    constructor(collector: Collector);
    /**
     * Gets the UID for a TypeScript Identifier that references a type.
     */
    getDeclarationReferenceForIdentifier(node: ts.Identifier): DeclarationReference | undefined;
    /**
     * Gets the DeclarationReference for a TypeScript Symbol for a given meaning.
     */
    getDeclarationReferenceForSymbol(symbol: ts.Symbol, meaning: ts.SymbolFlags): DeclarationReference | undefined;
    private static _isInExpressionContext;
    private static _isExternalModuleSymbol;
    private static _isSameSymbol;
    private _getNavigationToSymbol;
    private static _getMeaningOfSymbol;
    private _symbolToDeclarationReference;
    private _getParentReference;
    private _getPackageName;
    private _sourceFileToModuleSource;
}
//# sourceMappingURL=DeclarationReferenceGenerator.d.ts.map