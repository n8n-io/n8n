"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Inference = void 0;
const errors_1 = require("../errors");
/* This class is the class through which users interact with Pinecone's inference API.  */
class Inference {
    constructor(inferenceApi) {
        this._inferenceApi = inferenceApi;
    }
    /* Format the input data into the correct format for the Inference API request. */
    _formatInputs(data) {
        return data.map((str) => {
            return { text: str };
        });
    }
    /* Generate embeddings for a list of input strings using a specified embedding model. */
    async embed(model, inputs, params) {
        const typedAndFormattedInputs = this._formatInputs(inputs);
        if (params && params.inputType) {
            // Rename `inputType` to `input_type`
            params.input_type = params.inputType;
            delete params.inputType;
        }
        const typedRequest = {
            embedRequest: {
                model: model,
                inputs: typedAndFormattedInputs,
                parameters: params,
            },
        };
        return await this._inferenceApi.embed(typedRequest);
    }
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
    async rerank(model, query, documents, options = {}) {
        if (documents.length == 0) {
            throw new errors_1.PineconeArgumentError('You must pass at least one document to rerank');
        }
        if (query.length == 0) {
            throw new errors_1.PineconeArgumentError('You must pass a query to rerank');
        }
        if (model.length == 0) {
            throw new errors_1.PineconeArgumentError('You must pass the name of a supported reranking model in order to rerank' +
                ' documents. See https://docs.pinecone.io/models for supported models.');
        }
        const { topN = documents.length, returnDocuments = true, parameters = {}, } = options;
        let { rankFields = ['text'] } = options;
        // Validate and standardize documents to ensure they are in object format
        const newDocuments = documents.map((doc) => typeof doc === 'string' ? { text: doc } : doc);
        if (!options.rankFields) {
            if (!newDocuments.every((doc) => typeof doc === 'object' && doc.text)) {
                throw new errors_1.PineconeArgumentError('Documents must be a list of strings or objects containing the "text" field');
            }
        }
        if (options.rankFields) {
            rankFields = options.rankFields;
        }
        const req = {
            rerankRequest: {
                model: model,
                query: query,
                documents: newDocuments,
                topN: topN,
                returnDocuments: returnDocuments,
                rankFields: rankFields,
                parameters: parameters,
            },
        };
        return await this._inferenceApi.rerank(req);
    }
}
exports.Inference = Inference;
//# sourceMappingURL=inference.js.map