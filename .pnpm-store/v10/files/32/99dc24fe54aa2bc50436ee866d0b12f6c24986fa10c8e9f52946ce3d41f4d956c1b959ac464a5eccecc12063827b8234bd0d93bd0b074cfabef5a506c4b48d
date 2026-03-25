import { EmbeddingsList, EmbedRequestInputsInner, InferenceApi, RerankResult } from '../pinecone-generated-ts-fetch/inference';
/** Options one can send with a request to {@link rerank} *
 *
 * @param topN - The number of documents to return in the response. Default is the number of documents passed in the
 * request.
 * @param returnDocuments - Whether to return the documents in the response. Default is `true`.
 * @param rankFields - The fields by which to rank the documents. If no field is passed, default is `['text']`.
 * Note: some models only support 1 reranking field. See the [model documentation](https://docs.pinecone.io/guides/inference/understanding-inference#rerank) for more information.
 * @param parameters - Additional model-specific parameters to send with the request, e.g. {truncate: "END"}.
 * */
export interface RerankOptions {
    topN?: number;
    returnDocuments?: boolean;
    rankFields?: Array<string>;
    parameters?: {
        [key: string]: string;
    };
}
export declare class Inference {
    _inferenceApi: InferenceApi;
    constructor(inferenceApi: InferenceApi);
    _formatInputs(data: Array<string>): Array<EmbedRequestInputsInner>;
    embed(model: string, inputs: Array<string>, params: Record<string, string>): Promise<EmbeddingsList>;
    /** Rerank documents against a query with a reranking model. Each document is ranked in descending relevance order
     *  against the query provided.
     *
     *  @example
     *  ````typescript
     *  import { Pinecone } from '@pinecone-database/pinecone';
     *  const pc = new Pinecone();
     *  const rerankingModel = 'bge-reranker-v2-m3';
     *  const myQuery = 'What are some good Turkey dishes for Thanksgiving?';
     *
     *  // Option 1: Documents as an array of strings
     *  const myDocsStrings = [
     *    'I love turkey sandwiches with pastrami',
     *    'A lemon brined Turkey with apple sausage stuffing is a classic Thanksgiving main',
     *    'My favorite Thanksgiving dish is pumpkin pie',
     *    'Turkey is a great source of protein',
     *  ];
     *
     *  // Option 1 response
     *  const response = await pc.inference.rerank(
     *    rerankingModel,
     *    myQuery,
     *    myDocsStrings
     *  );
     *  console.log(response);
     *  // {
     *  // model: 'bge-reranker-v2-m3',
     *  // data: [
     *  //   { index: 1, score: 0.5633179, document: [Object] },
     *  //   { index: 2, score: 0.02013874, document: [Object] },
     *  //   { index: 3, score: 0.00035419367, document: [Object] },
     *  //   { index: 0, score: 0.00021485926, document: [Object] }
     *  // ],
     *  // usage: { rerankUnits: 1 }
     *  // }
     *
     *  // Option 2: Documents as an array of objects
     *  const myDocsObjs = [
     *    {
     *      title: 'Turkey Sandwiches',
     *      body: 'I love turkey sandwiches with pastrami',
     *    },
     *    {
     *      title: 'Lemon Turkey',
     *      body: 'A lemon brined Turkey with apple sausage stuffing is a classic Thanksgiving main',
     *    },
     *    {
     *      title: 'Thanksgiving',
     *      body: 'My favorite Thanksgiving dish is pumpkin pie',
     *    },
     *    { title: 'Protein Sources', body: 'Turkey is a great source of protein' },
     *  ];
     *
     *  // Option 2: Options object declaring which custom key to rerank on
     *  // Note: If no custom key is passed via `rankFields`, each doc must contain a `text` key, and that will act as
     *   the default)
     *  const rerankOptions = {
     *    topN: 3,
     *    returnDocuments: false,
     *    rankFields: ['body'],
     *    parameters: {
     *      inputType: 'passage',
     *      truncate: 'END',
     *    },
     *  };
     *
     *  // Option 2 response
     *  const response = await pc.inference.rerank(
     *    rerankingModel,
     *    myQuery,
     *    myDocsObjs,
     *    rerankOptions
     *  );
     *  console.log(response);
     *  // {
     *  // model: 'bge-reranker-v2-m3',
     *  // data: [
     *  //   { index: 1, score: 0.5633179, document: undefined },
     *  //   { index: 2, score: 0.02013874, document: undefined },
     *  //   { index: 3, score: 0.00035419367, document: undefined },
     *  // ],
     *  // usage: { rerankUnits: 1 }
     *  //}
     * ```
     *
     * @param model - (Required) The model to use for reranking. Currently, the only available model is "[bge-reranker-v2-m3](https://docs.pinecone.io/models/bge-reranker-v2-m3)"}.
     * @param query - (Required) The query to rerank documents against.
     * @param documents - (Required) An array of documents to rerank. The array can either be an array of strings or
     * an array of objects.
     * @param options - (Optional) Additional options to send with the reranking request. See {@link RerankOptions} for more details.
     * */
    rerank(model: string, query: string, documents: Array<{
        [key: string]: string;
    } | string>, options?: RerankOptions): Promise<RerankResult>;
}
