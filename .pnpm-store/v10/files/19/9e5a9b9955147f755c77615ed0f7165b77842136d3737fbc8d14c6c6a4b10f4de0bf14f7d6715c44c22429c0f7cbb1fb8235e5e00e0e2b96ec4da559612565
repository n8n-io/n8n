import { ApiDocumentedItem, type IApiDocumentedItemJson, type IApiDocumentedItemOptions } from './ApiDocumentedItem';
import { Excerpt, ExcerptToken, type IExcerptTokenRange, type IExcerptToken } from '../mixins/Excerpt';
import type { DeserializerContext } from '../model/DeserializerContext';
import { SourceLocation } from '../model/SourceLocation';
/**
 * Constructor options for {@link ApiDeclaredItem}.
 * @public
 */
export interface IApiDeclaredItemOptions extends IApiDocumentedItemOptions {
    excerptTokens: IExcerptToken[];
    fileUrlPath?: string;
}
export interface IApiDeclaredItemJson extends IApiDocumentedItemJson {
    excerptTokens: IExcerptToken[];
    fileUrlPath?: string;
}
/**
 * The base class for API items that have an associated source code excerpt containing a TypeScript declaration.
 *
 * @remarks
 *
 * This is part of the {@link ApiModel} hierarchy of classes, which are serializable representations of
 * API declarations.
 *
 * Most `ApiItem` subclasses have declarations and thus extend `ApiDeclaredItem`.  Counterexamples include
 * `ApiModel` and `ApiPackage`, which do not have any corresponding TypeScript source code.
 *
 * @public
 */
export declare class ApiDeclaredItem extends ApiDocumentedItem {
    private _excerptTokens;
    private _excerpt;
    private _fileUrlPath?;
    private _sourceLocation?;
    constructor(options: IApiDeclaredItemOptions);
    /** @override */
    static onDeserializeInto(options: Partial<IApiDeclaredItemOptions>, context: DeserializerContext, jsonObject: IApiDeclaredItemJson): void;
    /**
     * The source code excerpt where the API item is declared.
     */
    get excerpt(): Excerpt;
    /**
     * The individual source code tokens that comprise the main excerpt.
     */
    get excerptTokens(): ReadonlyArray<ExcerptToken>;
    /**
     * The file URL path relative to the `projectFolder` and `projectFolderURL` fields
     * as defined in the `api-extractor.json` config. Is `undefined` if the path is
     * the same as the parent API item's.
     */
    get fileUrlPath(): string | undefined;
    /**
     * Returns the source location where the API item is declared.
     */
    get sourceLocation(): SourceLocation;
    /**
     * If the API item has certain important modifier tags such as `@sealed`, `@virtual`, or `@override`,
     * this prepends them as a doc comment above the excerpt.
     */
    getExcerptWithModifiers(): string;
    /** @override */
    serializeInto(jsonObject: Partial<IApiDeclaredItemJson>): void;
    /**
     * Constructs a new {@link Excerpt} corresponding to the provided token range.
     */
    buildExcerpt(tokenRange: IExcerptTokenRange): Excerpt;
    /**
     * Builds the cached object used by the `sourceLocation` property.
     */
    private _buildSourceLocation;
}
//# sourceMappingURL=ApiDeclaredItem.d.ts.map