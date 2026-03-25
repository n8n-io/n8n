import { Neo4jGraph } from "./neo4j_graph.js";

//#region src/graphs/memgraph_graph.d.ts
interface MemgraphGraphConfig {
  url: string;
  username: string;
  password: string;
  database?: string;
}
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
declare class MemgraphGraph extends Neo4jGraph {
  constructor({
    url,
    username,
    password,
    database
  }: MemgraphGraphConfig);
  static initialize(config: MemgraphGraphConfig): Promise<MemgraphGraph>;
  refreshSchema(): Promise<void>;
}
//#endregion
export { MemgraphGraph };
//# sourceMappingURL=memgraph_graph.d.ts.map