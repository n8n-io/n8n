/**
 * SDK prompt sections for the workflow builder sub-agent.
 *
 * Adapted from ai-workflow-builder.ee/code-builder/prompts/index.ts — plain
 * strings without LangChain template escaping.
 */

import { SDK_IMPORT_STATEMENT } from './extract-code';

/**
 * Expression context reference — documents variables available inside expr()
 */
export const EXPRESSION_REFERENCE = `Available variables inside \`expr('{{ ... }}')\`:

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

String composition — variables MUST always be inside \`{{ }}\`, never outside as JS variables:

- \`expr('Hello {{ $json.name }}, welcome!')\` — variable embedded in text
- \`expr('Report for {{ $now.toFormat("MMMM d, yyyy") }} - {{ $json.title }}')\` — multiple variables with method call
- \`expr('{{ $json.firstName }} {{ $json.lastName }}')\` — combining multiple fields
- \`expr('Total: {{ $json.items.length }} items, updated {{ $now.toISO() }}')\` — expressions with method calls
- \`expr('Status: {{ $json.count > 0 ? "active" : "empty" }}')\` — inline ternary

Dynamic data from other nodes — \`$()\` MUST always be inside \`{{ }}\`, never used as plain JavaScript:

- WRONG: \`expr('{{ ' + JSON.stringify($('Source').all().map(i => i.json.name)) + ' }}')\` — $() outside {{ }}
- CORRECT: \`expr('{{ $("Source").all().map(i => ({ option: i.json.name })) }}')\` — $() inside {{ }}`;

/**
 * Additional SDK functions not covered by main workflow patterns
 */
export const ADDITIONAL_FUNCTIONS = `Additional SDK functions:

- \`placeholder('hint')\` — marks a parameter value for user input. Use directly as the parameter value — never wrap in \`expr()\`, objects, or arrays.
  Example: \`parameters: { url: placeholder('Your API URL (e.g. https://api.example.com/v1)') }\`

- \`sticky('content', nodes?, config?)\` — creates a sticky note on the canvas.
  Example: \`sticky('## Data Processing', [httpNode, setNode], { color: 2 })\`

- \`.output(n)\` — selects a specific output index for multi-output nodes. IF and Switch have dedicated methods (\`onTrue/onFalse\`, \`onCase\`), but \`.output(n)\` works as a generic alternative.
  Example: \`classifier.output(1).to(categoryB)\`

- \`.onError(handler)\` — connects a node's error output to a handler node. Requires \`onError: 'continueErrorOutput'\` in the node config.
  Example: \`httpNode.onError(errorHandler)\` (with \`config: { onError: 'continueErrorOutput' }\`)

- Additional subnode factories (all follow the same pattern as \`languageModel()\` and \`tool()\`):
  \`memory()\`, \`outputParser()\`, \`embeddings()\`, \`vectorStore()\`, \`retriever()\`, \`documentLoader()\`, \`textSplitter()\``;

/**
 * Workflow rules — strict constraints for code generation
 */
export const WORKFLOW_RULES = `Follow these rules strictly when generating workflows:

1. **Always use newCredential() for authentication**
   - When a node needs credentials, always use \`newCredential('Name')\` in the credentials config
   - NEVER use placeholder strings, fake API keys, or hardcoded auth values
   - Example: \`credentials: { slackApi: newCredential('Slack Bot') }\`
   - The credential type must match what the node expects

2. **Handle empty outputs with \`alwaysOutputData: true\`**
   - Nodes that query data (Data Table get, Google Sheets lookup, HTTP Request, etc.) may return 0 items
   - When a node returns 0 items, all downstream nodes are SKIPPED — the workflow chain breaks silently
   - Set \`alwaysOutputData: true\` on any node whose output feeds downstream nodes and might return empty results
   - Common cases: fresh/empty Data Tables, filtered queries, conditional lookups, API searches with no matches
   - Example: \`config: { ..., alwaysOutputData: true }\`

3. **Use \`executeOnce: true\` for single-execution nodes**
   - When a node receives N items but should only execute once (not N times), set \`executeOnce: true\`
   - Common cases: sending a summary notification, generating a report, calling an API that doesn't need per-item execution
   - Example: \`config: { ..., executeOnce: true }\``;

/**
 * Workflow SDK patterns — condensed examples of common workflow shapes
 */
