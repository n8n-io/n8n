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
	/** If this node is part of a composite pattern (merge source, if branch, switch case) */
	isPartOfComposite?: boolean;
}

/**
 * Determines if a node is a Merge node.
 */
function isMergeNode(node: NodeJSON): boolean {
	return node.type === 'n8n-nodes-base.merge';
}

/**
 * Determines if a node is an IF node.
 */
function isIfNode(node: NodeJSON): boolean {
	return node.type === 'n8n-nodes-base.if';
}

/**
 * Determines if a node is a Switch node.
 */
function isSwitchNode(node: NodeJSON): boolean {
	return node.type === 'n8n-nodes-base.switch';
}

/**
 * Determines if a node has error output enabled (onError: 'continueErrorOutput')
 */
function hasErrorOutput(node: NodeJSON): boolean {
	return node.onError === 'continueErrorOutput';
}

/**
 * Calculate the error output index for a node.
 * Error outputs are always the last output after regular outputs.
 */
function getErrorOutputIndex(node: NodeJSON): number {
	if (isIfNode(node)) {
		return 2; // IF: true=0, false=1, error=2
	}
	if (isSwitchNode(node)) {
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const params = node.parameters as Record<string, any> | undefined;
		const numberOutputs = params?.numberOutputs ?? params?.rules?.rules?.length ?? 4;
		return numberOutputs;
	}
	return 1; // Regular nodes: main=0, error=1
}

interface MergePattern {
	mergeNode: string;
	sources: { nodeName: string; inputIndex: number }[];
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
		`return workflow('${escapeString(json.id)}', '${escapeString(json.name)}'${settingsStr})`,
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

		// Check if orphan is an IF node with branches - use ifBranch() composite
		if (isIfNode(orphanInfo.node)) {
			const ifResult = generateIfBranchCall(orphanInfo, nodeInfoMap, addedNodes);
			if (ifResult) {
				lines.push(`  .add(${ifResult.call})`);
				addedNodes.add(orphanInfo.node.name);
				// Generate downstream chains for each branch
				for (const branchName of ifResult.branchNames) {
					const branchInfo = nodeInfoMap.get(branchName);
					if (branchInfo) {
						generateChain(branchInfo, nodeInfoMap, addedNodes, lines, 1);
					}
				}
				continue;
			}
		}

		// Check if orphan is a Switch node with cases - use switchCase() composite
		if (isSwitchNode(orphanInfo.node)) {
			const switchResult = generateSwitchCaseCall(orphanInfo, nodeInfoMap, addedNodes);
			if (switchResult) {
				lines.push(`  .add(${switchResult.call})`);
				addedNodes.add(orphanInfo.node.name);
				// Generate downstream chains for each case
				for (const caseName of switchResult.caseNames) {
					const caseInfo = nodeInfoMap.get(caseName);
					if (caseInfo) {
						generateChain(caseInfo, nodeInfoMap, addedNodes, lines, 1);
					}
				}
				continue;
			}
		}

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

