import { GraphDocument } from "../../graphs/document.js";
import { Document } from "@langchain/core/documents";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { BaseLanguageModel } from "@langchain/core/language_models/base";

//#region src/experimental/graph_transformers/llm.d.ts
declare const SYSTEM_PROMPT = "\n# Knowledge Graph Instructions for GPT-4\n\n## 1. Overview\n\nYou are a top-tier algorithm designed for extracting information in structured formats to build a knowledge graph.\n\nTry to capture as much information from the text as possible without sacrifing accuracy. Do not add any information that is not explicitly mentioned in the text\n\"\n- **Nodes** represent entities and concepts.\n\"\n- The aim is to achieve simplicity and clarity in the knowledge graph, making it\n\naccessible for a vast audience.\n\n## 2. Labeling Nodes\n\n- **Consistency**: Ensure you use available types for node labels.\n\nEnsure you use basic or elementary types for node labels.\n\n- For example, when you identify an entity representing a person, always label it as **'person'**. Avoid using more specific terms like 'mathematician' or 'scientist'\n- **Node IDs**: Never utilize integers as node IDs. Node IDs should be names or human-readable identifiers found in the text.\n\n- **Relationships** represent connections between entities or concepts.\n\nEnsure consistency and generality in relationship types when constructing knowledge graphs. Instead of using specific and momentary types such as 'BECAME_PROFESSOR', use more general and timeless relationship types like 'PROFESSOR'. Make sure to use general and timeless relationship types!\n\n## 3. Coreference Resolution\n\n- **Maintain Entity Consistency**: When extracting entities, it's vital to ensure consistency.\n\nIf an entity, such as \"John Doe\", is mentioned multiple times in the text but is referred to by different names or pronouns (e.g., \"Joe\", \"he\"), always use the most complete identifier for that entity throughout the knowledge graph. In this example, use \"John Doe\" as the entity ID.\n\nRemember, the knowledge graph should be coherent and easily understandable, so maintaining consistency in entity references is crucial.\n\n## 4. Strict Compliance\n\nAdhere to the rules strictly. Non-compliance will result in termination.\n";
interface LLMGraphTransformerProps {
  llm: BaseLanguageModel;
  allowedNodes?: string[];
  allowedRelationships?: string[];
  prompt?: ChatPromptTemplate;
  strictMode?: boolean;
  nodeProperties?: string[];
  relationshipProperties?: string[];
  /**
   * @description
   * The LLM may rarely create relationships without a type, causing extraction to fail.
   * Use this to provide a fallback relationship type in such case.
   */
  fallbackRelationshipType?: string | null;
}
declare class LLMGraphTransformer {
  chain: any;
  allowedNodes: string[];
  allowedRelationships: string[];
  strictMode: boolean;
  nodeProperties: string[];
  relationshipProperties: string[];
  fallbackRelationshipType: string | null;
  constructor({
    llm,
    allowedNodes,
    allowedRelationships,
    prompt,
    strictMode,
    nodeProperties,
    relationshipProperties,
    fallbackRelationshipType
  }: LLMGraphTransformerProps);
  /**
   * Method that processes a single document, transforming it into a graph
   * document using an LLM based on the model's schema and constraints.
   * @param document The document to process.
   * @returns A promise that resolves to a graph document.
   */
  processResponse(document: Document): Promise<GraphDocument>;
  /**
   * Method that converts an array of documents into an array of graph
   * documents using the `processResponse` method.
   * @param documents The array of documents to convert.
   * @returns A promise that resolves to an array of graph documents.
   */
  convertToGraphDocuments(documents: Document[]): Promise<GraphDocument[]>;
}
//#endregion
export { LLMGraphTransformer, LLMGraphTransformerProps, SYSTEM_PROMPT };
//# sourceMappingURL=llm.d.ts.map