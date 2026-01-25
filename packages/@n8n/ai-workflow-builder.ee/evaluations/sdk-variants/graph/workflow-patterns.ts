/**
 * Workflow Patterns for Graph-Based Explicit Connections Interface
 *
 * Examples demonstrating correct usage of the graph-style SDK interface.
 * All examples use the same scenarios as other variants for fair comparison.
 */

export const WORKFLOW_PATTERNS = `# Workflow Patterns

## Linear Chain (Simple)
\`\`\`typescript
// 1. Create the workflow graph
const graph = workflow('id', 'name');

// 2. Define all nodes
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

// 3. Add all nodes to the graph
graph.addNode(startTrigger);
graph.addNode(fetchData);
graph.addNode(processData);

// 4. Connect nodes explicitly (source, outputIndex, target, inputIndex)
graph.connect(startTrigger, 0, fetchData, 0);
graph.connect(fetchData, 0, processData, 0);

return graph;
\`\`\`

## Conditional Branching (IF/Else)

**Connection indices for IF node:** output 0 = true, output 1 = false

\`\`\`typescript
// 1. Create the workflow graph
const graph = workflow('id', 'name');

// 2. Define all nodes
const startTrigger = trigger({
  type: 'n8n-nodes-base.manualTrigger',
  version: 1.1,
  config: { name: 'Start', position: [240, 300] }
});

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

// 3. Add all nodes to the graph
graph.addNode(startTrigger);
graph.addNode(checkValid);
graph.addNode(formatData);
graph.addNode(enrichData);
graph.addNode(saveToDb);
graph.addNode(logError);

// 4. Connect nodes
graph.connect(startTrigger, 0, checkValid, 0);
graph.connect(checkValid, 0, formatData, 0);  // IF true (output 0) → formatData
graph.connect(formatData, 0, enrichData, 0);
graph.connect(enrichData, 0, saveToDb, 0);
graph.connect(checkValid, 1, logError, 0);    // IF false (output 1) → logError

return graph;
\`\`\`

## If/Else with Merge (Branches Rejoin)

When both branches should continue to a common endpoint:

\`\`\`typescript
// 1. Create the workflow graph
const graph = workflow('id', 'If-Merge Workflow');

// 2. Define all nodes
const startTrigger = trigger({
  type: 'n8n-nodes-base.manualTrigger',
  version: 1.1,
  config: { name: 'Start', position: [240, 300] }
});

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

// 3. Add all nodes to the graph
graph.addNode(startTrigger);
graph.addNode(checkStatus);
graph.addNode(processSuccess);
graph.addNode(handleFailure);
graph.addNode(combineResults);
graph.addNode(sendNotification);

// 4. Connect nodes with explicit indices
graph.connect(startTrigger, 0, checkStatus, 0);
graph.connect(checkStatus, 0, processSuccess, 0);    // IF true → processSuccess
graph.connect(checkStatus, 1, handleFailure, 0);     // IF false → handleFailure
graph.connect(processSuccess, 0, combineResults, 0); // processSuccess → merge input 0
graph.connect(handleFailure, 0, combineResults, 1);  // handleFailure → merge input 1
graph.connect(combineResults, 0, sendNotification, 0);

return graph;
\`\`\`

## Multi-Way Routing (5-way Switch)

**Connection indices for Switch node:** output 0 = case0, output 1 = case1, etc.

\`\`\`typescript
// 1. Create the workflow graph
const graph = workflow('id', 'Multi-way Switch');

// 2. Define all nodes
const startTrigger = trigger({
  type: 'n8n-nodes-base.manualTrigger',
  version: 1.1,
  config: { name: 'Start', position: [240, 300] }
});

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

// 3. Add all nodes to the graph
graph.addNode(startTrigger);
graph.addNode(routeByType);
graph.addNode(handleUrgent);
graph.addNode(handleHigh);
graph.addNode(handleNormal);
graph.addNode(handleLow);
graph.addNode(handleFallback);
graph.addNode(escalateNode);
graph.addNode(notifyManager);

// 4. Connect nodes - switch outputs map to case indices
graph.connect(startTrigger, 0, routeByType, 0);
graph.connect(routeByType, 0, handleUrgent, 0);    // case 0 (urgent) → handleUrgent
graph.connect(routeByType, 1, handleHigh, 0);      // case 1 (high) → handleHigh
graph.connect(routeByType, 2, handleNormal, 0);    // case 2 (normal) → handleNormal
graph.connect(routeByType, 3, handleLow, 0);       // case 3 (low) → handleLow
graph.connect(routeByType, 4, handleFallback, 0);  // fallback → handleFallback
graph.connect(handleUrgent, 0, escalateNode, 0);   // Chain within case
graph.connect(handleHigh, 0, notifyManager, 0);

return graph;
\`\`\`

## Parallel Execution (3-input Merge)

\`\`\`typescript
// 1. Create the workflow graph
const graph = workflow('id', 'Parallel Fetch');

// 2. Define all nodes
const startTrigger = trigger({
  type: 'n8n-nodes-base.manualTrigger',
  version: 1.1,
  config: { name: 'Start', position: [240, 300] }
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

const combineAll = node({
  type: 'n8n-nodes-base.merge',
  version: 3,
  config: { name: 'Combine All', parameters: { mode: 'combine' }, position: [840, 300] }
});

const processResults = node({
  type: 'n8n-nodes-base.set',
  version: 3.4,
  config: { name: 'Process Results', parameters: {}, position: [1140, 300] }
});

// 3. Add all nodes to the graph
graph.addNode(startTrigger);
graph.addNode(fetchApi1);
graph.addNode(fetchApi2);
graph.addNode(fetchApi3);
graph.addNode(combineAll);
graph.addNode(processResults);

// 4. Connect - trigger fans out, merge collects
graph.connect(startTrigger, 0, fetchApi1, 0);
graph.connect(startTrigger, 0, fetchApi2, 0);
graph.connect(startTrigger, 0, fetchApi3, 0);
graph.connect(fetchApi1, 0, combineAll, 0);  // → merge input 0
graph.connect(fetchApi2, 0, combineAll, 1);  // → merge input 1
graph.connect(fetchApi3, 0, combineAll, 2);  // → merge input 2
graph.connect(combineAll, 0, processResults, 0);

return graph;
\`\`\`

## Batch Processing (Split in Batches)

**Split in Batches outputs:** output 0 = done (after all batches), output 1 = loop (each batch)
Loop back by connecting from processor output 0 to splitInBatches input 0.

\`\`\`typescript
// 1. Create the workflow graph
const graph = workflow('id', 'Batch Processing');

// 2. Define all nodes
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

const batchProcessor = node({
  type: 'n8n-nodes-base.splitInBatches',
  version: 3.0,
  config: { name: 'Batch Process', parameters: { batchSize: 10 }, position: [840, 300] }
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

// 3. Add all nodes to the graph
graph.addNode(startTrigger);
graph.addNode(fetchRecords);
graph.addNode(batchProcessor);
graph.addNode(processRecord);
graph.addNode(finalizeResults);

// 4. Connect nodes
graph.connect(startTrigger, 0, fetchRecords, 0);
graph.connect(fetchRecords, 0, batchProcessor, 0);
graph.connect(batchProcessor, 0, finalizeResults, 0);   // done (output 0) → finalize
graph.connect(batchProcessor, 1, processRecord, 0);     // loop (output 1) → process
graph.connect(processRecord, 0, batchProcessor, 0);     // loop back to batch processor

return graph;
\`\`\`

## Nested Pattern: If + Split in Batches

\`\`\`typescript
// 1. Create the workflow graph
const graph = workflow('id', 'Nested Pattern');

// 2. Define all nodes
const startTrigger = trigger({
  type: 'n8n-nodes-base.manualTrigger',
  version: 1.1,
  config: { name: 'Start', position: [240, 300] }
});

const checkOrderValue = node({
  type: 'n8n-nodes-base.if',
  version: 2.2,
  config: { name: 'Check Order Value', parameters: { conditions: { ... } }, position: [540, 300] }
});

const premiumBatch = node({
  type: 'n8n-nodes-base.splitInBatches',
  version: 3.0,
  config: { name: 'Premium Batch', parameters: { batchSize: 5 }, position: [840, 200] }
});

const premiumHandler = node({
  type: 'n8n-nodes-base.httpRequest',
  version: 4.3,
  config: { name: 'Premium Handler', parameters: {}, position: [1140, 300] }
});

const premiumFinalize = node({
  type: 'n8n-nodes-base.set',
  version: 3.4,
  config: { name: 'Premium Finalize', parameters: {}, position: [1140, 100] }
});

const standardProcess = node({
  type: 'n8n-nodes-base.set',
  version: 3.4,
  config: { name: 'Standard Process', parameters: {}, position: [840, 500] }
});

// 3. Add all nodes to the graph
graph.addNode(startTrigger);
graph.addNode(checkOrderValue);
graph.addNode(premiumBatch);
graph.addNode(premiumHandler);
graph.addNode(premiumFinalize);
graph.addNode(standardProcess);

// 4. Connect - if true goes to batch processing, false to standard
graph.connect(startTrigger, 0, checkOrderValue, 0);
graph.connect(checkOrderValue, 0, premiumBatch, 0);     // IF true → premium batch
graph.connect(checkOrderValue, 1, standardProcess, 0);  // IF false → standard
graph.connect(premiumBatch, 0, premiumFinalize, 0);     // batch done → finalize
graph.connect(premiumBatch, 1, premiumHandler, 0);      // batch loop → handler
graph.connect(premiumHandler, 0, premiumBatch, 0);      // loop back

return graph;
\`\`\`

## AI Agent (Basic)
\`\`\`typescript
// 1. Create the workflow graph
const graph = workflow('ai-assistant', 'AI Assistant');

// 2. Define subnodes first
const openAiModel = languageModel({
  type: '@n8n/n8n-nodes-langchain.lmChatOpenAi',
  version: 1,
  config: { name: 'OpenAI Model', parameters: {}, position: [540, 500] }
});

// 3. Define main nodes
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

// 4. Add nodes and connect
graph.addNode(startTrigger);
graph.addNode(aiAgent);
graph.connect(startTrigger, 0, aiAgent, 0);

return graph;
\`\`\``;