	// Single output - check for fan-out (multiple targets on same output)
	if (outputs.length === 1) {
		const [_outputIndex, targets] = outputs[0];

		// Single target - simple .then() chain
		if (targets.length === 1) {
			const target = targets[0];
			const targetInfo = nodeInfoMap.get(target.to);

			// Skip subnodes - they're included in parent config
			if (targetInfo && !addedNodes.has(target.to) && !targetInfo.isSubnodeOf) {
				// Check if target is a Merge node - use merge() composite
				if (isMergeNode(targetInfo.node)) {
					const mergeCall = generateMergeCall(targetInfo, nodeInfoMap, addedNodes);
					if (mergeCall) {
						lines.push(`  .then(${mergeCall})`);
						addedNodes.add(target.to);
						generateChain(targetInfo, nodeInfoMap, addedNodes, lines, depth);
						return;
					}
				}

				// Check if target is an IF node with both branches - use ifBranch() composite
				if (isIfNode(targetInfo.node)) {
					const ifResult = generateIfBranchCall(targetInfo, nodeInfoMap, addedNodes);
					if (ifResult) {
						lines.push(`  .then(${ifResult.call})`);
						addedNodes.add(target.to);
						// Generate downstream chains for each branch
						for (const branchName of ifResult.branchNames) {
							const branchInfo = nodeInfoMap.get(branchName);
							if (branchInfo) {
								generateChain(branchInfo, nodeInfoMap, addedNodes, lines, depth + 1);
							}
						}
						return;
					}
				}

				// Check if target is a Switch node with outputs - use switchCase() composite
				if (isSwitchNode(targetInfo.node)) {
					const switchResult = generateSwitchCaseCall(targetInfo, nodeInfoMap, addedNodes);
					if (switchResult) {
						lines.push(`  .then(${switchResult.call})`);
						addedNodes.add(target.to);
						// Generate downstream chains for each case
						for (const caseName of switchResult.caseNames) {
							const caseInfo = nodeInfoMap.get(caseName);
							if (caseInfo) {
								generateChain(caseInfo, nodeInfoMap, addedNodes, lines, depth + 1);
							}
						}
						return;
					}
				}

				lines.push(`  .then(${generateNodeCall(targetInfo.node, nodeInfoMap)})`);
				addedNodes.add(target.to);
				generateChain(targetInfo, nodeInfoMap, addedNodes, lines, depth);
			}
			return;
		}

		// Multiple targets on same output - fan-out pattern: use .then([a, b]) syntax
		if (targets.length > 1) {
			// First check if this is a merge pattern (all targets feed into same merge)
			const mergePattern = detectMergePattern(targets, nodeInfoMap, addedNodes);
			if (mergePattern) {
				// Generate merge() call for all branches
				const branchCalls = mergePattern.sources.map((s) => {
					const info = nodeInfoMap.get(s.nodeName);
					return info ? generateNodeCall(info.node, nodeInfoMap) : '';
				});

				const mergeInfo = nodeInfoMap.get(mergePattern.mergeNode);
				if (mergeInfo) {
					const configParts: string[] = [];
					if (mergeInfo.node.typeVersion != null) {
						configParts.push(`version: ${mergeInfo.node.typeVersion}`);
					}
					if (mergeInfo.node.parameters && Object.keys(mergeInfo.node.parameters).length > 0) {
						configParts.push(`parameters: ${formatValue(mergeInfo.node.parameters, 2)}`);
					}
					if (mergeInfo.node.name !== 'Merge') {
						configParts.push(`name: '${escapeString(mergeInfo.node.name)}'`);
					}
					const configStr = configParts.length > 0 ? `, { ${configParts.join(', ')} }` : '';

					lines.push(`  .then(merge([${branchCalls.join(', ')}]${configStr}))`);

					for (const source of mergePattern.sources) {
						addedNodes.add(source.nodeName);
					}
					addedNodes.add(mergePattern.mergeNode);

					generateChain(mergeInfo, nodeInfoMap, addedNodes, lines, depth + 1);
					return;
				}
			}

			// Not a merge pattern - generate .then([a, b]) for fan-out
			const targetCalls: string[] = [];
			const targetInfos: NodeInfo[] = [];

			for (const target of targets) {
				const targetInfo = nodeInfoMap.get(target.to);
				if (!targetInfo || addedNodes.has(target.to) || targetInfo.isSubnodeOf) continue;

				targetCalls.push(generateNodeCall(targetInfo.node, nodeInfoMap));
				targetInfos.push(targetInfo);
				addedNodes.add(target.to);
			}

			if (targetCalls.length > 0) {
				if (targetCalls.length === 1) {
					// Only one valid target after filtering
					lines.push(`  .then(${targetCalls[0]})`);
				} else {
					// Multiple targets - use array syntax
					lines.push(`  .then([${targetCalls.join(', ')}])`);
				}

				// Generate downstream chains for each target
				for (const targetInfo of targetInfos) {
					generateChain(targetInfo, nodeInfoMap, addedNodes, lines, depth + 1);
				}
			}
			return;
		}
	}

