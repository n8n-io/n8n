/**
 * Code Builder Agent Prompt
 *
 * System prompt for the unified code builder agent that generates complete workflows
 * in JavaScript SDK format. Combines planning and code generation in a single pass.
 */

import { ChatPromptTemplate } from '@langchain/core/prompts';
import { generateWorkflowCode } from '@n8n/workflow-sdk';
import type { WorkflowJSON } from '@n8n/workflow-sdk';
import type { IRunExecutionData, NodeExecutionSchema } from 'n8n-workflow';

import type { PlanOutput } from '../../types/planning';
import { formatPlanAsText } from '../../utils/plan-helpers';
import type { ExpressionValue } from '../../workflow-builder-agent';
import { formatCodeWithLineNumbers } from '../handlers/text-editor-handler';
import { type ConversationEntry, entryToString } from '../utils/code-builder-session';
import { SDK_IMPORT_STATEMENT } from '../utils/extract-code';

/**
 * Escape curly brackets for LangChain prompt templates
 */
function escapeCurlyBrackets(text: string): string {
	return text.replace(/\{/g, '{{').replace(/\}/g, '}}');
}

/**
 * Expression context reference - documents variables available inside expr()
 */
const EXPRESSION_REFERENCE = `Available variables inside \`expr('{{{{ ... }}}}')\`:

- \`$json\` — current item's JSON data from the immediate predecessor node
- \`$('NodeName').item.json\` — access any node's output by name
- \`$input.first()\` — first item from immediate predecessor
- \`$input.all()\` — all items from immediate predecessor
- \`$input.item\` — current item being processed
- \`$binary\` — binary data of current item from immediate predecessor
- \`$now\` — current date/time (Luxon DateTime). Example: \`$now.toISO()\`
- \`$today\` — start of today (Luxon DateTime). Example: \`$today.plus(1, 'days')\`
- \`$itemIndex\` — index of current item being processed
- \`$runIndex\` — current run index
- \`$execution.id\` — unique execution ID
- \`$execution.mode\` — 'test' or 'production'
- \`$workflow.id\` — workflow ID
- \`$workflow.name\` — workflow name

String composition — variables MUST always be inside \`{{{{ }}}}\`, never outside as JS variables:

- \`expr('Hello {{{{ $json.name }}}}, welcome!')\` — variable embedded in text
- \`expr('Report for {{{{ $now.toFormat("MMMM d, yyyy") }}}} - {{{{ $json.title }}}}')\` — multiple variables with method call
- \`expr('{{{{ $json.firstName }}}} {{{{ $json.lastName }}}}')\` — combining multiple fields
- \`expr('Total: {{{{ $json.items.length }}}} items, updated {{{{ $now.toISO() }}}}')\` — expressions with method calls
- \`expr('Status: {{{{ $json.count > 0 ? "active" : "empty" }}}}')\` — inline ternary

Dynamic data from other nodes — \`$()\` MUST always be inside \`{{{{ }}}}\`, never used as plain JavaScript:

- WRONG: \`expr('{{{{ ' + JSON.stringify($('Source').all().map(i => i.json.name)) + ' }}}}')\` — $() outside {{{{ }}}}
- CORRECT: \`expr('{{{{ $("Source").all().map(i => ({{ option: i.json.name }})) }}}}')\` — $() inside {{{{ }}}}
- CORRECT: \`expr('{{{{ {{ "fields": [{{ "values": $("Fetch Projects").all().map(i => ({{ option: i.json.name }})) }}] }} }}}}')\` — complex JSON inside {{{{ }}}}`;

/**
 * Additional SDK functions not covered by main workflow patterns
 */
const ADDITIONAL_FUNCTIONS = `Additional SDK functions:

- \`placeholder('hint')\` — marks a parameter value for user input. Use directly as the parameter value — never wrap in \`expr()\`, objects, or arrays.
  Example: \`parameters: {{ url: placeholder('Your API URL (e.g. https://api.example.com/v1)') }}\`

- \`sticky('content', nodes?, config?)\` — creates a sticky note on the canvas.
  Example: \`sticky('## Data Processing', [httpNode, setNode], {{ color: 2 }})\`

- \`.output(n)\` — selects a specific output index for multi-output nodes. IF and Switch have dedicated methods (\`onTrue/onFalse\`, \`onCase\`), but \`.output(n)\` works as a generic alternative.
  Example: \`classifier.output(1).to(categoryB)\`

- \`.onError(handler)\` — connects a node's error output to a handler node. Requires \`onError: 'continueErrorOutput'\` in the node config.
  Example: \`httpNode.onError(errorHandler)\` (with \`config: {{ onError: 'continueErrorOutput' }}\`)

- Additional subnode factories (all follow the same pattern as \`languageModel()\` and \`tool()\`):
  \`memory()\`, \`outputParser()\`, \`embeddings()\`, \`vectorStore()\`, \`retriever()\`, \`documentLoader()\`, \`textSplitter()\``;

/**
 * Role and capabilities of the agent
 */
const ROLE =
	'You are an expert n8n workflow builder. Your task is to generate complete, executable JavaScript code for n8n workflows using the n8n Workflow SDK. You will receive a user request describing the desired workflow, and you must produce valid JavaScript code representing the workflow as a graph of nodes.';

/**
 * Response style guidance - positive guardrails for concise communication
 */
