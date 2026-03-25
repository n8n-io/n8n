import { GraphDocument } from "./document.cjs";
import { RoutingControl } from "neo4j-driver";

//#region src/graphs/neo4j_graph.d.ts
type Any = any;
interface Neo4jGraphConfig {
  url: string;
  username: string;
  password: string;
  database?: string;
  timeoutMs?: number;
  enhancedSchema?: boolean;
}
interface StructuredSchema {
  nodeProps: {
    [key: NodeType["labels"]]: NodeType["properties"];
  };
  relProps: {
    [key: RelType["type"]]: RelType["properties"];
  };
  relationships: PathType[];
  metadata?: {
    constraint: Record<string, Any>;
    index: Record<string, Any>;
  };
}
interface AddGraphDocumentsConfig {
  baseEntityLabel?: boolean;
  includeSource?: boolean;
}
type NodeType = {
  labels: string;
  properties: {
    property: string;
    type: string;
  }[];
};
type RelType = {
  type: string;
  properties: {
    property: string;
    type: string;
  }[];
};
type PathType = {
  start: string;
  type: string;
  end: string;
};
declare const BASE_ENTITY_LABEL = "__Entity__";
/**
 * @security *Security note*: Make sure that the database connection uses credentials
 * that are narrowly-scoped to only include necessary permissions.
 * Failure to do so may result in data corruption or loss, since the calling
 * code may attempt commands that would result in deletion, mutation
 * of data if appropriately prompted or reading sensitive data if such
 * data is present in the database.
 * The best way to guard against such negative outcomes is to (as appropriate)
 * limit the permissions granted to the credentials used with this tool.
 * For example, creating read only users for the database is a good way to
 * ensure that the calling code cannot mutate or delete data.
 *
 * @link See https://js.langchain.com/docs/security for more information.
 */
declare class Neo4jGraph {
  private driver;
  private database;
  private timeoutMs;
  private enhancedSchema;
  protected schema: string;
  protected structuredSchema: StructuredSchema;
  constructor({
    url,
    username,
    password,
    database,
    timeoutMs,
    enhancedSchema
  }: Neo4jGraphConfig);
  static initialize(config: Neo4jGraphConfig): Promise<Neo4jGraph>;
  getSchema(): string;
  getStructuredSchema(): StructuredSchema;
  query<RecordShape extends Record<string, Any> = Record<string, Any>>(query: string, params?: Record<string, Any>, routing?: RoutingControl): Promise<RecordShape[]>;
  verifyConnectivity(): Promise<void>;
  refreshSchema(): Promise<void>;
  enhancedSchemaCypher(labelOrType: string, properties: {
    property: string;
    type: string;
  }[], exhaustive: boolean, isRelationship?: boolean): Promise<string>;
  addGraphDocuments(graphDocuments: GraphDocument[], config?: AddGraphDocumentsConfig): Promise<void>;
  close(): Promise<void>;
}
//#endregion
export { AddGraphDocumentsConfig, BASE_ENTITY_LABEL, Neo4jGraph, NodeType, PathType, RelType };
//# sourceMappingURL=neo4j_graph.d.cts.map