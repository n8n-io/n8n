/**
 * Code generator for creating TypeScript SDK code from workflow JSON.
 */
import type { WorkflowJSON, NodeJSON, IConnection } from './types/base';

// AI connection types and their corresponding subnode factory functions
const AI_CONNECTION_TYPES = new Map<string, { factory: string; configKey: string }>([
	['ai_languageModel', { factory: 'languageModel', configKey: 'model' }],
	['ai_memory', { factory: 'memory', configKey: 'memory' }],
	['ai_tool', { factory: 'tool', configKey: 'tools' }],
	['ai_outputParser', { factory: 'outputParser', configKey: 'outputParser' }],
	['ai_embedding', { factory: 'embedding', configKey: 'embedding' }],
	['ai_vectorStore', { factory: 'vectorStore', configKey: 'vectorStore' }],
	['ai_retriever', { factory: 'retriever', configKey: 'retriever' }],
	['ai_document', { factory: 'documentLoader', configKey: 'documentLoader' }],
	['ai_textSplitter', { factory: 'textSplitter', configKey: 'textSplitter' }],
]);

/**
 * Escapes a string for use in a single-quoted TypeScript string literal.
 * Returns empty string if input is null/undefined.
 */
function escapeString(str: string | null | undefined): string {
	if (str == null) return '';
	return str
		.replace(/\\/g, '\\\\')
		.replace(/'/g, "\\'")
		.replace(/\n/g, '\\n')
		.replace(/\r/g, '\\r');
}

/**
 * Generate the default node name from a type string.
 * This must match the logic in node-builder.ts generateNodeName().
 */
function generateDefaultNodeName(type: string): string {
	// Extract the node name after the package prefix
	const parts = type.split('.');
	const nodeName = parts[parts.length - 1];

	// Convert camelCase/PascalCase to Title Case with spaces
	return nodeName
		.replace(/([a-z])([A-Z])/g, '$1 $2') // Insert space before capitals
		.replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2') // Handle consecutive capitals
		.replace(/^./, (str) => str.toUpperCase()) // Capitalize first letter
		.replace(/Http/g, 'HTTP') // Fix common acronyms
		.replace(/Api/g, 'API')
		.replace(/Url/g, 'URL')
		.replace(/Id/g, 'ID')
		.replace(/Json/g, 'JSON')
		.replace(/Xml/g, 'XML')
		.replace(/Sql/g, 'SQL')
		.replace(/Ai/g, 'AI')
		.replace(/Aws/g, 'AWS')
		.replace(/Gcp/g, 'GCP')
		.replace(/Ssh/g, 'SSH')
		.replace(/Ftp/g, 'FTP')
		.replace(/Csv/g, 'CSV');
}

/**
 * Formats a value as TypeScript code.
 */
function formatValue(value: unknown, indent: number = 0): string {
	const spaces = '  '.repeat(indent);
	const nextSpaces = '  '.repeat(indent + 1);

	if (value === null) return 'null';
	if (value === undefined) return 'undefined';
	if (typeof value === 'string') return `'${escapeString(value)}'`;
	if (typeof value === 'number' || typeof value === 'boolean') return String(value);

	if (Array.isArray(value)) {
		if (value.length === 0) return '[]';
		const items = value.map((v) => formatValue(v, indent + 1));
		if (items.join(', ').length < 60 && !items.some((i) => i.includes('\n'))) {
			return `[${items.join(', ')}]`;
		}
		return `[\n${nextSpaces}${items.join(`,\n${nextSpaces}`)}\n${spaces}]`;
	}

	if (typeof value === 'object') {
		const entries = Object.entries(value);
		if (entries.length === 0) return '{}';

		const formatted = entries.map(([k, v]) => {
			const key = /^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(k) ? k : `'${escapeString(k)}'`;
			return `${key}: ${formatValue(v, indent + 1)}`;
		});

		if (formatted.join(', ').length < 60 && !formatted.some((f) => f.includes('\n'))) {
			return `{ ${formatted.join(', ')} }`;
		}
		return `{\n${nextSpaces}${formatted.join(`,\n${nextSpaces}`)}\n${spaces}}`;
	}

	return String(value);
}

/**
 * Determines if a node is a trigger node.
 */
function isTriggerNode(node: NodeJSON): boolean {
	const type = node.type.toLowerCase();
	// Check for explicit trigger types
	if (type.includes('trigger') || type === 'n8n-nodes-base.start') {
		return true;
	}
	// Webhook is a trigger, but respondToWebhook is an action node
	if (type === 'n8n-nodes-base.webhook') {
		return true;
	}
	return false;
}

/**
 * Determines if a node is a sticky note.
 */
function isStickyNote(node: NodeJSON): boolean {
	return node.type === 'n8n-nodes-base.stickyNote';
}

interface SubnodeConnection {
	/** The subnode (source of AI connection) */
	subnodeName: string;
	/** The AI connection type (e.g., 'ai_languageModel') */
	connectionType: string;
}

interface NodeInfo {
	node: NodeJSON;
	varName: string;
	incomingConnections: { from: string; outputIndex: number; inputIndex: number }[];
	outgoingConnections: Map<number, { to: string; inputIndex: number }[]>;
	/** Subnodes connected to this node via AI connections */
	subnodes: SubnodeConnection[];
	/** If this node is a subnode, the parent node name */
	isSubnodeOf?: string;
	/** If this node is a subnode, the AI connection type */
	subnodeConnectionType?: string;
}

/**
 * Generates TypeScript SDK code from a workflow JSON.
 */
export function generateWorkflowCode(json: WorkflowJSON): string {
	const lines: string[] = [];

	// Build node info map
	const nodeInfoMap = new Map<string, NodeInfo>();
	const nodesByName = new Map<string, NodeJSON>();
	let unnamedCounter = 0;

	for (const nodeJson of json.nodes) {
		// Use node name, falling back to id or generated name for nodes without names
		const nodeName = nodeJson.name ?? nodeJson.id ?? `__unnamed_${unnamedCounter++}`;
		nodesByName.set(nodeName, nodeJson);
		nodeInfoMap.set(nodeName, {
			node: { ...nodeJson, name: nodeName }, // Ensure name is set
			varName: generateVarName(nodeName),
			incomingConnections: [],
			outgoingConnections: new Map(),
			subnodes: [],
		});
	}

	// Parse connections (both main and AI connections)
	for (const [sourceName, connectionTypes] of Object.entries(json.connections)) {
		const sourceInfo = nodeInfoMap.get(sourceName);
		if (!sourceInfo) continue;

		for (const [connType, outputs] of Object.entries(connectionTypes)) {
			if (!Array.isArray(outputs)) continue;

			// Check if this is an AI connection type
			const isAiConnection = AI_CONNECTION_TYPES.has(connType);

			outputs.forEach((targets: IConnection[] | null, outputIndex: number) => {
				if (!Array.isArray(targets)) return;

				for (const target of targets) {
					const targetInfo = nodeInfoMap.get(target.node);
					if (!targetInfo) continue;

					if (isAiConnection) {
						// This is an AI connection - mark source as subnode of target
						sourceInfo.isSubnodeOf = target.node;
						sourceInfo.subnodeConnectionType = connType;

						// Add to target's subnodes list
						targetInfo.subnodes.push({
							subnodeName: sourceName,
							connectionType: connType,
						});
					} else {
						// Regular 'main' connection
						const targetList = sourceInfo.outgoingConnections.get(outputIndex) ?? [];
						targetList.push({ to: target.node, inputIndex: target.index ?? 0 });
						sourceInfo.outgoingConnections.set(outputIndex, targetList);

						targetInfo.incomingConnections.push({
							from: sourceName,
							outputIndex,
							inputIndex: target.index ?? 0,
						});
					}
				}
			});
		}
	}

	// Find root nodes (triggers or nodes with no incoming connections)
	// Subnodes are NOT considered orphans - they're connected via AI connections
	const triggers: NodeInfo[] = [];
	const stickyNotes: NodeInfo[] = [];
	const orphanNodes: NodeInfo[] = [];

	for (const info of nodeInfoMap.values()) {
		if (isStickyNote(info.node)) {
			stickyNotes.push(info);
		} else if (info.isSubnodeOf) {
			// Skip subnodes - they will be included in their parent's config
			continue;
		} else if (isTriggerNode(info.node)) {
			triggers.push(info);
		} else if (info.incomingConnections.length === 0) {
			orphanNodes.push(info);
		}
	}

	// Generate settings string
	let settingsStr = '';
	if (json.settings && Object.keys(json.settings).length > 0) {
		settingsStr = `, ${formatValue(json.settings, 1)}`;
	}

	// Generate workflow declaration
	lines.push(
		`const wf = workflow('${escapeString(json.id)}', '${escapeString(json.name)}'${settingsStr})`,
	);

	// Track which nodes have been added
	const addedNodes = new Set<string>();

	// Generate node chains starting from each trigger
	for (const triggerInfo of triggers) {
		lines.push(`  .add(${generateNodeCall(triggerInfo.node, nodeInfoMap)})`);
		addedNodes.add(triggerInfo.node.name);
		generateChain(triggerInfo, nodeInfoMap, addedNodes, lines, 1);
	}

	// Add orphan nodes (nodes not connected to any trigger)
	for (const orphanInfo of orphanNodes) {
		if (addedNodes.has(orphanInfo.node.name)) continue;
		lines.push(`  .add(${generateNodeCall(orphanInfo.node, nodeInfoMap)})`);
		addedNodes.add(orphanInfo.node.name);
		generateChain(orphanInfo, nodeInfoMap, addedNodes, lines, 1);
	}

	// Add any remaining nodes that weren't reached
	// Skip subnodes - they're emitted as part of their parent's config
	for (const info of nodeInfoMap.values()) {
		if (addedNodes.has(info.node.name) || isStickyNote(info.node) || info.isSubnodeOf) continue;
		lines.push(`  // Disconnected: ${info.node.name}`);
		lines.push(`  .add(${generateNodeCall(info.node, nodeInfoMap)})`);
		addedNodes.add(info.node.name);
	}

	// Add sticky notes
	for (const stickyInfo of stickyNotes) {
		lines.push(`  .add(${generateStickyCall(stickyInfo.node)})`);
	}

	// Close workflow declaration
	lines.push(';');

	return lines.join('\n');
}

/**
 * Generates a variable name from a node name.
 */
function generateVarName(nodeName: string | null | undefined): string {
	const name = nodeName ?? 'unnamed';
	return name
		.replace(/[^a-zA-Z0-9]/g, '_')
		.replace(/^(\d)/, '_$1')
		.replace(/_+/g, '_')
		.replace(/^_|_$/g, '')
		.toLowerCase();
}

/**
 * Generates the chain of nodes following from a starting node.
 */
function generateChain(
	startInfo: NodeInfo,
	nodeInfoMap: Map<string, NodeInfo>,
	addedNodes: Set<string>,
	lines: string[],
	depth: number,
): void {
	const outputs = Array.from(startInfo.outgoingConnections.entries()).sort((a, b) => a[0] - b[0]);

	if (outputs.length === 0) return;

	// Single output with single target - simple .then() chain
	if (outputs.length === 1 && outputs[0][1].length === 1) {
		const [_outputIndex, targets] = outputs[0];
		const target = targets[0];
		const targetInfo = nodeInfoMap.get(target.to);

		// Skip subnodes - they're included in parent config
		if (targetInfo && !addedNodes.has(target.to) && !targetInfo.isSubnodeOf) {
			lines.push(`  .then(${generateNodeCall(targetInfo.node, nodeInfoMap)})`);
			addedNodes.add(target.to);
			generateChain(targetInfo, nodeInfoMap, addedNodes, lines, depth);
		}
		return;
	}

	// Multiple outputs (branching) - use .output(n)
	for (const [outputIndex, targets] of outputs) {
		if (targets.length === 0) continue;

		for (const target of targets) {
			const targetInfo = nodeInfoMap.get(target.to);
			// Skip subnodes - they're included in parent config
			if (!targetInfo || addedNodes.has(target.to) || targetInfo.isSubnodeOf) continue;

			lines.push(
				`  .output(${outputIndex}).then(${generateNodeCall(targetInfo.node, nodeInfoMap)})`,
			);
			addedNodes.add(target.to);
			generateChain(targetInfo, nodeInfoMap, addedNodes, lines, depth + 1);
		}
	}
}

/**
 * Generates a subnode factory call (e.g., languageModel({...}), tool({...}))
 * Recursively handles nested subnodes (subnodes that have their own subnodes)
 */
function generateSubnodeCall(
	nodeJson: NodeJSON,
	factoryName: string,
	nodeInfoMap: Map<string, NodeInfo>,
): string {
	const configParts: string[] = [];

	// Parameters
	if (nodeJson.parameters && Object.keys(nodeJson.parameters).length > 0) {
		configParts.push(`parameters: ${formatValue(nodeJson.parameters, 4)}`);
	}

	// Credentials
	if (nodeJson.credentials && Object.keys(nodeJson.credentials).length > 0) {
		configParts.push(`credentials: ${formatValue(nodeJson.credentials, 4)}`);
	}

	// Check if this subnode has its own subnodes (nested hierarchy)
	const nodeInfo = nodeInfoMap.get(nodeJson.name);
	if (nodeInfo && nodeInfo.subnodes.length > 0) {
		const subnodesConfig = generateSubnodesConfig(nodeInfo.subnodes, nodeInfoMap);
		if (subnodesConfig) {
			configParts.push(subnodesConfig);
		}
	}

	// Name (if different from type)
	const defaultName = generateDefaultNodeName(nodeJson.type);
	if (nodeJson.name !== defaultName) {
		configParts.push(`name: '${escapeString(nodeJson.name)}'`);
	}

	const configStr = configParts.length > 0 ? `{ ${configParts.join(', ')} }` : '{}';

	return `${factoryName}({ type: '${escapeString(nodeJson.type)}', version: ${nodeJson.typeVersion}, config: ${configStr} })`;
}

/**
 * Generates the subnodes config object for a node that has AI subnodes attached
 */
function generateSubnodesConfig(
	subnodes: SubnodeConnection[],
	nodeInfoMap: Map<string, NodeInfo>,
): string {
	if (subnodes.length === 0) return '';

	const parts: string[] = [];

	// Group subnodes by config key
	const byConfigKey = new Map<string, { factory: string; nodes: NodeJSON[] }>();

	for (const sub of subnodes) {
		const subInfo = nodeInfoMap.get(sub.subnodeName);
		if (!subInfo) continue;

		const aiConfig = AI_CONNECTION_TYPES.get(sub.connectionType);
		if (!aiConfig) continue;

		const existing = byConfigKey.get(aiConfig.configKey);
		if (existing) {
			existing.nodes.push(subInfo.node);
		} else {
			byConfigKey.set(aiConfig.configKey, {
				factory: aiConfig.factory,
				nodes: [subInfo.node],
			});
		}
	}

	// Generate each subnode config entry
	for (const [configKey, { factory, nodes }] of byConfigKey) {
		if (configKey === 'tools' || nodes.length > 1) {
			// Tools is always an array, other types become arrays when multiple nodes are connected
			const calls = nodes.map((n) => generateSubnodeCall(n, factory, nodeInfoMap));
			parts.push(`${configKey}: [${calls.join(', ')}]`);
		} else {
			// Single subnode
			parts.push(`${configKey}: ${generateSubnodeCall(nodes[0], factory, nodeInfoMap)}`);
		}
	}

	return parts.length > 0 ? `subnodes: { ${parts.join(', ')} }` : '';
}

/**
 * Generates a node() or trigger() call for a node.
 */
function generateNodeCall(nodeJson: NodeJSON, nodeInfoMap?: Map<string, NodeInfo>): string {
	const configParts: string[] = [];

	// Parameters
	if (nodeJson.parameters && Object.keys(nodeJson.parameters).length > 0) {
		configParts.push(`parameters: ${formatValue(nodeJson.parameters, 2)}`);
	}

	// Credentials
	if (nodeJson.credentials && Object.keys(nodeJson.credentials).length > 0) {
		configParts.push(`credentials: ${formatValue(nodeJson.credentials, 2)}`);
	}

	// Subnodes (if any)
	if (nodeInfoMap) {
		const nodeInfo = nodeInfoMap.get(nodeJson.name);
		if (nodeInfo && nodeInfo.subnodes.length > 0) {
			const subnodesConfig = generateSubnodesConfig(nodeInfo.subnodes, nodeInfoMap);
			if (subnodesConfig) {
				configParts.push(subnodesConfig);
			}
		}
	}

	// Position (only if non-zero)
	if (nodeJson.position && (nodeJson.position[0] !== 0 || nodeJson.position[1] !== 0)) {
		configParts.push(`position: [${nodeJson.position[0]}, ${nodeJson.position[1]}]`);
	}

	// Name (if different from type)
	const defaultName = generateDefaultNodeName(nodeJson.type);
	if (nodeJson.name !== defaultName) {
		configParts.push(`name: '${escapeString(nodeJson.name)}'`);
	}

	const fn = isTriggerNode(nodeJson) ? 'trigger' : 'node';
	const configStr = configParts.length > 0 ? `{ ${configParts.join(', ')} }` : '{}';

	return `${fn}({ type: '${escapeString(nodeJson.type)}', version: ${nodeJson.typeVersion}, config: ${configStr} })`;
}

/**
 * Generates a sticky() call for a sticky note.
 */
function generateStickyCall(nodeJson: NodeJSON): string {
	const content = (nodeJson.parameters?.content as string) ?? '';
	const options: string[] = [];

	// Name (if different from default 'Sticky Note')
	if (nodeJson.name && nodeJson.name !== 'Sticky Note') {
		options.push(`name: '${escapeString(nodeJson.name)}'`);
	}
	if (nodeJson.parameters?.color !== undefined) {
		options.push(`color: ${nodeJson.parameters.color}`);
	}
	if (nodeJson.position && (nodeJson.position[0] !== 0 || nodeJson.position[1] !== 0)) {
		options.push(`position: [${nodeJson.position[0]}, ${nodeJson.position[1]}]`);
	}
	if (nodeJson.parameters?.width !== undefined) {
		options.push(`width: ${nodeJson.parameters.width}`);
	}
	if (nodeJson.parameters?.height !== undefined) {
		options.push(`height: ${nodeJson.parameters.height}`);
	}

	const optionsStr = options.length > 0 ? `, { ${options.join(', ')} }` : '';
	return `sticky('${escapeString(content)}'${optionsStr})`;
}
