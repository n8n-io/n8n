import {
	AgentSourceCoreConfigSchema,
	type AgentSourceCoreConfig,
	type AgentSourceTool,
} from './agent-source-artifact';

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function canonicalize(value: unknown): unknown {
	if (Array.isArray(value)) return value.map(canonicalize);
	if (!isRecord(value)) return value;

	return Object.fromEntries(
		Object.keys(value)
			.sort()
			.map((key) => [key, canonicalize(value[key])]),
	);
}

function formatValue(value: unknown): string {
	return JSON.stringify(canonicalize(value), null, 2);
}

function formatCall(method: string, args: string[]): string {
	return `.${method}(${args.join(', ')})`
		.split('\n')
		.map((line) => `  ${line}`)
		.join('\n');
}

function hasKeys(value: Record<string, unknown>): boolean {
	return Object.keys(value).length > 0;
}

function isDisabledDefaultMemory(memory: Record<string, unknown>): boolean {
	return formatValue(memory) === formatValue({ enabled: false, storage: 'n8n' });
}

function getWorkflowToolCall(tool: Extract<AgentSourceTool, { type: 'workflow' }>): string {
	const options = {
		...(tool.name !== undefined ? { name: tool.name } : {}),
		...(tool.description !== undefined ? { description: tool.description } : {}),
		...(tool.requireApproval !== undefined ? { requireApproval: tool.requireApproval } : {}),
		...(tool.allOutputs !== undefined ? { allOutputs: tool.allOutputs } : {}),
	};
	const args = [formatValue(tool.workflow)];
	if (hasKeys(options)) args.push(formatValue(options));
	return `workflowTool(${args.join(', ')})`;
}

function getCustomToolCall(tool: Extract<AgentSourceTool, { type: 'custom' }>): string {
	const args = [formatValue(tool.id)];
	if (tool.requireApproval !== undefined) {
		args.push(formatValue({ requireApproval: tool.requireApproval }));
	}
	return `customTool(${args.join(', ')})`;
}

function getNodeToolCall(
	toolConfig: Extract<AgentSourceTool, { type: 'node' }>,
): [toolInstance: string, options: string] {
	const nodeInput = {
		type: toolConfig.node.nodeType,
		version: toolConfig.node.nodeTypeVersion,
		config: {
			parameters: toolConfig.node.nodeParameters,
			...(toolConfig.node.credentials ? { credentials: toolConfig.node.credentials } : {}),
		},
	};
	const options = {
		name: toolConfig.name,
		...(toolConfig.description !== undefined ? { description: toolConfig.description } : {}),
		...(toolConfig.requireApproval !== undefined
			? { requireApproval: toolConfig.requireApproval }
			: {}),
	};
	return [`tool(${formatValue(nodeInput)})`, formatValue(options)];
}

export function generateAgentSource(input: AgentSourceCoreConfig): string {
	const core = AgentSourceCoreConfigSchema.parse(input);
	const usesNodeTool = core.tools.some((toolConfig) => toolConfig.type === 'node');
	const agentImports = ['agent'];
	if (core.tools.some((toolConfig) => toolConfig.type === 'custom'))
		agentImports.push('customTool');
	if (core.skills.length > 0) agentImports.push('skillRef');
	if (core.tools.some((toolConfig) => toolConfig.type === 'workflow'))
		agentImports.push('workflowTool');

	const lines: string[] = [];
	if (usesNodeTool) lines.push("import { tool } from '@n8n/workflow-sdk';");
	lines.push(`import { ${agentImports.join(', ')} } from '@n8n/workflow-sdk/agent';`, '');
	lines.push(`export default agent(${formatValue(core.name)})`);

	if (core.model.trim().length > 0) {
		lines.push(
			formatCall('model', [
				formatValue({
					id: core.model,
					...(core.credential.trim().length > 0 ? { credential: core.credential } : {}),
				}),
			]),
		);
	}
	if (core.instructions.length > 0) {
		lines.push(formatCall('instructions', [formatValue(core.instructions)]));
	}
	if (!isDisabledDefaultMemory(core.memory)) {
		lines.push(formatCall('memory', [formatValue(core.memory)]));
	}

	const { agents, ...subAgentSettings } = core.subAgents;
	if (hasKeys(subAgentSettings)) {
		lines.push(formatCall('subAgentSettings', [formatValue(subAgentSettings)]));
	}
	for (const subAgent of agents) {
		lines.push(formatCall('subAgent', [formatValue(subAgent)]));
	}

	for (const toolConfig of core.tools) {
		switch (toolConfig.type) {
			case 'node': {
				const [toolInstance, options] = getNodeToolCall(toolConfig);
				lines.push(formatCall('tool', [toolInstance, options]));
				break;
			}
			case 'workflow':
				lines.push(formatCall('tool', [getWorkflowToolCall(toolConfig)]));
				break;
			case 'custom':
				lines.push(formatCall('tool', [getCustomToolCall(toolConfig)]));
				break;
		}
	}

	for (const skill of core.skills) {
		lines.push(formatCall('skill', [`skillRef(${formatValue(skill.id)})`]));
	}
	for (const [name, args] of Object.entries(core.providerTools).sort(([a], [b]) =>
		a.localeCompare(b),
	)) {
		lines.push(formatCall('providerTool', [formatValue(name), formatValue(args)]));
	}
	for (const mcpServer of core.mcpServers) {
		lines.push(formatCall('mcpServer', [formatValue(mcpServer)]));
	}
	for (const vectorStore of core.vectorStores) {
		lines.push(formatCall('vectorStore', [formatValue(vectorStore)]));
	}
	if (hasKeys(core.config)) {
		lines.push(formatCall('configuration', [formatValue(core.config)]));
	}

	return `${lines.join('\n')};\n`;
}
