import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import type { BaseMessage, AIMessage, ToolMessage } from '@langchain/core/messages';
import { isAIMessage } from '@langchain/core/messages';
import { ChatPromptTemplate } from '@langchain/core/prompts';
import type { Runnable } from '@langchain/core/runnables';
import { tool, type StructuredTool } from '@langchain/core/tools';
import { Annotation, StateGraph, END } from '@langchain/langgraph';
import type { Logger } from '@n8n/backend-common';
import type { INodeTypeDescription } from 'n8n-workflow';
import { z } from 'zod';

import { LLMServiceError } from '@/errors';
import {
	TechniqueDescription,
	WorkflowTechnique,
	type WorkflowTechniqueType,
} from '@/types/categorization';
import type { BuilderFeatureFlags } from '@/workflow-builder-agent';

import { BaseSubgraph } from './subgraph-interface';
import type { ParentGraphState } from '../parent-graph-state';
import { createGetBestPracticesTool } from '../tools/get-best-practices.tool';
import { createGetWorkflowExamplesTool } from '../tools/get-workflow-examples.tool';
import { createNodeDetailsTool } from '../tools/node-details.tool';
import { createNodeSearchTool } from '../tools/node-search.tool';
import type { CoordinationLogEntry } from '../types/coordination';
import { createDiscoveryMetadata } from '../types/coordination';
import type { NodeConfigurationsMap } from '../types/tools';
import { applySubgraphCacheMarkers } from '../utils/cache-control';
import { buildWorkflowSummary, createContextMessage } from '../utils/context-builders';
import { appendArrayReducer, nodeConfigurationsReducer } from '../utils/state-reducers';
import { executeSubgraphTools, extractUserRequest } from '../utils/subgraph-helpers';

/**
 * Example categorizations to guide technique selection
 * Expanded with diverse examples to improve accuracy
 */
const exampleCategorizations: Array<{
	prompt: string;
	techniques: WorkflowTechniqueType[];
}> = [
	{
		prompt: 'Monitor social channels for product mentions and auto-respond with campaign messages',
		techniques: [
			WorkflowTechnique.MONITORING,
			WorkflowTechnique.CHATBOT,
			WorkflowTechnique.CONTENT_GENERATION,
		],
	},
	{
		prompt: 'Collect partner referral submissions and verify client instances via BigQuery',
		techniques: [
			WorkflowTechnique.FORM_INPUT,
			WorkflowTechnique.HUMAN_IN_THE_LOOP,
			WorkflowTechnique.NOTIFICATION,
		],
	},
	{
		prompt: 'Scrape competitor pricing pages weekly and generate a summary report of changes',
		techniques: [
			WorkflowTechnique.SCHEDULING,
			WorkflowTechnique.SCRAPING_AND_RESEARCH,
			WorkflowTechnique.DATA_EXTRACTION,
			WorkflowTechnique.DATA_ANALYSIS,
		],
	},
	{
		prompt: 'Process uploaded PDF contracts to extract client details and update CRM records',
		techniques: [
			WorkflowTechnique.DOCUMENT_PROCESSING,
			WorkflowTechnique.DATA_EXTRACTION,
			WorkflowTechnique.DATA_TRANSFORMATION,
			WorkflowTechnique.ENRICHMENT,
		],
	},
	{
		prompt: 'Build a searchable internal knowledge base from past support tickets',
		techniques: [
			WorkflowTechnique.DATA_TRANSFORMATION,
			WorkflowTechnique.DATA_ANALYSIS,
			WorkflowTechnique.KNOWLEDGE_BASE,
		],
	},
	// Additional examples to address common misclassifications
	{
		prompt: 'Create an AI agent that writes and sends personalized emails to leads',
		techniques: [WorkflowTechnique.CONTENT_GENERATION, WorkflowTechnique.NOTIFICATION],
	},
	{
		prompt:
			'Fetch trending topics from Google Trends and Reddit, select the best ones, and create social posts',
		techniques: [
			WorkflowTechnique.SCRAPING_AND_RESEARCH,
			WorkflowTechnique.TRIAGE,
			WorkflowTechnique.CONTENT_GENERATION,
		],
	},
	{
		prompt:
			'Trigger when a new contact is created in HubSpot and enrich their profile with LinkedIn data',
		techniques: [WorkflowTechnique.MONITORING, WorkflowTechnique.ENRICHMENT],
	},
	{
		prompt: 'Get stock prices from financial APIs and analyze volatility patterns',
		techniques: [WorkflowTechnique.SCRAPING_AND_RESEARCH, WorkflowTechnique.DATA_ANALYSIS],
	},
	{
		prompt: 'Generate video reels from templates and auto-post to social media on schedule',
		techniques: [
			WorkflowTechnique.SCHEDULING,
			WorkflowTechnique.DOCUMENT_PROCESSING,
			WorkflowTechnique.CONTENT_GENERATION,
		],
	},
	{
		prompt: 'Receive news from Telegram channels, filter relevant ones, and forward to my channel',
		techniques: [
			WorkflowTechnique.MONITORING,
			WorkflowTechnique.TRIAGE,
			WorkflowTechnique.NOTIFICATION,
		],
	},
	{
		prompt: 'Analyze YouTube video performance data and generate a weekly report',
		techniques: [
			WorkflowTechnique.SCRAPING_AND_RESEARCH,
			WorkflowTechnique.DATA_ANALYSIS,
			WorkflowTechnique.DATA_TRANSFORMATION,
		],
	},
	{
		prompt:
			'Create a chatbot that answers questions using data from a Google Sheet as knowledge base',
		techniques: [WorkflowTechnique.CHATBOT, WorkflowTechnique.KNOWLEDGE_BASE],
	},
	{
		prompt: 'Form submission with file upload triggers document extraction and approval workflow',
		techniques: [
			WorkflowTechnique.FORM_INPUT,
			WorkflowTechnique.DOCUMENT_PROCESSING,
			WorkflowTechnique.HUMAN_IN_THE_LOOP,
		],
	},
];