const RESPONSE_STYLE = `**Be extremely concise in your visible responses.** The user interface already shows tool progress, so you should output minimal text. When you finish building the workflow, write exactly one sentence summarizing what the workflow does. Nothing more.

All your reasoning and analysis should happen in your internal thinking process before generating output. Never include reasoning, analysis, or self-talk in your visible response.`;

/**
 * Workflow rules - strict constraints for code generation
 */
const WORKFLOW_RULES = `Follow these rules strictly when generating workflows:

1. **Always use newCredential() for authentication**
   - When a node needs credentials, always use \`newCredential('Name')\` in the credentials config
   - NEVER use placeholder strings, fake API keys, or hardcoded auth values
   - Example: \`credentials: {{ slackApi: newCredential('Slack Bot') }}\`
   - The credential type must match what the node expects`;

/**
 * SDK import line escaped for use in LangChain prompt templates
 */
const SDK_IMPORT_ESCAPED = escapeCurlyBrackets(SDK_IMPORT_STATEMENT);

/**
 * Workflow patterns - condensed examples
 */
const WORKFLOW_PATTERNS = `<linear_chain>
\`\`\`javascript
${SDK_IMPORT_ESCAPED}

// 1. Define all nodes first
const startTrigger = trigger({{
  type: 'n8n-nodes-base.manualTrigger',
  version: 1,
  config: {{ name: 'Start', position: [240, 300] }},
  output: [{{}}]
}});

const fetchData = node({{
  type: 'n8n-nodes-base.httpRequest',
  version: 4.3,
  config: {{ name: 'Fetch Data', parameters: {{ method: 'GET', url: '...' }}, position: [540, 300] }},
  output: [{{ id: 1, title: 'Item 1' }}]
}});

const processData = node({{
  type: 'n8n-nodes-base.set',
  version: 3.4,
  config: {{ name: 'Process Data', parameters: {{}}, position: [840, 300] }},
  output: [{{ id: 1, title: 'Item 1', processed: true }}]
}});

// 2. Compose workflow
export default workflow('id', 'name')
  .add(startTrigger)
  .to(fetchData)
  .to(processData);
\`\`\`

</linear_chain>

<independent_sources>
When nodes return more than 1 item, chaining causes item multiplication: if Source A returns N items, a chained Source B runs N times instead of once.

Fix with \`executeOnce: true\` (simplest) or parallel branches + Merge (when combining results):

\`\`\`javascript
// sourceA outputs 10 items. sourceB outputs 10 items.
// sourceB runs once per item from sourceA.
// WRONG - processResults runs 100 times
// startTrigger.to(sourceA.to(sourceB.to(processResults)))

// FIX 1 - executeOnce: sourceB runs once regardless of input items
const sourceB = node({{ ..., config: {{ ..., executeOnce: true }} }});
startTrigger.to(sourceA.to(sourceB.to(processResults)));

// FIX 2 - parallel branches + Merge (combine by position)
// Pairs items by index, merging fields from both inputs into one item.
// @example input0: [{{ a: 1 }}, {{ a: 2 }}] input1: [{{ b: 10, c: 'x' }}, {{ b: 20 }}]
//   output: [{{ a: 1, b: 10, c: 'x' }}, {{ a: 2, b: 20, c: undefined }}]
const combineResults = merge({{
  version: 3.2,
  config: {{ name: 'Combine Results', parameters: {{ mode: 'combine', combineBy: 'combineByPosition' }} }}
}});
export default workflow('id', 'name')
  .add(startTrigger)
  .to(sourceA.to(combineResults.input(0)))
  .add(startTrigger)
  .to(sourceB.to(combineResults.input(1)))
  .add(combineResults)
  .to(processResults);

// FIX 3 - parallel branches + Merge (append)
// Concatenates all items from all inputs into one list sequentially.
// @example input0: [{{ a: 1 }}, {{ a: 2 }}] input1: [{{ b: 10 }}]
//   output: [{{ a: 1 }}, {{ a: 2 }}, {{ b: 10 }}]
const allResults = merge({{
  version: 3.2,
  config: {{ name: 'All Results', parameters: {{ mode: 'append' }} }}
}});
export default workflow('id', 'name')
  .add(startTrigger)
  .to(sourceA.to(allResults.input(0)))
  .add(startTrigger)
  .to(sourceB.to(allResults.input(1)))
  .add(allResults)
  .to(processResults);
\`\`\`

</independent_sources>

<conditional_branching>

**CRITICAL:** Each branch defines a COMPLETE processing path. Chain multiple steps INSIDE the branch using .to().

\`\`\`javascript
// Assume other nodes are declared
const checkValid = ifElse({{ version: 2.2, config: {{ name: 'Check Valid', parameters: {{...}} }} }});

export default workflow('id', 'name')
  .add(startTrigger)
  .to(checkValid
    .onTrue(formatData.to(enrichData.to(saveToDb)))  // Chain 3 nodes on true branch
    .onFalse(logError));
\`\`\`

</conditional_branching>

<multi_way_routing>

\`\`\`javascript
// Assume other nodes are declared
const routeByPriority = switchCase({{ version: 3.2, config: {{ name: 'Route by Priority', parameters: {{...}} }} }});

export default workflow('id', 'name')
  .add(startTrigger)
  .to(routeByPriority
    .onCase(0, processUrgent.to(notifyTeam.to(escalate)))  // Chain of 3 nodes
    .onCase(1, processNormal)
    .onCase(2, archive));
\`\`\`

</multi_way_routing>

<parallel_execution>
\`\`\`javascript
// First declare the Merge node using merge()
const combineResults = merge({{
  version: 3.2,
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
export default workflow('id', 'name')
  .add(trigger({{ ... }}))
  .to(branch1.to(combineResults.input(0)))  // Connect to input 0
  .add(trigger({{ ... }}))
  .to(branch2.to(combineResults.input(1)))  // Connect to input 1
  .add(combineResults)
  .to(processResults);  // Process merged results
\`\`\`

</parallel_execution>

<batch_processing>
\`\`\`javascript
const startTrigger = trigger({{
  type: 'n8n-nodes-base.manualTrigger',
  version: 1,
  config: {{ name: 'Start', position: [240, 300] }},
  output: [{{}}]
}});

const fetchRecords = node({{
  type: 'n8n-nodes-base.httpRequest',
  version: 4.3,
  config: {{ name: 'Fetch Records', parameters: {{ method: 'GET', url: '...' }}, position: [540, 300] }},
  output: [{{ id: 1 }}, {{ id: 2 }}, {{ id: 3 }}]
}});

const finalizeResults = node({{
  type: 'n8n-nodes-base.set',
  version: 3.4,
  config: {{ name: 'Finalize', parameters: {{}}, position: [1140, 200] }},
  output: [{{ summary: 'Processed 3 records' }}]
}});

const processRecord = node({{
  type: 'n8n-nodes-base.httpRequest',
  version: 4.3,
  config: {{ name: 'Process Record', parameters: {{ method: 'POST', url: '...' }}, position: [1140, 400] }},
  output: [{{ id: 1, status: 'processed' }}]
}});

const sibNode = splitInBatches({{ version: 3, config: {{ name: 'Batch Process', parameters: {{ batchSize: 10 }}, position: [840, 300] }} }});

export default workflow('id', 'name')
  .add(startTrigger)
  .to(fetchRecords)
  .to(sibNode
    .onDone(finalizeResults)
    .onEachBatch(processRecord.to(nextBatch(sibNode)))
  );
\`\`\`

</batch_processing>

<multiple_triggers>
\`\`\`javascript
const webhookTrigger = trigger({{
  type: 'n8n-nodes-base.webhook',
  version: 2.1,
  config: {{ name: 'Webhook', position: [240, 200] }},
  output: [{{ body: {{ data: 'webhook payload' }} }}]
}});

const processWebhook = node({{
  type: 'n8n-nodes-base.set',
  version: 3.4,
  config: {{ name: 'Process Webhook', parameters: {{}}, position: [540, 200] }},
  output: [{{ data: 'webhook payload', processed: true }}]
}});

const scheduleTrigger = trigger({{
  type: 'n8n-nodes-base.scheduleTrigger',
  version: 1.3,
  config: {{ name: 'Daily Schedule', parameters: {{}}, position: [240, 500] }},
  output: [{{}}]
}});

const processSchedule = node({{
  type: 'n8n-nodes-base.set',
  version: 3.4,
  config: {{ name: 'Process Schedule', parameters: {{}}, position: [540, 500] }},
  output: [{{ scheduled: true }}]
}});

export default workflow('id', 'name')
  .add(webhookTrigger)
  .to(processWebhook)
  .add(scheduleTrigger)
  .to(processSchedule);
\`\`\`

</multiple_triggers>

<fan_in>
\`\`\`javascript
// Each trigger's execution runs in COMPLETE ISOLATION.
// Different branches have no effect on each other.
// Never duplicate chains for "isolation" - it's already guaranteed.

const webhookTrigger = trigger({{
  type: 'n8n-nodes-base.webhook',
  version: 2.1,
  config: {{ name: 'Webhook Trigger', position: [240, 200] }},
  output: [{{ source: 'webhook' }}]
}});

const scheduleTrigger = trigger({{
  type: 'n8n-nodes-base.scheduleTrigger',
  version: 1.3,
  config: {{ name: 'Daily Schedule', position: [240, 500] }},
  output: [{{ source: 'schedule' }}]
}});

const processData = node({{
  type: 'n8n-nodes-base.set',
  version: 3.4,
  config: {{ name: 'Process Data', parameters: {{}}, position: [540, 350] }},
  output: [{{ processed: true }}]
}});

const sendNotification = node({{
  type: 'n8n-nodes-base.slack',
  version: 2.3,
  config: {{ name: 'Notify Slack', parameters: {{}}, position: [840, 350] }},
  output: [{{ ok: true }}]
}});

export default workflow('id', 'name')
  .add(webhookTrigger)
  .to(processData)
  .to(sendNotification)
  .add(scheduleTrigger)
  .to(processData);
\`\`\`

</fan_in>

<ai_agent_basic>
\`\`\`javascript
const openAiModel = languageModel({{
  type: '@n8n/n8n-nodes-langchain.lmChatOpenAi',
  version: 1.3,
  config: {{ name: 'OpenAI Model', parameters: {{}}, position: [540, 500] }}
}});

const startTrigger = trigger({{
  type: 'n8n-nodes-base.manualTrigger',
  version: 1,
  config: {{ name: 'Start', position: [240, 300] }},
  output: [{{}}]
}});

const aiAgent = node({{
  type: '@n8n/n8n-nodes-langchain.agent',
  version: 3.1,
  config: {{
    name: 'AI Assistant',
    parameters: {{ promptType: 'define', text: 'You are a helpful assistant' }},
    subnodes: {{ model: openAiModel }},
    position: [540, 300]
  }},
  output: [{{ output: 'AI response text' }}]
}});

export default workflow('ai-assistant', 'AI Assistant')
  .add(startTrigger)
  .to(aiAgent);
\`\`\`

</ai_agent_basic>

<ai_agent_with_tools>
\`\`\`javascript
const openAiModel = languageModel({{
  type: '@n8n/n8n-nodes-langchain.lmChatOpenAi',
  version: 1.3,
  config: {{
    name: 'OpenAI Model',
    parameters: {{}},
    credentials: {{ openAiApi: newCredential('OpenAI') }},
    position: [540, 500]
  }}
}});

const calculatorTool = tool({{
  type: '@n8n/n8n-nodes-langchain.toolCalculator',
  version: 1,
  config: {{ name: 'Calculator', parameters: {{}}, position: [700, 500] }}
}});

const startTrigger = trigger({{
  type: 'n8n-nodes-base.manualTrigger',
  version: 1,
  config: {{ name: 'Start', position: [240, 300] }},
  output: [{{}}]
}});

const aiAgent = node({{
  type: '@n8n/n8n-nodes-langchain.agent',
  version: 3.1,
  config: {{
    name: 'Math Agent',
    parameters: {{ promptType: 'define', text: 'You can use tools to help users' }},
    subnodes: {{ model: openAiModel, tools: [calculatorTool] }},
    position: [540, 300]
  }},
  output: [{{ output: '42' }}]
}});

export default workflow('ai-calculator', 'AI Calculator')
  .add(startTrigger)
  .to(aiAgent);
\`\`\`

</ai_agent_with_tools>

<ai_agent_with_from_ai>
\`\`\`javascript
const openAiModel = languageModel({{
  type: '@n8n/n8n-nodes-langchain.lmChatOpenAi',
  version: 1.3,
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
  config: {{
    name: 'Gmail Tool',
    parameters: {{
      sendTo: fromAi('recipient', 'Email address'),
      subject: fromAi('subject', 'Email subject'),
      message: fromAi('body', 'Email content')
    }},
    credentials: {{ gmailOAuth2: newCredential('Gmail') }},
    position: [700, 500]
  }}
}});

const startTrigger = trigger({{
  type: 'n8n-nodes-base.manualTrigger',
  version: 1,
  config: {{ name: 'Start', position: [240, 300] }},
  output: [{{}}]
}});

const aiAgent = node({{
  type: '@n8n/n8n-nodes-langchain.agent',
  version: 3.1,
  config: {{
    name: 'Email Agent',
    parameters: {{ promptType: 'define', text: 'You can send emails' }},
    subnodes: {{ model: openAiModel, tools: [gmailTool] }},
    position: [540, 300]
  }},
  output: [{{ output: 'Email sent successfully' }}]
}});

export default workflow('ai-email', 'AI Email Sender')
  .add(startTrigger)
  .to(aiAgent);
\`\`\`
</ai_agent_with_from_ai>

<ai_agent_with_structured_output>
\`\`\`javascript
const structuredParser = outputParser({{
  type: '@n8n/n8n-nodes-langchain.outputParserStructured',
  version: 1.3,
  config: {{
    name: 'Structured Output Parser',
    parameters: {{
      schemaType: 'fromJson',
      jsonSchemaExample: '{{{{ "sentiment": "positive", "confidence": 0.95, "summary": "brief summary" }}}}'
    }},
    position: [700, 500]
  }}
}});

const aiAgent = node({{
  type: '@n8n/n8n-nodes-langchain.agent',
  version: 3.1,
  config: {{
    name: 'Sentiment Analyzer',
    parameters: {{ promptType: 'define', text: 'Analyze the sentiment of the input text', hasOutputParser: true }},
    subnodes: {{ model: openAiModel, outputParser: structuredParser }},
    position: [540, 300]
  }},
  output: [{{ sentiment: 'positive', confidence: 0.95, summary: 'The text expresses satisfaction' }}]
}});

export default workflow('ai-sentiment', 'AI Sentiment Analyzer')
  .add(startTrigger)
  .to(aiAgent);
\`\`\`
</ai_agent_with_structured_output>`;

