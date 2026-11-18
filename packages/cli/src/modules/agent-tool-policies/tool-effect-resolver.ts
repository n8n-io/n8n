import { classifyMcpTool } from '@n8n/ai-utilities/agent-config';
import type { ToolPolicyToolEffect } from '@n8n/api-types';
import type { PolicedTool } from '@n8n/decorators';
import { Service } from '@n8n/di';
import {
	isINodePropertiesList,
	isINodePropertyCollectionList,
	isINodePropertyOptionsList,
	resolveNodeAnnotations,
	type INodeParameters,
	type INodeProperties,
	type INodeTypeDescription,
} from 'n8n-workflow';

import { resolveToolNodeType } from '@/node-execution/resolve-tool-node-type';
import { NodeTypes } from '@/node-types';

/**
 * `resolveNodeAnnotations` answers `write` for a node that says nothing about its operations.
 * So an answer counts only for a node type that has an annotation somewhere.
 */
function hasAnnotations(properties: INodeProperties[]): boolean {
	return properties.some(({ options }) => {
		if (isINodePropertyOptionsList(options)) return options.some((option) => option.annotations);
		if (isINodePropertiesList(options)) return hasAnnotations(options);
		if (isINodePropertyCollectionList(options)) {
			return options.some((group) => hasAnnotations(group.values));
		}
		return false;
	});
}

const isParameters = (value: unknown): value is INodeParameters =>
	typeof value === 'object' && value !== null && !Array.isArray(value);

/**
 * Says whether one tool call reads or writes. A node tool has one operation, which is fixed in
 * the config of the agent, so the answer comes from the annotations of the node type. An MCP
 * tool is one operation, so the answer comes from its annotations and its name.
 *
 * An MCP server writes its own annotations, so a server can call a tool that writes a tool
 * that reads. The tool then counts as one that reads.
 */
@Service()
export class ToolEffectResolver {
	constructor(private readonly nodeTypes: NodeTypes) {}

	/** `undefined` when nothing says what the operation of the tool does. */
	effectOf(tool: PolicedTool): ToolPolicyToolEffect | undefined {
		if (tool.mcpServerName !== undefined) {
			if (tool.mcpToolName === undefined) return undefined;
			return classifyMcpTool({ name: tool.mcpToolName, annotations: tool.mcpAnnotations });
		}

		const { kind, nodeType, nodeTypeVersion, nodeParameters } = tool.metadata ?? {};
		if (kind !== 'node' || typeof nodeType !== 'string' || typeof nodeTypeVersion !== 'number') {
			return undefined;
		}
		const description = this.findDescription(nodeType, nodeTypeVersion);
		if (!description) return undefined;
		if (description.annotations === undefined && !hasAnnotations(description.properties)) {
			return undefined;
		}

		return resolveNodeAnnotations(description, {
			parameters: isParameters(nodeParameters) ? nodeParameters : {},
			typeVersion: nodeTypeVersion,
		}).effect;
	}

	/** The description of the type that the tool runs as, which is its tool variant when one exists. */
	private findDescription(nodeType: string, version: number): INodeTypeDescription | undefined {
		try {
			const runsAs = resolveToolNodeType(nodeType, version);
			return this.nodeTypes.getByNameAndVersion(runsAs, version).description;
		} catch {
			return undefined;
		}
	}
}
