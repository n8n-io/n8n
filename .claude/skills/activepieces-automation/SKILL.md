---
name: activepieces-automation
description: Build no-code / low-code business automations with Activepieces - self-hosting with Docker, flows (triggers, actions, branches, approvals, AI steps), and custom "pieces" (integrations) in TypeScript. Also helps choose between Activepieces, n8n, Zapier or a script. Use when the user wants to automate a process (orders, WhatsApp/email notifications, CRM, invoices, reports), connect apps, or mentions Activepieces, "automatisation", "workflow sans code", "connecter mes outils". Checked against the activepieces/activepieces repository (core MIT; packages/ee is under a separate enterprise licence).
---

# Activepieces automation

## Choose the tool first

| Need | Best fit |
|---|---|
| Simple app-to-app links, no server, budget available | Zapier / Make (paid per task) |
| Self-hosted, many integrations, code nodes, already used in this repo | n8n |
| Self-hosted with an MIT core, simple UI for non-developers, custom integrations in TypeScript | Activepieces |
| One fixed job on a schedule, developer available | A script + cron (cheapest, least moving parts) |

Count real volume first (runs per day) and the cost of a failed run. An automation that
sends money or messages to customers needs an approval step and alerts, whatever the tool.

## Self-host in one command (test or small use)

```bash
docker run -d --name activepieces -p 8080:80 \
  -v ~/.activepieces:/root/.activepieces \
  -e AP_DB_TYPE=PGLITE \
  -e AP_REDIS_TYPE=MEMORY \
  -e AP_FRONTEND_URL="http://localhost:8080" \
  activepieces/activepieces:latest
```

- `AP_FRONTEND_URL` must be the public URL, or webhooks from outside will not reach it
  (ngrok for a quick test, a domain + HTTPS reverse proxy for real use).
- Back up before upgrading: `docker stop activepieces && cp -r ~/.activepieces ~/.activepieces-backup`.
- For production: Docker Compose with PostgreSQL and Redis (see `docs/install/options/`),
  or the hosted cloud.

## Flows

- A flow = one trigger + steps (actions, branches, loops, code, AI steps).
- Pass data between steps by referencing earlier step outputs; use project variables for
  values shared across flows, never hard-coded secrets.
- Version and publish flows; debug from the run history (each run keeps the input and
  output of every step).
- Flow approvals (publish-time review gate for "sensitive" projects) are an
  Enterprise/Cloud feature. On the open-source edition, add a manual approval step inside
  the flow for risky actions.

## Custom piece (integration) in TypeScript

Scaffold in a fork of the repository:

```bash
npm run cli pieces create
npm run cli actions create    # asks: piece folder, display name, description
npm run cli triggers create   # also asks: polling or webhook
```

Action:

```ts
import { createAction, Property } from '@activepieces/pieces-framework';
import { httpClient, HttpMethod } from '@activepieces/pieces-common';
import { myAuth } from '../..';

export const getOrder = createAction({
  name: 'get_order',            // unique in the piece; never rename after release
  auth: myAuth,
  displayName: 'Get Order',
  description: 'Fetch one order by its id',
  props: { orderId: Property.ShortText({ displayName: 'Order ID', required: true }) },
  async run(context) {
    const res = await httpClient.sendRequest({
      method: HttpMethod.GET,
      url: `https://api.example.com/orders/${context.propsValue.orderId}`,
      headers: { Authorization: context.auth.secret_text },
    });
    return res.body;
  },
});
```

Triggers: `TriggerStrategy.POLLING` (use `pollingHelper` with
`DedupeStrategy.TIMEBASED` or last-item dedupe so items are not processed twice),
`TriggerStrategy.WEBHOOK`, or `TriggerStrategy.APP_WEBHOOK`. Always give `sampleData`
so users can map fields before the first real event.

Register everything in the piece:

```ts
export const myPiece = createPiece({
  displayName: 'My App',
  logoUrl: 'https://…/logo.png',
  authors: [],
  auth: myAuth,
  actions: [getOrder],
  triggers: [newOrder],
});
```

Reference topics in `docs/build-pieces/piece-reference/`: authentication, properties and
validation, files, persistent storage, flow control, output schema, versioning, i18n.

## Gotchas

- Polling triggers without dedupe re-run old items after a restart.
- Webhooks fail silently when `AP_FRONTEND_URL` is localhost.
- Changing an action `name` breaks every flow that uses it; add a new action instead.
- Code under `packages/ee` is not MIT; do not copy it into another project.