// ── Mandatory workflow steps ──────────────────────────────────────────────────
// Two paths exist: build mode and plan mode (when an approved plan is provided).
//
// Build path: Step 1 (analyze) → Step 2 (2a suggest, 2b search, 2c review) → Step 3 (design) → Steps 4–7
// Plan path:    Step 1 (read plan) → Step 2 (2a search, 2b review)            → Step 3 (design) → Steps 4–7
//
// Step 2 sub-steps are numbered sequentially within each path.

const MANDATORY_WORKFLOW_INTRO =
	'**You MUST follow these steps in order. Do NOT produce visible output until the final step — only tool calls.**';

// ── Step 1 variants ──────────────────────────────────────────────────────────

const ANALYZE_USER_REQUEST = `
Analyze the user request internally. Do NOT produce visible output in this step — reason internally (NOT Think tool), then proceed to tool calls. Be concise.

1. **Extract Requirements**: Quote or paraphrase what the user wants to accomplish.

2. **Identify All Relevant Workflow Technique Categories that might be relevant**:
   - chatbot: Receiving chat messages and replying (built-in chat, Telegram, Slack, etc.)
   - notification: Sending alerts or updates via email, chat, SMS when events occur
   - scheduling: Running actions at specific times or intervals
   - data_transformation: Cleaning, formatting, or restructuring data
   - data_persistence: Storing, updating, or retrieving records from persistent storage
   - data_extraction: Pulling specific information from structured or unstructured inputs
   - document_processing: Taking action on content within files (PDFs, Word docs, images)
   - form_input: Gathering data from users via forms
   - content_generation: Creating text, images, audio, or video
   - triage: Classifying data for routing or prioritization
   - scraping_and_research: Collecting current/live information from external sources. ALSO applies when the workflow analyzes, monitors, tracks, or reports on real-world entities (stocks, weather, news, prices, people, companies) — the AI model alone cannot provide up-to-date data

3. **Identify External Services**: List all external services mentioned (Gmail, Slack, Notion, APIs, etc.)
   - Do NOT assume you know the node names yet
   - Just identify what services need to be connected

4. **Identify Workflow Concepts**: What patterns are needed?
   - Trigger type — every workflow must start with one (\`manualTrigger\` for testing, \`scheduleTrigger\` for recurring, \`webhook\` for external)
   - Branching/routing (if/else, switch, merge)
   - Loops (batch processing)
   - Data transformation needs
`;

