# Demo script: Custom Nodes & Custom Operations (6–8 minutes)

## Setup (before the demo)

1. Build once and start with the flag on:

   ```bash
   pnpm build > build.log 2>&1
   N8N_CUSTOM_NODES_MOCKUP=true pnpm start
   ```

   The first boot creates the `custom_node_definition` table and seeds two
   examples: the Stripe **Create Payment Link** custom operation and the
   **Acme Billing** custom node.

2. Import `docs/custom-nodes-mockup/fixtures/mock-stripe-workflow.json`
   (Workflow menu → *Import from File*) and **activate** it. It mocks
   `POST /v1/payment_links` and `GET /api/v2/invoices/:id` so the demo does
   not depend on real API keys. The mock URLs are:

   - `http://localhost:5678/webhook/mock-stripe/v1/payment_links`
   - `http://localhost:5678/webhook/mock-acme/api/v2/invoices/inv_123`

3. Create a **Stripe API** credential with any secret key (for example
   `sk_test_demo`) and a **Header Auth** credential (`X-Api-Key: demo`).

4. Open Settings → **Custom nodes** in a second tab so the switch is quick.

## 1. The problem (30 s)

Open a new workflow, add the Stripe node, open the Operation dropdown.
Point out that Stripe has hundreds of endpoints and the node covers eight
resources. Today the answer is "use the HTTP Request node", and that
configuration lives and dies inside one workflow.

## 2. Configure an HTTP Request node (1 min)

Add an **HTTP Request** node:

- Method `POST`
- URL `http://localhost:5678/webhook/mock-stripe/v1/payment_links`
- Authentication → *Predefined Credential Type* → **Stripe API** → pick the
  credential
- Body: *Send Body*, content type **Form-Urlencoded**, fields
  `line_items[0].price` = `={{ $json.priceId }}` and
  `line_items[0].quantity` = `1`

Run it once with a pinned input item `{ "priceId": "price_demo" }` so the
audience sees the mock response.

## 3. Save as custom operation (2 min — the money shot)

Click **Save as custom operation…** at the top of the node parameters.

- **Choose**: the wizard already selected *Stripe* as parent (it recognised
  the `stripeApi` credential). Name it `Create Payment Link (demo)`.
- **Request**: method, URL and body fields are pre-filled. Nothing to do.
- **Fields**: `line_items[0].price` was an expression, so it is already a
  *Required input* called "Price". `line_items[0].quantity` is *Fixed*;
  switch it to *Optional input* with default `1`. Add nothing else.
- **Review**: the right column shows the generated parameters: *Price*
  (required) and *Additional Fields → Quantity*. Click **Create**.

Toast: "Custom operation saved. Find it under Stripe in the nodes panel."

## 4. Use it like a built-in action (1.5 min)

1. Open the nodes panel, search **Stripe**, click it.
2. Scroll to the **CUSTOM OPERATIONS** group at the bottom of the actions
   list. Both the seeded *Create Payment Link* and your new operation are
   there, with the Stripe icon.
3. Click yours. A node lands on the canvas with the Stripe icon, the Stripe
   credential selector and exactly two parameters: *Price* and *Additional
   Fields*.
4. Fill `Price` = `price_demo`, select the Stripe credential, run it. The mock
   response shows the Bearer header and the form-encoded body that arrived.
   Nobody wrote an `execute()` function: this runs through the declarative
   `RoutingNode`.

Optional: open the node's JSON (copy the node) and show
`"type": "n8n-custom.<id>", "typeVersion": 1`.

## 5. Custom node for a service without a node (1 min)

Open the nodes panel again, search **Acme**. *Acme Billing* is a regular
node with the uploaded logo. Click it: two actions, *Create Invoice* and
*Get Invoice*. Add *Get Invoice*, set Invoice ID `inv_123`, pick the Header
Auth credential, change the URL in Settings only if you want to hit the mock
(`baseUrl` is `https://billing.acme.example/api/v2`; for a live call, edit
the node in Settings → Custom nodes and set the base URL to
`http://localhost:5678/webhook/mock-acme/api/v2`).

## 6. Edit in Settings → new version → old workflow stays pinned (1.5 min)

1. Settings → **Custom nodes**. The list shows both custom operations and
   the custom node with active version and version count.
2. On your operation choose **Edit (new version)**. In *Fields*, add a URL
   input or change the display name of *Price* to "Stripe Price ID". In
   *Review*, type a changelog and click **Save as new version**.
3. **Version history** now shows v2 (active) and v1. Click *Set active* on
   v1 and back again to show it is a switch, not a migration.
4. Back in the workflow: the node you added earlier still has
   `typeVersion: 1` and the old label. Add the operation again from the
   panel: the new node gets v2 with the new label. Two versions of the same
   custom operation coexist, exactly like built-in node versions.

## 7. Wrap-up (30 s)

- Definitions are JSON rows, node types are generated at runtime, execution
  reuses `RoutingNode`. No restart, no package build, no `execute()` code.
- Everything is behind `N8N_CUSTOM_NODES_MOCKUP`. Turn it off and the
  instance behaves exactly as before.
- Open `DESIGN.md` for the trade-offs and the production checklist.

## Troubleshooting

- **Custom nodes menu missing**: the flag is read at boot. Check that
  `N8N_CUSTOM_NODES_MOCKUP=true` is set and `GET /rest/module-settings`
  returns `"custom-nodes": { "enabled": true }`.
- **Operation not in the Stripe actions list**: reload the page once; the
  panel rebuilds from `types/nodes.json`, which the backend regenerates on
  every save and announces through the `nodeDescriptionUpdated` push event.
- **Mock returns 404**: the mock workflow must be *active*; test URLs
  (`/webhook-test/…`) only work while "Listen for test event" runs.
