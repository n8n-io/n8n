import { GoogleAbstractedClientOpsMethod, GoogleResponse, GoogleVertexAIConnectionParams } from "../types/googlevertexai-types.cjs";
import { GoogleVertexAIConnection } from "../utils/googlevertexai-connection.cjs";
import { Docstore } from "../stores/doc/base.cjs";
import { AsyncCaller, AsyncCallerCallOptions, AsyncCallerParams } from "@langchain/core/utils/async_caller";
import { Document, DocumentInput } from "@langchain/core/documents";
import { EmbeddingsInterface } from "@langchain/core/embeddings";
import { GoogleAuthOptions } from "google-auth-library";
import { VectorStore } from "@langchain/core/vectorstores";

//#region src/vectorstores/googlevertexai.d.ts

/**
 * Allows us to create IdDocument classes that contain the ID.
 */
interface IdDocumentInput extends DocumentInput {
  id?: string;
}
/**
 * A Document that optionally includes the ID of the document.
 */
declare class IdDocument extends Document implements IdDocumentInput {
  id?: string;
  constructor(fields: IdDocumentInput);
}
interface IndexEndpointConnectionParams extends GoogleVertexAIConnectionParams<GoogleAuthOptions> {
  indexEndpoint: string;
}
interface DeployedIndex {
  id: string;
  index: string;
}
interface IndexEndpointResponse extends GoogleResponse {
  data: {
    deployedIndexes: DeployedIndex[];
    publicEndpointDomainName: string;
  };
}
declare class IndexEndpointConnection extends GoogleVertexAIConnection<AsyncCallerCallOptions, IndexEndpointResponse, GoogleAuthOptions> {
  indexEndpoint: string;
  constructor(fields: IndexEndpointConnectionParams, caller: AsyncCaller);
  buildUrl(): Promise<string>;
  buildMethod(): GoogleAbstractedClientOpsMethod;
  request(options: AsyncCallerCallOptions): Promise<IndexEndpointResponse>;
}
/**
 * Used to represent parameters that are necessary to delete documents
 * from the matching engine. These must be a list of string IDs
 */
interface MatchingEngineDeleteParams {
  ids: string[];
}
interface RemoveDatapointParams extends GoogleVertexAIConnectionParams<GoogleAuthOptions> {
  index: string;
}
interface RemoveDatapointResponse extends GoogleResponse {}
declare class RemoveDatapointConnection extends GoogleVertexAIConnection<AsyncCallerCallOptions, RemoveDatapointResponse, GoogleAuthOptions> {
  index: string;
  constructor(fields: RemoveDatapointParams, caller: AsyncCaller);
  buildUrl(): Promise<string>;
  buildMethod(): GoogleAbstractedClientOpsMethod;
  request(datapointIds: string[], options: AsyncCallerCallOptions): Promise<RemoveDatapointResponse>;
}
interface UpsertDatapointParams extends GoogleVertexAIConnectionParams<GoogleAuthOptions> {
  index: string;
}
interface Restriction {
  namespace: string;
  allowList?: string[];
  denyList?: string[];
}
interface CrowdingTag {
  crowdingAttribute: string;
}
interface IndexDatapoint {
  datapointId: string;
  featureVector: number[];
  restricts?: Restriction[];
  crowdingTag?: CrowdingTag;
}
interface UpsertDatapointResponse extends GoogleResponse {}
declare class UpsertDatapointConnection extends GoogleVertexAIConnection<AsyncCallerCallOptions, UpsertDatapointResponse, GoogleAuthOptions> {
  index: string;
  constructor(fields: UpsertDatapointParams, caller: AsyncCaller);
  buildUrl(): Promise<string>;
  buildMethod(): GoogleAbstractedClientOpsMethod;
  request(datapoints: IndexDatapoint[], options: AsyncCallerCallOptions): Promise<UpsertDatapointResponse>;
}
/**
 * Information about the Matching Engine public API endpoint.
 * Primarily exported to allow for testing.
 */
interface PublicAPIEndpointInfo {
  apiEndpoint?: string;
  deployedIndexId?: string;
}
/**
 * Parameters necessary to configure the Matching Engine.
 */