/**
 * Format technique descriptions for prompt
 */
function formatTechniqueList(): string {
	return Object.entries(TechniqueDescription)
		.map(([key, description]) => `- **${key}**: ${description}`)
		.join('\n');
}

/**
 * Format example categorizations for prompt
 */
function formatExampleCategorizations(): string {
	return exampleCategorizations
		.map((example) => `- ${example.prompt} → ${example.techniques.join(', ')}`)
		.join('\n');
}

/**
 * Strict Output Schema for Discovery
 * Simplified to reduce token usage while maintaining utility for downstream subgraphs
 */
const discoveryOutputSchema = z.object({
	nodesFound: z
		.array(
			z.object({
				nodeName: z.string().describe('The internal name of the node (e.g., n8n-nodes-base.gmail)'),
				version: z
					.number()
					.describe('The version number of the node (e.g., 1, 1.1, 2, 3, 3.2, etc.)'),
				reasoning: z.string().describe('Why this node is relevant for the workflow'),
				connectionChangingParameters: z
					.array(
						z.object({
							name: z
								.string()
								.describe('Parameter name (e.g., "mode", "operation", "hasOutputParser")'),
							possibleValues: z
								.array(z.union([z.string(), z.boolean(), z.number()]))
								.describe('Possible values this parameter can take'),
						}),
					)
					.describe(
						'Parameters that affect node connections (inputs/outputs). ONLY include if parameter appears in <input> or <output> expressions',
					),
			}),
		)
		.describe('List of n8n nodes identified as necessary for the workflow'),
});

interface DiscoveryPromptOptions {
	includeExamples: boolean;
}

/**
 * Generate the process steps with proper numbering
 */
function generateProcessSteps(options: DiscoveryPromptOptions): string {
	const { includeExamples } = options;

	const steps: string[] = [
		'**Analyze user prompt** - Extract services, models, and technologies mentioned',
		'**Call get_best_practices** with identified techniques (internal context)',
	];

	if (includeExamples) {
		steps.push('**Call get_workflow_examples** with search queries for mentioned services/models');
	}

	const examplesContext = includeExamples ? ', and examples' : '';
	steps.push(
		`**Identify workflow components** from user request, best practices${examplesContext}`,
		'**Call search_nodes IN PARALLEL** for all components (e.g., "Gmail", "OpenAI", "Schedule")',
		'**Call get_node_details IN PARALLEL** for ALL promising nodes (batch multiple calls)',
		`**Extract node information** from each node_details response:
   - Node name from <name> tag
   - Version number from <version> tag (required - extract the number)
   - Connection-changing parameters from <connections> section`,
		'**Call submit_discovery_results** with complete nodesFound array',
	);

	return steps.map((step, index) => `${index + 1}. ${step}`).join('\n');
}

