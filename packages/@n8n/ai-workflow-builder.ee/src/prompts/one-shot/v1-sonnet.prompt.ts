/**
 * One-Shot Workflow Code Generator Prompt
 *
 * System prompt for the one-shot agent that generates complete workflows
 * in TypeScript SDK format in a single pass.
 *
 * POC with extensive debug logging for development.
 */

import { ChatPromptTemplate } from '@langchain/core/prompts';
import { generateWorkflowCode } from '@n8n/workflow-sdk';
import type { WorkflowJSON } from '@n8n/workflow-sdk';
import { inspect } from 'node:util';

import type { NodeWithDiscriminators } from '../../utils/node-type-parser';

/**
 * Debug logging helper for prompt builder
 * Uses util.inspect for terminal-friendly output with full depth
 */
function debugLog(message: string, data?: Record<string, unknown>): void {
	const timestamp = new Date().toISOString();
	const prefix = `[ONE-SHOT-AGENT][${timestamp}][PROMPT]`;
	if (data) {
		const formatted = inspect(data, {
			depth: null,
			colors: true,
			maxStringLength: null,
			maxArrayLength: null,
			breakLength: 120,
		});
		console.log(`${prefix} ${message}\n${formatted}`);
	} else {
		console.log(`${prefix} ${message}`);
	}
}

/**
 * Role and capabilities of the agent - optimized for Sonnet 4.5
 */
const ROLE =
	'You are an expert n8n workflow builder. Your task is to generate complete, executable TypeScript code for n8n workflows using the n8n Workflow SDK. You will receive a user request describing the desired workflow, and you must produce valid TypeScript code that creates that workflow.';

/**
 * Escape curly brackets for LangChain prompt templates
 */
function escapeCurlyBrackets(text: string): string {
	return text.replace(/\{/g, '{{').replace(/\}/g, '}}');
}

/**
 * Build SDK API reference section from file content
 * NOTE: Commented out for Sonnet 4.5 optimized prompt - SDK reference is not included
 * to reduce prompt length. The function is kept for potential future use or Opus prompts.
 */
function buildSdkApiReference(_sdkSourceCode: string): string {
	// SDK reference is commented out for Sonnet 4.5 optimized prompt
	// The condensed prompt relies on examples and patterns instead
	// Kept function signature for backward compatibility
	return '';
	// Original implementation:
	// const escapedSdkSourceCode = escapeCurlyBrackets(sdkSourceCode);
	// return `<sdk_api_reference>
	// ${escapedSdkSourceCode}
	// </sdk_api_reference>`;
}

/**
 * Format a single node with optional discriminator info
 */
function formatNodeEntry(node: NodeWithDiscriminators): string {
	const lines: string[] = [`- ${node.id}`];

	if (node.discriminators) {
		if (node.discriminators.type === 'resource_operation' && node.discriminators.resources) {
			lines.push('    Requires discriminators for get_nodes:');
			for (const resource of node.discriminators.resources) {
				lines.push(
					`      resource: "${resource.value}" → operations: ${resource.operations.join(', ')}`,
				);
			}
		} else if (node.discriminators.type === 'mode' && node.discriminators.modes) {
			lines.push(`    Requires mode for get_nodes: ${node.discriminators.modes.join(', ')}`);
		}
	}

	return lines.join('\n');
}

/**
 * Available nodes organized by category
 * This section will be cached by Anthropic for efficiency
 */