const READ_APPROVED_PLAN = `
Read the approved plan provided in <approved_plan>. Do NOT re-analyze the user request — the plan is the authoritative specification.
Be EXTREMELY concise.

1. **Collect node types**: Extract all node type names from each step's suggestedNodes.
2. **Note the trigger**: Identify the trigger type described in the plan.
3. **Note additional specs**: Review any additionalSpecs for constraints.

If you have everything you need to build a workflow, continue directly with step 2b, reviewing search results, and step 3, planning workflow design.
`;

// ── Step 2 variants ─────────────────────────────────────────────────────────
// Build path uses: get_suggested_nodes → search → review (3 sub-steps)
// Plan path uses:    search → review (2 sub-steps)
// Numbering (2a, 2b, ...) is applied at the array level in the builder functions.

const GET_SUGGESTED_NODES = `
Do NOT produce visible output — only the tool call. Call \`get_suggested_nodes\` with the workflow technique categories identified in Step 1:

\`\`\`
get_suggested_nodes({{ categories: ["chatbot", "notification"] }})
\`\`\`

This returns curated node recommendations with pattern hints and configuration guidance.
`;

const SEARCH_NODES_BUILD = `
Do NOT produce visible output — only the tool call. Be EXTREMELY concise. Call \`search_nodes\` to find specific nodes for services identified in Step 1 and ALL node types you plan to use:

\`\`\`
search_nodes({{ queries: ["gmail", "slack", "schedule trigger", "set", ...] }})
\`\`\`

Search for:
- External services (Gmail, Slack, etc.)
- Workflow concepts (schedule, webhook, etc.)
- **Utility nodes you'll need** (set/edit fields, filter, if, code, merge, switch, etc.)
- AI-related terms if needed
- **Nodes from suggested results you plan to use**
`;

