// Use case: devops / Catalog Sync per Configuration Entry.
// Swap a tool: replace only the nodes marked with that family. Keep the variable names
// and the fields the next node reads.
// Edit the list in Sync Targets. The sub-workflow receives one item per entry with
// $json.catalog, $json.source_url and $json.table, and does the fetch and the upsert.
import { workflow, node, trigger, placeholder } from '@n8n/workflow-sdk';

// Runs every hour.
const everyHour = trigger({
	type: 'n8n-nodes-base.scheduleTrigger',
	version: 1.4,
	config: {
		name: 'Every Hour',
		parameters: { rule: { interval: [{ field: 'hours', hoursInterval: 1 }] } },
	},
});

// The list of catalogs to sync. Add one object per catalog.
const syncTargets = node({
	type: 'n8n-nodes-base.set',
	version: 3.4,
	config: {
		name: 'Sync Targets',
		parameters: {
			mode: 'raw',
			jsonOutput: `{
  "targets": [
    { "catalog": "products", "source_url": "https://api.example.com/v1/products", "table": "catalog_products" },
    { "catalog": "suppliers", "source_url": "https://api.example.com/v1/suppliers", "table": "catalog_suppliers" }
  ]
}`,
			options: {},
		},
	},
});

// One item per catalog entry.
const splitTargets = node({
	type: 'n8n-nodes-base.splitOut',
	version: 1,
	config: { name: 'Split Targets', parameters: { fieldToSplitOut: 'targets', options: {} } },
});

// Runs the sync sub-workflow with all entries. Its nodes run once per item.
const runCatalogSync = node({
	type: 'n8n-nodes-base.executeWorkflow',
	version: 1.3,
	config: {
		name: 'Run Catalog Sync',
		parameters: {
			mode: 'once',
			source: 'database',
			workflowId: {
				__rl: true,
				mode: 'id',
				value: placeholder('Workflow ID of the catalog sync sub-workflow'),
			},
			options: { waitForSubWorkflow: false },
		},
	},
});

export default workflow('id', 'Catalog Sync per Configuration Entry')
	.add(everyHour)
	.to(syncTargets)
	.to(splitTargets)
	.to(runCatalogSync);