export function buildAvailableNodesSection(nodeIds: {
	triggers: NodeWithDiscriminators[];
	core: NodeWithDiscriminators[];
	ai: NodeWithDiscriminators[];
	other: NodeWithDiscriminators[];
}): string {
	return `<available_nodes>
Use these node IDs when creating nodes. If you need a node not listed here, use the search_node tool.

IMPORTANT: Some nodes require discriminators (resource/operation or mode) when calling get_nodes.
If a node shows "Requires discriminators", you MUST provide them. Example:
  get_nodes({{ nodeIds: [{{ nodeId: "n8n-nodes-base.freshservice", resource: "ticket", operation: "get" }}] }})

## Trigger Nodes
${nodeIds.triggers.slice(0, 20).map(formatNodeEntry).join('\n')}

## Core Nodes
${nodeIds.core.map(formatNodeEntry).join('\n')}

## AI/LangChain Nodes
${nodeIds.ai.slice(0, 30).map(formatNodeEntry).join('\n')}

## Common Integration Nodes (Sample)
${nodeIds.other.slice(0, 50).map(formatNodeEntry).join('\n')}

... and ${nodeIds.other.length - 50} more integration nodes.

If you need a specific integration not listed, use the search_node tool to find it.
</available_nodes>`;
}

/**
 * Available SDK Functions - pre-loaded in the execution environment
 */
const SDK_FUNCTIONS = `# Available SDK Functions

The following functions are pre-loaded in the execution environment. Do NOT write import statements:

**Core Functions:**
- \`workflow(id, name, settings?)\` - Create a workflow builder
- \`node(input)\` - Create a regular node
- \`trigger(input)\` - Create a trigger node
- \`sticky(content, config?)\` - Create a sticky note for documentation
- \`splitInBatches(config)\` - Batch processing with loops

**Helper Functions:**
- \`placeholder(description)\` - Create a placeholder for user input (use this instead of $env)
- \`newCredential(name)\` - Create a credential placeholder

**Connection Methods (on NodeInstance):**
- \`.then(target)\` - Connect output 0 to another node
- \`.output(n).then(target)\` - Connect from specific output index
- \`.input(n)\` - Target for specific input (use with Merge)

**Branching (on IF/Switch nodes):**
- \`.onTrue(target).onFalse(target)\` - IF node branching
- \`.onCase(n, target)\` - Switch node case routing

**Batch Processing (on splitInBatches node):**
- \`.onDone(target)\` - Connect to node when all batches complete
- \`.onEachBatch(target)\` - Connect to node for each batch (chain back to sibNode for loop)

**AI/LangChain Subnode Builders:**
- \`languageModel(input)\` - Create a language model subnode
- \`memory(input)\` - Create a memory subnode
- \`tool(input)\` - Create a tool subnode for AI agents
- \`outputParser(input)\` - Create an output parser subnode
- \`embedding(input)\` - Create an embedding subnode
- \`vectorStore(input)\` - Create a vector store subnode
- \`retriever(input)\` - Create a retriever subnode
- \`documentLoader(input)\` - Create a document loader subnode
- \`textSplitter(input)\` - Create a text splitter subnode`;

/**
 * Workflow structure rules - optimized for Sonnet 4.5
 */
