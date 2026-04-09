import { Documents } from "../operationsInterfaces/index.js";
import { SearchClient } from "../searchClient.js";
import { DocumentsCountOptionalParams, DocumentsCountResponse, DocumentsSearchGetOptionalParams, DocumentsSearchGetResponse, SearchRequest, DocumentsSearchPostOptionalParams, DocumentsSearchPostResponse, DocumentsGetOptionalParams, DocumentsGetResponse, DocumentsSuggestGetOptionalParams, DocumentsSuggestGetResponse, SuggestRequest, DocumentsSuggestPostOptionalParams, DocumentsSuggestPostResponse, IndexBatch, DocumentsIndexOptionalParams, DocumentsIndexResponse, DocumentsAutocompleteGetOptionalParams, DocumentsAutocompleteGetResponse, AutocompleteRequest, DocumentsAutocompletePostOptionalParams, DocumentsAutocompletePostResponse } from "../models/index.js";
/** Class containing Documents operations. */
export declare class DocumentsImpl implements Documents {
    private readonly client;
    /**
     * Initialize a new instance of the class Documents class.
     * @param client Reference to the service client
     */
    constructor(client: SearchClient);
    /**
     * Queries the number of documents in the index.
     * @param options The options parameters.
     */
    count(options?: DocumentsCountOptionalParams): Promise<DocumentsCountResponse>;
    /**
     * Searches for documents in the index.
     * @param options The options parameters.
     */
    searchGet(options?: DocumentsSearchGetOptionalParams): Promise<DocumentsSearchGetResponse>;
    /**
     * Searches for documents in the index.
     * @param searchRequest The definition of the Search request.
     * @param options The options parameters.
     */
    searchPost(searchRequest: SearchRequest, options?: DocumentsSearchPostOptionalParams): Promise<DocumentsSearchPostResponse>;
    /**
     * Retrieves a document from the index.
     * @param key The key of the document to retrieve.
     * @param options The options parameters.
     */
    get(key: string, options?: DocumentsGetOptionalParams): Promise<DocumentsGetResponse>;
    /**
     * Suggests documents in the index that match the given partial query text.
     * @param searchText The search text to use to suggest documents. Must be at least 1 character, and no
     *                   more than 100 characters.
     * @param suggesterName The name of the suggester as specified in the suggesters collection that's part
     *                      of the index definition.
     * @param options The options parameters.
     */
    suggestGet(searchText: string, suggesterName: string, options?: DocumentsSuggestGetOptionalParams): Promise<DocumentsSuggestGetResponse>;
    /**
     * Suggests documents in the index that match the given partial query text.
     * @param suggestRequest The Suggest request.
     * @param options The options parameters.
     */
    suggestPost(suggestRequest: SuggestRequest, options?: DocumentsSuggestPostOptionalParams): Promise<DocumentsSuggestPostResponse>;
    /**
     * Sends a batch of document write actions to the index.
     * @param batch The batch of index actions.
     * @param options The options parameters.
     */
    index(batch: IndexBatch, options?: DocumentsIndexOptionalParams): Promise<DocumentsIndexResponse>;
    /**
     * Autocompletes incomplete query terms based on input text and matching terms in the index.
     * @param searchText The incomplete term which should be auto-completed.
     * @param suggesterName The name of the suggester as specified in the suggesters collection that's part
     *                      of the index definition.
     * @param options The options parameters.
     */
    autocompleteGet(searchText: string, suggesterName: string, options?: DocumentsAutocompleteGetOptionalParams): Promise<DocumentsAutocompleteGetResponse>;
    /**
     * Autocompletes incomplete query terms based on input text and matching terms in the index.
     * @param autocompleteRequest The definition of the Autocomplete request.
     * @param options The options parameters.
     */
    autocompletePost(autocompleteRequest: AutocompleteRequest, options?: DocumentsAutocompletePostOptionalParams): Promise<DocumentsAutocompletePostResponse>;
}
//# sourceMappingURL=documents.d.ts.map