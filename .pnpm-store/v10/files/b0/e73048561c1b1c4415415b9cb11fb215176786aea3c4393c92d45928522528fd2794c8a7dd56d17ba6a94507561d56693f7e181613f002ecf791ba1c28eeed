export type RerankerTransformersConfig = {};
export type RerankerCohereConfig = {
    model?: 'rerank-english-v2.0' | 'rerank-multilingual-v2.0' | string;
};
export type RerankerVoyageAIConfig = {
    baseURL?: string;
    model?: 'rerank-lite-1' | string;
};
export type RerankerJinaAIConfig = {
    model?: 'jina-reranker-v2-base-multilingual' | 'jina-reranker-v1-base-en' | 'jina-reranker-v1-turbo-en' | 'jina-reranker-v1-tiny-en' | 'jina-colbert-v1-en' | string;
};
export type RerankerNvidiaConfig = {
    baseURL?: string;
    model?: 'nvidia/rerank-qa-mistral-4b' | string;
};
export type RerankerConfig = RerankerCohereConfig | RerankerJinaAIConfig | RerankerNvidiaConfig | RerankerTransformersConfig | RerankerVoyageAIConfig | Record<string, any> | undefined;
export type Reranker = 'reranker-cohere' | 'reranker-jinaai' | 'reranker-nvidia' | 'reranker-transformers' | 'reranker-voyageai' | 'none' | string;
export type RerankerConfigType<R> = R extends 'reranker-cohere' ? RerankerCohereConfig : R extends 'reranker-jinaai' ? RerankerJinaAIConfig : R extends 'reranker-nvidia' ? RerankerNvidiaConfig : R extends 'reranker-transformers' ? RerankerTransformersConfig : R extends 'reranker-voyageai' ? RerankerVoyageAIConfig : R extends 'none' ? undefined : Record<string, any> | undefined;
