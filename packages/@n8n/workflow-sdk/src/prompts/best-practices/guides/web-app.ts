import type { BestPracticesDocument } from '../types';
import { WorkflowTechnique } from '../types';

export class WebAppBestPractices implements BestPracticesDocument {
	readonly technique = WorkflowTechnique.WEB_APP;
	readonly version = '1.0.0';

	private readonly documentation = `# Best Practices: Web App (SPA served from webhook)

Serve a single-page application from an n8n webhook. The workflow serves HTML pages and JSON API endpoints.

## Architecture

Webhook (responseNode) → Code node (build HTML) → Respond with text/html

## File-based HTML (REQUIRED for pages > ~50 lines)

Write the HTML to a separate file (e.g., \`chunks/dashboard.html\`), then in the SDK TypeScript code use \`readFileSync\` + \`JSON.stringify\` to safely embed it in a Code node. This eliminates ALL escaping problems:

1. Write your full HTML (with CSS, JS, Alpine.js/Tailwind) to \`chunks/page.html\`
2. In \`src/workflow.ts\`: \`const htmlTemplate = readFileSync(join(__dirname, '../chunks/page.html'), 'utf8');\`
3. Use \`JSON.stringify(htmlTemplate)\` to create a safe JS string literal for the Code node's jsCode
4. For data injection, embed a \`__DATA_PLACEHOLDER__\` token in the HTML and replace it at runtime

**NEVER embed large HTML directly in jsCode** — not as template literals, not as arrays of quoted lines. Both break for real-world pages (20KB+). Always use the file-based pattern.

## Data Injection Patterns

- **Static page** (no server data): embed HTML directly, no placeholder needed
- **Dynamic data**: put \`<script id="__data" type="application/json">__DATA_PLACEHOLDER__</script>\` in the HTML. At runtime, the Code node replaces \`__DATA_PLACEHOLDER__\` with base64-encoded JSON. Client-side: \`JSON.parse(atob(document.getElementById('__data').textContent))\`
- Do NOT place bare \`{{ $json... }}\` inside an HTML string parameter

## Multi-route SPA

Use multiple webhooks in one workflow — one serves the HTML page, others serve JSON API endpoints. The HTML's JavaScript uses \`fetch()\` to call sibling webhook paths.

\`\`\`javascript
import { readFileSync } from 'fs';
import { join } from 'path';

const htmlTemplate = readFileSync(join(__dirname, '../chunks/dashboard.html'), 'utf8');

// Webhook routes
const pageWebhook = trigger({ type: 'n8n-nodes-base.webhook', version: 2.1,
  config: { name: 'GET /app', parameters: { httpMethod: 'GET', path: 'app', responseMode: 'responseNode', options: {} } }
});
const apiWebhook = trigger({ type: 'n8n-nodes-base.webhook', version: 2.1,
  config: { name: 'GET /app/data', parameters: { httpMethod: 'GET', path: 'app/data', responseMode: 'responseNode', options: {} } }
});

// Build HTML with injected data
const buildPage = node({ type: 'n8n-nodes-base.code', version: 2,
  config: { name: 'Build Page', parameters: { mode: 'runOnceForAllItems',
    jsCode: 'var data = $input.all()[0].json.data || [];\\n'
      + 'var encoded = Buffer.from(JSON.stringify(data)).toString("base64");\\n'
      + 'var html = ' + JSON.stringify(htmlTemplate) + '.replace("__DATA_PLACEHOLDER__", encoded);\\n'
      + 'return [{ json: { html: html } }];'
  }}
});

// Respond with HTML
const respondHtml = node({ type: 'n8n-nodes-base.respondToWebhook', version: 1.1,
  config: { name: 'Respond HTML', parameters: { respondWith: 'text', responseBody: expr('{{ $json.html }}'),
    options: { responseHeaders: { entries: [{ name: 'Content-Type', value: 'text/html; charset=utf-8' }] } }
  }}
});

export default workflow('id', 'Dashboard')
  .add(pageWebhook).to(fetchData).to(buildPage).to(respondHtml)
  .add(apiWebhook).to(getApiData).to(respondJson);
\`\`\`

## Default Stack

Alpine.js + Tailwind CSS via CDN. No build step, works in a single HTML file.

## Respond Correctly

Use respondToWebhook with \`respondWith: "text"\`, put the HTML in responseBody via expression, and set Content-Type header to \`text/html; charset=utf-8\`.
`;

	getDocumentation(): string {
		return this.documentation;
	}
}