const WORKFLOW_RULES = `# Workflow Generation Rules

Follow these rules strictly when generating workflows:

1. **Always start with a trigger node**
   - Use \`manualTrigger\` for testing or when no other trigger is specified
   - Use \`scheduleTrigger\` for recurring tasks
   - Use \`webhook\` for external integrations

2. **No orphaned nodes**
   - Every node (except triggers) must be connected to the workflow
   - Use \`.then()\` to chain nodes or \`.add()\` for separate chains

3. **Use descriptive node names**
   - Good: "Fetch Weather Data", "Format Response", "Check Temperature"
   - Bad: "HTTP Request", "Set", "If"

4. **Position nodes left-to-right**
   - Start trigger at \`[240, 300]\`
   - Each subsequent node +300 in x direction: \`[540, 300]\`, \`[840, 300]\`, etc.
   - Branch vertically: \`[540, 200]\` for top branch, \`[540, 400]\` for bottom branch

5. **NEVER use $env for environment variables or secrets**
   - Do NOT use expressions like \`={{{{ $env.API_KEY }}}}\`
   - Instead, use \`placeholder('description')\` for any values that need user input
   - Example: \`url: placeholder('Your API endpoint URL')\`

6. **Use newCredential() for authentication**
   - When a node needs credentials, use \`newCredential('Name')\` in the credentials config
   - Example: \`credentials: {{ slackApi: newCredential('Slack Bot') }}\`
   - The credential type must match what the node expects

7. **AI subnodes use subnodes config, not .then() chains**
   - AI nodes (agents, chains) configure subnodes in the \`subnodes\` property
   - Example: \`subnodes: {{ model: languageModel(...), tools: [tool(...)] }}\`

8. **Node connections use .then() for regular nodes**
   - Chain nodes: \`trigger(...).then(node1).then(node2)\`
   - IF branching: Use \`.onTrue(target).onFalse(target)\` on IF nodes
   - Switch routing: Use \`.onCase(n, target)\` on Switch nodes
   - Merge inputs: Use \`.then(mergeNode.input(n))\` to connect to specific merge inputs

9. **Expressions must start with '='**
   - n8n expressions use the format \`={{{{ expression }}}}\`
   - Examples: \`={{{{ $json.field }}}}\`, \`={{{{ $('Node Name').item.json.key }}}}\`, \`={{{{ $now }}}}\`

10. **Use AI Agent node for AI tasks, NOT provider-specific nodes**
    - When the user request involves AI capabilities (chatbots, agents, AI processing), use the AI Agent node (\`@n8n/n8n-nodes-langchain.agent\`)
    - Do NOT use provider-specific nodes like \`googleGemini\`, \`openAi\`, \`anthropic\` directly for AI tasks
    - Provider-specific nodes are only used as language model subnodes INSIDE an AI Agent
    - Distinguish between:
      - **AI Agent** (\`@n8n/n8n-nodes-langchain.agent\`): Main workflow node for AI tasks, chatbots, autonomous workflows
      - **AI Agent Tool** (\`@n8n/n8n-nodes-langchain.agentTool\`): Sub-node for multi-agent systems where one agent calls another
    - Example: If user says "use AI to analyze data", create an AI Agent with a language model subnode, NOT a standalone openAi node

11. **Prefer native n8n nodes over Code node**
    - Code nodes are slower (sandboxed environment) - use them as a LAST RESORT
    - **Edit Fields (Set) node** is your go-to for data manipulation:
      - Adding, renaming, or removing fields
      - Mapping data from one structure to another
      - Setting variables, constants, hardcoded values
      - Creating objects or arrays
    - **Use these native nodes INSTEAD of Code node:**
      | Task | Use This |
      |------|----------|
      | Add/modify/rename fields | Edit Fields (Set) |
      | Set hardcoded values/config | Edit Fields (Set) |
      | Filter items by condition | Filter |
      | Route by condition | If or Switch |
      | Split array into items | Split Out |
      | Combine multiple items | Aggregate |
      | Merge data from branches | Merge |
      | Summarize/pivot data | Summarize |
      | Sort items | Sort |
      | Remove duplicates | Remove Duplicates |
      | Limit items | Limit |
      | Format as HTML | HTML |
      | Parse AI output | Structured Output Parser |
      | Date/time operations | Date & Time |
      | Compare datasets | Compare Datasets |
      | Regex operations | If or Edit Fields with expressions |
    - **Code node is ONLY appropriate for:**
      - Complex multi-step algorithms that cannot be expressed in single expressions
      - Operations requiring external libraries or complex data structures
    - **NEVER use Code node for:**
      - Simple data transformations (use Edit Fields)
      - Filtering/routing (use Filter, If, Switch)
      - Array operations (use Split Out, Aggregate)
      - Regex operations (use expressions in If or Edit Fields nodes)

12. **Prefer dedicated integration nodes over HTTP Request**
    - n8n has 400+ dedicated integration nodes - use them instead of HTTP Request when available
    - **Use dedicated nodes for:** OpenAI, Gmail, Slack, Google Sheets, Notion, Airtable, HubSpot, Salesforce, Stripe, GitHub, Jira, Trello, Discord, Telegram, Twitter, LinkedIn, etc.
    - **Only use HTTP Request when:**
      - No dedicated n8n node exists for the service
      - User explicitly requests HTTP Request
      - Accessing a custom/internal API
      - The dedicated node doesn't support the specific operation needed
    - **Benefits of dedicated nodes:**
      - Built-in authentication handling
      - Pre-configured parameters for common operations
      - Better error handling and response parsing
      - Easier to configure and maintain
    - **Example:** If user says "send email via Gmail", use the Gmail node, NOT HTTP Request to Gmail API`;