/**
 * Generate available tools list based on feature flags
 */
function generateAvailableToolsList(options: DiscoveryPromptOptions): string {
	const { includeExamples } = options;

	const tools = [
		'- get_best_practices: Retrieve best practices (internal context)',
		'- search_nodes: Find n8n nodes by keyword',
		'- get_node_details: Get complete node information including <connections>',
	];

	if (includeExamples) {
		tools.push('- get_workflow_examples: Search for workflow examples as reference');
	}

	tools.push('- submit_discovery_results: Submit final results');

	return tools.join('\n');
}

/**
 * Discovery Agent Prompt
 */
function generateDiscoveryPrompt(options: DiscoveryPromptOptions): string {
	const availableTools = generateAvailableToolsList(options);
	const processSteps = generateProcessSteps(options);

	return `You are a Discovery Agent for n8n AI Workflow Builder.

YOUR ROLE: Identify relevant n8n nodes and their connection-changing parameters.

AVAILABLE TOOLS:
${availableTools}

PROCESS:
${processSteps}

TECHNIQUE CATEGORIZATION:
When calling get_best_practices, select techniques that match the user's workflow intent.

<available_techniques>
{techniques}
</available_techniques>

<example_categorizations>
{exampleCategorizations}
</example_categorizations>

<technique_clarifications>
Common distinctions to get right:
- **NOTIFICATION vs CHATBOT**: Use NOTIFICATION when SENDING emails/messages/alerts (including to Telegram CHANNELS which are broadcast-only). Use CHATBOT only when RECEIVING and REPLYING to direct messages in a conversation.
- **MONITORING**: Use when workflow TRIGGERS on external events (new record created, status changed, incoming webhook, new message in channel). NOT just scheduled runs.
- **SCRAPING_AND_RESEARCH vs DATA_EXTRACTION**: Use SCRAPING when fetching from EXTERNAL sources (APIs, websites, social media). Use DATA_EXTRACTION for parsing INTERNAL data you already have.
- **TRIAGE**: Use when SELECTING, PRIORITIZING, ROUTING, or QUALIFYING items (e.g., "pick the best", "route to correct team", "qualify leads").
- **DOCUMENT_PROCESSING**: Use for ANY file handling - PDFs, images, videos, Excel, Google Sheets, audio files, file uploads in forms.
- **HUMAN_IN_THE_LOOP**: Use when workflow PAUSES for human approval, review, signing documents, responding to polls, or any manual input before continuing.
- **DATA_ANALYSIS**: Use when ANALYZING, CLASSIFYING, IDENTIFYING PATTERNS, or UNDERSTANDING data (e.g., "analyze outcomes", "learn from previous", "classify by type", "identify trends").
- **KNOWLEDGE_BASE**: Use when storing/retrieving from a DATA SOURCE for Q&A - includes vector DBs, spreadsheets used as databases, document collections.
- **DATA_TRANSFORMATION**: Use when CONVERTING data format, creating REPORTS/SUMMARIES from analyzed data, or restructuring output.
</technique_clarifications>

Technique selection rules:
- Select ALL techniques that apply (most workflows use 2-4)
- Maximum 5 techniques
- Only select techniques you're confident apply

CONNECTION-CHANGING PARAMETERS - CRITICAL RULES:

A parameter is connection-changing ONLY IF it appears in <input> or <output> expressions within <node_details>.

**How to identify:**
1. Look at the <connections> section in node details
2. Check if <input> or <output> uses expressions like: ={{...parameterName...}}
3. If a parameter is referenced in these expressions, it IS connection-changing
4. If a parameter is NOT in <input>/<output> expressions, it is NOT connection-changing

**Example from AI Agent:**
\`\`\`xml
<input>={{...hasOutputParser, needsFallback...}}</input>
\`\`\`
→ hasOutputParser and needsFallback ARE connection-changing (they control which inputs appear)

**Counter-example:**
\`\`\`xml
<properties>
  <property name="promptType">...</property>  <!-- NOT in <input>/<output> -->
  <property name="systemMessage">...</property>  <!-- NOT in <input>/<output> -->
</properties>
\`\`\`
→ promptType and systemMessage are NOT connection-changing (they don't affect connections)

**Common connection-changing parameters:**
- Vector Store: mode (appears in <input>/<output> expressions)
- AI Agent: hasOutputParser, needsFallback (appears in <input> expression)
- Merge: numberInputs (appears in <input> expression)
- Webhook: responseMode (appears in <output> expression)

<dynamic_output_nodes>
Some nodes have DYNAMIC outputs that depend on parameter values:

**Switch Node** (n8n-nodes-base.switch):
- When mode is "rules", the number of outputs equals the number of routing rules
- Connection parameter: mode: "rules" - CRITICAL for enabling rule-based routing
- Each rule in rules.values[] creates one output
- The rules parameter uses the same filter structure as IF node conditions
- ALWAYS flag mode as connection-changing with possibleValues: ["rules", "expression"]

**Merge Node** (n8n-nodes-base.merge):
- numberInputs parameter controls how many inputs the node accepts

When you find these nodes, ALWAYS flag mode/numberInputs as connection-changing parameters with possibleValues.
</dynamic_output_nodes>

SUB-NODES SEARCHES:
When searching for AI nodes, ALSO search for their required sub-nodes:
- "AI Agent" → also search for "Chat Model", "Memory", "Output Parser"
- "Basic LLM Chain" → also search for "Chat Model", "Output Parser"
- "Vector Store" → also search for "Embeddings", "Document Loader"

STRUCTURED OUTPUT PARSER - WHEN TO INCLUDE:
Search for "Structured Output Parser" (@n8n/n8n-nodes-langchain.outputParserStructured) when:
- AI output will be used programmatically (conditions, formatting, database storage, API calls)
- AI needs to extract specific fields (e.g., score, category, priority, action items)
- AI needs to classify/categorize data into defined categories
- Downstream nodes need to access specific fields from AI response (e.g., $json.score, $json.category)
- Output will be displayed in a formatted way (e.g., HTML email with specific sections)
- Data needs validation against a schema before processing


- Always use search_nodes to find the exact node names and versions - NEVER guess versions

CRITICAL RULES:
- NEVER ask clarifying questions
- ALWAYS call get_best_practices first
- THEN Call search_nodes to learn about available nodes and their inputs and outputs
- FINALLY call get_node_details IN PARALLEL for speed to get more details about RELVANT node
- ALWAYS extract version number from <version> tag in node details
- NEVER guess node versions - always use search_nodes to find exact versions
- ONLY flag connectionChangingParameters if they appear in <input> or <output> expressions
- If no parameters appear in connection expressions, return empty array []
- Output ONLY: nodesFound with {{ nodeName, version, reasoning, connectionChangingParameters }}

DO NOT:
- Output text commentary between tool calls
- Include bestPractices or categorization in submit_discovery_results
- Flag parameters that don't affect connections
- Stop without calling submit_discovery_results
`;
}

