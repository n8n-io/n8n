return workflow('', '')
  .add(trigger({ type: 'n8n-nodes-base.webhook', version: 2.1, config: { parameters: {
      path: '07aaa04d-6c73-416f-82e2-1e6ededeacc4',
      options: {},
      responseMode: 'responseNode'
    }, position: [-80, -240] } }))
  .then(node({ type: 'n8n-nodes-base.supabase', version: 1, config: { parameters: {
      filters: {
        conditions: [{ keyName: 'email', keyValue: '={{ $json.query.email }}' }]
      },
      tableId: 'demo_contacts',
      operation: 'get'
    }, credentials: {
      supabaseApi: { id: 'credential-id', name: 'supabaseApi Credential' }
    }, position: [240, -240], name: 'Get a row' } }))
  .then(node({ type: 'n8n-nodes-base.respondToWebhook', version: 1.4, config: { parameters: { options: {}, respondWith: 'allIncomingItems' }, position: [512, -240], name: 'Respond to Webhook' } }))
  .add(trigger({ type: 'n8n-nodes-base.webhook', version: 2.1, config: { parameters: {
      path: '07aaa04d-6c73-416f-82e2-1e6ededeacc4',
      options: {},
      httpMethod: 'POST',
      responseMode: 'responseNode'
    }, position: [-80, 64], name: 'Webhook1' } }))
  .then(node({ type: 'n8n-nodes-base.set', version: 3.4, config: { parameters: { mode: 'raw', options: {}, jsonOutput: '={{ $json.body }}' }, position: [240, 64], name: 'Edit Fields' } }))
  .then(node({ type: 'n8n-nodes-base.supabase', version: 1, config: { parameters: {
      tableId: 'demo_contacts',
      dataToSend: 'autoMapInputData',
      inputsToIgnore: 'id'
    }, credentials: {
      supabaseApi: { id: 'credential-id', name: 'supabaseApi Credential' }
    }, position: [512, 64], name: 'Create a row' } }))
  .then(node({ type: 'n8n-nodes-base.respondToWebhook', version: 1.4, config: { parameters: { options: {}, respondWith: 'allIncomingItems' }, position: [752, 64], name: 'Respond to Webhook1' } }))
  .add(trigger({ type: 'n8n-nodes-base.webhook', version: 2.1, config: { parameters: {
      path: '07aaa04d-6c73-416f-82e2-1e6ededeacc4',
      options: {},
      httpMethod: 'PUT'
    }, position: [-80, 1200], name: 'Webhook2' } }))
  .add(trigger({ type: 'n8n-nodes-base.webhook', version: 2.1, config: { parameters: {
      path: '07aaa04d-6c73-416f-82e2-1e6ededeacc4',
      options: { ipWhitelist: '', allowedOrigins: '*' },
      httpMethod: 'PATCH',
      responseMode: 'streaming'
    }, position: [-80, 352], name: 'Webhook3' } }))
  .then(node({ type: 'n8n-nodes-base.set', version: 3.4, config: { parameters: { mode: 'raw', options: {}, jsonOutput: '={{ $json.body }}' }, position: [240, 352], name: 'Edit Fields1' } }))
  .then(node({ type: 'n8n-nodes-base.supabase', version: 1, config: { parameters: {
      filters: {
        conditions: [
          { keyName: 'id', keyValue: '={{ $json.id }}', condition: 'eq' }
        ]
      },
      tableId: 'demo_contacts',
      operation: 'update',
      dataToSend: 'autoMapInputData'
    }, credentials: {
      supabaseApi: { id: 'credential-id', name: 'supabaseApi Credential' }
    }, position: [512, 352], name: 'Update a row' } }))
  .then(node({ type: 'n8n-nodes-base.respondToWebhook', version: 1.4, config: { parameters: { options: {}, respondWith: 'allIncomingItems' }, position: [752, 352], name: 'Respond to Webhook2' } }))
  .add(trigger({ type: 'n8n-nodes-base.webhook', version: 2.1, config: { parameters: {
      path: '07aaa04d-6c73-416f-82e2-1e6ededeacc4',
      options: {},
      httpMethod: 'DELETE'
    }, position: [-80, 640], name: 'Webhook4' } }))
  .then(node({ type: 'n8n-nodes-base.supabase', version: 1, config: { parameters: {
      filters: {
        conditions: [
          {
            keyName: 'id',
            keyValue: '={{ $json.query.id }}',
            condition: 'eq'
          }
        ]
      },
      tableId: 'demo_contacts',
      operation: 'delete'
    }, credentials: {
      supabaseApi: { id: 'credential-id', name: 'supabaseApi Credential' }
    }, position: [240, 640], name: 'Delete a row' } }))
  .add(trigger({ type: 'n8n-nodes-base.webhook', version: 2.1, config: { parameters: {
      path: '07aaa04d-6c73-416f-82e2-1e6ededeacc4',
      options: {},
      httpMethod: 'HEAD'
    }, position: [-80, 928], name: 'Webhook5' } }))
  .add(sticky('## What is a webhook (in n8n)?\nA webhook is a tiny HTTP endpoint that n8n exposes to trigger a workflow when it’s called. It can read query params, headers, and body (JSON/form/multipart), and it can send a response immediately, after the flow finishes, or via a Respond to Webhook node. Each Webhook node gives you a Test URL (editor-only) and a Production URL (requires the workflow to be active). Security is built-in: Basic, Header, or JWT auth, plus IP allow-listing and CORS options.', { color: 4, position: [-704, -368], width: 464, height: 272 }))
  .add(sticky('## GET → \n“Retrieve data without making changes. Think queries or health checks.”', { name: 'Sticky Note1', color: 7, position: [-144, -368], width: 272, height: 272 }))
  .add(sticky('## POST → \n“Send new data/events. Most webhooks from apps use POST.”', { name: 'Sticky Note2', color: 7, position: [-144, -64], width: 272, height: 272 }))
  .add(sticky('## PUT → \n“Replace a whole resource with new data. Idempotent.”', { name: 'Sticky Note3', color: 7, position: [-144, 1088], width: 256, height: 272 }))
  .add(sticky('## PATCH → \n“Update part of a resource. Send only the fields that changed.”', { name: 'Sticky Note4', color: 7, position: [-144, 224], width: 272, height: 272 }))
  .add(sticky('## DELETE → \n“Remove a resource. Repeating the call has the same result.”', { name: 'Sticky Note5', color: 7, position: [-144, 512], width: 272, height: 272 }))
  .add(sticky('## HEAD → \n“Like GET but no body — used for checks/headers only.”', { name: 'Sticky Note6', color: 7, position: [-144, 800], width: 256, height: 272 }))
  .add(sticky('## 🔐 Webhook Auth Types in n8n\n\n* **Basic Auth** → Username + password in the request.\n  *Good for simple server-to-server use. Always use HTTPS.*\n\n* **Header Auth** → Require a specific header + value (e.g. `X-API-Key`).\n  *Works like an API key. Easy to rotate or share.*\n\n* **JWT Auth** → Caller sends a signed JWT (`Authorization: Bearer <token>`).\n  *Stronger option — tokens can expire and carry claims.*\n\n**Extra hardening (Options menu):**\n\n* **IP Whitelist** → Only allow listed IPs.\n* **Allowed Origins (CORS)** → Restrict browser requests to known domains.\n* **Ignore Bots** → Block crawlers/link previewers.', { name: 'Sticky Note7', color: 4, position: [-704, -80], width: 464, height: 432 }))
  .add(sticky('## 📡 Webhook Response Types in n8n\n\n* **Immediately** → Returns `200 OK` right away.\n  *Use when caller only needs a quick acknowledgement.*\n\n* **When Last Node Finishes** → Waits for the workflow to complete, then sends the final data back.\n  *Good when the client expects the processed result.*\n\n* **Using Respond to Webhook** → Response is sent from a separate **Respond to Webhook** node.\n  *Best for async flows — reply later while work continues in background.*\n', { name: 'Sticky Note8', color: 4, position: [-704, 368], width: 464, height: 320 }))
  .add(sticky('# n8n Webhooks: A Beginner’s Guide (with Security Built-In)\nBuilt by [Wayne Simpson](https://www.linkedin.com/in/simpsonwayne/) at [nocodecreative.io](https://nocodecreative.io)\n☕ If you find this useful, feel free to [buy me a coffee](https://ko-fi.com/waynesimpson)', { name: 'Sticky Note10', color: 6, position: [1248, -32], width: 848, height: 171 }))
  .add(sticky('# Watch the Video 📺\n### Watch the Video 👇\n[![n8n Webhooks 101 | Secure Them the Right Way](https://vdyfnvnstovfxpabhdjc.supabase.co/storage/v1/object/public/images/Thumbnails/n8n%20webhooks%20101%20SECURE%20YOUR%20DATA.png)](https://www.youtube.com/watch?v=o6F36xsiuBk)\n\n\n', { name: 'Sticky Note11', color: 7, position: [1040, 176], width: 667, height: 497 }))
  .add(sticky('## Read to blog post to get started 📝\n**Follow along to to get up and running**\n\n[![n8n Webhooks: A Beginner’s Guide (with Security Built-In)](https://vdyfnvnstovfxpabhdjc.supabase.co/storage/v1/object/public/images/Thumbnails/Screenshot%202025-09-04%20161058.png)](https://blog.nocodecreative.io/n8n-webhooks-a-beginners-guide-with-security-built-in/)\n', { name: 'Sticky Note12', color: 7, position: [1744, 176], width: 600, height: 500 }))