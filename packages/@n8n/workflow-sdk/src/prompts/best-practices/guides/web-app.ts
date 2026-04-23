import type { BestPracticesDocument } from '../types';
import { WorkflowTechnique } from '../types';

export class WebAppBestPractices implements BestPracticesDocument {
	readonly technique = WorkflowTechnique.WEB_APP;
	readonly version = '1.0.0';

	private readonly documentation = `# Best Practices: Web App Workflows (SPA served from a webhook)

## Architecture

Webhook (responseNode) → Code node (build HTML) → respondToWebhook (Content-Type: text/html).

Serve a single-page application from an n8n webhook. The workflow fetches data, then renders a full HTML page with a client-side framework (Alpine.js + Tailwind via CDN is the default stack — no build step needed).

## File-based HTML (REQUIRED for pages > ~50 lines)

Write the HTML to a separate file (e.g., \`chunks/dashboard.html\`), then in the SDK TypeScript code use \`readFileSync\` + \`JSON.stringify\` to safely embed it in a Code node. This eliminates ALL escaping problems:

1. Write your full HTML (with CSS, JS, Alpine.js/Tailwind) to \`chunks/page.html\`.
2. In \`src/workflow.ts\`: \`const htmlTemplate = readFileSync(join(__dirname, '../chunks/page.html'), 'utf8');\`
3. Use \`JSON.stringify(htmlTemplate)\` to create a safe JS string literal for the Code node's \`jsCode\`.
4. For data injection, embed a \`__DATA_PLACEHOLDER__\` token in the HTML and replace it at runtime.

**Do not embed large HTML directly in \`jsCode\`** — neither as template literals nor as arrays of quoted lines. Both break for real-world pages (20KB+). Always use the file-based pattern.

For small static HTML (< 50 lines), you may inline as an array of quoted strings + \`.join('\\n')\`, but the file-based approach is still preferred.

## Data injection patterns

- **Static page (no server data):** embed HTML directly, no placeholder needed.
- **Dynamic data:** put \`<script id="__data" type="application/json">__DATA_PLACEHOLDER__</script>\` in the HTML. At runtime the Code node replaces \`__DATA_PLACEHOLDER__\` with base64-encoded JSON. Client-side: \`JSON.parse(atob(document.getElementById('__data').textContent))\`.
- Do not place bare \`{{ $json... }}\` expressions inside an HTML string parameter — they won't be evaluated.

## Multi-route SPA (dashboard with API endpoints)

Use multiple webhooks in one workflow — one serves the HTML page, others serve JSON API endpoints. The HTML's JavaScript uses \`fetch()\` to call sibling webhook paths.

## Responding correctly

Use \`respondToWebhook\` with \`respondWith: "text"\`, put the HTML in \`responseBody\` via expression, and set the \`Content-Type\` header to \`text/html; charset=utf-8\`.

## Example: Multi-route dashboard with DataTable API

**chunks/dashboard.html** — the full HTML page (write this file first):

\`\`\`html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Dashboard</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <script defer src="https://cdn.jsdelivr.net/npm/alpinejs@3/dist/cdn.min.js"></script>
</head>
<body class="bg-gray-50 min-h-screen p-8">
  <h1 class="text-2xl font-bold mb-6">Dashboard</h1>
  <div x-data="app()" x-init="loadItems()">
    <template x-for="item in items" :key="item.id">
      <div class="bg-white rounded-lg shadow p-4 mb-3 flex items-center gap-3">
        <input type="checkbox" :checked="item.completed" @change="toggle(item)">
        <span x-text="item.title" :class="item.completed && 'line-through text-gray-400'"></span>
      </div>
    </template>
    <form @submit.prevent="addItem()" class="mt-4 flex gap-2">
      <input x-model="newTitle" placeholder="New item..." class="border rounded px-3 py-2 flex-1">
      <button type="submit" class="bg-blue-600 text-white px-4 py-2 rounded">Add</button>
    </form>
  </div>
  <!-- Server data injected at runtime (base64-encoded JSON) -->
  <script id="__data" type="application/json">__DATA_PLACEHOLDER__</script>
  <script>
    function app() {
      return {
        items: JSON.parse(atob(document.getElementById('__data').textContent)),
        newTitle: '',
        async toggle(item) {
          await fetch('/webhook/app/items/toggle', {
            method: 'POST', headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ id: item.id, completed: !item.completed })
          });
          item.completed = !item.completed;
        },
        async addItem() {
          if (!this.newTitle.trim()) return;
          const res = await fetch('/webhook/app/items/add', {
            method: 'POST', headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ title: this.newTitle })
          });
          const created = await res.json();
          this.items.push(created);
          this.newTitle = '';
        },
        loadItems() { /* items already loaded from __data */ }
      };
    }
  </script>
</body>
</html>
\`\`\`

**src/workflow.ts** — the workflow with 4 webhook routes:

\`\`\`javascript
import { workflow, node, trigger, expr } from '@n8n/workflow-sdk';
import { readFileSync } from 'fs';
import { join } from 'path';

// Read the HTML template at build time — eliminates all escaping issues
const htmlTemplate = readFileSync(join(__dirname, '../chunks/dashboard.html'), 'utf8');

// ── Webhooks ──────────────────────────────────────────────
const pageWebhook = trigger({
  type: 'n8n-nodes-base.webhook', version: 2.1,
  config: { name: 'GET /app', parameters: { httpMethod: 'GET', path: 'app', responseMode: 'responseNode', options: {} } }
});
const getItemsWebhook = trigger({
  type: 'n8n-nodes-base.webhook', version: 2.1,
  config: { name: 'GET /app/items', parameters: { httpMethod: 'GET', path: 'app/items', responseMode: 'responseNode', options: {} } }
});
const toggleWebhook = trigger({
  type: 'n8n-nodes-base.webhook', version: 2.1,
  config: { name: 'POST /app/items/toggle', parameters: { httpMethod: 'POST', path: 'app/items/toggle', responseMode: 'responseNode', options: {} } }
});
const addWebhook = trigger({
  type: 'n8n-nodes-base.webhook', version: 2.1,
  config: { name: 'POST /app/items/add', parameters: { httpMethod: 'POST', path: 'app/items/add', responseMode: 'responseNode', options: {} } }
});

// ── Route 1: Serve HTML page with pre-loaded data ─────────
const fetchAllItems = node({
  type: 'n8n-nodes-base.dataTable', version: 1.1,
  config: { name: 'Fetch Items', parameters: { resource: 'row', operation: 'get', dataTableId: { __rl: true, mode: 'name', value: 'items' }, returnAll: true, options: {} } }
});
const aggregateItems = node({
  type: 'n8n-nodes-base.aggregate', version: 1,
  config: { name: 'Aggregate', parameters: { aggregate: 'aggregateAllItemData', destinationFieldName: 'data', options: {} } }
});
// JSON.stringify in the SDK code creates a safe JS string literal — no escaping issues
const buildPage = node({
  type: 'n8n-nodes-base.code', version: 2,
  config: {
    name: 'Build Page',
    parameters: {
      mode: 'runOnceForAllItems',
      jsCode: 'var data = $input.all()[0].json.data || [];\\n'
        + 'var encoded = Buffer.from(JSON.stringify(data)).toString("base64");\\n'
        + 'var html = ' + JSON.stringify(htmlTemplate) + '.replace("__DATA_PLACEHOLDER__", encoded);\\n'
        + 'return [{ json: { html: html } }];'
    }
  }
});
const respondHtml = node({
  type: 'n8n-nodes-base.respondToWebhook', version: 1.1,
  config: { name: 'Respond HTML', parameters: { respondWith: 'text', responseBody: expr('{{ $json.html }}'), options: { responseHeaders: { entries: [{ name: 'Content-Type', value: 'text/html; charset=utf-8' }] } } } }
});

// ── Route 2: GET items as JSON ────────────────────────────
const fetchItemsJson = node({
  type: 'n8n-nodes-base.dataTable', version: 1.1,
  config: { name: 'Get Items JSON', parameters: { resource: 'row', operation: 'get', dataTableId: { __rl: true, mode: 'name', value: 'items' }, returnAll: true, options: {} } }
});
const respondItems = node({
  type: 'n8n-nodes-base.respondToWebhook', version: 1.1,
  config: { name: 'Respond Items', parameters: { respondWith: 'allEntries', options: {} } }
});

// ── Route 3: Toggle item completion ───────────────────────
const updateItem = node({
  type: 'n8n-nodes-base.dataTable', version: 1.1,
  config: { name: 'Update Item', parameters: { resource: 'row', operation: 'update', dataTableId: { __rl: true, mode: 'name', value: 'items' }, matchingColumns: ['id'], columns: { mappingMode: 'defineBelow', value: { id: expr('{{ $json.body.id }}'), completed: expr('{{ $json.body.completed }}') }, schema: [{ id: 'id', displayName: 'id', required: false, defaultMatch: true, display: true, type: 'string', canBeUsedToMatch: true }, { id: 'completed', displayName: 'completed', required: false, defaultMatch: false, display: true, type: 'boolean', canBeUsedToMatch: false }] }, options: {} } }
});
const respondToggle = node({
  type: 'n8n-nodes-base.respondToWebhook', version: 1.1,
  config: { name: 'Respond Toggle', parameters: { respondWith: 'allEntries', options: {} } }
});

// ── Route 4: Add new item ─────────────────────────────────
const insertItem = node({
  type: 'n8n-nodes-base.dataTable', version: 1.1,
  config: { name: 'Insert Item', parameters: { resource: 'row', operation: 'insert', dataTableId: { __rl: true, mode: 'name', value: 'items' }, columns: { mappingMode: 'defineBelow', value: { title: expr('{{ $json.body.title }}'), completed: false }, schema: [{ id: 'title', displayName: 'title', required: false, defaultMatch: false, display: true, type: 'string', canBeUsedToMatch: true }, { id: 'completed', displayName: 'completed', required: false, defaultMatch: false, display: true, type: 'boolean', canBeUsedToMatch: false }] }, options: {} } }
});
const respondAdd = node({
  type: 'n8n-nodes-base.respondToWebhook', version: 1.1,
  config: { name: 'Respond Add', parameters: { respondWith: 'allEntries', options: {} } }
});

// ── Wire it all together ──────────────────────────────────
export default workflow('id', 'Item Dashboard')
  .add(pageWebhook).to(fetchAllItems).to(aggregateItems).to(buildPage).to(respondHtml)
  .add(getItemsWebhook).to(fetchItemsJson).to(respondItems)
  .add(toggleWebhook).to(updateItem).to(respondToggle)
  .add(addWebhook).to(insertItem).to(respondAdd);
\`\`\`

**Key takeaway:** \`JSON.stringify(htmlTemplate)\` at build time produces a perfectly escaped JS string. The Code node's \`jsCode\` is just four lines. No escaping problems, no matter how large the HTML.
`;

	getDocumentation(): string {
		return this.documentation;
	}
}