const SEARCH_NODES_PLAN = `
Do NOT produce visible output — only the tool call. Be EXTREMELY concise. Call \`search_nodes\` with node types from the plan's suggestedNodes to get discriminators, versions, and related nodes:

\`\`\`
search_nodes({{ queries: ["httpRequest", "slack", "schedule trigger", "set", ...] }})
\`\`\`

Search for:
- All node types listed in the plan's suggestedNodes
- The trigger type mentioned in the plan
- **Utility nodes you'll need** (set/edit fields, filter, if, code, merge, switch, etc.)
`;

const SEARCH_NODES_PREFETCHED = `
The search results for the plan's suggestedNodes are pre-fetched in <node_search_results>. Read those results carefully.
If you need additional nodes not covered (trigger, utility nodes (set/edit fields, filter, if, code, merge, switch, etc.)), call \`search_nodes\`. Otherwise proceed to the next step.

\`\`\`
search_nodes({{ queries: ["httpRequest", "slack", "schedule trigger", "set", ...] }})
\`\`\`
`;

const REVIEW_RESULTS_BUILD = `
Review all results internally. Do NOT produce visible output in this step. Be EXTREMELY concise.

For each service/concept searched, list the matching node(s) found:
- Note which nodes have [TRIGGER] tags for trigger nodes
- Note discriminator requirements (resource/operation or mode) for each node
- Note [RELATED] nodes that might be useful
- Note @relatedNodes with relationHints for complementary nodes
- **Pay special attention to @builderHint and @example annotations** — write these out as they are guides specifically meant to help you choose the right node configurations
- Review patternHints and notes from get_suggested_nodes. If multiple categories were returned, focus on the most relevant patternHint for the user's core request — don't try to follow all of them
- It's OK for this section to be quite long if many nodes were found

If you have everything you need to build a workflow, continue to step 3, planning the workflow design.
`;

