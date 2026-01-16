import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import type { BaseMessage } from '@langchain/core/messages';
import { AIMessage, HumanMessage } from '@langchain/core/messages';
import { ChatPromptTemplate } from '@langchain/core/prompts';
import type { RunnableConfig } from '@langchain/core/runnables';

import {
	buildResponderPrompt,
	buildRecursionErrorWithWorkflowGuidance,
	buildRecursionErrorNoWorkflowGuidance,
	buildGeneralErrorGuidance,
	buildDataTableCreationGuidance,
} from '@/prompts/agents/responder.prompt';

import type { CoordinationLogEntry } from '../types/coordination';
import type { DiscoveryContext } from '../types/discovery-types';
import { isAIMessage } from '../types/langchain';
import type { SimpleWorkflow } from '../types/workflow';
import {
	getErrorEntry,
	getBuilderOutput,
	getConfiguratorOutput,
	hasRecursionErrorsCleared,
} from '../utils/coordination-log';

const DATA_TABLE_NODE_TYPE = 'n8n-nodes-base.dataTable';
const SET_NODE_TYPE = 'n8n-nodes-base.set';

/**
 * Column definition with name and type
 */
export interface ColumnDefinition {
	name: string;
	type: string;
}

/**
 * Information about a Data Table node in the workflow
 */
export interface DataTableInfo {
	/** The node name in the workflow */
	nodeName: string;
	/** The table name/ID (may be a placeholder) */
	tableName: string;
	/** Column definitions with names and types */
	columns: ColumnDefinition[];
	/** Whether columns are auto-mapped from input data */
	isAutoMapped: boolean;
	/** The operation (insert, update, upsert, get, delete) */
	operation?: string;
}

/**
 * Find nodes that connect to a target node
 */
function findPredecessorNodes(workflow: SimpleWorkflow, targetNodeName: string): string[] {
	const predecessors: string[] = [];

	for (const [sourceName, outputs] of Object.entries(workflow.connections)) {
		if (!outputs.main) continue;

		for (const connections of outputs.main) {
			if (!connections) continue;
			for (const connection of connections) {
				if (connection.node === targetNodeName) {
					predecessors.push(sourceName);
				}
			}
		}
	}

	return predecessors;
}

/**
 * Extract field definitions from a Set node's assignments
 */
function extractSetNodeFields(workflow: SimpleWorkflow, nodeName: string): ColumnDefinition[] {
	const node = workflow.nodes.find((n) => n.name === nodeName && n.type === SET_NODE_TYPE);
	if (!node) return [];

	const params = node.parameters ?? {};
	const assignments = params.assignments as
		| { assignments?: Array<{ name: string; type: string }> }
		| undefined;

	if (!assignments?.assignments) return [];

	return assignments.assignments
		.filter((a) => a.name && a.type)
		.map((a) => ({
			name: a.name,
			type: mapSetNodeTypeToDataTableType(a.type),
		}));
}

/**
 * Map Set node field types to Data Table column types
 */
function mapSetNodeTypeToDataTableType(setNodeType: string): string {
	switch (setNodeType) {
		case 'number':
			return 'number';
		case 'boolean':
			return 'boolean';
		case 'string':
		default:
			return 'text';
	}
}

/**
 * Extract data table information from workflow nodes
 * Used to inform users about data tables they need to create manually
 */
function extractDataTableInfo(workflow: SimpleWorkflow): DataTableInfo[] {
	const dataTableNodes = workflow.nodes.filter((node) => node.type === DATA_TABLE_NODE_TYPE);

	return dataTableNodes.map((node) => {
		const params = node.parameters ?? {};

		// Extract table name from dataTableId parameter
		// The structure is: { __rl: true, mode: 'id', value: 'tableName' }
		let tableName = 'unknown';
		const dataTableId = params.dataTableId as { value?: string } | undefined;
		if (dataTableId?.value) {
			tableName = dataTableId.value;
		}

		// Check if columns are auto-mapped or explicitly defined
		const columnsParam = params.columns as
			| { mappingMode?: string; value?: Record<string, unknown> }
			| undefined;
		const isAutoMapped = columnsParam?.mappingMode === 'autoMapInputData';

		let columns: ColumnDefinition[] = [];

		if (!isAutoMapped && columnsParam?.value) {
			// Columns are explicitly defined - extract names (types default to text)
			columns = Object.keys(columnsParam.value).map((name) => ({
				name,
				type: 'text', // Default type when explicitly defined
			}));
		} else if (isAutoMapped) {
			// Try to infer columns from predecessor Set nodes
			const predecessors = findPredecessorNodes(workflow, node.name);
			for (const predecessorName of predecessors) {
				const setFields = extractSetNodeFields(workflow, predecessorName);
				if (setFields.length > 0) {
					columns = setFields;
					break;
				}
			}
		}

		// Get the operation type
		const operation = (params.operation as string) ?? 'insert';

		return {
			nodeName: node.name,
			tableName,
			columns,
			isAutoMapped,
			operation,
		};
	});
}

