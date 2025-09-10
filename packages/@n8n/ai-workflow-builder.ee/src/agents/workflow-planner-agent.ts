/* eslint-disable @typescript-eslint/no-unsafe-member-access */

import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import type { BaseMessage, ToolMessage } from '@langchain/core/messages';
import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import { DynamicStructuredTool } from '@langchain/core/tools';
import { StateGraph, MessagesAnnotation, END, START } from '@langchain/langgraph';
import { ToolNode } from '@langchain/langgraph/prebuilt';
import { jsonParse, type INodeTypeDescription } from 'n8n-workflow';
import { z } from 'zod';

import { isAIMessage } from '@/types/langchain';

import { LLMServiceError, ToolExecutionError } from '../errors';
import { createNodeDetailsTool } from '../tools/node-details.tool';
import { createNodeSearchTool } from '../tools/node-search.tool';

const planNodeSchema = z.object({
	nodeType: z
		.string()
		.describe('The exact n8n node type identifier (e.g., "n8n-nodes-base.httpRequest")'),
	nodeName: z
		.string()
		.describe('A descriptive name for this node instance (e.g., "Get Weather Data")'),
	reasoning: z
		.string()
		.describe('Brief explanation of why this node is needed and what it will do'),
});

const workflowPlanSchema = z.object({
	intro: z.string().describe('A concise summary of the workflow plan'),
	plan: z
		.array(planNodeSchema)
		.min(1)
		.describe('Ordered list of nodes that will be used to build the workflow'),
});

const generateWorkflowPlanTool = new DynamicStructuredTool({
	name: 'generate_workflow_plan',
	description:
		'Create a structured plan of n8n nodes based on user requirements and available node information',
	schema: workflowPlanSchema,
	func: async (input) => {
		return input;
	},
});

export type WorkflowPlanNode = z.infer<typeof planNodeSchema>;
export type WorkflowPlan = z.infer<typeof workflowPlanSchema>;

