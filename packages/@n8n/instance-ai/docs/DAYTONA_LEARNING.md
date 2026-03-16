# Daytona Sandbox Setup

## Recommended: Daytona Cloud

The fastest path. No Docker, no snapshots, no architecture issues.

1. Sign up at https://app.daytona.io
2. Generate an API key from the dashboard
3. Set env vars:

```
N8N_INSTANCE_AI_SANDBOX_ENABLED=true
N8N_INSTANCE_AI_SANDBOX_PROVIDER=daytona
DAYTONA_API_URL=https://app.daytona.io/api
DAYTONA_API_KEY=<your-cloud-api-key>
```

Leave `N8N_INSTANCE_AI_SANDBOX_IMAGE` empty — Daytona Cloud uses its own default snapshot.

### What's in the sandbox

- Node.js v25.6.0 with tsx (TypeScript execution)
- Python 3.14.2
- Ubuntu Linux x86_64
- Full shell access, apt install, file I/O

---

## Self-Hosted on macOS (Docker Desktop) — Not Recommended Yet

Self-hosting on Apple Silicon Macs has significant issues. Documented here for reference.

### Setup

```bash
git clone --depth 1 https://github.com/daytonaio/daytona.git /path/to/daytona
cd /path/to/daytona
docker compose -f docker/docker-compose.yaml up -d
```

Dashboard: http://localhost:3000 (dev@daytona.io / password)

### Known Issues

#### 1. Docker-in-Docker doesn't work

Docker Desktop's Linux VM doesn't support nested Docker daemons. Runner crash-loops.

**Fix**: Mount host Docker socket via `docker-compose.override.yaml`:

```yaml
services:
  runner:
    privileged: true
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
```

#### 2. Runner can't push to internal registry

With host socket, the runner uses the host Docker daemon which can't resolve `registry:6000`.

**Fix**:
1. Add `127.0.0.1 registry` to `/etc/hosts`
2. Add `"insecure-registries": ["registry:6000"]` to `~/.docker/daemon.json`, restart Docker Desktop

#### 3. Sandbox image architecture errors on ARM Macs

Most `daytonaio/sandbox` images have empty architecture metadata. Daytona rejects them with "architecture () is not x64 compatible".

**Status**: As of March 2026, no `-slim` images work on ARM Macs via self-hosted. Non-slim images (`0.5.0`, `0.5.3`) have proper metadata but hit other issues (entrypoint permission errors). **Use Daytona Cloud instead.**

#### 4. Proxy DNS

Port previews need `*.proxy.localhost` DNS resolution:
```bash
bash scripts/setup-proxy-dns.sh
```

### Self-hosted env vars

```
N8N_INSTANCE_AI_SANDBOX_ENABLED=true
N8N_INSTANCE_AI_SANDBOX_PROVIDER=daytona
DAYTONA_API_URL=http://localhost:3000/api
DAYTONA_API_KEY=<your-api-key>
```

### Services & Ports

| Service | Port | Purpose |
|---------|------|---------|
| API/Dashboard | 3000 | Main Daytona server |
| Proxy | 4000 | Sandbox port previews |
| Runner | 3003 | Sandbox orchestration |
| Registry | 6000 | Internal Docker registry |
| Dex (OIDC) | 5556 | Authentication |
| MinIO | 9001 | Object storage console |
| PgAdmin | 5050 | Database admin |
