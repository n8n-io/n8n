/**
 * Instance-AI workflow patterns — enriched examples with full parameter structures.
 *
 * Includes zero_item_safety, executeOnce guidance, and complete conditions/switch
 * parameter examples. No positions or sample output — instance-AI auto-calculates layout.
 *
 * See also: workflow-patterns-detailed.ts for the legacy code-builder variant
 * (includes positions and sample output for the sandbox environment).
 */

const SDK_IMPORT =
	"import { workflow, node, trigger, sticky, placeholder, newCredential, ifElse, switchCase, merge, splitInBatches, nextBatch, languageModel, memory, tool, outputParser, embedding, embeddings, vectorStore, retriever, documentLoader, textSplitter, fromAi, expr } from '@n8n/workflow-sdk';";

/**
 * Concise workflow patterns without positions or sample output.
 * Used by the instance-ai builder sub-agent.
 */
export const WORKFLOW_SDK_PATTERNS = `<linear_chain>
\`\`\`javascript
${SDK_IMPORT}

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

export { WORKFLOW_SDK_PATTERNS as WORKFLOW_PATTERNS_CONCISE };