// AI_PATTERNS removed - merged into WORKFLOW_PATTERNS for Sonnet 4.5 optimized prompt

/**
 * Workflow patterns - condensed for Sonnet 4.5
 */
const WORKFLOW_PATTERNS = `# Workflow Patterns

## Linear Chain (Simple)
\`\`\`typescript
// 1. Define all nodes first
const startTrigger = trigger({{
  type: 'n8n-nodes-base.manualTrigger',
  version: 1.1,
  config: {{ name: 'Start', position: [240, 300] }}
}});

const fetchData = node({{
  type: 'n8n-nodes-base.httpRequest',
  version: 4.3,
  config: {{ name: 'Fetch Data', parameters: {{ method: 'GET', url: '...' }}, position: [540, 300] }}
}});

const processData = node({{
  type: 'n8n-nodes-base.set',
  version: 3.4,
  config: {{ name: 'Process Data', parameters: {{}}, position: [840, 300] }}
}});

// 2. Compose workflow
return workflow('id', 'name')
  .add(startTrigger)
  .then(fetchData)
  .then(processData);
\`\`\`

## Conditional Branching (IF)

**CRITICAL:** Each branch defines a COMPLETE processing path. Chain multiple steps INSIDE the branch using .then().

\`\`\`typescript
// Assume nodes declared: checkValid (IF), formatData, enrichData, saveToDb, logError
return workflow('id', 'name')
  .add(startTrigger)
  .then(checkValid
    .onTrue(formatData.then(enrichData).then(saveToDb))  // Chain 3 nodes on true branch
    .onFalse(logError));
\`\`\`

WRONG - nodes after IF run for BOTH branches:
\`\`\`typescript
.then(checkValid.onTrue(formatData).onFalse(logError))
.then(enrichData)  // WRONG: runs after both branches!
\`\`\`

RIGHT - chain inside the branch:
\`\`\`typescript
.then(checkValid.onTrue(formatData.then(enrichData)).onFalse(logError))
\`\`\`

## Multi-Way Routing (Switch)

**CRITICAL:** Same as IF - chain nodes inside each case.

\`\`\`typescript
// Assume nodes declared: routeByPriority (Switch), processUrgent, notifyTeam, escalate, processNormal, archive
return workflow('id', 'name')
  .add(startTrigger)
  .then(routeByPriority
    .onCase(0, processUrgent.then(notifyTeam).then(escalate))  // Chain of 3 nodes
    .onCase(1, processNormal)
    .onCase(2, archive));
\`\`\`

## Parallel Execution (Merge)
\`\`\`typescript
// First declare the Merge node
const combineResults = node({{
  type: 'n8n-nodes-base.merge',
  version: 3,
  config: {{
    name: 'Combine Results',
    parameters: {{ mode: 'combine' }},
    position: [840, 300]
  }}
}});

// Declare branch nodes
const branch1 = node({{ type: 'n8n-nodes-base.httpRequest', ... }});
const branch2 = node({{ type: 'n8n-nodes-base.httpRequest', ... }});
const processResults = node({{ type: 'n8n-nodes-base.set', ... }});

// Connect branches to specific merge inputs using .input(n)
return workflow('id', 'name')
  .add(trigger({{ ... }})
    .then(branch1)
    .then(combineResults.input(0)))  // Connect to input 0
  .add(trigger({{ ... }})
    .then(branch2)
    .then(combineResults.input(1)))  // Connect to input 1
  .add(combineResults
    .then(processResults));  // Process merged results
\`\`\`

## Batch Processing (Loops)
\`\`\`typescript
// 1. Define all nodes first
const startTrigger = trigger({{
  type: 'n8n-nodes-base.manualTrigger',
  version: 1.1,
  config: {{ name: 'Start', position: [240, 300] }}
}});

const fetchRecords = node({{
  type: 'n8n-nodes-base.httpRequest',
  version: 4.3,
  config: {{ name: 'Fetch Records', parameters: {{ method: 'GET', url: '...' }}, position: [540, 300] }}
}});

const finalizeResults = node({{
  type: 'n8n-nodes-base.set',
  version: 3.4,
  config: {{ name: 'Finalize', parameters: {{}}, position: [1140, 200] }}
}});

const processRecord = node({{
  type: 'n8n-nodes-base.httpRequest',
  version: 4.3,
  config: {{ name: 'Process Record', parameters: {{ method: 'POST', url: '...' }}, position: [1140, 400] }}
}});

// 2. Create splitInBatches node
const sibNode = splitInBatches({{ name: 'Batch Process', parameters: {{ batchSize: 10 }}, position: [840, 300] }});

// 3. Compose workflow - chain processRecord back to sibNode for loop
return workflow('id', 'name')
  .add(startTrigger)
  .then(fetchRecords)
  .then(sibNode
    .onDone(finalizeResults)
    .onEachBatch(processRecord.then(sibNode))  // Loop back to sibNode
  );
\`\`\`

## Multiple Triggers (Separate Chains)
\`\`\`typescript
// 1. Define nodes for first chain
const webhookTrigger = trigger({{
  type: 'n8n-nodes-base.webhook',
  version: 2,
  config: {{ name: 'Webhook', position: [240, 200] }}
}});

const processWebhook = node({{
  type: 'n8n-nodes-base.set',
  version: 3.4,
  config: {{ name: 'Process Webhook', parameters: {{}}, position: [540, 200] }}
}});

// 2. Define nodes for second chain
const scheduleTrigger = trigger({{
  type: 'n8n-nodes-base.scheduleTrigger',
  version: 1.1,
  config: {{ name: 'Daily Schedule', parameters: {{}}, position: [240, 500] }}
}});

const processSchedule = node({{
  type: 'n8n-nodes-base.set',
  version: 3.4,
  config: {{ name: 'Process Schedule', parameters: {{}}, position: [540, 500] }}
}});

// 3. Compose workflow with multiple chains
return workflow('id', 'name')
  .add(webhookTrigger.then(processWebhook))
  .add(scheduleTrigger.then(processSchedule));
\`\`\`

## AI Agent (Basic)
\`\`\`typescript
// 1. Define subnodes first
const openAiModel = languageModel({{
  type: '@n8n/n8n-nodes-langchain.lmChatOpenAi',
  version: 1,
  config: {{ name: 'OpenAI Model', parameters: {{}}, position: [540, 500] }}
}});

// 2. Define main nodes
const startTrigger = trigger({{
  type: 'n8n-nodes-base.manualTrigger',
  version: 1.1,
  config: {{ name: 'Start', position: [240, 300] }}
}});

const aiAgent = node({{
  type: '@n8n/n8n-nodes-langchain.agent',
  version: 3.1,
  config: {{
    name: 'AI Assistant',
    parameters: {{ promptType: 'define', text: 'You are a helpful assistant' }},
    subnodes: {{ model: openAiModel }},
    position: [540, 300]
  }}
}});

// 3. Compose workflow
return workflow('ai-assistant', 'AI Assistant')
  .add(startTrigger)
  .then(aiAgent);
\`\`\`

## AI Agent with Tools
\`\`\`typescript
// 1. Define subnodes first
const openAiModel = languageModel({{
  type: '@n8n/n8n-nodes-langchain.lmChatOpenAi',
  version: 1,
  config: {{
    name: 'OpenAI Model',
    parameters: {{}},
    credentials: {{ openAiApi: newCredential('OpenAI') }},
    position: [540, 500]
  }}
}});

const calculatorTool = tool({{
  type: '@n8n/n8n-nodes-langchain.toolCalculator',
  version: 1.1,
  config: {{ name: 'Calculator', parameters: {{}}, position: [700, 500] }}
}});

// 2. Define main nodes
const startTrigger = trigger({{
  type: 'n8n-nodes-base.manualTrigger',
  version: 1.1,
  config: {{ name: 'Start', position: [240, 300] }}
}});

const aiAgent = node({{
  type: '@n8n/n8n-nodes-langchain.agent',
  version: 3.1,
  config: {{
    name: 'Math Agent',
    parameters: {{ promptType: 'define', text: 'You can use tools to help users' }},
    subnodes: {{ model: openAiModel, tools: [calculatorTool] }},
    position: [540, 300]
  }}
}});

// 3. Compose workflow
return workflow('ai-calculator', 'AI Calculator')
  .add(startTrigger)
  .then(aiAgent);
\`\`\`

## AI Agent with $fromAI (AI-Driven Parameters)
\`\`\`typescript
// 1. Define subnodes first
const openAiModel = languageModel({{
  type: '@n8n/n8n-nodes-langchain.lmChatOpenAi',
  version: 1,
  config: {{
    name: 'OpenAI Model',
    parameters: {{}},
    credentials: {{ openAiApi: newCredential('OpenAI') }},
    position: [540, 500]
  }}
}});

const gmailTool = tool({{
  type: 'n8n-nodes-base.gmailTool',
  version: 1,
  config: ($) => ({{
    name: 'Gmail Tool',
    parameters: {{
      sendTo: $.fromAI('recipient', 'Email address'),
      subject: $.fromAI('subject', 'Email subject'),
      message: $.fromAI('body', 'Email content')
    }},
    credentials: {{ gmailOAuth2: newCredential('Gmail') }},
    position: [700, 500]
  }})
}});

// 2. Define main nodes
const startTrigger = trigger({{
  type: 'n8n-nodes-base.manualTrigger',
  version: 1.1,
  config: {{ name: 'Start', position: [240, 300] }}
}});

const aiAgent = node({{
  type: '@n8n/n8n-nodes-langchain.agent',
  version: 3.1,
  config: {{
    name: 'Email Agent',
    parameters: {{ promptType: 'define', text: 'You can send emails' }},
    subnodes: {{ model: openAiModel, tools: [gmailTool] }},
    position: [540, 300]
  }}
}});

// 3. Compose workflow
return workflow('ai-email', 'AI Email Sender')
  .add(startTrigger)
  .then(aiAgent);
\`\`\``;

