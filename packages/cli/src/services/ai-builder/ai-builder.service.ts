/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable complexity */
import { Service } from '@n8n/di';
import type { Operation as JsonPatchOperation } from 'fast-json-patch';
import { applyPatch } from 'fast-json-patch'; // Using a library for patches
import type { IUser, INodeTypeDescription, INode, IWorkflowBase } from 'n8n-workflow';
import { ApplicationError, deepCopy, jsonParse, OperationalError } from 'n8n-workflow';

import { NodeTypes } from '@/node-types';

// Assuming this exists and provides an invoke method
// import { WorkflowMemoryService } from '@/services/workflow-memory.service'; // Hypothetical service for persistence

// --- Define Toolkit Input/Output Interfaces ---
interface AddNodeInput {
	type: string;
	position: { x: number; y: number };
	parameters?: Record<string, any>;
	name?: string;
	// ... other relevant fields
}

interface ConnectNodesInput {
	sourceNodeId: string;
	targetNodeId: string;
	sourceOutput: string; // e.g., 'main', 'ai_languageModel'
	targetInput: string; // e.g., 'main'
	outputIndex?: number;
	inputIndex?: number;
}

interface ConfigureNodeInput {
	nodeId: string;
	parameters: Record<string, any>; // Only the parameters to update
}

type WorkflowBuilderWorkflow = Pick<IWorkflowBase, 'nodes' | 'connections'>;

// Use JSON Patch standard directly
export type WorkflowPatch = JsonPatchOperation;

// --- Define Message Types for Streaming ---
export type OrchestratorMessage =
	| { type: 'clarification_request'; question: string; options?: string[]; context?: any } // Added context for frontend
	| {
			type: 'step_update';
			stepDescription: string;
			status: 'in_progress' | 'completed' | 'failed';
			error?: string;
	  }
	| { type: 'workflow_update'; patch: WorkflowPatch[] } // Stream diffs
	| { type: 'workflow_snapshot'; workflow: WorkflowBuilderWorkflow } // Optionally stream full state
	| { type: 'final_result'; workflow: WorkflowBuilderWorkflow; summary?: string }
	| { type: 'error'; message: string };

@Service()
export class AiBuilderService {
	private allNodeTypes: INodeTypeDescription[] = [];

	constructor(
		private readonly nodeTypes: NodeTypes,
		// private readonly llm: typeof llm, // Injected LLM for orchestration
	) {
		this.loadNodeTypes();
	}

	private loadNodeTypes(): void {
		// const nodeTypeData = this.nodeTypes.getKnownTypes();
		// this.allNodeTypes = Object.entries(nodeTypeData)
		// 	.map(([name, data]) => ({
		// 		...data.description,
		// 		name, // Ensure name is part of the description object
		// 	}))
		// 	.filter((nodeType) => nodeType.hidden !== true);
		const nodeTypesKeys = Object.keys(this.nodeTypes.getKnownTypes());

		const nodeTypes = nodeTypesKeys
			.map((nodeName) => {
				return { ...this.nodeTypes.getByNameAndVersion(nodeName).description, name: nodeName };
			})
			.filter((nodeType) => nodeType.hidden !== true);

		this.allNodeTypes = nodeTypes;
	}

	// --- Toolkit Implementations ---

	private searchNodeLibrary(intent: string): INodeTypeDescription[] {
		console.log(`Toolkit: Searching for nodes matching intent: ${intent}`);
		// Simple keyword matching for now. LLM could be used for better semantic search.
		const lowerIntent = intent.toLowerCase();
		const candidates = this.allNodeTypes.filter(
			(nt) =>
				nt.name.toLowerCase().includes(lowerIntent) ||
				nt.description?.toLowerCase().includes(lowerIntent) ||
				nt.subtitle?.toLowerCase().includes(lowerIntent),
		);
		// Basic ranking (exact name match first)
		candidates.sort((a, b) => {
			if (a.name.toLowerCase() === lowerIntent) return -1;
			if (b.name.toLowerCase() === lowerIntent) return 1;
			return 0;
		});
		return candidates.slice(0, 5); // Return top 5
	}