const REVIEW_RESULTS_PLAN = `
Do NOT produce visible output in this step. Only internal thinking. Be EXTREMELY concise.

For each node searched, list the matching node(s) found:
- Note which nodes have [TRIGGER] tags for trigger nodes
- Note discriminator requirements (resource/operation or mode) for each node
- Note [RELATED] nodes that might be useful
- Note @relatedNodes with relationHints for complementary nodes
- **Pay special attention to @builderHint and @example annotations** — write these out as they are guides specifically meant to help you choose the right node configurations
- It's OK for this section to be quite long if many nodes were found

If you have everything you need to build a workflow, continue to step 3, planning the workflow design.
`;

// ── Step 3 variants ──────────────────────────────────────────────────────────

const DESIGN_WORKFLOW_BUILD = `
Make design decisions internally based on the reviewed results. Do NOT produce visible output in this step.

1. **Select Nodes**: Based on search results AND suggested nodes, choose specific nodes:
   - Use dedicated integration nodes when available (from search)
   - Only use HTTP Request if no dedicated node was found
   - Note discriminators needed for each node
   - Use the most relevant patternHint as a starting template for your workflow structure. When multiple patternHints were returned, pick the one that best matches the user's core goal — don't merge all hints into one structure
   - Review node notes from all categories for recommended additions the user may not have explicitly requested (e.g., a storage step, memory for agents)
   - **If you identified \`scraping_and_research\` in Step 1, you MUST include a data-fetching node or tool** (e.g., SerpApi tool, Perplexity, HTTP Request). Do not rely on the AI model's training data for real-world information — commit to the data source you identified earlier

2. **Map Node Connections**:
   - Is this linear, branching, parallel, or looped? Or merge to combine parallel branches?
   - **Trace item counts**: For each connection A → B, if A returns N items, should B run N times or just once? If B doesn't need A's items (e.g., it fetches from an independent source), either set \`executeOnce: true\` on B or use parallel branches + Merge to combine results.
   - Which nodes connect to which?
	 - Draw out the flow in text form (e.g., "Trigger → Node A → Node B → Node C" or "Trigger → Node A → [Node B (true), Node C (false)]")
   - **Handling convergence after branches**: When a node receives data from multiple paths (after Switch, IF, Merge): use optional chaining \`expr('{{{{ $json.data?.approved ?? $json.status }}}}')\`, reference a node that ALWAYS runs \`expr("{{{{ $('Webhook').item.json.field }}}}")\`, or normalize data before convergence with Set nodes

3. **Prepare get_node_types Call**: Write the exact call including discriminators

It's OK for this section to be quite long as you work through the design.
**Pay attention to @builderHint annotations in the type definitions** - these provide critical guidance on how to correctly configure node parameters.
`;

const DESIGN_WORKFLOW_PLAN = `
Use thinking to make design decisions based on the search results and the approved plan's steps. Do NOT produce visible output in this step.

1. **Select Nodes**: Based on search results and the plan's steps, choose specific nodes:
   - Use dedicated integration nodes when available (from search)
   - Only use HTTP Request if no dedicated node was found
   - Note discriminators needed for each node
   - Follow the plan's step sequence as the workflow structure

2. **Map Node Connections**:
   - Is this linear, branching, parallel, or looped? Or merge to combine parallel branches?
   - **Trace item counts**: For each connection A → B, if A returns N items, should B run N times or just once? If B doesn't need A's items (e.g., it fetches from an independent source), either set \`executeOnce: true\` on B or use parallel branches + Merge to combine results.
   - Which nodes connect to which?
	 - Draw out the flow in text form (e.g., "Trigger → Node A → Node B → Node C" or "Trigger → Node A → [Node B (true), Node C (false)]")
   - **Handling convergence after branches**: When a node receives data from multiple paths (after Switch, IF, Merge): use optional chaining \`expr('{{{{ $json.data?.approved ?? $json.status }}}}')\`, reference a node that ALWAYS runs \`expr("{{{{ $('Webhook').item.json.field }}}}")\`, or normalize data before convergence with Set nodes

3. **Prepare get_node_types Call**: Write the exact call including discriminators

It's OK for this section to be quite long as you work through the design.
**Pay attention to @builderHint annotations in the type definitions** - these provide critical guidance on how to correctly configure node parameters.
`;

// ── Steps 4–7 (shared) ──────────────────────────────────────────────────────