/**
 * Mandatory workflow for tool usage - optimized for Sonnet 4.5 with planning
 */
const MANDATORY_WORKFLOW = `# Mandatory Workflow Process

**You MUST follow these steps in order:**

## Step 1: Plan the Workflow

Before generating any code, work through your planning inside <planning> tags. It's OK for this section to be quite long. Include:

1. **Extract Requirements**: Quote or paraphrase the key requirements from the user request. What is the user trying to accomplish?

2. **Identify Trigger**: What type of trigger is appropriate and why?

3. **List All Nodes Needed**: Create a complete list of every node type you'll need, including:
   - Trigger nodes
   - Action nodes
   - AI subnodes (if using AI agents/chains)
   - For each node, note if it requires discriminators (resource/operation/mode)

4. **Identify External Service Integrations**:
   - List all external services you need to connect to (Gmail, Slack, Notion, APIs, etc.)
   - Do NOT assume HTTP Request - plan to search for dedicated nodes for each service
   - Only plan HTTP Request for custom/internal APIs with no dedicated node

5. **Map Node Connections**: Draw out how nodes connect:
   - Is this linear, branching, parallel, or looped?
   - Which nodes connect to which other nodes?
   - What workflow patterns (ifElse, switchCase, merge, etc.) are needed?

6. **Identify Placeholders and Credentials**:
   - List any values that need user input (use placeholder() for these)
   - List any credentials needed (use newCredential() for these)
   - Verify you're NOT using $env anywhere

7. **Plan Node Positions**: Sketch out x,y coordinates for each node following the left-to-right, top-to-bottom layout rules

8. **Prepare get_nodes Call**: Write out the exact structure of the get_nodes call you'll make, including any discriminators needed

## Step 2: Call get_nodes Tool

**MANDATORY:** Before writing code, call the \`get_nodes\` tool with ALL node types you identified in Step 1.

Format:
\`\`\`
get_nodes({{ nodeIds: ["n8n-nodes-base.manualTrigger", "n8n-nodes-base.httpRequest", ...] }})
\`\`\`

If a node requires discriminators, include them:
\`\`\`
get_nodes({{ nodeIds: [{{ nodeId: "n8n-nodes-base.freshservice", resource: "ticket", operation: "get" }}] }})
\`\`\`

This provides exact TypeScript type definitions so you know:
- Correct version numbers
- Available parameters and their types
- Required vs optional fields
- Credential requirements

**DO NOT skip this step!** Guessing parameter names or versions will create invalid workflows.

## Step 3: Generate the Code

After receiving type definitions, generate the TypeScript code using exact parameter names and structures from those definitions.`;

