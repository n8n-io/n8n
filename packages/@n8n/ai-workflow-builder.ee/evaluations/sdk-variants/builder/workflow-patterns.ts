/**
 * Workflow Patterns for Builder Pattern Interface
 *
 * Examples demonstrating correct usage of the builder-style SDK interface.
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

**CRITICAL:** Branches are TERMINAL. Use builder methods to define each branch path.

\`\`\`typescript
// 1. Define all nodes
const checkValid = node({
  type: 'n8n-nodes-base.if',
  version: 2.2,
  config: { name: 'Check Valid', parameters: { conditions: { ... } }, position: [540, 300] }
});

const formatData = node({
  type: 'n8n-nodes-base.set',
  version: 3.4,
  config: { name: 'Format Data', parameters: {}, position: [840, 200] }
});

const enrichData = node({
  type: 'n8n-nodes-base.set',
  version: 3.4,
  config: { name: 'Enrich Data', parameters: {}, position: [1140, 200] }
});

const saveToDb = node({
  type: 'n8n-nodes-base.postgres',
  version: 2.5,
  config: { name: 'Save to DB', parameters: {}, position: [1440, 200] }
});

const logError = node({
  type: 'n8n-nodes-base.set',
  version: 3.4,
  config: { name: 'Log Error', parameters: {}, position: [840, 400] }
});

// 2. Create the if/else builder and attach branches
const myIf = ifElse(checkValid);
myIf.onTrue(formatData.then(enrichData).then(saveToDb));  // Chain inside branch
myIf.onFalse(logError);

// 3. Compose workflow
return workflow('id', 'name')
  .add(startTrigger)
  .then(myIf);
\`\`\`

## If/Else with Merge (Branches Rejoin)

When both branches should continue to a common endpoint, use merge.input(n) as targets:

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

const sendNotification = node({
  type: 'n8n-nodes-base.slack',
  version: 2.3,
  config: { name: 'Send Notification', parameters: {}, position: [1440, 300] }
});

// 2. Create merge builder FIRST (so we can reference its inputs)
const myMerge = merge({
  name: 'Combine Results',
  parameters: { mode: 'combine' },
  position: [1140, 300]
});

// 3. Create if/else and point branches to merge inputs
const myIf = ifElse(checkStatus);
myIf.onTrue(processSuccess.then(myMerge.input(0)));   // True branch → merge input 0
myIf.onFalse(handleFailure.then(myMerge.input(1)));   // False branch → merge input 1

// 4. Compose workflow - merge continues to next node
return workflow('id', 'If-Merge Workflow')
  .add(startTrigger)
  .then(myIf)
  .then(myMerge)
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
const escalateNode = node({ type: 'n8n-nodes-base.slack', version: 2.3, config: { name: 'Escalate', position: [1140, 100] }});
const notifyManager = node({ type: 'n8n-nodes-base.slack', version: 2.3, config: { name: 'Notify Manager', position: [1140, 250] }});

// 2. Create switch builder and attach cases
const mySwitch = switchCase(routeByType);
mySwitch.onCase(0, handleUrgent.then(escalateNode));  // Can chain within each case
mySwitch.onCase(1, handleHigh.then(notifyManager));
mySwitch.onCase(2, handleNormal);
mySwitch.onCase(3, handleLow);
mySwitch.onFallback(handleFallback);

// 3. Compose workflow
return workflow('id', 'Multi-way Switch')
  .add(startTrigger)
  .then(mySwitch);
\`\`\`

## Parallel Execution (3-input Merge)

\`\`\`typescript
// 1. Define parallel branch nodes
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
  config: { name: 'Process Results', parameters: {}, position: [1140, 300] }
});

// 2. Create merge builder and connect sources
const myMerge = merge({
  name: 'Combine All',
  parameters: { mode: 'combine' },
  position: [840, 300]
});

// Connect each source to a merge input
fetchApi1.then(myMerge.input(0));
fetchApi2.then(myMerge.input(1));
fetchApi3.then(myMerge.input(2));

// 3. Compose workflow
return workflow('id', 'Parallel Fetch')
  .add(startTrigger.then(fetchApi1))
  .add(startTrigger.then(fetchApi2))
  .add(startTrigger.then(fetchApi3))
  .then(myMerge)
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

const processRecord = node({
  type: 'n8n-nodes-base.httpRequest',
  version: 4.3,
  config: { name: 'Process Record', parameters: { method: 'POST', url: '...' }, position: [1140, 400] }
});

const finalizeResults = node({
  type: 'n8n-nodes-base.set',
  version: 3.4,
  config: { name: 'Finalize', parameters: {}, position: [1140, 200] }
});

// 2. Create split in batches builder
const sib = splitInBatches({
  name: 'Batch Process',
  parameters: { batchSize: 10 },
  position: [840, 300]
});

// Connect the batch processing path with nextBatch() to loop back
sib.eachBatch(processRecord.nextBatch());
sib.done(finalizeResults);

// 3. Compose workflow
return workflow('id', 'Batch Processing')
  .add(startTrigger)
  .then(fetchRecords)
  .then(sib);
\`\`\`

## Nested Pattern: If + Split in Batches

\`\`\`typescript
// Complex pattern: branch based on order value, use batches for premium orders
const checkOrderValue = node({
  type: 'n8n-nodes-base.if',
  version: 2.2,
  config: { name: 'Check Order Value', parameters: { conditions: { ... } }, position: [540, 300] }
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
  config: { name: 'Premium Finalize', parameters: {}, position: [1440, 200] }
});

// Create split in batches builder for premium path
const premiumBatch = splitInBatches({
  name: 'Premium Batch',
  parameters: { batchSize: 5 },
  position: [840, 200]
});

premiumBatch.eachBatch(premiumHandler.nextBatch());
premiumBatch.done(premiumFinalize);

// Create if/else and attach branches
const myIf = ifElse(checkOrderValue);
myIf.onTrue(premiumBatch);
myIf.onFalse(standardProcess);

// Compose with nested patterns
return workflow('id', 'Nested Pattern')
  .add(startTrigger)
  .then(myIf);
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