const STEPS_4_THROUGH_7 = `<step_4_get_node_type_definitions>

Do NOT produce visible output — only the tool call.

**MANDATORY:** Call \`get_node_types\` with ALL nodes you selected.

\`\`\`
get_node_types({{ nodeIds: ["n8n-nodes-base.manualTrigger", {{ nodeId: "n8n-nodes-base.gmail", resource: "message", operation: "send" }}, ...] }})
\`\`\`

Include discriminators for nodes that require them (shown in search results).

**DO NOT skip this step!** Guessing parameter names or versions creates invalid workflows.

**Pay attention to @builderHint annotations in the type definitions** - these provide critical guidance on how to correctly configure node parameters.

</step_4_get_node_type_definitions>

<step_5_create_or_edit_workflow>

Do NOT produce visible output — only the tool call to edit code.

Edit \`/workflow.js\` using \`batch_str_replace\`, \`str_replace\`, \`insert\`, or \`create\` (to write the full file with imports).

Rules:
- When making multiple edits, prefer \`batch_str_replace\` to apply all changes atomically in one call.
- Use exact parameter names and structures from the type definitions.
- Use unique variable names — never reuse builder function names (e.g. \`node\`, \`trigger\`) as variable names
- Use descriptive node names (Good: "Fetch Weather Data", "Check Temperature"; Bad: "HTTP Request", "Set", "If")
- Credentials: \`credentials: {{ slackApi: newCredential('Slack Bot') }}\` — type must match what the node expects
- Expressions: use \`expr()\` for any \`{{{{ }}}}\` syntax  — always use single or double quotes, NOT backtick template literals
  - e.g. \`expr('Hello {{{{ $json.name }}}}')\` or \`expr("{{{{ $('Node').item.json.field }}}}")\`
	- For multiline expressions, use string concatenation: \`expr('Line 1\\n' + 'Line 2 {{{{ $json.value }}}}')\`
  - WRONG: \`expr('Daily Digest - ' + $now.toFormat('MMMM d') + '\\n' + $json.output)\` — $now and $json are outside {{{{ }}}}
  - CORRECT: \`expr('Daily Digest - {{{{ $now.toFormat("MMMM d") }}}}\\n{{{{ $json.output }}}}')\` — variables inside {{{{ }}}}
  - WRONG: \`expr('{{{{ ' + JSON.stringify($('Node').all().map(i => i.json)) + ' }}}}')\` — $() used as JavaScript
  - CORRECT: \`expr('{{{{ $("Node").all().map(i => i.json) }}}}')\` — $() inside {{{{ }}}} evaluated at runtime
- Placeholders: use \`placeholder('hint')\` directly as the parameter value, not inside \`expr()\`, objects, or arrays, etc.
- Every node MUST have an \`output\` property with sample data — following nodes depend on it for expressions
- String quoting: When a string value contains an apostrophe, use double quotes for that string.
  Example: \`output: [{{ text: "I've arrived" }}]\`
- Do NOT add or edit comments. Comments are ignored and not shared with user. Use sticky(...) to provide guidance.

</step_5_create_or_edit_workflow>

<step_6_validate_workflow>

Do NOT produce visible output — only the tool call.

After writing or editing code in the previous step, call \`validate_workflow\` to check for errors:

\`\`\`
validate_workflow({{ path: "/workflow.js" }})
\`\`\`

**Only call validate_workflow after you have written or edited code.** Do not call it if no code exists yet.

If errors are reported, fix ALL relevant issues using \`batch_str_replace\` (preferred for multiple fixes) or individual str_replace/insert calls, then call \`validate_workflow\` again. Do not call validate_workflow after each individual fix — batch all fixes first, then validate once. Focus on warnings relevant to your changes and last user request.

</step_6_validate_workflow>

<step_7_finalize>

When validation passes, stop calling tools.
</step_7_finalize>`;

function wrapStep(tag: string, content: string): string {
	return `<${tag}>${content}</${tag}>`;
}

function buildBuildModeSteps(): string {
	const step2Parts = [
		wrapStep('step_2a_get_suggested_nodes', GET_SUGGESTED_NODES),
		wrapStep('step_2b_search_for_nodes', SEARCH_NODES_BUILD),
		wrapStep('step_2c_review_search_results', REVIEW_RESULTS_BUILD),
	].join('\n');

	return [
		MANDATORY_WORKFLOW_INTRO,
		wrapStep('step_1_analyze_user_request', ANALYZE_USER_REQUEST),
		wrapStep('step_2_search_for_nodes', `\n${step2Parts}\n`),
		wrapStep('step_3_plan_workflow_design', DESIGN_WORKFLOW_BUILD),
		STEPS_4_THROUGH_7,
	].join('\n\n');
}

function buildPlanModeSteps(hasPreSearchResults: boolean): string {
	const searchContent = hasPreSearchResults ? SEARCH_NODES_PREFETCHED : SEARCH_NODES_PLAN;
	const step2Parts = [
		wrapStep('step_2a_search_for_nodes', searchContent),
		wrapStep('step_2b_review_search_results', REVIEW_RESULTS_PLAN),
	].join('\n');

	return [
		MANDATORY_WORKFLOW_INTRO,
		wrapStep('step_1_read_approved_plan', READ_APPROVED_PLAN),
		wrapStep('step_2_search_for_nodes', `\n${step2Parts}\n`),
		wrapStep('step_3_plan_workflow_design', DESIGN_WORKFLOW_PLAN),
		STEPS_4_THROUGH_7,
	].join('\n\n');
}

function buildMandatoryWorkflow(hasPlanOutput: boolean, hasPreSearchResults = false): string {
	if (hasPlanOutput) {
		return buildPlanModeSteps(hasPreSearchResults);
	}
	return buildBuildModeSteps();
}

/**
 * History context for multi-turn conversations
 */
export interface HistoryContext {
	/** Typed conversation entries in this session */
	conversationEntries: ConversationEntry[];
	/** Compacted summary of older conversations (if any) */
	previousSummary?: string;
}

/**
 * Options for building the code builder prompt
 */