interface MatchingEngineArgs extends GoogleVertexAIConnectionParams<GoogleAuthOptions>, IndexEndpointConnectionParams, UpsertDatapointParams {
  docstore: Docstore;
  callerParams?: AsyncCallerParams;
  callerOptions?: AsyncCallerCallOptions;
  apiEndpoint?: string;
  deployedIndexId?: string;
}
/**
 * A class that represents a connection to a Google Vertex AI Matching Engine
 * instance.
 */
declare class MatchingEngine extends VectorStore implements MatchingEngineArgs {
  FilterType: Restriction[];
  /**
   * Docstore that retains the document, stored by ID
   */
  docstore: Docstore;
  /**
   * The host to connect to for queries and upserts.
   */
  apiEndpoint: string;
  apiVersion: string;
  endpoint: string;
  location: string;
  /**
   * The id for the index endpoint
   */
  indexEndpoint: string;
  /**
   * The id for the index
   */
  index: string;
  /**
   * Explicitly set Google Auth credentials if you cannot get them from google auth application-default login
   * This is useful for serverless or autoscaling environments like Fargate
   */
  authOptions: GoogleAuthOptions;
  /**
   * The id for the "deployed index", which is an identifier in the
   * index endpoint that references the index (but is not the index id)
   */
  deployedIndexId: string;
  callerParams: AsyncCallerParams;
  callerOptions: AsyncCallerCallOptions;
  caller: AsyncCaller;
  indexEndpointClient: IndexEndpointConnection;
  removeDatapointClient: RemoveDatapointConnection;
  upsertDatapointClient: UpsertDatapointConnection;
  constructor(embeddings: EmbeddingsInterface, args: MatchingEngineArgs);
  _vectorstoreType(): string;
  addDocuments(documents: Document[]): Promise<void>;
  addVectors(vectors: number[][], documents: Document[]): Promise<void>;
  cleanMetadata(documentMetadata: Record<string, any>): {
    [key: string]: string | number | boolean | string[] | null;
  };
  /**
   * Given the metadata from a document, convert it to an array of Restriction
   * objects that may be passed to the Matching Engine and stored.
   * The default implementation flattens any metadata and includes it as
   * an "allowList". Subclasses can choose to convert some of these to
   * "denyList" items or to add additional restrictions (for example, to format
   * dates into a different structure or to add additional restrictions
   * based on the date).
   * @param documentMetadata - The metadata from a document
   * @returns a Restriction[] (or an array of a subclass, from the FilterType)
   */
  metadataToRestrictions(documentMetadata: Record<string, any>): this["FilterType"];
  /**
   * Create an index datapoint for the vector and document id.
   * If an id does not exist, create it and set the document to its value.
   * @param vector
   * @param document
   */
  buildDatapoint(vector: number[], document: IdDocument): IndexDatapoint;
  delete(params: MatchingEngineDeleteParams): Promise<void>;
  similaritySearchVectorWithScore(query: number[], k: number, filter?: this["FilterType"]): Promise<[Document, number][]>;
  /**
   * For this index endpoint, figure out what API Endpoint URL and deployed
   * index ID should be used to do upserts and queries.
   * Also sets the `apiEndpoint` and `deployedIndexId` property for future use.
   * @return The URL
   */
  determinePublicAPIEndpoint(): Promise<PublicAPIEndpointInfo>;
  getPublicAPIEndpoint(): Promise<string>;
  getDeployedIndexId(): Promise<string>;
  static fromTexts(texts: string[], metadatas: object[] | object, embeddings: EmbeddingsInterface, dbConfig: MatchingEngineArgs): Promise<VectorStore>;
  static fromDocuments(docs: Document[], embeddings: EmbeddingsInterface, dbConfig: MatchingEngineArgs): Promise<VectorStore>;
}
//#endregion
export { IdDocument, IdDocumentInput, MatchingEngine, MatchingEngineArgs, MatchingEngineDeleteParams, PublicAPIEndpointInfo, Restriction };
//# sourceMappingURL=googlevertexai.d.cts.map