	// Multiple outputs (branching) - check for special patterns first
	// Check if all targets from a single output feed into the same merge node
	for (const [_outputIndex, targets] of outputs) {
		if (targets.length === 0) continue;

		// Check if all targets feed into the same merge node
		if (targets.length >= 2) {
			const mergePattern = detectMergePattern(targets, nodeInfoMap, addedNodes);
			if (mergePattern) {
				// Generate merge() call for all branches
				const branchCalls = mergePattern.sources.map((s) => {
					const info = nodeInfoMap.get(s.nodeName);
					return info ? generateNodeCall(info.node, nodeInfoMap) : '';
				});

				const mergeInfo = nodeInfoMap.get(mergePattern.mergeNode);
				if (mergeInfo) {
					const configParts: string[] = [];
					// Always include version to preserve original node version
					if (mergeInfo.node.typeVersion != null) {
						configParts.push(`version: ${mergeInfo.node.typeVersion}`);
					}
					if (mergeInfo.node.parameters && Object.keys(mergeInfo.node.parameters).length > 0) {
						configParts.push(`parameters: ${formatValue(mergeInfo.node.parameters, 2)}`);
					}
					if (mergeInfo.node.name !== 'Merge') {
						configParts.push(`name: '${escapeString(mergeInfo.node.name)}'`);
					}
					const configStr = configParts.length > 0 ? `, { ${configParts.join(', ')} }` : '';

					lines.push(`  .then(merge([${branchCalls.join(', ')}]${configStr}))`);

					// Mark all source nodes and merge as added
					for (const source of mergePattern.sources) {
						addedNodes.add(source.nodeName);
					}
					addedNodes.add(mergePattern.mergeNode);

					// Continue chain from merge node
					generateChain(mergeInfo, nodeInfoMap, addedNodes, lines, depth + 1);
				}
				continue; // Don't process these targets individually
			}
		}

		// Multi-output branching - add nodes directly (connections established via node.then())
		for (const target of targets) {
			const targetInfo = nodeInfoMap.get(target.to);
			// Skip subnodes - they're included in parent config
			if (!targetInfo || addedNodes.has(target.to) || targetInfo.isSubnodeOf) continue;

			// For multi-output nodes, just add the node - connections are declared via node.then()
			lines.push(`  .add(${generateNodeCall(targetInfo.node, nodeInfoMap)})`);
			addedNodes.add(target.to);
			generateChain(targetInfo, nodeInfoMap, addedNodes, lines, depth + 1);
		}
	}
}

/**
 * Detect if targets all feed into the same merge node.
 * Returns the merge pattern if found, null otherwise.
 */
function detectMergePattern(
	targets: { to: string; inputIndex: number }[],
	nodeInfoMap: Map<string, NodeInfo>,
	addedNodes: Set<string>,
): MergePattern | null {
	// Check where each target's output goes
	let mergeNode: string | null = null;
	const sources: { nodeName: string; inputIndex: number }[] = [];

	for (const target of targets) {
		const targetInfo = nodeInfoMap.get(target.to);
		if (!targetInfo || addedNodes.has(target.to)) return null;

		// Check if this target has exactly one output that goes to a merge node
		const targetOutputs = Array.from(targetInfo.outgoingConnections.entries());
		if (targetOutputs.length !== 1) return null;

		const [_outIdx, targetTargets] = targetOutputs[0];
		if (targetTargets.length !== 1) return null;

		const nextTarget = targetTargets[0];
		const nextInfo = nodeInfoMap.get(nextTarget.to);
		if (!nextInfo || !isMergeNode(nextInfo.node)) return null;

		// All targets must feed into the same merge node
		if (mergeNode === null) {
			mergeNode = nextTarget.to;
		} else if (mergeNode !== nextTarget.to) {
			return null;
		}

		sources.push({
			nodeName: target.to,
			inputIndex: nextTarget.inputIndex,
		});
	}

	if (!mergeNode || sources.length < 2) return null;

	// Sort sources by input index
	sources.sort((a, b) => a.inputIndex - b.inputIndex);

	return { mergeNode, sources };
}

/**
 * Generate a merge() call for a Merge node.
 * Returns the merge call string, or null if pattern doesn't match.
 */
function generateMergeCall(
	mergeInfo: NodeInfo,
	nodeInfoMap: Map<string, NodeInfo>,
	addedNodes: Set<string>,
): string | null {
	// Collect ALL nodes that connect to this merge, sorted by input index
	// Include already-added nodes since they're part of the merge pattern
	const sources: { node: NodeJSON; inputIndex: number; alreadyAdded: boolean }[] = [];

	for (const [sourceName, sourceInfo] of nodeInfoMap.entries()) {
		// Skip subnodes and sticky notes
		if (sourceInfo.isSubnodeOf || isStickyNote(sourceInfo.node)) continue;

		for (const [_outputIdx, targets] of sourceInfo.outgoingConnections.entries()) {
			for (const target of targets) {
				if (target.to === mergeInfo.node.name) {
					sources.push({
						node: sourceInfo.node,
						inputIndex: target.inputIndex,
						alreadyAdded: addedNodes.has(sourceName),
					});
				}
			}
		}
	}

	// Need at least 2 sources for a merge pattern
	if (sources.length < 2) return null;

	// Sort by input index
	sources.sort((a, b) => a.inputIndex - b.inputIndex);

	// Mark source nodes as added (those that weren't already)
	for (const source of sources) {
		addedNodes.add(source.node.name);
	}

	// Generate the merge call
	const branchCalls = sources.map((s) => generateNodeCall(s.node, nodeInfoMap));
	const configParts: string[] = [];

	// Always include version to preserve original node version
	if (mergeInfo.node.typeVersion != null) {
		configParts.push(`version: ${mergeInfo.node.typeVersion}`);
	}
	if (mergeInfo.node.parameters && Object.keys(mergeInfo.node.parameters).length > 0) {
		configParts.push(`parameters: ${formatValue(mergeInfo.node.parameters, 2)}`);
	}
	if (mergeInfo.node.name !== 'Merge') {
		configParts.push(`name: '${escapeString(mergeInfo.node.name)}'`);
	}

	const configStr = configParts.length > 0 ? `, { ${configParts.join(', ')} }` : '';
	return `merge([${branchCalls.join(', ')}]${configStr})`;
}

