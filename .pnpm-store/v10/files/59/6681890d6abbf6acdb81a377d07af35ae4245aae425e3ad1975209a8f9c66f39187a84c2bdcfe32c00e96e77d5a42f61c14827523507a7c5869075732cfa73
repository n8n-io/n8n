export interface IZepClient {
    baseURL: string;
    headers: any;
    getFullUrl(endpoint: string): string;
}
export interface IAddCollectionParams {
    name: string;
    embeddingDimensions: number;
    description?: string;
    metadata?: Record<string, any>;
    isAutoEmbedded?: boolean;
}
export interface IUpdateCollectionParams {
    name: string;
    description?: string;
    metadata?: Record<string, any>;
}
export interface IUpdateDocumentParams {
    uuid: string;
    documentId: string;
    metadata?: Record<string, any>;
}
export interface ISearchQuery {
    text?: string;
    metadata?: Record<string, any>;
    embedding?: Float32Array;
    searchType?: "similarity" | "mmr";
    mmrLambda?: number;
}
