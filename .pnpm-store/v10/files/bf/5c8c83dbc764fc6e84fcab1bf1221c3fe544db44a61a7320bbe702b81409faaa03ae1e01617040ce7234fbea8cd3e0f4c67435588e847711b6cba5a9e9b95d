const require_rolldown_runtime = require('../_virtual/rolldown_runtime.cjs');
const require_graphs_neo4j_graph = require('./neo4j_graph.cjs');

//#region src/graphs/memgraph_graph.ts
var memgraph_graph_exports = {};
require_rolldown_runtime.__export(memgraph_graph_exports, { MemgraphGraph: () => MemgraphGraph });
const rawSchemaQuery = `
CALL llm_util.schema("raw")
YIELD *
RETURN *
`;
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
var MemgraphGraph = class MemgraphGraph extends require_graphs_neo4j_graph.Neo4jGraph {
	constructor({ url, username, password, database = "memgraph" }) {
		super({
			url,
			username,
			password,
			database
		});
	}
	static async initialize(config) {
		const graph = new MemgraphGraph(config);
		try {
			await graph.verifyConnectivity();
		} catch {
			console.error("Failed to verify connection.");
		}
		try {
			await graph.refreshSchema();
			console.debug("Schema refreshed successfully.");
		} catch (error) {
			throw new Error(error.message);
		}
		return graph;
	}
	async refreshSchema() {
		const rawSchemaQueryResult = await this.query(rawSchemaQuery);
		if (rawSchemaQueryResult?.[0]?.schema) {
			const rawSchema = rawSchemaQueryResult?.[0]?.schema;
			this.structuredSchema = {
				nodeProps: rawSchema.node_props,
				relProps: rawSchema.rel_props,
				relationships: rawSchema.relationships
			};
			const formattedNodeProps = Object.entries(rawSchema.node_props).map(([nodeName, properties]) => {
				const propertiesStr = JSON.stringify(properties);
				return `Node name: '${nodeName}', Node properties: ${propertiesStr}`;
			}).join("\n");
			const formattedRelProps = Object.entries(rawSchema.rel_props).map(([relationshipName, properties]) => {
				const propertiesStr = JSON.stringify(properties);
				return `Relationship name: '${relationshipName}', Relationship properties: ${propertiesStr}`;
			}).join("\n");
			const formattedRels = rawSchema.relationships?.map((el) => `(:${el.start})-[:${el.type}]->(:${el.end})`).join("\n");
			this.schema = [
				"Node properties are the following:",
				formattedNodeProps,
				"Relationship properties are the following:",
				formattedRelProps,
				"The relationships are the following:",
				formattedRels
			].join("\n");
		}
	}
};

//#endregion
exports.MemgraphGraph = MemgraphGraph;
Object.defineProperty(exports, 'memgraph_graph_exports', {
  enumerable: true,
  get: function () {
    return memgraph_graph_exports;
  }
});
//# sourceMappingURL=memgraph_graph.cjs.map