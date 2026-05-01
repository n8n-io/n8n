/**
 * Legacy code-builder workflow patterns — verbose examples with positions and sample output.
 *
 * Used by the sandbox-based builder (ai-workflow-builder.ee) where explicit positions
 * and output data are needed for code generation and validation.
 *
 * See also: workflow-patterns.ts for the instance-AI variant
 * (enriched parameter examples, no positions/output).
 */
const SDK_IMPORT =
	"import { workflow, node, trigger, sticky, placeholder, newCredential, ifElse, switchCase, merge, splitInBatches, nextBatch, languageModel, memory, tool, outputParser, embedding, embeddings, vectorStore, retriever, documentLoader, textSplitter, reranker, fromAi, expr } from '@n8n/workflow-sdk';";

export const WORKFLOW_PATTERNS_DETAILED = `<linear_chain>
\`\`\`javascript
${SDK_IMPORT}

// 1. Define all nodes first
const startTrigger = trigger({
  type: 'n8n-nodes-base.manualTrigger',
  version: 1,
  config: { name: 'Start', position: [240, 300] },
  output: [{}]
});

const fetchData = node({
  type: 'n8n-nodes-base.httpRequest',
  version: 4.3,
  config: { name: 'Fetch Data', parameters: { method: 'GET', url: '...' }, position: [540, 300] },
  output: [{ id: 1, title: 'Item 1' }]
});

const processData = node({
  type: 'n8n-nodes-base.set',
  version: 3.4,
  config: { name: 'Process Data', parameters: {}, position: [840, 300] },
  output: [{ id: 1, title: 'Item 1', processed: true }]
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

Fix with \`executeOnce: true\` (simplest) or parallel branches + Merge (when combining results):

\`\`\`javascript
// sourceA outputs 10 items. sourceB outputs 10 items.
// sourceB runs once per item from sourceA.
// WRONG - processResults runs 100 times
// startTrigger.to(sourceA.to(sourceB.to(processResults)))

// FIX 1 - executeOnce: sourceB runs once regardless of input items
const sourceB = node({ ..., config: { ..., executeOnce: true } });
startTrigger.to(sourceA.to(sourceB.to(processResults)));

// FIX 2 - parallel branches + Merge (combine by position)
// Pairs items by index, merging fields from both inputs into one item.
// @example input0: [{ a: 1 }, { a: 2 }] input1: [{ b: 10, c: 'x' }, { b: 20 }]
//   output: [{ a: 1, b: 10, c: 'x' }, { a: 2, b: 20, c: undefined }]
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
// Concatenates all items from all inputs into one list sequentially.
// @example input0: [{ a: 1 }, { a: 2 }] input1: [{ b: 10 }]
//   output: [{ a: 1 }, { a: 2 }, { b: 10 }]
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

<conditional_branching>

**CRITICAL:** Each branch defines a COMPLETE processing path. Chain multiple steps INSIDE the branch using .to().

\`\`\`javascript
// Assume other nodes are declared
const checkValid = ifElse({ version: 2.2, config: { name: 'Check Valid', parameters: {...} } });

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
const routeByPriority = switchCase({ version: 3.2, config: { name: 'Route by Priority', parameters: {...} } });

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
const combineResults = merge({
  version: 3.2,
  config: {
    name: 'Combine Results',
    parameters: { mode: 'combine' },
    position: [840, 300]
  }
});

const branch1 = node({ type: 'n8n-nodes-base.httpRequest', ... });
const branch2 = node({ type: 'n8n-nodes-base.httpRequest', ... });
const processResults = node({ type: 'n8n-nodes-base.set', ... });

// Connect branches to specific merge inputs using .input(n)
export default workflow('id', 'name')
  .add(trigger({ ... }))
  .to(branch1.to(combineResults.input(0)))
  .add(trigger({ ... }))
  .to(branch2.to(combineResults.input(1)))
  .add(combineResults)
  .to(processResults);
\`\`\`

</parallel_execution>

<batch_processing>
\`\`\`javascript
const startTrigger = trigger({
  type: 'n8n-nodes-base.manualTrigger', version: 1,
  config: { name: 'Start', position: [240, 300] },
  output: [{}]
});

const fetchRecords = node({
  type: 'n8n-nodes-base.httpRequest', version: 4.3,
  config: { name: 'Fetch Records', parameters: { method: 'GET', url: '...' }, position: [540, 300] },
  output: [{ id: 1 }, { id: 2 }, { id: 3 }]
});

const finalizeResults = node({
  type: 'n8n-nodes-base.set', version: 3.4,
  config: { name: 'Finalize', parameters: {}, position: [1140, 200] },
  output: [{ summary: 'Processed 3 records' }]
});

const processRecord = node({
  type: 'n8n-nodes-base.httpRequest', version: 4.3,
  config: { name: 'Process Record', parameters: { method: 'POST', url: '...' }, position: [1140, 400] },
  output: [{ id: 1, status: 'processed' }]
});

const sibNode = splitInBatches({ version: 3, config: { name: 'Batch Process', parameters: { batchSize: 10 }, position: [840, 300] } });

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
  type: 'n8n-nodes-base.webhook', version: 2.1,
  config: { name: 'Webhook', position: [240, 200] },
  output: [{ body: { data: 'webhook payload' } }]
});

const processWebhook = node({
  type: 'n8n-nodes-base.set', version: 3.4,
  config: { name: 'Process Webhook', parameters: {}, position: [540, 200] },
  output: [{ data: 'webhook payload', processed: true }]
});

const scheduleTrigger = trigger({
  type: 'n8n-nodes-base.scheduleTrigger', version: 1.3,
  config: { name: 'Daily Schedule', parameters: {}, position: [240, 500] },
  output: [{}]
});

const processSchedule = node({
  type: 'n8n-nodes-base.set', version: 3.4,
  config: { name: 'Process Schedule', parameters: {}, position: [540, 500] },
  output: [{ scheduled: true }]
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
  type: 'n8n-nodes-base.webhook', version: 2.1,
  config: { name: 'Webhook Trigger', position: [240, 200] },
  output: [{ source: 'webhook' }]
});

const scheduleTrigger = trigger({
  type: 'n8n-nodes-base.scheduleTrigger', version: 1.3,
  config: { name: 'Daily Schedule', position: [240, 500] },
  output: [{ source: 'schedule' }]
});

const processData = node({
  type: 'n8n-nodes-base.set', version: 3.4,
  config: { name: 'Process Data', parameters: {}, position: [540, 350] },
  output: [{ processed: true }]
});

const sendNotification = node({
  type: 'n8n-nodes-base.slack', version: 2.3,
  config: { name: 'Notify Slack', parameters: {}, position: [840, 350] },
  output: [{ ok: true }]
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
  type: '@n8n/n8n-nodes-langchain.lmChatOpenAi', version: 1.3,
  config: { name: 'OpenAI Model', parameters: {}, position: [540, 500] }
});

const startTrigger = trigger({
  type: 'n8n-nodes-base.manualTrigger', version: 1,
  config: { name: 'Start', position: [240, 300] },
  output: [{}]
});

const aiAgent = node({
  type: '@n8n/n8n-nodes-langchain.agent', version: 3.1,
  config: {
    name: 'AI Assistant',
    parameters: { promptType: 'define', text: 'You are a helpful assistant' },
    subnodes: { model: openAiModel },
    position: [540, 300]
  },
  output: [{ output: 'AI response text' }]
});

export default workflow('ai-assistant', 'AI Assistant')
  .add(startTrigger)
  .to(aiAgent);
\`\`\`

</ai_agent_basic>

<ai_agent_with_tools>
\`\`\`javascript
const openAiModel = languageModel({
  type: '@n8n/n8n-nodes-langchain.lmChatOpenAi', version: 1.3,
  config: {
    name: 'OpenAI Model', parameters: {},
    credentials: { openAiApi: newCredential('OpenAI') },
    position: [540, 500]
  }
});

const calculatorTool = tool({
  type: '@n8n/n8n-nodes-langchain.toolCalculator', version: 1,
  config: { name: 'Calculator', parameters: {}, position: [700, 500] }
});

const startTrigger = trigger({
  type: 'n8n-nodes-base.manualTrigger', version: 1,
  config: { name: 'Start', position: [240, 300] },
  output: [{}]
});

const aiAgent = node({
  type: '@n8n/n8n-nodes-langchain.agent', version: 3.1,
  config: {
    name: 'Math Agent',
    parameters: { promptType: 'define', text: 'You can use tools to help users' },
    subnodes: { model: openAiModel, tools: [calculatorTool] },
    position: [540, 300]
  },
  output: [{ output: '42' }]
});

export default workflow('ai-calculator', 'AI Calculator')
  .add(startTrigger)
  .to(aiAgent);
\`\`\`

</ai_agent_with_tools>

<ai_agent_with_from_ai>
\`\`\`javascript
const gmailTool = tool({
  type: 'n8n-nodes-base.gmailTool', version: 1,
  config: {
    name: 'Gmail Tool',
    parameters: {
      sendTo: fromAi('recipient', 'Email address'),
      subject: fromAi('subject', 'Email subject'),
      message: fromAi('body', 'Email content')
    },
    credentials: { gmailOAuth2: newCredential('Gmail') },
    position: [700, 500]
  }
});

const aiAgent = node({
  type: '@n8n/n8n-nodes-langchain.agent', version: 3.1,
  config: {
    name: 'Email Agent',
    parameters: { promptType: 'define', text: 'You can send emails' },
    subnodes: { model: openAiModel, tools: [gmailTool] },
    position: [540, 300]
  },
  output: [{ output: 'Email sent successfully' }]
});

export default workflow('ai-email', 'AI Email Sender')
  .add(startTrigger)
  .to(aiAgent);
\`\`\`
</ai_agent_with_from_ai>

<ai_agent_with_structured_output>
\`\`\`javascript
const structuredParser = outputParser({
  type: '@n8n/n8n-nodes-langchain.outputParserStructured', version: 1.3,
  config: {
    name: 'Structured Output Parser',
    parameters: {
      schemaType: 'fromJson',
      jsonSchemaExample: '{ "sentiment": "positive", "confidence": 0.95, "summary": "brief summary" }'
    },
    position: [700, 500]
  }
});

const aiAgent = node({
  type: '@n8n/n8n-nodes-langchain.agent', version: 3.1,
  config: {
    name: 'Sentiment Analyzer',
    parameters: { promptType: 'define', text: 'Analyze the sentiment of the input text', hasOutputParser: true },
    subnodes: { model: openAiModel, outputParser: structuredParser },
    position: [540, 300]
  },
  output: [{ sentiment: 'positive', confidence: 0.95, summary: 'The text expresses satisfaction' }]
});

export default workflow('ai-sentiment', 'AI Sentiment Analyzer')
  .add(startTrigger)
  .to(aiAgent);
\`\`\`
</ai_agent_with_structured_output>`;
