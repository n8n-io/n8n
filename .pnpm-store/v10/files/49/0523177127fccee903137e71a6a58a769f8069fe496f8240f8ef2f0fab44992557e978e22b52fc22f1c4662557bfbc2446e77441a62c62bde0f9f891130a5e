export interface IDocument {
    uuid?: string;
    created_at?: Date;
    updated_at?: Date;
    document_id?: string;
    content: string;
    metadata?: Record<string, any>;
    is_embedded?: boolean;
    embedding?: Float32Array | number[];
    score?: number;
}
export declare class Document implements IDocument {
    uuid?: string;
    created_at?: Date;
    updated_at?: Date;
    document_id?: string;
    content: string;
    metadata?: Record<string, any>;
    is_embedded?: boolean;
    embedding?: Float32Array;
    score?: number;
    constructor({ content, uuid, created_at, updated_at, document_id, metadata, is_embedded, embedding, score, }: {
        content: string;
        uuid?: string;
        created_at?: Date;
        updated_at?: Date;
        document_id?: string;
        metadata?: Record<string, any>;
        is_embedded?: boolean;
        embedding?: Float32Array;
        score?: number;
    });
    toDict(): IDocument;
}
export interface IDocumentCollectionModel {
    uuid?: string;
    created_at?: Date;
    updated_at?: Date;
    name: string;
    description?: string;
    metadata?: Record<string, any>;
    embedding_dimensions?: number;
    is_auto_embedded?: boolean;
    is_indexed?: boolean;
    document_count?: number;
    document_embedded_count?: number;
    is_normalized?: boolean;
}
export declare class DocumentCollectionModel implements IDocumentCollectionModel {
    uuid?: string;
    created_at?: Date;
    updated_at?: Date;
    name: string;
    description?: string;
    metadata?: Record<string, any>;
    embedding_dimensions?: number;
    is_auto_embedded?: boolean;
    is_indexed?: boolean;
    document_count?: number;
    document_embedded_count?: number;
    is_normalized?: boolean;
    constructor({ name, uuid, created_at, updated_at, description, metadata, embedding_dimensions, is_auto_embedded, is_indexed, document_count, document_embedded_count, is_normalized, }: {
        name: string;
        uuid?: string;
        created_at?: Date;
        updated_at?: Date;
        description?: string;
        metadata?: Record<string, any>;
        embedding_dimensions?: number;
        is_auto_embedded?: boolean;
        is_indexed?: boolean;
        document_count?: number;
        document_embedded_count?: number;
        is_normalized?: boolean;
    });
    toDict(): IDocumentCollectionModel;
}
export declare function isGetIDocument(object: any): object is IDocument;
declare function docsToDocsWithFloatArray(documents: IDocument[]): IDocument[];
declare function docsWithFloatArrayToDocs(documents: IDocument[]): IDocument[];
export { docsToDocsWithFloatArray, docsWithFloatArrayToDocs };