/**
 * Generate a node call WITH its downstream chain using .then() chaining.
 * This is used for branch nodes in ifBranch() and switchCase() to include
 * the entire downstream chain inline.
 *
 * Recursively handles IF, Switch, and Merge nodes to prevent them from
 * becoming disconnected.
 *
 * @returns The node call string with chained .then() calls for downstream nodes
 */
function generateNodeCallWithChain(
	startInfo: NodeInfo,
	nodeInfoMap: Map<string, NodeInfo>,
	addedNodes: Set<string>,
): string {
	let call = generateNodeCall(startInfo.node, nodeInfoMap);

	// Get downstream nodes (single output, single target chains only)
	// We follow the chain as long as there's exactly one output with exactly one target
	let currentInfo: NodeInfo | undefined = startInfo;

	while (currentInfo) {
		const outputs = Array.from(currentInfo.outgoingConnections.entries());

		// Stop if no outputs or multiple outputs (branching)
		if (outputs.length !== 1) break;

		const [_outputIndex, targets] = outputs[0];

		// Stop if no targets or multiple targets (fan-out)
		if (targets.length !== 1) break;

		const target = targets[0];
		const targetInfo = nodeInfoMap.get(target.to);

		// Stop if target not found, already added, or is a subnode
		if (!targetInfo || addedNodes.has(target.to) || targetInfo.isSubnodeOf) break;

		// Handle composite patterns recursively (IF, Switch, Merge)
		if (isIfNode(targetInfo.node)) {
			const ifResult = generateIfBranchCall(targetInfo, nodeInfoMap, addedNodes);
			if (ifResult) {
				addedNodes.add(target.to);
				call += `.then(${ifResult.call})`;
				// Continue from the IF node to see if there's more downstream
				currentInfo = targetInfo;
				continue;
			}
			break;
		}

		if (isSwitchNode(targetInfo.node)) {
			const switchResult = generateSwitchCaseCall(targetInfo, nodeInfoMap, addedNodes);
			if (switchResult) {
				addedNodes.add(target.to);
				call += `.then(${switchResult.call})`;
				// Continue from the Switch node
				currentInfo = targetInfo;
				continue;
			}
			break;
		}

		if (isMergeNode(targetInfo.node)) {
			const mergeCall = generateMergeCall(targetInfo, nodeInfoMap, addedNodes);
			if (mergeCall) {
				addedNodes.add(target.to);
				call += `.then(${mergeCall})`;
				// Continue from the Merge node
				currentInfo = targetInfo;
				continue;
			}
			break;
		}

		// Add the downstream node to the chain
		addedNodes.add(target.to);
		call += `.then(${generateNodeCall(targetInfo.node, nodeInfoMap)})`;
		currentInfo = targetInfo;
	}

	return call;
}

/**
 * Generate an ifBranch() call for an IF node.
 * Supports both full IF nodes (both branches) and single-branch IF nodes.
 * Returns the ifBranch call string, or null if no branches connected.
 * Note: branchNames is kept for backward compatibility but downstream nodes
 * are now included inline via .then() chaining.
 */
