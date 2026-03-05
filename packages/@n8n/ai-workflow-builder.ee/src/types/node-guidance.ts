/**
 * Structured guidance for node usage across different agents.
 * Each property maps to a specific agent's needs.
 */
export interface NodeGuidance {
	/** Node identifier (e.g., "@n8n/n8n-nodes-langchain.outputParserStructured") */
	nodeType: string;

	/**
	 * When to use this node - used by Discovery Agent
	 * Describes scenarios/conditions that warrant searching for this node
	 */
	usage: string;

	/**
	 * How to connect this node - used by Builder Agent
	 * Describes connection patterns, source/target relationships
	 */
	connections: string;

	/**
	 * How to configure parameters - used by Builder Agent
	 * Describes parameter settings that affect the node or related nodes
	 */
	configuration: string;

	/**
	 * General recommendations - used by Legacy Agent
	 * High-level guidance about when to prefer this node over alternatives
	 */
	recommendation?: string;
}