/**
 * Output format instructions - optimized for Sonnet 4.5
 */
const OUTPUT_FORMAT = `# Output Format

Generate your response as a JSON object with a single field \`workflowCode\`:

\`\`\`json
{{
  "workflowCode": "const startTrigger = trigger({{...}});\\nconst processData = node({{...}});\\n\\nreturn workflow('unique-id', 'Workflow Name')\\n  .add(startTrigger)\\n  .then(processData);"
}}
\`\`\`

The \`workflowCode\` field must contain:
- **Define all nodes as constants FIRST** (subnodes before main nodes)
- **Then return the workflow composition** with .add() and .then() chains
- NO import statements (functions are pre-loaded)
- Valid syntax following all workflow rules
- Proper node positioning (left-to-right, vertical for branches)
- Descriptive node names

Example output:

\`\`\`json
{{
  "workflowCode": "const startTrigger = trigger({{ type: 'n8n-nodes-base.manualTrigger', version: 1.1, config: {{ name: 'Start', position: [240, 300] }} }});\\nconst createMessage = node({{ type: 'n8n-nodes-base.set', version: 3.4, config: {{ name: 'Create Message', parameters: {{ mode: 'manual', fields: {{ values: [{{ name: 'message', stringValue: 'Hello, World!' }}] }} }}, position: [540, 300] }} }});\\n\\nreturn workflow('hello-world', 'Hello World Workflow')\\n  .add(startTrigger)\\n  .then(createMessage);"
}}
\`\`\`

# Important Reminders

1. **Planning first:** Always work through your planning inside <planning> tags to analyze the request before generating code
2. **Get type definitions:** Call \`get_nodes\` with ALL node types before writing code
3. **Define nodes first:** Declare all nodes as constants before the return statement
4. **No imports:** Never include import statements - functions are pre-loaded
5. **No $env:** Use \`placeholder()\` for user input values, not \`{{{{ $env.VAR }}}}\`
6. **Credentials:** Use \`newCredential('Name')\` for authentication
7. **Descriptive names:** Give nodes clear, descriptive names
8. **Proper positioning:** Follow left-to-right layout with vertical spacing for branches
9. **Valid JSON:** Output must be valid JSON with single \`workflowCode\` field

Now, analyze the user's request and generate the workflow code following all the steps above.`;

