import type { BestPracticesDocument } from '../types';
import { WorkflowTechnique } from '../types';

export class WorkflowCompositionBestPractices implements BestPracticesDocument {
	readonly technique = WorkflowTechnique.WORKFLOW_COMPOSITION;
	readonly version = '1.0.0';

	private readonly documentation = `# Best Practices: Workflow Composition Patterns

## Data Flow Fundamentals

### Item Multiplication (executeOnce)

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

// FIX 2 - parallel branches + Merge
const combineResults = merge({
  version: 3.2,
  config: { name: 'Combine', parameters: { mode: 'combine', combineBy: 'combineByPosition' } }
});
export default workflow('id', 'name')
  .add(startTrigger).to(sourceA.to(combineResults.input(0)))
  .add(startTrigger).to(sourceB.to(combineResults.input(1)))
  .add(combineResults).to(processResults);
\`\`\`

### Zero-Item Safety (alwaysOutputData)

Nodes that fetch or filter data may return 0 items, which stops the entire downstream chain.
Use \`alwaysOutputData: true\` on data-fetching nodes to ensure the chain continues with an empty item.

**When to use:** Data Table gets, HTTP Requests that may return empty arrays, lookup/filter nodes.
**When NOT to use:** Trigger nodes, Code nodes (handle empty input in code), end-of-chain nodes.

\`\`\`javascript
const getData = node({
  type: 'n8n-nodes-base.dataTable', version: 1.1,
  config: { name: 'Get Data', alwaysOutputData: true, parameters: { resource: 'row', operation: 'get', returnAll: true } }
});
\`\`\`

## Parallel Execution + Merge

Declare a Merge node, then connect branches to specific inputs using \`.input(n)\`:

\`\`\`javascript
const combineResults = merge({
  version: 3.2,
  config: { name: 'Combine Results', parameters: { mode: 'combine' } }
});

export default workflow('id', 'name')
  .add(trigger({ ... }))
  .to(branch1.to(combineResults.input(0)))
  .add(trigger({ ... }))
  .to(branch2.to(combineResults.input(1)))
  .add(combineResults)
  .to(processResults);
\`\`\`

## Batch Processing (splitInBatches)

Use \`splitInBatches()\` with \`.onDone()\` for finalization and \`.onEachBatch()\` for the processing loop:

\`\`\`javascript
const sibNode = splitInBatches({ version: 3, config: { name: 'Batch', parameters: { batchSize: 10 } } });

export default workflow('id', 'name')
  .add(startTrigger).to(fetchRecords)
  .to(sibNode
    .onDone(finalizeResults)
    .onEachBatch(processRecord.to(nextBatch(sibNode)))
  );
\`\`\`

## Multiple Triggers + Fan-In

Each trigger's execution runs in COMPLETE ISOLATION. Different branches have no effect on each other. Multiple triggers can share downstream nodes:

\`\`\`javascript
export default workflow('id', 'name')
  .add(webhookTrigger).to(processData).to(sendNotification)
  .add(scheduleTrigger).to(processData);
\`\`\`

Never duplicate chains for "isolation" — it's already guaranteed by the execution model.
`;

	getDocumentation(): string {
		return this.documentation;
	}
}
