/**
 * Code generator for creating TypeScript SDK code from workflow JSON.
 */
import type { WorkflowJSON, NodeJSON, ConnectionTarget } from './types/base';

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
	return (
		type.includes('trigger') ||
		type.includes('webhook') ||
		type === 'n8n-nodes-base.start' ||
		type === 'n8n-nodes-base.manualTrigger'
	);
}

/**
 * Determines if a node is a sticky note.
 */
function isStickyNote(node: NodeJSON): boolean {
	return node.type === 'n8n-nodes-base.stickyNote';
}

interface NodeInfo {
	node: NodeJSON;
	varName: string;
	incomingConnections: { from: string; outputIndex: number; inputIndex: number }[];
	outgoingConnections: Map<number, { to: string; inputIndex: number }[]>;
}

/**
 * Generates TypeScript SDK code from a workflow JSON.
 */
export function generateWorkflowCode(json: WorkflowJSON): string {
	const lines: string[] = [];

	// Imports
	lines.push("import { workflow, node, trigger, sticky } from '@n8n/workflow-sdk';");
	lines.push('');

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
		});
	}

	// Parse connections
	for (const [sourceName, connectionTypes] of Object.entries(json.connections)) {
		const sourceInfo = nodeInfoMap.get(sourceName);
		if (!sourceInfo) continue;

		for (const [_connType, outputs] of Object.entries(connectionTypes)) {
			if (!Array.isArray(outputs)) continue;

			outputs.forEach((targets: ConnectionTarget[], outputIndex: number) => {
				if (!Array.isArray(targets)) return;

				const targetList: { to: string; inputIndex: number }[] = [];
				for (const target of targets) {
					targetList.push({ to: target.node, inputIndex: target.index ?? 0 });

					const targetInfo = nodeInfoMap.get(target.node);
					if (targetInfo) {
						targetInfo.incomingConnections.push({
							from: sourceName,
							outputIndex,
							inputIndex: target.index ?? 0,
						});
					}
				}
				sourceInfo.outgoingConnections.set(outputIndex, targetList);
			});
		}
	}

	// Find root nodes (triggers or nodes with no incoming connections)
	const triggers: NodeInfo[] = [];
	const stickyNotes: NodeInfo[] = [];
	const orphanNodes: NodeInfo[] = [];

	for (const info of nodeInfoMap.values()) {
		if (isStickyNote(info.node)) {
			stickyNotes.push(info);
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
		lines.push(`  .add(${generateNodeCall(triggerInfo.node)})`);
		addedNodes.add(triggerInfo.node.name);
		generateChain(triggerInfo, nodeInfoMap, addedNodes, lines, 1);
	}

	// Add orphan nodes (nodes not connected to any trigger)
	for (const orphanInfo of orphanNodes) {
		if (addedNodes.has(orphanInfo.node.name)) continue;
		lines.push(`  .add(${generateNodeCall(orphanInfo.node)})`);
		addedNodes.add(orphanInfo.node.name);
		generateChain(orphanInfo, nodeInfoMap, addedNodes, lines, 1);
	}

	// Add any remaining nodes that weren't reached
	for (const info of nodeInfoMap.values()) {
		if (addedNodes.has(info.node.name) || isStickyNote(info.node)) continue;
		lines.push(`  // Disconnected: ${info.node.name}`);
		lines.push(`  .add(${generateNodeCall(info.node)})`);
		addedNodes.add(info.node.name);
	}

	// Add sticky notes
	for (const stickyInfo of stickyNotes) {
		lines.push(`  .add(${generateStickyCall(stickyInfo.node)})`);
	}

	// Close workflow declaration
	lines.push(';');
	lines.push('');
	lines.push('export default wf;');
	lines.push('');

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

		if (targetInfo && !addedNodes.has(target.to)) {
			lines.push(`  .then(${generateNodeCall(targetInfo.node)})`);
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
			if (!targetInfo || addedNodes.has(target.to)) continue;

			lines.push(`  .output(${outputIndex}).then(${generateNodeCall(targetInfo.node)})`);
			addedNodes.add(target.to);
			generateChain(targetInfo, nodeInfoMap, addedNodes, lines, depth + 1);
		}
	}
}

/**
 * Generates a node() or trigger() call for a node.
 */
function generateNodeCall(nodeJson: NodeJSON): string {
	const parts: string[] = [];

	// Parameters
	if (nodeJson.parameters && Object.keys(nodeJson.parameters).length > 0) {
		parts.push(`parameters: ${formatValue(nodeJson.parameters, 2)}`);
	}

	// Credentials
	if (nodeJson.credentials && Object.keys(nodeJson.credentials).length > 0) {
		parts.push(`credentials: ${formatValue(nodeJson.credentials, 2)}`);
	}

	// Position (only if non-zero)
	if (nodeJson.position && (nodeJson.position[0] !== 0 || nodeJson.position[1] !== 0)) {
		parts.push(`position: [${nodeJson.position[0]}, ${nodeJson.position[1]}]`);
	}

	// Name (if different from type)
	const defaultName = nodeJson.type.split('.').pop() ?? nodeJson.type;
	if (nodeJson.name !== defaultName) {
		parts.push(`name: '${escapeString(nodeJson.name)}'`);
	}

	const config = parts.length > 0 ? `, { ${parts.join(', ')} }` : '';
	const fn = isTriggerNode(nodeJson) ? 'trigger' : 'node';

	return `${fn}('${escapeString(nodeJson.type)}', ${nodeJson.typeVersion}${config})`;
}

/**
 * Generates a sticky() call for a sticky note.
 */
function generateStickyCall(nodeJson: NodeJSON): string {
	const content = (nodeJson.parameters?.content as string) ?? '';
	const options: string[] = [];

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
