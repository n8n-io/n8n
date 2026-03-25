import { AsyncCaller, AsyncCallerParams } from "@langchain/core/utils/async_caller";
import { DocumentInterface } from "@langchain/core/documents";
import { BaseRetriever, BaseRetrieverInput } from "@langchain/core/retrievers";

//#region src/retrievers/remote/base.d.ts

/**
 * Type for the authentication method used by the RemoteRetriever. It can
 * either be false (no authentication) or an object with a bearer token.
 */
type RemoteRetrieverAuth = false | {
  bearer: string;
};
/**
 * Type for the JSON response values from the remote server.
 */
type RemoteRetrieverValues = Record<string, any>;
/**
 * Interface for the parameters required to initialize a RemoteRetriever
 * instance.
 */
interface RemoteRetrieverParams extends AsyncCallerParams, BaseRetrieverInput {
  /**
   * The URL of the remote retriever server
   */
  url: string;
  /**
   * The authentication method to use, currently implemented is
   * - false: no authentication
   * - { bearer: string }: Bearer token authentication
   */
  auth: RemoteRetrieverAuth;
}
/**
 * Abstract class for interacting with a remote server to retrieve
 * relevant documents based on a given query.
 */
declare abstract class RemoteRetriever extends BaseRetriever implements RemoteRetrieverParams {
  get lc_secrets(): {
    [key: string]: string;
  } | undefined;
  url: string;
  auth: RemoteRetrieverAuth;
  headers: Record<string, string>;
  asyncCaller: AsyncCaller;
  constructor(fields: RemoteRetrieverParams);
  /**
   * Abstract method that should be implemented by subclasses to create the
   * JSON body of the request based on the given query.
   * @param query The query based on which the JSON body of the request is created.
   * @returns The JSON body of the request.
   */
  abstract createJsonBody(query: string): RemoteRetrieverValues;
  /**
   * Abstract method that should be implemented by subclasses to process the
   * JSON response from the server and convert it into an array of Document
   * instances.
   * @param json The JSON response from the server.
   * @returns An array of Document instances.
   */
  abstract processJsonResponse(json: RemoteRetrieverValues): DocumentInterface[];
  _getRelevantDocuments(query: string): Promise<DocumentInterface[]>;
}
//#endregion
export { RemoteRetriever, RemoteRetrieverAuth, RemoteRetrieverParams, RemoteRetrieverValues };
//# sourceMappingURL=base.d.ts.map