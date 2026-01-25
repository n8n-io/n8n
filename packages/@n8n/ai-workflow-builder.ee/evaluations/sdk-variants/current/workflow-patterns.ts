/**
 * Workflow Patterns for Current (Object-Based) Interface
 *
 * Examples demonstrating correct usage of the current SDK interface.
 * All examples use the same scenarios as other variants for fair comparison.
 */

export const WORKFLOW_PATTERNS = `# Workflow Patterns

## Linear Chain (Simple)
\`\`\`typescript
// 1. Define all nodes first
const startTrigger = trigger({
  type: 'n8n-nodes-base.manualTrigger',
  version: 1.1,
  config: { name: 'Start', position: [240, 300] }
});

const fetchData = node({
  type: 'n8n-nodes-base.httpRequest',
  version: 4.3,
  config: { name: 'Fetch Data', parameters: { method: 'GET', url: '...' }, position: [540, 300] }
});

const processData = node({
  type: 'n8n-nodes-base.set',
  version: 3.4,
  config: { name: 'Process Data', parameters: {}, position: [840, 300] }
});

// 2. Compose workflow
return workflow('id', 'name')
  .add(startTrigger)
  .then(fetchData)
  .then(processData);
\`\`\`

## Conditional Branching (IF/Else)

**CRITICAL:** Each branch defines a COMPLETE processing path. Chain multiple steps INSIDE the branch using .then().

\`\`\`typescript
// Assume nodes declared: checkValid (IF), formatData, enrichData, saveToDb, logError
return workflow('id', 'name')
  .add(startTrigger)
  .then(ifElse(checkValid, {
    true: formatData.then(enrichData).then(saveToDb),  // Chain 3 nodes on true branch
    false: logError
  }));
\`\`\`

WRONG - nodes after ifElse run for BOTH branches:
\`\`\`typescript
.then(ifElse(checkValid, { true: formatData, false: logError }))
.then(enrichData)  // WRONG: runs after both branches!
\`\`\`

RIGHT - chain inside the branch:
\`\`\`typescript
.then(ifElse(checkValid, { true: formatData.then(enrichData), false: logError }))
\`\`\`

## If/Else with Merge (Branches Rejoin)

When both branches should continue to a common endpoint:

\`\`\`typescript
// 1. Define all nodes including the merge point
const checkStatus = node({
  type: 'n8n-nodes-base.if',
  version: 2.2,
  config: { name: 'Check Status', parameters: { conditions: { ... } }, position: [540, 300] }
});

const processSuccess = node({
  type: 'n8n-nodes-base.set',
  version: 3.4,
  config: { name: 'Process Success', parameters: {}, position: [840, 200] }
});

const handleFailure = node({
  type: 'n8n-nodes-base.set',
  version: 3.4,
  config: { name: 'Handle Failure', parameters: {}, position: [840, 400] }
});

const combineResults = node({
  type: 'n8n-nodes-base.merge',
  version: 3,
  config: { name: 'Combine Results', parameters: { mode: 'combine' }, position: [1140, 300] }
});

const sendNotification = node({
  type: 'n8n-nodes-base.slack',
  version: 2.3,
  config: { name: 'Send Notification', parameters: {}, position: [1440, 300] }
});

// 2. Compose with merge to rejoin branches
return workflow('id', 'If-Merge Workflow')
  .add(startTrigger)
  .then(ifElse(checkStatus, {
    true: processSuccess,
    false: handleFailure
  }))
  .then(merge(combineResults, {
    input0: processSuccess,
    input1: handleFailure
  }))
  .then(sendNotification);
\`\`\`

## Multi-Way Routing (5-way Switch)

\`\`\`typescript
// 1. Define the switch node and all case handlers
const routeByType = node({
  type: 'n8n-nodes-base.switch',
  version: 3.2,
  config: {
    name: 'Route By Type',
    parameters: {
      rules: { values: [
        { outputKey: 'urgent', conditions: { ... } },
        { outputKey: 'high', conditions: { ... } },
        { outputKey: 'normal', conditions: { ... } },
        { outputKey: 'low', conditions: { ... } }
      ]}
    },
    position: [540, 300]
  }
});

const handleUrgent = node({ type: 'n8n-nodes-base.set', version: 3.4, config: { name: 'Handle Urgent', position: [840, 100] }});
const handleHigh = node({ type: 'n8n-nodes-base.set', version: 3.4, config: { name: 'Handle High', position: [840, 250] }});
const handleNormal = node({ type: 'n8n-nodes-base.set', version: 3.4, config: { name: 'Handle Normal', position: [840, 400] }});
const handleLow = node({ type: 'n8n-nodes-base.set', version: 3.4, config: { name: 'Handle Low', position: [840, 550] }});
const handleFallback = node({ type: 'n8n-nodes-base.set', version: 3.4, config: { name: 'Handle Fallback', position: [840, 700] }});

// 2. Compose workflow with 5-way switch
return workflow('id', 'Multi-way Switch')
  .add(startTrigger)
  .then(switchCase(routeByType, {
    case0: handleUrgent.then(escalateNode),  // Can chain within each case
    case1: handleHigh.then(notifyManager),
    case2: handleNormal,
    case3: handleLow,
    case4: handleFallback
  }));
\`\`\`

## Parallel Execution (3-input Merge)

\`\`\`typescript
// 1. Define merge node and parallel branches
const combineAll = node({
  type: 'n8n-nodes-base.merge',
  version: 3,
  config: { name: 'Combine All', parameters: { mode: 'combine' }, position: [1140, 300] }
});

const fetchApi1 = node({
  type: 'n8n-nodes-base.httpRequest',
  version: 4.3,
  config: { name: 'Fetch API 1', parameters: { method: 'GET', url: '...' }, position: [540, 100] }
});

const fetchApi2 = node({
  type: 'n8n-nodes-base.httpRequest',
  version: 4.3,
  config: { name: 'Fetch API 2', parameters: { method: 'GET', url: '...' }, position: [540, 300] }
});

const fetchApi3 = node({
  type: 'n8n-nodes-base.httpRequest',
  version: 4.3,
  config: { name: 'Fetch API 3', parameters: { method: 'GET', url: '...' }, position: [540, 500] }
});

const processResults = node({
  type: 'n8n-nodes-base.set',
  version: 3.4,
  config: { name: 'Process Results', parameters: {}, position: [1440, 300] }
});

// 2. Compose with 3-input merge
return workflow('id', 'Parallel Fetch')
  .add(startTrigger)
  .then(merge(combineAll, {
    input0: fetchApi1,
    input1: fetchApi2,
    input2: fetchApi3
  }))
  .then(processResults);
\`\`\`

## Batch Processing (Split in Batches)

\`\`\`typescript
// 1. Define all nodes first
const startTrigger = trigger({
  type: 'n8n-nodes-base.manualTrigger',
  version: 1.1,
  config: { name: 'Start', position: [240, 300] }
});

const fetchRecords = node({
  type: 'n8n-nodes-base.httpRequest',
  version: 4.3,
  config: { name: 'Fetch Records', parameters: { method: 'GET', url: '...' }, position: [540, 300] }
});

const finalizeResults = node({
  type: 'n8n-nodes-base.set',
  version: 3.4,
  config: { name: 'Finalize', parameters: {}, position: [1140, 200] }
});

const processRecord = node({
  type: 'n8n-nodes-base.httpRequest',
  version: 4.3,
  config: { name: 'Process Record', parameters: { method: 'POST', url: '...' }, position: [1140, 400] }
});

// 2. Compose workflow with split in batches
return workflow('id', 'Batch Processing')
  .add(startTrigger)
  .then(fetchRecords)
  .then(
    splitInBatches({ name: 'Batch Process', parameters: { batchSize: 10 }, position: [840, 300] })
      .done().then(finalizeResults)
      .each().then(processRecord)
      .loop()
  );
\`\`\`

## Nested Pattern: If + Split in Batches

\`\`\`typescript
// Complex pattern: branch based on order value, use batches for premium orders
const checkOrderValue = node({
  type: 'n8n-nodes-base.if',
  version: 2.2,
  config: { name: 'Check Order Value', parameters: { conditions: { ... } }, position: [540, 300] }
});

const premiumBatchProcess = splitInBatches({
  name: 'Premium Batch',
  parameters: { batchSize: 5 },
  position: [840, 200]
});

const standardProcess = node({
  type: 'n8n-nodes-base.set',
  version: 3.4,
  config: { name: 'Standard Process', parameters: {}, position: [840, 500] }
});

const premiumHandler = node({
  type: 'n8n-nodes-base.httpRequest',
  version: 4.3,
  config: { name: 'Premium Handler', parameters: {}, position: [1140, 200] }
});

const premiumFinalize = node({
  type: 'n8n-nodes-base.set',
  version: 3.4,
  config: { name: 'Premium Finalize', parameters: {}, position: [1140, 100] }
});

// Compose with nested patterns
return workflow('id', 'Nested Pattern')
  .add(startTrigger)
  .then(ifElse(checkOrderValue, {
    true: premiumBatchProcess
      .done().then(premiumFinalize)
      .each().then(premiumHandler)
      .loop(),
    false: standardProcess
  }));
\`\`\`

## AI Agent (Basic)
\`\`\`typescript
// 1. Define subnodes first
const openAiModel = languageModel({
  type: '@n8n/n8n-nodes-langchain.lmChatOpenAi',
  version: 1,
  config: { name: 'OpenAI Model', parameters: {}, position: [540, 500] }
});

// 2. Define main nodes
const startTrigger = trigger({
  type: 'n8n-nodes-base.manualTrigger',
  version: 1.1,
  config: { name: 'Start', position: [240, 300] }
});

const aiAgent = node({
  type: '@n8n/n8n-nodes-langchain.agent',
  version: 3.1,
  config: {
    name: 'AI Assistant',
    parameters: { promptType: 'define', text: 'You are a helpful assistant' },
    subnodes: { model: openAiModel },
    position: [540, 300]
  }
});

// 3. Compose workflow
return workflow('ai-assistant', 'AI Assistant')
  .add(startTrigger)
  .then(aiAgent);
\`\`\``;
