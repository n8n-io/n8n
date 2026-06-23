# Cross-instance promotion demo (two local instances)

Walk the full `pair → mark → pull → review → apply` flow from
[`SPIKE-PLAN.md`](../SPIKE-PLAN.md) using two n8n processes on your machine.
No Docker required.

| Instance | Role | URL |
|----------|------|-----|
| dev | producing | http://localhost:5678 |
| prd | consuming | http://localhost:5679 |

Each instance needs its own data directory and encryption key so they stay
independent.

## 1. Build (once, or after backend/frontend changes)

From the repo root:

```bash
pnpm build
```

For day-to-day UI work, run the frontend dev server (step 2) instead of
rebuilding after every change.

## 2. Start both instances

**Terminal 1 — producing (dev)**

```bash
cd packages/cli
N8N_PORT=5678 \
N8N_ENCRYPTION_KEY=promotion-demo-dev-key \
N8N_SECURE_COOKIE=false \
N8N_DIAGNOSTICS_ENABLED=false \
N8N_PERSONALIZATION_ENABLED=false \
N8N_RUNNERS_ENABLED=true \
N8N_LICENSE_TENANT_ID=1001 \
N8N_LICENSE_ACTIVATION_KEY=xxx \
N8N_USER_FOLDER=$HOME/tmp/n8n-promo-dev \
pnpm dev
```

**Terminal 2 — consuming (prd)**

```bash
cd packages/cli
N8N_PORT=5679 \
N8N_ENCRYPTION_KEY=promotion-demo-prd-key \
N8N_SECURE_COOKIE=false \
N8N_DIAGNOSTICS_ENABLED=false \
N8N_PERSONALIZATION_ENABLED=false \
N8N_RUNNERS_ENABLED=true \
N8N_LICENSE_TENANT_ID=1001 \
N8N_LICENSE_ACTIVATION_KEY=xxx \
N8N_USER_FOLDER=$HOME/tmp/n8n-promo-prd \
pnpm dev
```

**Terminal 3 — frontend hot reload (optional, recommended for UI work)**

```bash
cd packages/frontend/editor-ui
pnpm dev
```

Open http://localhost:8080 for dev (producing, with hot reload) and
http://localhost:5679 for prd (consuming). Complete owner setup on each — they
are separate instances.

The editor-ui dev server on port 8080 proxies API calls to the dev backend on
5678. Use http://localhost:5679 directly for prd (served from the built
frontend until you rebuild `editor-ui`).

## 3. Walk the demo

1. **dev → create an API key**: Settings → n8n API → create a key. Copy it.
2. **prd → pair**: open *Promotion review* (main sidebar, between Overview and
   Personal) → **Source instances** → add:
   - Name: `n8n Dev`
   - Base URL: `http://localhost:5678` ← backend-to-backend pull from prd to
     dev on the same machine
   - API key: the key from step 1
3. **dev → mark for deployment**: on the same *Promotion review* page, use
   **Mark for deployment** — pick a workflow (build one first if needed; include
   at least one credential, e.g. a Slack node) and submit.
4. **prd → review**: open *Promotion review*. The request appears in the inbox
   (pulled from dev's `/outbox`). Open it → pick a target project → map each
   source credential to one in that project → **Approve & apply**. The workflow
   lands in the chosen prd project.

### Credential rebind

The target project must already contain credentials of the matching type. If the
dropdown is empty, create the credential in that project on prd, then pick it in
the rebind UI.

## Reset local data

```bash
rm -rf $HOME/tmp/n8n-promo-dev $HOME/tmp/n8n-promo-prd
```

Restart both CLI processes and complete setup again.

## Optional: Docker

`docker-compose.yml` in this folder runs the same demo in containers
(`n8nio/n8n:local`). Use it when you want isolated instances without a local
build loop:

```bash
pnpm build:docker   # from repo root
docker compose up -d
```

When pairing inside Docker, use the producing hostname
`http://n8n-dev:5678` (not `localhost`) because the pull is
backend-to-backend over the Docker network.
