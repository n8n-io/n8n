import { __export } from "../../_virtual/rolldown_runtime.js";
import { GraphDocument, Node, Relationship } from "../../graphs/document.js";
import { toJsonSchema } from "@langchain/core/utils/json_schema";
import { z } from "zod/v3";
import { ChatPromptTemplate } from "@langchain/core/prompts";

//#region src/experimental/graph_transformers/llm.ts
var llm_exports = {};
__export(llm_exports, {
	LLMGraphTransformer: () => LLMGraphTransformer,
	SYSTEM_PROMPT: () => SYSTEM_PROMPT
});
const SYSTEM_PROMPT = `
# Knowledge Graph Instructions for GPT-4\n
## 1. Overview\n
You are a top-tier algorithm designed for extracting information in structured formats to build a knowledge graph.\n
Try to capture as much information from the text as possible without sacrifing accuracy. Do not add any information that is not explicitly mentioned in the text\n"
- **Nodes** represent entities and concepts.\n"
- The aim is to achieve simplicity and clarity in the knowledge graph, making it\n
accessible for a vast audience.\n
## 2. Labeling Nodes\n
- **Consistency**: Ensure you use available types for node labels.\n
Ensure you use basic or elementary types for node labels.\n
- For example, when you identify an entity representing a person, always label it as **'person'**. Avoid using more specific terms like 'mathematician' or 'scientist'
- **Node IDs**: Never utilize integers as node IDs. Node IDs should be names or human-readable identifiers found in the text.\n
- **Relationships** represent connections between entities or concepts.\n
Ensure consistency and generality in relationship types when constructing knowledge graphs. Instead of using specific and momentary types such as 'BECAME_PROFESSOR', use more general and timeless relationship types like 'PROFESSOR'. Make sure to use general and timeless relationship types!\n
## 3. Coreference Resolution\n
- **Maintain Entity Consistency**: When extracting entities, it's vital to ensure consistency.\n
If an entity, such as "John Doe", is mentioned multiple times in the text but is referred to by different names or pronouns (e.g., "Joe", "he"), always use the most complete identifier for that entity throughout the knowledge graph. In this example, use "John Doe" as the entity ID.\n
Remember, the knowledge graph should be coherent and easily understandable, so maintaining consistency in entity references is crucial.\n
## 4. Strict Compliance\n
Adhere to the rules strictly. Non-compliance will result in termination.
`;
const DEFAULT_PROMPT = /* @__PURE__ */ ChatPromptTemplate.fromMessages([["system", SYSTEM_PROMPT], ["human", "Tip: Make sure to answer in the correct format and do not include any explanations. Use the given format to extract information from the following input: {input}"]]);
function toTitleCase(str) {
	return str.split(" ").map((w) => w[0].toUpperCase() + w.substring(1).toLowerCase()).join("");
}
function createOptionalEnumType({ enumValues = void 0, description = "", isRel = false }) {
	let schema;
	if (enumValues && enumValues.length) schema = z.enum(enumValues).describe(`${description} Available options are: ${enumValues.join(", ")}.`);
	else {
		const nodeInfo = "Ensure you use basic or elementary types for node labels.\nFor example, when you identify an entity representing a person, always label it as **'Person'**. Avoid using more specific terms like 'Mathematician' or 'Scientist'";
		const relInfo = "Instead of using specific and momentary types such as 'BECAME_PROFESSOR', use more general and timeless relationship types like 'PROFESSOR'. However, do not sacrifice any accuracy for generality";
		const additionalInfo = isRel ? relInfo : nodeInfo;
		schema = z.string().describe(description + additionalInfo);
	}
	return schema;
}
function createNodeSchema(allowedNodes, nodeProperties) {
	const nodeSchema = z.object({
		id: z.string(),
		type: createOptionalEnumType({
			enumValues: allowedNodes,
			description: "The type or label of the node."
		})
	});
	return nodeProperties.length > 0 ? nodeSchema.extend({ properties: z.array(z.object({
		key: createOptionalEnumType({
			enumValues: nodeProperties,
			description: "Property key."
		}),
		value: z.string().describe("Extracted value.")
	})).describe(`List of node properties`) }) : nodeSchema;
}
function createRelationshipSchema(allowedNodes, allowedRelationships, relationshipProperties) {
	const relationshipSchema = z.object({
		sourceNodeId: z.string(),
		sourceNodeType: createOptionalEnumType({
			enumValues: allowedNodes,
			description: "The source node of the relationship."
		}),
		relationshipType: createOptionalEnumType({
			enumValues: allowedRelationships,
			description: "The type of the relationship.",
			isRel: true
		}),
		targetNodeId: z.string(),
		targetNodeType: createOptionalEnumType({
			enumValues: allowedNodes,
			description: "The target node of the relationship."
		})
	});
	return relationshipProperties.length > 0 ? relationshipSchema.extend({ properties: z.array(z.object({
		key: createOptionalEnumType({
			enumValues: relationshipProperties,
			description: "Property key."
		}),
		value: z.string().describe("Extracted value.")
	})).describe(`List of relationship properties`) }) : relationshipSchema;
}
function createSchema(allowedNodes, allowedRelationships, nodeProperties, relationshipProperties) {
	const nodeSchema = createNodeSchema(allowedNodes, nodeProperties);
	const relationshipSchema = createRelationshipSchema(allowedNodes, allowedRelationships, relationshipProperties);
	const dynamicGraphSchema = z.object({
		nodes: z.array(nodeSchema).describe("List of nodes"),
		relationships: z.array(relationshipSchema).describe("List of relationships.")
	});
	return dynamicGraphSchema;
}
function convertPropertiesToRecord(properties) {
	return properties.reduce((accumulator, prop) => {
		accumulator[prop.key] = prop.value;
		return accumulator;
	}, {});
}
function mapToBaseNode(node) {
	return new Node({
		id: node.id,
		type: node.type ? toTitleCase(node.type) : "",
		properties: node.properties ? convertPropertiesToRecord(node.properties) : {}
	});
}
function mapToBaseRelationship({ fallbackRelationshipType }) {
	return function(relationship) {
		return new Relationship({
			source: new Node({
				id: relationship.sourceNodeId,
				type: relationship.sourceNodeType ? toTitleCase(relationship.sourceNodeType) : ""
			}),
			target: new Node({
				id: relationship.targetNodeId,
				type: relationship.targetNodeType ? toTitleCase(relationship.targetNodeType) : ""
			}),
			type: (relationship.relationshipType || fallbackRelationshipType).replace(" ", "_").toUpperCase(),
			properties: relationship.properties ? convertPropertiesToRecord(relationship.properties) : {}
		});
	};
}
var LLMGraphTransformer = class {
	chain;
	allowedNodes = [];
	allowedRelationships = [];
	strictMode;
	nodeProperties;
	relationshipProperties;
	fallbackRelationshipType = null;
	constructor({ llm, allowedNodes = [], allowedRelationships = [], prompt = DEFAULT_PROMPT, strictMode = true, nodeProperties = [], relationshipProperties = [], fallbackRelationshipType = null }) {
		if (typeof llm.withStructuredOutput !== "function") throw new Error("The specified LLM does not support the 'withStructuredOutput'. Please ensure you are using an LLM that supports this feature.");
		this.allowedNodes = allowedNodes;
		this.allowedRelationships = allowedRelationships;
		this.strictMode = strictMode;
		this.nodeProperties = nodeProperties;
		this.relationshipProperties = relationshipProperties;
		this.fallbackRelationshipType = fallbackRelationshipType;
		const schema = createSchema(allowedNodes, allowedRelationships, nodeProperties, relationshipProperties);
		const structuredLLM = llm.withStructuredOutput(toJsonSchema(schema));
		this.chain = prompt.pipe(structuredLLM);
	}
	/**
	* Method that processes a single document, transforming it into a graph
	* document using an LLM based on the model's schema and constraints.
	* @param document The document to process.
	* @returns A promise that resolves to a graph document.
	*/
	async processResponse(document) {
		const text = document.pageContent;
		const rawSchema = await this.chain.invoke({ input: text });
		let nodes = [];
		if (rawSchema?.nodes) nodes = rawSchema.nodes.map(mapToBaseNode);
		let relationships = [];
		if (rawSchema?.relationships) relationships = rawSchema.relationships.map(mapToBaseRelationship({ fallbackRelationshipType: this.fallbackRelationshipType }));
		if (this.strictMode && (this.allowedNodes.length > 0 || this.allowedRelationships.length > 0)) {
			if (this.allowedNodes.length > 0) {
				const allowedNodesLowerCase = this.allowedNodes.map((node) => node.toLowerCase());
				nodes = nodes.filter((node) => allowedNodesLowerCase.includes(node.type.toLowerCase()));
				relationships = relationships.filter((rel) => allowedNodesLowerCase.includes(rel.source.type.toLowerCase()) && allowedNodesLowerCase.includes(rel.target.type.toLowerCase()));
			}
			if (this.allowedRelationships.length > 0) relationships = relationships.filter((rel) => this.allowedRelationships.map((rel$1) => rel$1.toLowerCase()).includes(rel.type.toLowerCase()));
		}
		return new GraphDocument({
			nodes,
			relationships,
			source: document
		});
	}
	/**
	* Method that converts an array of documents into an array of graph
	* documents using the `processResponse` method.
	* @param documents The array of documents to convert.
	* @returns A promise that resolves to an array of graph documents.
	*/
	async convertToGraphDocuments(documents) {
		const results = [];
		for (const document of documents) {
			const graphDocument = await this.processResponse(document);
			results.push(graphDocument);
		}
		return results;
	}
};

//#endregion
export { LLMGraphTransformer, SYSTEM_PROMPT, llm_exports };
//# sourceMappingURL=llm.js.map