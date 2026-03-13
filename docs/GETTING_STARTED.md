# Getting Started with n8n Locally

This guide shows you the fastest ways to run n8n on your machine.

## Prerequisites

| Requirement | Minimum Version | Install |
|---|---|---|
| Node.js | 20.15 | https://nodejs.org or `nvm install 20` |
| Docker | any recent | https://docs.docker.com/get-docker/ |
| pnpm | 9.x | `npm install -g pnpm@9` |

---

## Option A: Docker (Quickest – Recommended)

```bash
# Create a persistent data volume
docker volume create n8n_data

# Run n8n
docker run -it --rm \
  --name n8n \
  -p 5678:5678 \
  -v n8n_data:/home/node/.n8n \
  docker.n8n.io/n8nio/n8n
```

Open **http://localhost:5678** in your browser. Create an owner account on first visit.

### With Docker Compose

The repository ships a pre-configured Compose file at [`docker/`](../docker/):

```bash
cd docker
# Review/edit docker-compose.yml for your environment
docker compose up -d
```

---

## Option B: npx (No Install Required)

```bash
npx n8n
```

This downloads and runs n8n without a global install. Useful for a quick demo.

---

## Option C: Global npm Install

```bash
npm install -g n8n
n8n
```

Then open **http://localhost:5678**.

---

## Option D: Full Source Build (For Contributors)

See [Local Setup](./LOCAL_SETUP.md) for a step-by-step guide to clone, build, and run n8n from source with hot-reload.

---

## First-Run Walkthrough

1. Open **http://localhost:5678**.
2. Create your **owner account** (credentials stored locally).
3. You land on the **Workflow Editor**.
4. Click **+ Add first step** to start a new workflow.
5. Search for a trigger (e.g., **Manual Trigger**, **Webhook**, **Schedule**).
6. Connect nodes by dragging from the output dot to the next node.
7. Click **Execute workflow** (▶) to run it.
8. Check the **Executions** tab to see logs.

---

## Environment Variables

Configure n8n behaviour via environment variables. Key ones for local use:

| Variable | Default | Description |
|---|---|---|
| `N8N_PORT` | `5678` | HTTP port |
| `N8N_HOST` | `localhost` | Bind address |
| `N8N_BASIC_AUTH_ACTIVE` | `false` | Enable HTTP basic auth |
| `N8N_ENCRYPTION_KEY` | auto-generated | Encrypts credentials at rest |
| `DB_TYPE` | `sqlite` | `sqlite`, `postgresdb`, `mysqldb` |
| `N8N_LOG_LEVEL` | `info` | `verbose`, `debug`, `info`, `warn`, `error` |
| `WEBHOOK_URL` | — | Public URL for webhooks (e.g., behind a proxy) |

Store these in a `.env` file and pass them to Docker:

```bash
docker run -it --rm \
  --name n8n \
  -p 5678:5678 \
  -v n8n_data:/home/node/.n8n \
  --env-file .env \
  docker.n8n.io/n8nio/n8n
```

---

## What's Next?

- **Browse use cases** → [Use Cases](./USECASES.md)
- **Build AI workflows** → [Prompts](./PROMPTS.md)
- **Contribute to n8n** → [Local Setup](./LOCAL_SETUP.md) then [CONTRIBUTING.md](../CONTRIBUTING.md)
- **Hit an error?** → [Troubleshooting](./TROUBLESHOOTING.md)