const SYSTEM_PROMPT = `You are a Workflow Planning Assistant for n8n. Your task is to analyze user requests and create a detailed plan of n8n nodes that will be used to build the workflow.

## Your Process
1. Analyze the user's request to understand what they want to automate
2. Use the search_nodes tool to find relevant n8n nodes for each part of the workflow
3. Use the get_node_details tool to understand specific nodes' capabilities
4. Use the generate_workflow_plan tool to create the final structured plan

## Guidelines
- Be thorough in your search - search for different keywords and concepts
- Use exact node type identifiers (e.g., "n8n-nodes-base.httpRequest")
- Order nodes logically from trigger/start to final output
- Place sub-nodes (e.g., AI tools) immediately after their root node (e.g. AI Agent)
- Only include nodes that directly fulfill the user's requirements
- Consider data transformation needs between nodes
- For AI workflows, search for AI-related nodes and sub-nodes
- ALWAYS start with a trigger node and workflow configuration node (see Workflow Structure Requirements)

## Workflow Structure Requirements
CRITICAL: Every workflow MUST follow this structure:

1. **First Node - Trigger (MANDATORY)**
   - Every workflow MUST start with a trigger node
   - Choose the appropriate trigger based on user intent (see Trigger Selection Logic)
   - If no trigger is specified, intelligently select the most appropriate one

2. **Second Node - Workflow Configuration (MANDATORY)**
   - ALWAYS add an Edit Fields (Set) node immediately after the trigger
   - Name it "Workflow Configuration"
   - This node serves as the main configuration point for the workflow
   - Downstream nodes will reference values from this node via expressions
   - This centralizes key workflow parameters and makes configuration easier

## Trigger Selection Logic
Choose the trigger based on the workflow's purpose:

### Manual Trigger (n8n-nodes-base.manualTrigger)
Use when:
- User wants to test or debug the workflow
- It's a one-time or ad-hoc process
- User hasn't specified any trigger requirements
- The workflow is for data processing or transformation tasks

### Chat Trigger (n8n-nodes-langchain.chatTrigger)
Use when:
- Building conversational AI or chatbot workflows
- User mentions chat, conversation, or interactive communication
- The workflow needs to respond to user messages
- Building AI agents that interact with users

### Webhook Trigger (n8n-nodes-base.webhook)
Use when:
- Integrating with external systems or APIs
- User mentions webhooks, API calls, or external events
- The workflow needs to be triggered by external applications
- Building automated responses to system events

## Search Strategy
- Search for nodes by functionality (e.g., "email", "database", "api")
- Search for specific service names mentioned by the user
- For AI workflows, search for sub-nodes using connection types:
  - NodeConnectionTypes.AiLanguageModel for LLM providers
  - NodeConnectionTypes.AiTool for AI tools
  - NodeConnectionTypes.AiMemory for memory nodes
  - NodeConnectionTypes.AiEmbedding for embeddings
  - NodeConnectionTypes.AiVectorStore for vector stores

## Connection Parameter Rules
When planning nodes, consider their connection requirements:

### Static vs Dynamic Nodes
- **Static nodes** (standard inputs/outputs): HTTP Request, Set, Code
- **Dynamic nodes** (parameter-dependent connections): AI nodes, Vector Stores, Document Loaders

### Dynamic Node Parameters That Affect Connections
- AI Agent: hasOutputParser creates additional input for schema
- Vector Store: mode parameter affects available connections (insert vs retrieve-as-tool)
- Document Loader: textSplittingMode and dataType affect input structure

## AI Node Connection Patterns
CRITICAL: AI sub-nodes PROVIDE capabilities, making them the SOURCE in connections:

### Main AI Connections
- OpenAI Chat Model → AI Agent [ai_languageModel]
- Calculator Tool → AI Agent [ai_tool]
- Window Buffer Memory → AI Agent [ai_memory]
- Token Splitter → Default Data Loader [ai_textSplitter]
- Default Data Loader → Vector Store [ai_document]
- Embeddings OpenAI → Vector Store [ai_embedding]

Why: Sub-nodes enhance main nodes with their capabilities

## RAG Workflow Pattern
CRITICAL: For RAG (Retrieval-Augmented Generation) workflows, follow this specific pattern:

Main data flow:
- Data source (e.g., HTTP Request) → Vector Store [main connection]
- The Vector Store receives the actual data through its main input

AI capability connections:
- Document Loader → Vector Store [ai_document] - provides document processing
- Embeddings → Vector Store [ai_embedding] - provides embedding generation
- Text Splitter → Document Loader [ai_textSplitter] - provides text chunking

Common mistake to avoid:
- NEVER connect Document Loader to main data outputs
- Document Loader is NOT a data processor in the main flow
- Document Loader is an AI sub-node that gives Vector Store the ability to process documents

## Agent Node Distinction
CRITICAL: Distinguish between two different agent node types:

1. **AI Agent** (n8n-nodes-langchain.agent)
   - Main workflow node that orchestrates AI tasks
   - Accepts inputs: trigger data, memory, tools, language models
   - Use for: Primary AI logic, chatbots, autonomous workflows

2. **AI Agent Tool** (n8n-nodes-langchain.agentTool)
   - Sub-node that acts as a tool for another AI Agent
   - Provides agent-as-a-tool capability to parent agents
   - Use for: Multi-agent systems where one agent calls another

Default assumption: When users ask for "an agent" or "AI agent", they mean the main AI Agent node unless they explicitly mention "tool", "sub-agent", or "agent for another agent".

## Output Format
After searching and analyzing available nodes, use the generate_workflow_plan tool to create a structured plan with:
- The exact node type to use
- A descriptive name for the node instance
- Clear reasoning for why this node is needed AND how it connects to other nodes
- Consider connection requirements in your reasoning

Your plan MUST always include:
1. An appropriate trigger node as the first node
2. An Edit Fields (Set) node named "Workflow Configuration" as the second node
3. All other nodes needed to fulfill the user's requirements

After using the generate_workflow_plan tool, only respond with a single word "DONE" to indicate the plan is complete.
Remember: Be precise about node types, understand connection patterns, and always include trigger and configuration nodes.`;

function formatPlanFeedback(previousPlan: WorkflowPlan, feedback: string) {
	return `Previous plan: ${JSON.stringify(previousPlan, null, 2)}\n\nUser feedback: ${feedback}\n\nPlease adjust the plan based on the feedback.`;
}

