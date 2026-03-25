import { V2 } from "./api/resources/v2/client/Client";
import { CohereClient } from "./Client";
export declare class CohereClientV2 implements Omit<CohereClient, keyof V2 | "v2">, Pick<V2, keyof V2> {
    private _options;
    constructor(_options: CohereClient.Options);
    private client;
    private clientV2;
    chat: (request: import("./api").V2ChatRequest, requestOptions?: V2.RequestOptions | undefined) => Promise<import("./api").ChatResponse>;
    chatStream: (request: import("./api").V2ChatStreamRequest, requestOptions?: V2.RequestOptions | undefined) => Promise<import("./core").Stream<import("./api").StreamedChatResponseV2>>;
    embed: (request: import("./api").V2EmbedRequest, requestOptions?: V2.RequestOptions | undefined) => Promise<import("./api").EmbedByTypeResponse>;
    rerank: (request: import("./api").V2RerankRequest, requestOptions?: V2.RequestOptions | undefined) => Promise<import("./api").V2RerankResponse>;
    generateStream: (request: import("./api").GenerateStreamRequest, requestOptions?: CohereClient.RequestOptions | undefined) => Promise<import("./core").Stream<import("./api").GenerateStreamedResponse>>;
    generate: (request: import("./api").GenerateRequest, requestOptions?: CohereClient.RequestOptions | undefined) => Promise<import("./api").Generation>;
    classify: (request: import("./api").ClassifyRequest, requestOptions?: CohereClient.RequestOptions | undefined) => Promise<import("./api").ClassifyResponse>;
    summarize: (request: import("./api").SummarizeRequest, requestOptions?: CohereClient.RequestOptions | undefined) => Promise<import("./api").SummarizeResponse>;
    tokenize: (request: import("./api").TokenizeRequest, requestOptions?: CohereClient.RequestOptions | undefined) => Promise<import("./api").TokenizeResponse>;
    detokenize: (request: import("./api").DetokenizeRequest, requestOptions?: CohereClient.RequestOptions | undefined) => Promise<import("./api").DetokenizeResponse>;
    checkApiKey: (requestOptions?: CohereClient.RequestOptions | undefined) => Promise<import("./api").CheckApiKeyResponse>;
    embedJobs: import("./api/resources/embedJobs/client/Client").EmbedJobs;
    datasets: import("./api/resources/datasets/client/Client").Datasets;
    connectors: import("./api/resources/connectors/client/Client").Connectors;
    models: import("./api/resources/models/client/Client").Models;
    finetuning: import("./api/resources/finetuning/client/Client").Finetuning;
}
