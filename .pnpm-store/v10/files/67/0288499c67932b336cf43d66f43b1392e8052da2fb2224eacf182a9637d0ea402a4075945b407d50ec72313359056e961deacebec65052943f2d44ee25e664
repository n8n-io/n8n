"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.context = void 0;
const types_1 = require("./types");
const validateObjectProperties_1 = require("../../utils/validateObjectProperties");
const errors_1 = require("../../errors");
/**
 * Retrieves [the context snippets](https://docs.pinecone.io/guides/assistant/understanding-context-snippets) used
 * by an Assistant during the retrieval process.
 *
 * @example
 * ```typescript
 * import { Pinecone } from '@pinecone-database/pinecone';
 * const pc = new Pinecone();
 * const assistantName = 'test1';
 * const assistant = pc.Assistant(assistantName);
 * const response = await assistant.context({query: "What is the capital of France?"});
 * console.log(response);
 * // {
 * //  snippets: [
 * //    {
 * //      type: 'text',
 * //      content: 'The capital of France is Paris.',
 * //      score: 0.9978925,
 * //      reference: [Object]
 * //    },
 * //  ],
 * //  usage: { promptTokens: 527, completionTokens: 0, totalTokens: 527 }
 * // }
 * ```
 *
 * @param assistantName - The name of the Assistant to retrieve the context snippets from.
 * @param api - The Pinecone API object.
 * @throws An error if a query is not provided.
 * @returns A promise that resolves to a {@link ContextModel} object containing the context snippets.
 */
const context = (assistantName, apiProvider) => {
    return async (options) => {
        validateContextOptions(options);
        const api = await apiProvider.provideData();
        const request = {
            assistantName: assistantName,
            contextRequest: {
                query: options.query,
                filter: options.filter,
            },
        };
        return await api.contextAssistant(request);
    };
};
exports.context = context;
const validateContextOptions = (options) => {
    if (!options || (!options.query && !options.messages)) {
        throw new errors_1.PineconeArgumentError('You must pass an object with required properties (`query`, or `messages`) to retrieve context snippets.');
    }
    (0, validateObjectProperties_1.ValidateObjectProperties)(options, types_1.ContextOptionsType);
};
//# sourceMappingURL=context.js.map