	private addNode(input: AddNodeInput, currentWorkflow: WorkflowBuilderWorkflow): WorkflowPatch[] {
		console.log(`Toolkit: Adding node ${input.type}`);
		const nodeType = this.nodeTypes.getByName(input.type);
		if (!nodeType) {
			throw new OperationalError(`Node type "${input.type}" not found.`);
		}

		const newNodeId = `node_${Date.now()}`; // Simple unique ID
		const newNode: Partial<INode> = {
			id: newNodeId,
			name: input.name || input.type, // Default name to type
			type: input.type,
			// typeVersion: nodeType.version ?? 1, // TODO: Assume latest version if not specified
			position: [input.position.x, input.position.y],
			parameters: input.parameters || {},
			notes: '',
			disabled: false,
			// credentials: {}, // Add if needed
		};

		// Check if nodes array exists, add if not
		const patches: WorkflowPatch[] = [];
		if (!currentWorkflow.nodes) {
			patches.push({ op: 'add', path: '/nodes', value: [] });
		}

		patches.push({ op: 'add', path: '/nodes/-', value: newNode }); // Add to end of array

		return patches;
	}

	private connectNodes(
		input: ConnectNodesInput,
		currentWorkflow: WorkflowBuilderWorkflow,
	): WorkflowPatch[] {
		console.log(
			`Toolkit: Connecting ${input.sourceNodeId} (${input.sourceOutput}) to ${input.targetNodeId} (${input.targetInput})`,
		);

		const sourceNodeExists = currentWorkflow.nodes.some((n) => n.id === input.sourceNodeId);
		const targetNodeExists = currentWorkflow.nodes.some((n) => n.id === input.targetNodeId);

		if (!sourceNodeExists)
			throw new ApplicationError(`Source node "${input.sourceNodeId}" not found.`);
		if (!targetNodeExists)
			throw new ApplicationError(`Target node "${input.targetNodeId}" not found.`);

		const connectionData = {
			node: input.targetNodeId,
			type: input.targetInput,
			index: input.inputIndex ?? 0,
		};

		const connectionPath = `/connections/${input.sourceNodeId}`;
		const outputTypePath = `${connectionPath}/${input.sourceOutput}`;
		const outputIndexPath = `${outputTypePath}/${input.outputIndex ?? 0}`;

		const patches: WorkflowPatch[] = [];

		// Ensure connections object exists
		if (!currentWorkflow.connections) {
			patches.push({ op: 'add', path: '/connections', value: {} });
		}
		// Ensure source node entry exists
		if (!currentWorkflow.connections?.[input.sourceNodeId]) {
			patches.push({ op: 'add', path: connectionPath, value: {} });
		}
		// Ensure output type array exists
		if (!currentWorkflow.connections?.[input.sourceNodeId]?.[input.sourceOutput]) {
			patches.push({ op: 'add', path: outputTypePath, value: [] });
		}
		// Ensure output index array exists (if needed, usually just add to end)
		// This assumes we add to the specified index or the end if index is not given/out of bounds
		// For simplicity, let's assume adding to a specific index or end.
		// JSON Patch 'add' to an array index inserts, '-' appends.
		const targetPath = `${outputTypePath}/${input.outputIndex ?? '-'}`;
		patches.push({ op: 'add', path: targetPath, value: connectionData });

		return patches;
	}

	private configureNode(
		input: ConfigureNodeInput,
		currentWorkflow: WorkflowBuilderWorkflow,
	): WorkflowPatch[] {
		console.log(`Toolkit: Configuring node ${input.nodeId}`);
		const nodeIndex = currentWorkflow.nodes.findIndex((n) => n.id === input.nodeId);
		if (nodeIndex === -1) {
			throw new OperationalError(`Node "${input.nodeId}" not found for configuration.`);
		}

		const patches: WorkflowPatch[] = [];
		for (const [key, value] of Object.entries(input.parameters)) {
			// Use 'replace' if parameter exists, 'add' otherwise
			const paramPath = `/nodes/${nodeIndex}/parameters/${key}`;
			// Note: A robust solution would check the actual node structure before deciding add/replace
			// For simplicity, assuming 'replace' works or 'add' if it doesn't exist at the path.
			// Let's default to 'add' which also replaces if the path exists.
			patches.push({ op: 'add', path: paramPath, value });
		}
		return patches;
	}

