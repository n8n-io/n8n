import * as ts from 'typescript';
import { type IExcerptToken, type IExcerptTokenRange } from '@microsoft/api-extractor-model';
import type { DeclarationReferenceGenerator } from './DeclarationReferenceGenerator';
import type { AstDeclaration } from '../analyzer/AstDeclaration';
/**
 * Used to provide ExcerptBuilder with a list of nodes whose token range we want to capture.
 */
export interface IExcerptBuilderNodeTransform {
    /**
     * The node to process
     */
    node: ts.Node;
    /**
     * A token range whose startIndex/endIndex will be overwritten with the indexes for the
     * tokens corresponding to IExcerptBuilderNodeTransform.node
     */
    captureTokenRange?: IExcerptTokenRange;
    /**
     * Text that will replace the text of the given node during emit.
     */
    replacementText?: string;
}
export declare class ExcerptBuilder {
    /**
     * Appends a blank line to the `excerptTokens` list.
     * @param excerptTokens - The target token list to append to
     */
    static addBlankLine(excerptTokens: IExcerptToken[]): void;
    /**
     * Appends the signature for the specified `AstDeclaration` to the `excerptTokens` list.
     * @param excerptTokens - The target token list to append to
     * @param nodeTransforms - A list of child nodes whose token ranges we want to capture
     */
    static addDeclaration(excerptTokens: IExcerptToken[], astDeclaration: AstDeclaration, nodeTransforms: IExcerptBuilderNodeTransform[], referenceGenerator: DeclarationReferenceGenerator): void;
    static createEmptyTokenRange(): IExcerptTokenRange;
    /** @returns false if we encountered a token that causes iteration to stop. */
    private static _buildSpan;
    private static _appendToken;
    /**
     * Condenses the provided excerpt tokens by merging tokens where possible. Updates the provided token ranges to
     * remain accurate after token merging.
     *
     * @remarks
     * For example, suppose we have excerpt tokens ["A", "B", "C"] and a token range [0, 2]. If the excerpt tokens
     * are condensed to ["AB", "C"], then the token range would be updated to [0, 1]. Note that merges are only
     * performed if they are compatible with the provided token ranges. In the example above, if our token range was
     * originally [0, 1], we would not be able to merge tokens "A" and "B".
     */
    private static _condenseTokens;
    private static _isDeclarationName;
    private static _isDeclaration;
}
//# sourceMappingURL=ExcerptBuilder.d.ts.map