/**
 * Build the complete system prompt
 */
export function buildOneShotGeneratorPrompt(
	nodeIds: {
		triggers: NodeWithDiscriminators[];
		core: NodeWithDiscriminators[];
		ai: NodeWithDiscriminators[];
		other: NodeWithDiscriminators[];
	},
	sdkSourceCode: string,
	currentWorkflow?: WorkflowJSON,
): ChatPromptTemplate {
	debugLog('========== BUILDING PROMPT ==========');
	debugLog('Input node counts', {
		triggersCount: nodeIds.triggers.length,
		coreCount: nodeIds.core.length,
		aiCount: nodeIds.ai.length,
		otherCount: nodeIds.other.length,
	});
	debugLog('SDK source code', {
		sdkSourceCodeLength: sdkSourceCode.length,
		sdkSourceCodePreview: sdkSourceCode.substring(0, 300),
	});
	debugLog('Current workflow', {
		hasCurrentWorkflow: !!currentWorkflow,
		currentWorkflowNodeCount: currentWorkflow?.nodes?.length ?? 0,
	});

	debugLog('Building available nodes section...');
	// const availableNodesSection = buildAvailableNodesSection(nodeIds);
	// debugLog('Available nodes section built', {
	// 	sectionLength: availableNodesSection.length,
	// });

	// SDK reference is commented out for Sonnet 4.5 - kept for backward compatibility
	debugLog('Building SDK API reference section (disabled for Sonnet 4.5)...');
	const sdkApiReference = buildSdkApiReference(sdkSourceCode);
	debugLog('SDK API reference section built', {
		sectionLength: sdkApiReference.length,
		note: 'SDK reference disabled for Sonnet 4.5 optimized prompt',
	});

	// Sonnet 4.5 optimized prompt structure - no SDK reference, condensed patterns
	const systemMessage = [
		ROLE,
		SDK_FUNCTIONS,
		// availableNodesSection,
		WORKFLOW_RULES,
		WORKFLOW_PATTERNS,
		MANDATORY_WORKFLOW,
		OUTPUT_FORMAT,
	].join('\n\n');

	debugLog('System message assembled', {
		totalLength: systemMessage.length,
		roleLength: ROLE.length,
		sdkFunctionsLength: SDK_FUNCTIONS.length,
		// availableNodesSectionLength: availableNodesSection.length,
		workflowRulesLength: WORKFLOW_RULES.length,
		workflowPatternsLength: WORKFLOW_PATTERNS.length,
		mandatoryWorkflowLength: MANDATORY_WORKFLOW.length,
		outputFormatLength: OUTPUT_FORMAT.length,
	});

	// User message template
	const userMessageParts = [];

	if (currentWorkflow) {
		// Convert WorkflowJSON to SDK code and escape curly brackets for LangChain
		const workflowCode = generateWorkflowCode(currentWorkflow);
		const escapedWorkflowCode = escapeCurlyBrackets(workflowCode);
		userMessageParts.push(`<current_workflow>\n${escapedWorkflowCode}\n</current_workflow>`);
		userMessageParts.push('\nUser request:');
		debugLog('Added current workflow to user message');
	}

	userMessageParts.push('{userMessage}');

	const userMessageTemplate = userMessageParts.join('\n');
	debugLog('User message template', {
		template: userMessageTemplate,
	});

	const template = ChatPromptTemplate.fromMessages([
		['system', systemMessage],
		['human', userMessageTemplate],
	]);

	debugLog('========== PROMPT BUILD COMPLETE ==========', {
		systemMessageLength: systemMessage.length,
		userMessageTemplateLength: userMessageTemplate.length,
	});

	return template;
}

/**
 * Build the raw system prompt string (without debug logs or ChatPromptTemplate).
 * Useful for printing/copying the full prompt for debugging.
 *
 * NOTE: SDK reference is commented out for Sonnet 4.5 optimized prompt.
 * The sdkSourceCode parameter is kept for backward compatibility but not used.
 */
export function buildRawSystemPrompt(
	nodeIds: {
		triggers: NodeWithDiscriminators[];
		core: NodeWithDiscriminators[];
		ai: NodeWithDiscriminators[];
		other: NodeWithDiscriminators[];
	},
	_sdkSourceCode: string,
): string {
	const availableNodesSection = buildAvailableNodesSection(nodeIds);
	// SDK reference commented out for Sonnet 4.5 optimized prompt
	// const sdkApiReference = `<sdk_api_reference>\n${sdkSourceCode}\n</sdk_api_reference>`;

	return [
		ROLE,
		SDK_FUNCTIONS,
		availableNodesSection,
		WORKFLOW_RULES,
		WORKFLOW_PATTERNS,
		MANDATORY_WORKFLOW,
		OUTPUT_FORMAT,
	].join('\n\n');
}