function generateIfBranchCall(
	ifInfo: NodeInfo,
	nodeInfoMap: Map<string, NodeInfo>,
	addedNodes: Set<string>,
): { call: string; branchNames: string[] } | null {
	const outputs = ifInfo.outgoingConnections;

	// Get true (output 0) and false (output 1) branches - may be error output at index 2
	const errorOutputIndex = hasErrorOutput(ifInfo.node) ? getErrorOutputIndex(ifInfo.node) : -1;
	const trueBranch = outputs.get(0)?.[0];
	const falseBranch = outputs.get(1)?.[0];

	// Need at least one branch (true or false, but not just error)
	if (!trueBranch && !falseBranch) return null;

	const trueInfo = trueBranch ? nodeInfoMap.get(trueBranch.to) : null;
	const falseInfo = falseBranch ? nodeInfoMap.get(falseBranch.to) : null;

	// If we have a branch but can't find its info, skip
	if ((trueBranch && !trueInfo) || (falseBranch && !falseInfo)) return null;

	// branchNames is now empty since downstream nodes are included inline
	const branchNames: string[] = [];

	// Mark branch nodes as added
	if (trueBranch && trueInfo) {
		addedNodes.add(trueBranch.to);
	}
	if (falseBranch && falseInfo) {
		addedNodes.add(falseBranch.to);
	}

	// Generate the ifBranch call with inline downstream chains
	const trueCall = trueInfo ? generateNodeCallWithChain(trueInfo, nodeInfoMap, addedNodes) : 'null';
	const falseCall = falseInfo
		? generateNodeCallWithChain(falseInfo, nodeInfoMap, addedNodes)
		: 'null';

	const configParts: string[] = [];
	// Always include version to preserve original node version
	if (ifInfo.node.typeVersion != null) {
		configParts.push(`version: ${ifInfo.node.typeVersion}`);
	}
	if (ifInfo.node.parameters && Object.keys(ifInfo.node.parameters).length > 0) {
		configParts.push(`parameters: ${formatValue(ifInfo.node.parameters, 2)}`);
	}
	if (ifInfo.node.name !== 'IF') {
		configParts.push(`name: '${escapeString(ifInfo.node.name)}'`);
	}
	// Include onError if set
	if (ifInfo.node.onError) {
		configParts.push(`onError: '${ifInfo.node.onError}'`);
	}

	const configStr = configParts.length > 0 ? `, { ${configParts.join(', ')} }` : '';

	// Check for error output connection
	let errorHandlerCall = '';
	if (errorOutputIndex >= 0) {
		const errorTargets = outputs.get(errorOutputIndex);
		if (errorTargets && errorTargets.length > 0) {
			const errorTarget = errorTargets[0];
			const errorInfo = nodeInfoMap.get(errorTarget.to);
			if (errorInfo && !addedNodes.has(errorTarget.to)) {
				// We'll need to handle error output separately via a variable
				addedNodes.add(errorTarget.to);
				errorHandlerCall = `\n  // Error handler connected via ifNode.onError(errorHandler)`;
			}
		}
	}

	return {
		call: `ifBranch([${trueCall}, ${falseCall}]${configStr})${errorHandlerCall}`,
		branchNames,
	};
}

/**
 * Generate a switchCase() call for a Switch node.
 * Returns the switchCase call string and case names, or null if pattern doesn't match.
 */
function generateSwitchCaseCall(
	switchInfo: NodeInfo,
	nodeInfoMap: Map<string, NodeInfo>,
	addedNodes: Set<string>,
): { call: string; caseNames: string[] } | null {
	const outputs = Array.from(switchInfo.outgoingConnections.entries()).sort((a, b) => a[0] - b[0]);

	// Need at least one output
	if (outputs.length === 0) return null;

	// Collect case nodes in order, including their downstream chains
	const caseCalls: string[] = [];
	const caseNames: string[] = [];
	for (const [_outputIndex, targets] of outputs) {
		if (targets.length === 0) continue;
		const target = targets[0];
		const targetInfo = nodeInfoMap.get(target.to);
		if (!targetInfo) continue;

		// Mark this case node as added before generating its chain
		addedNodes.add(target.to);
		// Generate the case node WITH its downstream chain (not just a single node)
		caseCalls.push(generateNodeCallWithChain(targetInfo, nodeInfoMap, addedNodes));
		caseNames.push(target.to);
	}

	if (caseCalls.length === 0) return null;

	// Generate the switchCase call
	const configParts: string[] = [];
	// Always include version to preserve original node version
	if (switchInfo.node.typeVersion != null) {
		configParts.push(`version: ${switchInfo.node.typeVersion}`);
	}
	if (switchInfo.node.parameters && Object.keys(switchInfo.node.parameters).length > 0) {
		configParts.push(`parameters: ${formatValue(switchInfo.node.parameters, 2)}`);
	}
	if (switchInfo.node.name !== 'Switch') {
		configParts.push(`name: '${escapeString(switchInfo.node.name)}'`);
	}

	const configStr = configParts.length > 0 ? `, { ${configParts.join(', ')} }` : '';
	return {
		call: `switchCase([${caseCalls.join(', ')}]${configStr})`,
		caseNames,
	};
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

	// Always include name to preserve it across roundtrips
	// (sticky notes now generate unique default names like "Sticky Note abc12345")
	if (nodeJson.name) {
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
