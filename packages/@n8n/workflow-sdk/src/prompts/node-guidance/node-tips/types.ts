/**
 * Structured guidance for node usage across different agents.
 */
export interface NodeGuidance {
	nodeType: string;
	usage: string;
	connections: string;
	configuration: string;
	recommendation?: string;
}
