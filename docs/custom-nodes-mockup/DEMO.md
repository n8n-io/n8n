# Demo script: Custom Nodes & Custom Operations (6–8 minutes)

## Setup (before the demo)

1. Build once and start (the mockup is always on for this branch):

   ```bash
   pnpm build > build.log 2>&1
   pnpm start
   ```

   The first boot creates the `custom_node_definition` table and seeds the
   demo set: three custom actions on built-in nodes (Stripe **Create Payment
   Link**, GitHub **React to Issue**, Slack **Set User Status**) and three
   custom nodes (**Acme Billing**, **Open-Meteo Weather** which calls a real
   public API without a key, **Feature Flags**). Settings → Custom nodes →
   *Reset demo data* restores this set at any time; a changed seed set is
   also re-applied automatically on restart.

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

## 3. Save as custom action (2 min — the money shot)

Click **Save as custom action…** at the top of the node parameters.

- **Choose**: the wizard already selected *Stripe* as parent (it recognised
  the `stripeApi` credential). Name it `Create Payment Link (demo)`.
- **Request**: method, URL and body fields are pre-filled. Nothing to do.
- **Fields**: `line_items[0].price` was an expression, so it is already a
  *Required input* called "Price". `line_items[0].quantity` is *Fixed*;
  switch it to *Optional input* with default `1`. Add nothing else.
- **Review**: the right column shows the generated parameters: *Price*
  (required) and *Additional Fields → Quantity*. Click **Create**.

Toast: "Custom action saved. Find it under Stripe in the nodes panel."

## 4. Use it like a built-in operation (1.5 min)

1. Open the nodes panel, search **Stripe**, click it.
2. Scroll to the **CUSTOM ACTIONS** group at the bottom of the
   actions list. Both the seeded *Create Payment Link* and your new operation
   are there.
3. Click yours. A regular **Stripe** node lands on the canvas. Open the
   Resource dropdown: it now contains *Custom*; the Operation
   dropdown lists your operations. Below them: exactly two parameters,
   *Price* and *Additional Fields*.
4. Fill `Price` = `price_demo`, select the Stripe credential, run it. The mock
   response shows the Bearer header and the form-encoded body that arrived.
   Nobody wrote an `execute()` function: the Stripe node detected the custom
   operation and routed it through the declarative `RoutingNode`.

Optional: switch Resource back to *Charge* to show the built-in operations
still work unchanged.

## 5. Custom node for a service without a node (1 min)

Open the nodes panel again, search **Weather**. *Open-Meteo Weather* is a
regular node with its own logo and no credential. Click it: two actions,
*Get Current Weather* and *Search City*. Add *Get Current Weather*, keep the
Berlin coordinates, run it: a live response from the public Open-Meteo API,
no key needed. *Acme Billing* and *Feature Flags* show the same for
fictional internal APIs with Header Auth / Bearer Auth (point *Acme
Billing*'s base URL at `http://localhost:5678/webhook/mock-acme/api/v2` in
Settings → Custom nodes to hit the mock).

## 6. Edit in Settings → new version → old workflow stays pinned (1.5 min)

1. Settings → **Custom nodes**. The list shows both custom actions and
   the custom node with active version and version count.
2. On your operation choose **Edit (new version)**. In *Fields*, add a URL
   input or change the display name of *Price* to "Stripe Price ID". In
   *Review*, type a changelog and click **Save as new version**.
3. **Version history** now shows v2 (active) and v1. Click *Set active* on
   v1 and back again to show it is a switch, not a migration.
4. Back in the workflow: reopen the Stripe node. It shows the v2 parameters
   (the new label) because nodes follow the active version. Set v1 active in
   Settings and reopen: the old label is back. Versioning is an
   instance-wide switch with rollback, not a per-node pin.

## 7. Wrap-up (30 s)

- Definitions are JSON rows, node types are generated at runtime, execution
  reuses `RoutingNode`. No restart, no package build, no `execute()` code.
- The mockup is always on for this branch. Everything lives in one backend
  module plus one frontend feature folder, so a production flag is a
  one-line change in the module entrypoint.
- Open `DESIGN.md` for the trade-offs and the production checklist.

## Troubleshooting

- **Custom nodes menu missing**: check that `GET /rest/module-settings`
  returns `"custom-nodes": { "enabled": true }` and that the build is fresh
  (`pnpm build`).
- **Operation not in the Stripe actions list**: reload the page once; the
  panel rebuilds from `types/nodes.json`, which the backend regenerates on
  every save and announces through the `nodeDescriptionUpdated` push event.
- **Where is "Create custom node"?** At the very bottom of the nodes panel
  list, and highlighted when a search has no results. There is also
  Settings → Custom nodes → *Create custom node*.
- **Mock returns 404**: the mock workflow must be *active*; test URLs
  (`/webhook-test/…`) only work while "Listen for test event" runs.