	// --- Orchestrator Logic ---

	private applyPatches(
		workflow: WorkflowBuilderWorkflow,
		patches: WorkflowPatch[],
	): WorkflowBuilderWorkflow {
		console.log(`Applying ${patches.length} patches...`);
		try {
			// Use fast-json-patch for reliable patching. It modifies in place, so clone first.
			const document = deepCopy(workflow);
			const result = applyPatch(document, patches, true, false); // validateOperation=true, mutateDocument=false (already cloned)
			return result.newDocument;
		} catch (error: any) {
			console.error('Patch application failed:', error);
			throw new OperationalError(`Failed to apply workflow patches: ${error.message}`);
		}
	}

	// Placeholder for actual LLM interaction
	private async invokeLlm(prompt: string): Promise<string> {
		try {
			// Replace with actual call to this.llm.invoke or similar
			console.log('LLM Prompt:', prompt);
			// Simulate LLM response for planning/action determination
			if (prompt.includes('Generate a step-by-step plan')) {
				return '1. Add a Webhook node.\n2. Add a Set node to extract status.\n3. Add an IF node to check status.\n4. Add a Google Sheets node to log failures.';
			}
			if (prompt.includes('which toolkit should be used')) {
				if (prompt.includes('Add a Webhook node'))
					return JSON.stringify({
						toolkit: 'AddNode',
						parameters: { type: 'Webhook', position: { x: 100, y: 100 } },
					});
				if (prompt.includes('Add a Set node'))
					return JSON.stringify({
						toolkit: 'AddNode',
						parameters: { type: 'Set', position: { x: 300, y: 100 } },
					});
				if (prompt.includes('Add an IF node'))
					return JSON.stringify({
						toolkit: 'AddNode',
						parameters: { type: 'IF', position: { x: 500, y: 100 } },
					});
				if (prompt.includes('Add a Google Sheets node'))
					return JSON.stringify({
						toolkit: 'AddNode',
						parameters: { type: 'Google Sheets', position: { x: 700, y: 100 } },
					});
				// Add more simulated responses as needed
			}
			return 'Unknown LLM request'; // Default fallback
		} catch (error: any) {
			throw new ApplicationError(`LLM invocation failed: ${error.message}`);
		}
	}