/**
 * Discovery Subgraph State
 */
export const DiscoverySubgraphState = Annotation.Root({
	// Input: What the user wants to build
	userRequest: Annotation<string>({
		reducer: (x, y) => y ?? x,
		default: () => '',
	}),

	// Internal: Conversation within this subgraph
	messages: Annotation<BaseMessage[]>({
		reducer: (x, y) => x.concat(y),
		default: () => [],
	}),

	// Output: Found nodes with version, reasoning and connection-changing parameters
	nodesFound: Annotation<
		Array<{
			nodeName: string;
			version: number;
			reasoning: string;
			connectionChangingParameters: Array<{
				name: string;
				possibleValues: Array<string | boolean | number>;
			}>;
		}>
	>({
		reducer: (x, y) => y ?? x,
		default: () => [],
	}),

	// Output: Best practices documentation
	bestPractices: Annotation<string | undefined>({
		reducer: (x, y) => y ?? x,
	}),

	// Output: Template IDs fetched from workflow examples for telemetry
	templateIds: Annotation<number[]>({
		reducer: appendArrayReducer,
		default: () => [],
	}),

	// Output: Node configurations collected from workflow examples
	// Used to provide example parameter configurations when get_node_details is called
	nodeConfigurations: Annotation<NodeConfigurationsMap>({
		reducer: nodeConfigurationsReducer,
		default: () => ({}),
	}),
});