export interface BuildCodeBuilderPromptOptions {
	/** Enable text editor mode */
	enableTextEditor?: boolean;
	/** Node output schemas from previous execution */
	executionSchema?: NodeExecutionSchema[];
	/** Execution result data for status and error info */
	executionData?: IRunExecutionData['resultData'];
	/** Expression values resolved from previous execution */
	expressionValues?: Record<string, ExpressionValue[]>;
	/** Pre-generated workflow code (used to ensure text editor and prompt have same content) */
	preGeneratedCode?: string;
	/** Whether execution schema values were excluded (redacted) */
	valuesExcluded?: boolean;
	/** Node names whose output schema was derived from pin data */
	pinnedNodes?: string[];
	/** Approved plan from planning phase */
	planOutput?: PlanOutput;
	/** Pre-fetched search_nodes results for the plan's suggestedNodes */
	preSearchResults?: string;
}

/**
 * Build the user message context parts (history, workflow, plan, search results)
 */
function buildUserMessageParts(
	currentWorkflow: WorkflowJSON | undefined,
	historyContext: HistoryContext | undefined,
	options: BuildCodeBuilderPromptOptions | undefined,
): string[] {
	const parts: string[] = [];

	// 1. Compacted summary (if exists from previous compactions)
	if (historyContext?.previousSummary) {
		parts.push(
			`<conversation_summary>\n${escapeCurlyBrackets(historyContext.previousSummary)}\n</conversation_summary>`,
		);
	}

	// 2. Previous user requests (raw messages for recent context)
	if (historyContext?.conversationEntries && historyContext.conversationEntries.length > 0) {
		parts.push('<previous_requests>');
		historyContext.conversationEntries.forEach((msg, i) => {
			parts.push(`${i + 1}. ${escapeCurlyBrackets(entryToString(msg))}`);
		});
		parts.push('</previous_requests>');
	}

	// 3. Current workflow context (with line numbers for text editor)
	if (currentWorkflow) {
		// Use pre-generated code if provided (ensures text editor and prompt match),
		// otherwise generate with execution context
		const workflowCode =
			options?.preGeneratedCode ??
			generateWorkflowCode({
				workflow: currentWorkflow,
				executionSchema: options?.executionSchema,
				executionData: options?.executionData,
				expressionValues: options?.expressionValues,
				valuesExcluded: options?.valuesExcluded,
				pinnedNodes: options?.pinnedNodes,
			});

		// Format as file with line numbers (matches view command output)
		// Include SDK import so LLM sees the same code that's in the text editor
		const codeWithImport = `${SDK_IMPORT_STATEMENT}\n\n${workflowCode}`;
		const formattedCode = formatCodeWithLineNumbers(codeWithImport);
		const escapedCode = escapeCurlyBrackets(formattedCode);
		parts.push(`<workflow_file path="/workflow.js">\n${escapedCode}\n</workflow_file>`);
	} else {
		parts.push(
			'<workflow_file path="/workflow.js">\nNo file exists yet. Use the `create` command to write the initial workflow code.\n</workflow_file>',
		);
	}

	// 4. Approved plan (when plan mode feeds into code builder)
	if (options?.planOutput) {
		parts.push(
			`<approved_plan>\n${escapeCurlyBrackets(formatPlanAsText(options.planOutput))}\n</approved_plan>`,
		);
	}

	// 5. Pre-fetched search results (saves an LLM round-trip when plan is provided)
	if (options?.preSearchResults) {
		parts.push(
			`<node_search_results>\n${escapeCurlyBrackets(options.preSearchResults)}\n</node_search_results>`,
		);
	}

	return parts;
}

/**
 * Build the complete system prompt for the code builder agent
 *
 * @param currentWorkflow - Optional current workflow JSON context
 * @param historyContext - Optional conversation history for multi-turn refinement
 * @param options - Optional configuration options
 */
export function buildCodeBuilderPrompt(
	currentWorkflow?: WorkflowJSON,
	historyContext?: HistoryContext,
	options?: BuildCodeBuilderPromptOptions,
): ChatPromptTemplate {
	const hasPlanOutput = !!options?.planOutput;
	const hasPreSearchResults = !!options?.preSearchResults;
	const mandatoryWorkflow = buildMandatoryWorkflow(hasPlanOutput, hasPreSearchResults);

	const promptSections = [
		`<role>\n${ROLE}\n</role>`,
		`<response_style>\n${RESPONSE_STYLE}\n</response_style>`,
		`<workflow_rules>\n${WORKFLOW_RULES}\n</workflow_rules>`,
		`<workflow_patterns>\n${WORKFLOW_PATTERNS}\n</workflow_patterns>`,
		`<expression_reference>\n${EXPRESSION_REFERENCE}\n</expression_reference>`,
		`<additional_functions>\n${ADDITIONAL_FUNCTIONS}\n</additional_functions>`,
		`<mandatory_workflow_process>\n${mandatoryWorkflow}\n</mandatory_workflow_process>`,
	];

	const systemMessage = promptSections.join('\n\n');

	const userMessageParts = buildUserMessageParts(currentWorkflow, historyContext, options);

	// Wrap user message in XML tag for easy extraction when loading sessions
	if (userMessageParts.length > 0) {
		userMessageParts.push('<user_request>');
		userMessageParts.push('{userMessage}');
		userMessageParts.push('</user_request>');
	} else {
		userMessageParts.push('{userMessage}');
	}

	const userMessageTemplate = userMessageParts.join('\n');

	return ChatPromptTemplate.fromMessages([
		['system', [{ type: 'text', text: systemMessage, cache_control: { type: 'ephemeral' } }]],
		['human', userMessageTemplate],
	]);
}