const systemPrompt = ChatPromptTemplate.fromMessages([
	[
		'system',
		[
			{
				type: 'text',
				text: buildResponderPrompt(),
				cache_control: { type: 'ephemeral' },
			},
		],
	],
	['placeholder', '{messages}'],
]);

export interface ResponderAgentConfig {
	llm: BaseChatModel;
}

/**
 * Context required for the responder to generate a response
 */
export interface ResponderContext {
	/** Conversation messages */
	messages: BaseMessage[];
	/** Coordination log tracking subgraph completion */
	coordinationLog: CoordinationLogEntry[];
	/** Discovery results (nodes found) */
	discoveryContext?: DiscoveryContext | null;
	/** Current workflow state */
	workflowJSON: SimpleWorkflow;
	/** Summary of previous conversation (from compaction) */
	previousSummary?: string;
}

/**
 * Responder Agent
 *
 * Synthesizes final user-facing responses from workflow building context.
 * Handles conversational queries and explanations.
 */
export class ResponderAgent {
	private llm: BaseChatModel;

	constructor(config: ResponderAgentConfig) {
		this.llm = config.llm;
	}

	/**
	 * Build internal context message from coordination log and state
	 */
	private buildContextMessage(context: ResponderContext): HumanMessage | null {
		const contextParts: string[] = [];

		// Previous conversation summary (from compaction)
		if (context.previousSummary) {
			contextParts.push(`**Previous Conversation Summary:**\n${context.previousSummary}`);
		}

		// Check for state management actions (compact/clear)
		const stateManagementEntry = context.coordinationLog.find(
			(e) => e.phase === 'state_management',
		);
		if (stateManagementEntry) {
			contextParts.push(`**State Management:** ${stateManagementEntry.summary}`);
		}

		// Check for errors - provide context-aware guidance (AI-1812)
		// Skip errors that have been cleared (AI-1812)
		const errorEntry = getErrorEntry(context.coordinationLog);
		const errorsCleared = hasRecursionErrorsCleared(context.coordinationLog);

		if (errorEntry && !errorsCleared) {
			const hasWorkflow = context.workflowJSON.nodes.length > 0;
			const errorMessage = errorEntry.summary.toLowerCase();
			const isRecursionError =
				errorMessage.includes('recursion') ||
				errorMessage.includes('maximum number of steps') ||
				errorMessage.includes('iteration limit');

			contextParts.push(
				`**Error:** An error occurred in the ${errorEntry.phase} phase: ${errorEntry.summary}`,
			);

			// AI-1812: Provide better guidance based on workflow state and error type
			if (isRecursionError && hasWorkflow) {
				// Recursion error but workflow was created
				const guidance = buildRecursionErrorWithWorkflowGuidance(context.workflowJSON.nodes.length);
				contextParts.push(...guidance);
			} else if (isRecursionError && !hasWorkflow) {
				// Recursion error and no workflow created
				const guidance = buildRecursionErrorNoWorkflowGuidance();
				contextParts.push(...guidance);
			} else {
				// Other errors (not recursion-related)
				contextParts.push(buildGeneralErrorGuidance());
			}
		}

		// Discovery context
		if (context.discoveryContext?.nodesFound.length) {
			contextParts.push(
				`**Discovery:** Found ${context.discoveryContext.nodesFound.length} relevant nodes`,
			);
		}

		// Builder output
		const builderOutput = getBuilderOutput(context.coordinationLog);
		if (builderOutput) {
			contextParts.push(`**Builder:** ${builderOutput}`);
		} else if (context.workflowJSON.nodes.length) {
			contextParts.push(`**Workflow:** ${context.workflowJSON.nodes.length} nodes created`);
		}

		// Configurator output
		const configuratorOutput = getConfiguratorOutput(context.coordinationLog);
		if (configuratorOutput) {
			contextParts.push(`**Configuration:**\n${configuratorOutput}`);
		}

		// Data Table creation guidance
		// If the workflow contains Data Table nodes, inform user they need to create tables manually
		const dataTableInfo = extractDataTableInfo(context.workflowJSON);
		if (dataTableInfo.length > 0) {
			const dataTableGuidance = buildDataTableCreationGuidance(dataTableInfo);
			contextParts.push(dataTableGuidance);
		}

		if (contextParts.length === 0) {
			return null;
		}

		return new HumanMessage({
			content: `[Internal Context - Use this to craft your response]\n${contextParts.join('\n\n')}`,
		});
	}

	/**
	 * Invoke the responder agent with the given context
	 * @param context - Responder context with messages and workflow state
	 * @param config - Optional RunnableConfig for tracing callbacks
	 */
	async invoke(context: ResponderContext, config?: RunnableConfig): Promise<AIMessage> {
		const agent = systemPrompt.pipe(this.llm);

		const contextMessage = this.buildContextMessage(context);
		const messagesToSend = contextMessage
			? [...context.messages, contextMessage]
			: context.messages;

		const result = await agent.invoke({ messages: messagesToSend }, config);
		if (!isAIMessage(result)) {
			return new AIMessage({
				content: 'I encountered an issue generating a response. Please try again.',
			});
		}
		return result;
	}
}