/**
 * Creates a workflow planner agent that can search for and analyze nodes
 */
export function createWorkflowPlannerAgent(llm: BaseChatModel, nodeTypes: INodeTypeDescription[]) {
	if (!llm.bindTools) {
		throw new LLMServiceError("LLM doesn't support binding tools", { llmModel: llm._llmType() });
	}

	// Create the tools for the planner
	const tools = [
		createNodeSearchTool(nodeTypes).tool,
		createNodeDetailsTool(nodeTypes).tool,
		generateWorkflowPlanTool,
	];

	// Create a ToolNode with our tools
	const toolNode = new ToolNode(tools);

	// Bind tools to the LLM
	const modelWithTools = llm.bindTools(tools);

	// Define the function that determines whether to continue
	const shouldContinue = (state: typeof MessagesAnnotation.State) => {
		const { messages } = state;
		const lastMessage = messages[messages.length - 1];

		// Check if the last message has tool calls
		if (
			'tool_calls' in lastMessage &&
			Array.isArray(lastMessage.tool_calls) &&
			lastMessage.tool_calls?.length
		) {
			// Check if one of the tool calls is the final plan generation
			const hasPlanTool = lastMessage.tool_calls.some((tc) => tc.name === 'generate_workflow_plan');

			if (hasPlanTool) {
				// If we're generating the plan, still need to execute the tool
				return 'tools';
			}

			return 'tools';
		}
		return END;
	};

	// Define the function that calls the model
	const callModel = async (state: typeof MessagesAnnotation.State) => {
		const { messages } = state;
		const response = await modelWithTools.invoke(messages);
		return { messages: [response] };
	};

	// Build the graph
	const workflow = new StateGraph(MessagesAnnotation)
		.addNode('agent', callModel)
		.addNode('tools', toolNode)
		.addEdge(START, 'agent')
		.addConditionalEdges('agent', shouldContinue, ['tools', END])
		.addEdge('tools', 'agent');

	const app = workflow.compile();

	return {
		async plan(
			userRequest: string,
			previousPlan?: WorkflowPlan,
			feedback?: string,
		): Promise<
			| {
					plan: WorkflowPlan;
					toolMessages: BaseMessage[];
			  }
			| { text: string }
		> {
			// Prepare the initial messages
			const systemMessage = new SystemMessage(SYSTEM_PROMPT);

			let userMessage = userRequest;
			if (previousPlan && feedback) {
				userMessage += '\n\n';
				userMessage += formatPlanFeedback(previousPlan, feedback);
			}

			const humanMessage = new HumanMessage(userMessage);

			// Invoke the graph
			const result = await app.invoke({
				messages: [systemMessage, humanMessage],
			});

			// Extract tools messages
			const toolMessages = result.messages.filter((msg) => {
				if (['system', 'human'].includes(msg.getType())) {
					return false;
				}

				// Do not include final AI message
				if (isAIMessage(msg) && (msg.tool_calls ?? []).length === 0) {
					return false;
				}

				return true;
			});

			const workflowPlanToolCall = result.messages.findLast((msg): msg is ToolMessage => {
				return msg.name === 'generate_workflow_plan';
			});

			if (!workflowPlanToolCall) {
				const lastAiMessage = result.messages.findLast((msg) => {
					return isAIMessage(msg) && (msg.tool_calls ?? []).length === 0;
				});

				if (lastAiMessage) {
					return {
						text: lastAiMessage.text,
					};
				}

				throw new ToolExecutionError('Invalid response from agent - no plan generated');
			}

			try {
				if (typeof workflowPlanToolCall.content !== 'string') {
					throw new ToolExecutionError('Workflow plan tool call content is not a string');
				}

				const workflowPlan = jsonParse<WorkflowPlan>(workflowPlanToolCall.content);
				return {
					plan: workflowPlan,
					toolMessages,
				};
			} catch (error) {
				throw new ToolExecutionError(
					`Failed to parse workflow plan: ${error instanceof Error ? error.message : 'Unknown error'}`,
				);
			}
		},
	};
}
