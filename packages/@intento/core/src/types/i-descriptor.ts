/**
 * Metadata descriptor for intento agents and suppliers.
 *
 * Provides comprehensive identification and display information for intento
 * agents and suppliers (e.g., translation agents, segmentation suppliers),
 * enabling proper discovery, logging, and documentation in n8n workflows.
 */
export interface IDescriptor {
	/** Unique hierarchical identifier */
	name: string;

	/** Log prefix symbol for visual identification in logs */
	symbol: string;

	/** Associated n8n AI tool identifier */
	tool: string;

	/** Associated n8n node identifier */
	node: string;

	/** Human-readable display name shown in UI */
	displayName: string;

	/** Detailed description of agent/supplier functionality and capabilities */
	description: string;
}