export const WORKFLOW_SDK_PATTERNS = `<linear_chain>
\`\`\`javascript
${SDK_IMPORT_STATEMENT}

// 1. Define all nodes first
const startTrigger = trigger({
  type: 'n8n-nodes-base.manualTrigger',
  version: 1,
  config: { name: 'Start' }
});

const fetchData = node({
  type: 'n8n-nodes-base.httpRequest',
  version: 4.3,
  config: { name: 'Fetch Data', parameters: { method: 'GET', url: '...' } }
});

const processData = node({
  type: 'n8n-nodes-base.set',
  version: 3.4,
  config: { name: 'Process Data', parameters: {} }
});

// 2. Compose workflow
export default workflow('id', 'name')
  .add(startTrigger)
  .to(fetchData)
  .to(processData);
\`\`\`

</linear_chain>

<independent_sources>
When nodes return more than 1 item, chaining causes item multiplication: if Source A returns N items, a chained Source B runs N times instead of once.

**When to use \`executeOnce: true\`:**
- A node fetches data independently but is chained after another data source (prevents N×M multiplication)
- A node should summarize/aggregate all upstream items in a single call (e.g., AI summary, send one notification)
- A node calls an API that doesn't vary per input item

Fix with \`executeOnce: true\` (simplest) or parallel branches + Merge (when combining results):

\`\`\`javascript
// sourceA outputs 10 items. sourceB outputs 10 items.
// WRONG - processResults runs 100 times
// startTrigger.to(sourceA.to(sourceB.to(processResults)))

// FIX 1 - executeOnce: sourceB runs once regardless of input items
const sourceB = node({ ..., config: { ..., executeOnce: true } });
startTrigger.to(sourceA.to(sourceB.to(processResults)));

// FIX 2 - parallel branches + Merge (combine by position)
const combineResults = merge({
  version: 3.2,
  config: { name: 'Combine Results', parameters: { mode: 'combine', combineBy: 'combineByPosition' } }
});
export default workflow('id', 'name')
  .add(startTrigger)
  .to(sourceA.to(combineResults.input(0)))
  .add(startTrigger)
  .to(sourceB.to(combineResults.input(1)))
  .add(combineResults)
  .to(processResults);

// FIX 3 - parallel branches + Merge (append)
const allResults = merge({
  version: 3.2,
  config: { name: 'All Results', parameters: { mode: 'append' } }
});
export default workflow('id', 'name')
  .add(startTrigger)
  .to(sourceA.to(allResults.input(0)))
  .add(startTrigger)
  .to(sourceB.to(allResults.input(1)))
  .add(allResults)
  .to(processResults);
\`\`\`

</independent_sources>

<zero_item_safety>
Nodes that fetch or filter data may return 0 items, which stops the entire downstream chain.
Use \`alwaysOutputData: true\` on data-fetching nodes to ensure the chain continues with an empty item \`{json: {}}\`.

\`\`\`javascript
// Data Table might be empty (fresh table, no matching rows)
const getReflections = node({
  type: 'n8n-nodes-base.dataTable',
  version: 1.1,
  config: {
    name: 'Get Reflections',
    alwaysOutputData: true,  // Chain continues even if table is empty
    parameters: { resource: 'row', operation: 'get', returnAll: true }
  }
});

// Downstream Code node handles the empty case
const processData = node({
  type: 'n8n-nodes-base.code',
  version: 2,
  config: {
    name: 'Process Data',
    parameters: {
      mode: 'runOnceForAllItems',
      jsCode: \\\`
const items = $input.all();
// items will be [{json: {}}] if upstream had no data
const hasData = items.length > 0 && Object.keys(items[0].json).length > 0;
// ... handle both cases
\\\`.trim()
    }
  }
});
\`\`\`

**When to use \`alwaysOutputData: true\`:**
- Data Table with \`operation: 'get'\` (table may be empty or freshly created)
- Any lookup/search/filter node whose result feeds into downstream processing
- HTTP Request that may return an empty array

**When NOT to use it:**
- Trigger nodes (they always produce output)
- Code nodes (handle empty input in your code logic instead)
- Nodes at the end of the chain (no downstream to protect)

</zero_item_safety>

<conditional_branching>

**CRITICAL:** Each branch defines a COMPLETE processing path. Chain multiple steps INSIDE the branch using .to().

Every IF/Filter \`conditions\` parameter MUST include \`options\`, \`conditions\`, and \`combinator\`:
\`\`\`javascript
const checkValid = ifElse({
  version: 2.2,
  config: {
    name: 'Check Valid',
    parameters: {
      conditions: {
        options: { caseSensitive: true, leftValue: '', typeValidation: 'strict' },
        conditions: [{ leftValue: '={{ $json.status }}', operator: { type: 'string', operation: 'equals' }, rightValue: 'active' }],
        combinator: 'and'
      }
    }
  }
});

export default workflow('id', 'name')
  .add(startTrigger)
  .to(checkValid
    .onTrue(formatData.to(enrichData.to(saveToDb)))  // Chain 3 nodes on true branch
    .onFalse(logError));
\`\`\`

</conditional_branching>

<multi_way_routing>

Switch rules use \`rules.values\` (NOT \`rules.rules\`). Each rule needs \`outputKey\` and a complete \`conditions\` object:
\`\`\`javascript
const routeByPriority = switchCase({
  version: 3.2,
  config: {
    name: 'Route by Priority',
    parameters: {
      rules: {
        values: [
          { outputKey: 'urgent', conditions: { options: { caseSensitive: true, leftValue: '', typeValidation: 'strict' }, conditions: [{ leftValue: '={{ $json.priority }}', operator: { type: 'string', operation: 'equals' }, rightValue: 'urgent' }], combinator: 'and' } },
          { outputKey: 'normal', conditions: { options: { caseSensitive: true, leftValue: '', typeValidation: 'strict' }, conditions: [{ leftValue: '={{ $json.priority }}', operator: { type: 'string', operation: 'equals' }, rightValue: 'normal' }], combinator: 'and' } },
        ]
      }
    }
  }
});

export default workflow('id', 'name')
  .add(startTrigger)
  .to(routeByPriority
    .onCase('urgent', processUrgent.to(notifyTeam.to(escalate)))
    .onCase('normal', processNormal)
    .onDefault(archive));
\`\`\`

</multi_way_routing>

<parallel_execution>
\`\`\`javascript
// First declare the Merge node using merge()
const combineResults = merge({
  version: 3.2,
  config: { name: 'Combine Results', parameters: { mode: 'combine' } }
});

// Declare branch nodes
const branch1 = node({ type: 'n8n-nodes-base.httpRequest', ... });
const branch2 = node({ type: 'n8n-nodes-base.httpRequest', ... });
const processResults = node({ type: 'n8n-nodes-base.set', ... });

// Connect branches to specific merge inputs using .input(n)
export default workflow('id', 'name')
  .add(trigger({ ... }))
  .to(branch1.to(combineResults.input(0)))  // Connect to input 0
  .add(trigger({ ... }))
  .to(branch2.to(combineResults.input(1)))  // Connect to input 1
  .add(combineResults)
  .to(processResults);  // Process merged results
\`\`\`

</parallel_execution>

<batch_processing>
\`\`\`javascript
const startTrigger = trigger({
  type: 'n8n-nodes-base.manualTrigger',
  version: 1,
  config: { name: 'Start' }
});

const fetchRecords = node({
  type: 'n8n-nodes-base.httpRequest',
  version: 4.3,
  config: { name: 'Fetch Records', parameters: { method: 'GET', url: '...' } }
});

const finalizeResults = node({
  type: 'n8n-nodes-base.set',
  version: 3.4,
  config: { name: 'Finalize', parameters: {} }
});

const processRecord = node({
  type: 'n8n-nodes-base.httpRequest',
  version: 4.3,
  config: { name: 'Process Record', parameters: { method: 'POST', url: '...' } }
});

const sibNode = splitInBatches({ version: 3, config: { name: 'Batch Process', parameters: { batchSize: 10 } } });

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
const webhookTrigger = trigger({
  type: 'n8n-nodes-base.webhook',
  version: 2.1,
  config: { name: 'Webhook' }
});

const processWebhook = node({
  type: 'n8n-nodes-base.set',
  version: 3.4,
  config: { name: 'Process Webhook', parameters: {} }
});

const scheduleTrigger = trigger({
  type: 'n8n-nodes-base.scheduleTrigger',
  version: 1.3,
  config: { name: 'Daily Schedule', parameters: {} }
});

const processSchedule = node({
  type: 'n8n-nodes-base.set',
  version: 3.4,
  config: { name: 'Process Schedule', parameters: {} }
});

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

const webhookTrigger = trigger({
  type: 'n8n-nodes-base.webhook',
  version: 2.1,
  config: { name: 'Webhook Trigger' }
});

const scheduleTrigger = trigger({
  type: 'n8n-nodes-base.scheduleTrigger',
  version: 1.3,
  config: { name: 'Daily Schedule' }
});

const processData = node({
  type: 'n8n-nodes-base.set',
  version: 3.4,
  config: { name: 'Process Data', parameters: {} }
});

const sendNotification = node({
  type: 'n8n-nodes-base.slack',
  version: 2.3,
  config: { name: 'Notify Slack', parameters: {} }
});

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
const openAiModel = languageModel({
  type: '@n8n/n8n-nodes-langchain.lmChatOpenAi',
  version: 1.3,
  config: { name: 'OpenAI Model', parameters: {} }
});

const startTrigger = trigger({
  type: 'n8n-nodes-base.manualTrigger',
  version: 1,
  config: { name: 'Start' }
});

const aiAgent = node({
  type: '@n8n/n8n-nodes-langchain.agent',
  version: 3.1,
  config: {
    name: 'AI Assistant',
    parameters: { promptType: 'define', text: 'You are a helpful assistant' },
    subnodes: { model: openAiModel }
  }
});

export default workflow('ai-assistant', 'AI Assistant')
  .add(startTrigger)
  .to(aiAgent);
\`\`\`

</ai_agent_basic>

<ai_agent_with_tools>
\`\`\`javascript
const openAiModel = languageModel({
  type: '@n8n/n8n-nodes-langchain.lmChatOpenAi',
  version: 1.3,
  config: {
    name: 'OpenAI Model',
    parameters: {},
    credentials: { openAiApi: newCredential('OpenAI') }
  }
});

const calculatorTool = tool({
  type: '@n8n/n8n-nodes-langchain.toolCalculator',
  version: 1,
  config: { name: 'Calculator', parameters: {} }
});

const startTrigger = trigger({
  type: 'n8n-nodes-base.manualTrigger',
  version: 1,
  config: { name: 'Start' }
});

const aiAgent = node({
  type: '@n8n/n8n-nodes-langchain.agent',
  version: 3.1,
  config: {
    name: 'Math Agent',
    parameters: { promptType: 'define', text: 'You can use tools to help users' },
    subnodes: { model: openAiModel, tools: [calculatorTool] }
  }
});

export default workflow('ai-calculator', 'AI Calculator')
  .add(startTrigger)
  .to(aiAgent);
\`\`\`

</ai_agent_with_tools>

<ai_agent_with_from_ai>
\`\`\`javascript
const openAiModel = languageModel({
  type: '@n8n/n8n-nodes-langchain.lmChatOpenAi',
  version: 1.3,
  config: {
    name: 'OpenAI Model',
    parameters: {},
    credentials: { openAiApi: newCredential('OpenAI') }
  }
});

const gmailTool = tool({
  type: 'n8n-nodes-base.gmailTool',
  version: 1,
  config: {
    name: 'Gmail Tool',
    parameters: {
      sendTo: fromAi('recipient', 'Email address'),
      subject: fromAi('subject', 'Email subject'),
      message: fromAi('body', 'Email content')
    },
    credentials: { gmailOAuth2: newCredential('Gmail') }
  }
});

const startTrigger = trigger({
  type: 'n8n-nodes-base.manualTrigger',
  version: 1,
  config: { name: 'Start' }
});

const aiAgent = node({
  type: '@n8n/n8n-nodes-langchain.agent',
  version: 3.1,
  config: {
    name: 'Email Agent',
    parameters: { promptType: 'define', text: 'You can send emails' },
    subnodes: { model: openAiModel, tools: [gmailTool] }
  }
});

export default workflow('ai-email', 'AI Email Sender')
  .add(startTrigger)
  .to(aiAgent);
\`\`\`
</ai_agent_with_from_ai>

<ai_agent_with_structured_output>
\`\`\`javascript
const structuredParser = outputParser({
  type: '@n8n/n8n-nodes-langchain.outputParserStructured',
  version: 1.3,
  config: {
    name: 'Structured Output Parser',
    parameters: {
      schemaType: 'fromJson',
      jsonSchemaExample: '{ "sentiment": "positive", "confidence": 0.95, "summary": "brief summary" }'
    }
  }
});

const aiAgent = node({
  type: '@n8n/n8n-nodes-langchain.agent',
  version: 3.1,
  config: {
    name: 'Sentiment Analyzer',
    parameters: { promptType: 'define', text: 'Analyze the sentiment of the input text', hasOutputParser: true },
    subnodes: { model: openAiModel, outputParser: structuredParser }
  }
});

export default workflow('ai-sentiment', 'AI Sentiment Analyzer')
  .add(startTrigger)
  .to(aiAgent);
\`\`\`
</ai_agent_with_structured_output>`;