export interface DiscoverySubgraphConfig {
	parsedNodeTypes: INodeTypeDescription[];
	llm: BaseChatModel;
	logger?: Logger;
	featureFlags?: BuilderFeatureFlags;
}

export class DiscoverySubgraph extends BaseSubgraph<
	DiscoverySubgraphConfig,
	typeof DiscoverySubgraphState.State,
	typeof ParentGraphState.State
> {
	name = 'discovery_subgraph';
	description = 'Discovers nodes and context for the workflow';

	private agent!: Runnable;
	private toolMap!: Map<string, StructuredTool>;
	private logger?: Logger;

	create(config: DiscoverySubgraphConfig) {
		this.logger = config.logger;

		// Check if template examples are enabled
		const includeExamples = config.featureFlags?.templateExamples === true;

		// Create base tools
		const baseTools = [
			createGetBestPracticesTool(),
			createNodeSearchTool(config.parsedNodeTypes),
			createNodeDetailsTool(config.parsedNodeTypes),
		];

		// Conditionally add workflow examples tool if feature flag is enabled
		const tools = includeExamples
			? [...baseTools, createGetWorkflowExamplesTool(config.logger)]
			: baseTools;

		this.toolMap = new Map(tools.map((bt) => [bt.tool.name, bt.tool]));

		// Define output tool
		const submitTool = tool(() => {}, {
			name: 'submit_discovery_results',
			description: 'Submit the final discovery results',
			schema: discoveryOutputSchema,
		});

		// Generate prompt based on feature flags
		const discoveryPrompt = generateDiscoveryPrompt({ includeExamples });

		// Create agent with tools bound (including submit tool)
		const systemPrompt = ChatPromptTemplate.fromMessages([
			[
				'system',
				[
					{
						type: 'text',
						text: discoveryPrompt,
						cache_control: { type: 'ephemeral' },
					},
				],
			],
			['human', '{prompt}'],
			['placeholder', '{messages}'],
		]);

		if (typeof config.llm.bindTools !== 'function') {
			throw new LLMServiceError('LLM does not support tools', {
				llmModel: config.llm._llmType(),
			});
		}

		// Bind all tools including the output tool
		const allTools = [...tools.map((bt) => bt.tool), submitTool];
		this.agent = systemPrompt.pipe(config.llm.bindTools(allTools));

		// Build the subgraph
		const subgraph = new StateGraph(DiscoverySubgraphState)
			.addNode('agent', this.callAgent.bind(this))
			.addNode('tools', async (state) => await executeSubgraphTools(state, this.toolMap))
			.addNode('format_output', this.formatOutput.bind(this))
			.addEdge('__start__', 'agent')
			// Conditional: tools if has tool calls, format_output if submit called
			.addConditionalEdges('agent', this.shouldContinue.bind(this), {
				tools: 'tools',
				format_output: 'format_output',
				end: END, // Fallback
			})
			.addEdge('tools', 'agent') // After tools, go back to agent
			.addEdge('format_output', END); // After formatting, END

		return subgraph.compile();
	}

	/**
	 * Agent node - calls discovery agent
	 * Context is already in messages from transformInput
	 */
	private async callAgent(state: typeof DiscoverySubgraphState.State) {
		// Apply cache markers to accumulated messages (for tool loop iterations)
		if (state.messages.length > 0) {
			applySubgraphCacheMarkers(state.messages);
		}

		// Messages already contain context from transformInput
		const response = (await this.agent.invoke({
			messages: state.messages,
			prompt: state.userRequest,
			techniques: formatTechniqueList(),
			exampleCategorizations: formatExampleCategorizations(),
		})) as AIMessage;

		return { messages: [response] };
	}

	/**
	 * Format the output from the submit tool call
	 * No hydration - just return raw node names. Subgraphs will hydrate if needed.
	 */
	private formatOutput(state: typeof DiscoverySubgraphState.State) {
		const lastMessage = state.messages.at(-1);
		let output: z.infer<typeof discoveryOutputSchema> | undefined;

		if (lastMessage && isAIMessage(lastMessage) && lastMessage.tool_calls) {
			const submitCall = lastMessage.tool_calls.find(
				(tc) => tc.name === 'submit_discovery_results',
			);
			if (submitCall) {
				output = submitCall.args as z.infer<typeof discoveryOutputSchema>;
			}
		}

		if (!output) {
			this.logger?.error('[Discovery] No submit tool call found in last message');
			return {
				nodesFound: [],
				templateIds: [],
			};
		}

		const bestPracticesTool = state.messages.find(
			(m): m is ToolMessage => m.getType() === 'tool' && m?.text?.startsWith('<best_practices>'),
		);

		// Return raw output without hydration, including templateIds and nodeConfigurations from workflow examples
		return {
			nodesFound: output.nodesFound,
			bestPractices: bestPracticesTool?.text,
			templateIds: state.templateIds ?? [],
			nodeConfigurations: state.nodeConfigurations ?? {},
		};
	}

	/**
	 * Should continue with tools or finish?
	 */
	private shouldContinue(state: typeof DiscoverySubgraphState.State) {
		const lastMessage = state.messages[state.messages.length - 1];

		if (
			lastMessage &&
			isAIMessage(lastMessage) &&
			lastMessage.tool_calls &&
			lastMessage.tool_calls.length > 0
		) {
			// Check if the submit tool was called
			const submitCall = lastMessage.tool_calls.find(
				(tc) => tc.name === 'submit_discovery_results',
			);
			if (submitCall) {
				return 'format_output';
			}
			return 'tools';
		}

		// No tool calls = agent is done (or failed to call tool)
		// In this pattern, we expect a tool call. If none, we might want to force it or just end.
		// For now, let's treat it as an end, but ideally we'd reprompt.
		this.logger?.warn('[Discovery Subgraph] Agent stopped without submitting results');
		return 'end';
	}

	transformInput(parentState: typeof ParentGraphState.State) {
		const userRequest = extractUserRequest(parentState.messages, 'Build a workflow');

		// Build context parts for Discovery
		const contextParts: string[] = [];

		// 1. User request (primary)
		contextParts.push('<user_request>');
		contextParts.push(userRequest);
		contextParts.push('</user_request>');

		// 2. Current workflow summary (just node names, to know what exists)
		// Discovery doesn't need full JSON, just awareness of existing nodes
		if (parentState.workflowJSON.nodes.length > 0) {
			contextParts.push('<existing_workflow_summary>');
			contextParts.push(buildWorkflowSummary(parentState.workflowJSON));
			contextParts.push('</existing_workflow_summary>');
		}

		// Create initial message with context
		const contextMessage = createContextMessage(contextParts);

		return {
			userRequest,
			messages: [contextMessage], // Context already in messages
		};
	}

	transformOutput(
		subgraphOutput: typeof DiscoverySubgraphState.State,
		_parentState: typeof ParentGraphState.State,
	) {
		const nodesFound = subgraphOutput.nodesFound || [];
		const templateIds = subgraphOutput.templateIds || [];
		const nodeConfigurations = subgraphOutput.nodeConfigurations || {};
		const discoveryContext = {
			nodesFound,
			bestPractices: subgraphOutput.bestPractices,
			nodeConfigurations,
		};

		// Create coordination log entry (not a message)
		const logEntry: CoordinationLogEntry = {
			phase: 'discovery',
			status: 'completed',
			timestamp: Date.now(),
			summary: `Discovered ${nodesFound.length} nodes`,
			metadata: createDiscoveryMetadata({
				nodesFound: nodesFound.length,
				nodeTypes: nodesFound.map((n) => n.nodeName),
				hasBestPractices: !!subgraphOutput.bestPractices,
			}),
		};

		return {
			discoveryContext,
			coordinationLog: [logEntry],
			// Pass template IDs for telemetry
			templateIds,
			// Pass node configurations for example parameters in node details
			nodeConfigurations,
		};
	}
}
