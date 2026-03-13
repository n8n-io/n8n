# Troubleshooting

Common issues when running or developing n8n locally, and how to fix them.

---

## Quick Diagnostics

```bash
# Check Node.js version (needs 20.15+)
node --version

# Check pnpm version (needs 9.x)
pnpm --version

# Check n8n version
npx n8n --version   # or: n8n --version

# View n8n logs (Docker)
docker logs n8n --tail 100

# View build errors
tail -n 50 build.log
```

---

## Installation Issues

### `pnpm install` fails with ENOENT or peer dependency errors

**Cause:** Wrong Node.js or pnpm version.

```bash
# Fix: use the correct versions
nvm use 20
corepack enable
corepack prepare pnpm@9 --activate
pnpm install
```

---

### `pnpm build` fails with TypeScript errors

**Cause:** Type definitions out of sync after pulling changes.

```bash
# Fix: clean and rebuild
pnpm clean
pnpm install
pnpm build > build.log 2>&1
tail -n 30 build.log
```

---

### `Error: Cannot find module 'n8n-workflow'`

**Cause:** Packages not yet built. Always build before running in development.

```bash
pnpm build > build.log 2>&1
```

---

## Runtime Issues

### n8n won't start: `EADDRINUSE: address already in use :::5678`

**Cause:** Another process is using port 5678.

```bash
# Find what's using the port
lsof -i :5678
# Kill it (replace <PID> with actual PID)
kill <PID>

# Or change n8n's port
N8N_PORT=5679 n8n
```

---

### Cannot open http://localhost:5678 — connection refused

**Cause:** n8n hasn't finished starting, or started on a different host/port.

```bash
# Check if n8n is running
ps aux | grep n8n

# Check Docker container status
docker ps

# Re-run with verbose logs
N8N_LOG_LEVEL=debug n8n
```

---

### Workflow executions stuck in "running" state

**Cause:** Orphaned execution records from an unclean shutdown.

**Fix in the n8n UI:** Settings → Executions → click "Recover" on stuck executions.

**Fix via SQLite CLI (development only):**
```bash
sqlite3 ~/.n8n/database.sqlite \
  "UPDATE execution_entity SET status = 'error', stoppedAt = datetime('now') WHERE status = 'running';"
```

---

### `Error: Credentials not found for node [NodeName]`

**Cause:** Credential ID referenced in the workflow doesn't exist in this n8n instance.

**Fix:**
1. Open the workflow node.
2. Re-create the credential under Settings → Credentials.
3. Select it in the node's credential dropdown.

---

### Webhook not receiving events

**Possible causes:**

1. **n8n is not publicly accessible** — webhooks need a public URL. Use [ngrok](https://ngrok.com) for local development:
   ```bash
   ngrok http 5678
   # Then set:
   WEBHOOK_URL=https://<your-ngrok-id>.ngrok.io n8n
   ```

2. **Workflow is not active** — toggle the workflow to "Active" (top-right switch in the editor).

3. **Wrong webhook path** — copy the exact webhook URL from the Webhook node's "Production URL" field.

---

### `Error: Invalid encryption key` after restarting n8n

**Cause:** `N8N_ENCRYPTION_KEY` changed between runs. All saved credentials are encrypted with the original key.

**Fix:** Set `N8N_ENCRYPTION_KEY` back to its original value (check your `.env` or Docker secrets).

> Never change the encryption key in production — you will lose access to all credentials.

---

## Build & Development Issues

### Frontend dev server not hot-reloading

```bash
# Restart the dev server
pnpm dev

# If Vite cache is stale
rm -rf packages/frontend/editor-ui/.vite
pnpm dev
```

---

### TypeScript errors after pulling latest changes

```bash
# Rebuild changed packages
pnpm build --filter=@n8n/api-types
pnpm build --filter=@n8n/db
pnpm typecheck
```

---

### Tests failing with `Cannot find module`

```bash
# Run from the correct package directory
pushd packages/cli
pnpm test
popd
```

---

### ESLint or Biome failing with unexpected errors

```bash
# Run lint from the package directory
cd packages/cli
pnpm lint

# Auto-fix safe issues
pnpm lint --fix
```

---

## Docker Issues

### `docker: Error response from daemon: Mounts denied`

**Cause (macOS):** Docker doesn't have permission to mount the volume path.

**Fix:** Docker Desktop → Settings → Resources → File Sharing → add the path.

---

### Container exits immediately

```bash
# Check the exit log
docker logs n8n

# Common fix: volume permission issue
docker volume rm n8n_data
docker volume create n8n_data
docker run -it --rm --name n8n -p 5678:5678 -v n8n_data:/home/node/.n8n docker.n8n.io/n8nio/n8n
```

---

### Out of memory in Docker

Add a memory limit and increase if needed:

```yaml
# docker-compose.yml
services:
  n8n:
    mem_limit: 2g
```

---

## Database Issues

### `SQLITE_READONLY: attempt to write a readonly database`

**Fix:**
```bash
chmod 644 ~/.n8n/database.sqlite
```

---

### PostgreSQL migration fails on startup

**Fix:** Ensure the Postgres user has `CREATE TABLE` and `ALTER TABLE` privileges:

```sql
GRANT ALL PRIVILEGES ON DATABASE n8n TO n8n_user;
```

---

### `too many connections` error (PostgreSQL)

**Fix:** Set a connection pool limit:

```bash
DB_POSTGRESDB_POOL_SIZE=5
```

---

## Getting More Help

| Resource | URL |
|---|---|
| Community Forum | https://community.n8n.io |
| GitHub Issues | https://github.com/n8n-io/n8n/issues |
| n8n Docs | https://docs.n8n.io |
| Discord | https://discord.gg/vWwMVThRta |

When asking for help, always include:
- n8n version (`n8n --version`)
- Node.js version (`node --version`)
- Deployment type (Docker / npm / source)
- Full error message and stack trace from logs