	async *chat(
		payload: { prompt: string; workflowId?: string; currentWorkflow?: IWorkflowBase }, // Allow passing current workflow directly for stateless operation
		user?: IUser, // Make user optional if not strictly needed for core logic yet
	): AsyncGenerator<OrchestratorMessage> {
		let workflowState: WorkflowBuilderWorkflow;
		const dialogueHistory: string[] = [`User: ${payload.prompt}`];

		// Initialize workflow state
		workflowState = payload.currentWorkflow ?? { nodes: [], connections: {} };
		yield { type: 'workflow_snapshot', workflow: workflowState };

		try {
			// 1. Generate High-Level Plan (using LLM)
			yield { type: 'step_update', stepDescription: 'Generating plan...', status: 'in_progress' };
			const planPrompt = `Based on the dialogue history:\n${dialogueHistory.join('\n')}\n\nGenerate a concise, step-by-step plan to modify the workflow according to the latest user request ("${payload.prompt}"). Output only the numbered steps.`;
			const planResponse = await this.invokeLlm(planPrompt); // Use placeholder LLM call
			const steps = planResponse.split('\n').filter((s) => s.trim().match(/^\d+\./)); // Simple parsing for numbered steps
			if (steps.length === 0) throw new ApplicationError('LLM failed to generate a plan.');
			yield {
				type: 'step_update',
				stepDescription: `Plan Generated: ${steps.join('; ')}`,
				status: 'completed',
			};

			// 2. Execute Plan Step-by-Step
			for (const step of steps) {
				const stepDescription = step.replace(/^\d+\.\s*/, ''); // Remove numbering
				yield {
					type: 'step_update',
					stepDescription: `Executing: ${stepDescription}`,
					status: 'in_progress',
				};

				// 3. Determine Action/Toolkit (using LLM)
				const actionPrompt = `Given the step "${stepDescription}" and the current workflow state (Nodes: ${workflowState.nodes.map((n) => n.name).join(', ')}), which toolkit should be used and with what parameters? Available toolkits: AddNode, RemoveNode, ConnectNodes, ConfigureNode, SearchNodeLibrary. Respond ONLY with JSON: {"toolkit": "TOOL_NAME", "parameters": {...}}`;
				const actionResponse = await this.invokeLlm(actionPrompt); // Use placeholder LLM call
				let action: { toolkit: string; parameters: any };
				try {
					action = jsonParse(actionResponse); // Use safe JSON parse
				} catch (e) {
					yield {
						type: 'error',
						message: `Failed to parse LLM action JSON for step "${stepDescription}": ${actionResponse}`,
					};
					continue; // Skip this step
				}

				// 4. Execute Toolkit
				let patches: WorkflowPatch[] = [];
				try {
					switch (action.toolkit) {
						case 'AddNode':
							// Basic intent check if type is vague
							let nodeTypeToAdd = action.parameters.type;
							if (nodeTypeToAdd && !this.allNodeTypes.some((nt) => nt.name === nodeTypeToAdd)) {
								const candidates = this.searchNodeLibrary(nodeTypeToAdd);
								if (candidates.length > 0) {
									// TODO: Implement clarification flow if candidates.length > 1
									// For now, just pick the first candidate
									if (candidates.length > 1) {
										console.warn(
											`Ambiguous node type "${nodeTypeToAdd}", choosing "${candidates[0].name}"`,
										);
									}
									nodeTypeToAdd = candidates[0].name;
									action.parameters.type = nodeTypeToAdd; // Update parameters
								} else {
									throw new OperationalError(`Node type "${nodeTypeToAdd}" not found.`);
								}
							}
							// Add default position if missing
							if (!action.parameters.position) {
								const x = (workflowState.nodes.length % 5) * 200 + 100; // Simple layout
								const y = Math.floor(workflowState.nodes.length / 5) * 150 + 100;
								action.parameters.position = { x, y };
							}
							patches = this.addNode(action.parameters, workflowState);
							break;
						case 'ConnectNodes':
							// Infer indices if missing? For now, assume provided or default 0
							action.parameters.outputIndex = action.parameters.outputIndex ?? 0;
							action.parameters.inputIndex = action.parameters.inputIndex ?? 0;
							action.parameters.sourceOutput = action.parameters.sourceOutput ?? 'main';
							action.parameters.targetInput = action.parameters.targetInput ?? 'main';
							patches = this.connectNodes(action.parameters, workflowState);
							break;
						case 'ConfigureNode':
							patches = this.configureNode(action.parameters, workflowState);
							break;
						// case 'RemoveNode': // Implement if needed
						// case 'SearchNodeLibrary': // Usually called internally or for clarification
						default:
							yield {
								type: 'step_update',
								stepDescription: `Skipping unknown toolkit: ${action.toolkit}`,
								status: 'failed',
							};
							continue;
					}

					// 5. Apply Patches & Update State
					if (patches.length > 0) {
						workflowState = this.applyPatches(workflowState, patches);
						yield { type: 'workflow_update', patch: patches }; // Stream the changes
					}
					yield {
						type: 'step_update',
						stepDescription: `Executed: ${stepDescription}`,
						status: 'completed',
					};
				} catch (error: any) {
					console.error(`Toolkit execution failed for step "${stepDescription}":`, error);
					yield {
						type: 'step_update',
						stepDescription: `Failed: ${stepDescription}`,
						status: 'failed',
						error: error.message,
					};
				}
			}

			// 6. Final Result
			yield {
				type: 'final_result',
				workflow: workflowState,
				summary: 'Workflow generation complete.',
			};
			// TODO: Add memory saving logic here if persistence is implemented
		} catch (error: any) {
			console.error('AI Builder Orchestration Error:', error);
			yield {
				type: 'error',
				message: error.message || 'An unexpected error occurred during workflow generation.',
			};
		}
	}
}
