# Secure Exec Node — Docker + Bubblewrap Plan

## Context

n8n currently has an `ExecuteCommand` node that runs shell commands directly via `child_process.exec()`. It is **disabled by default** on cloud (`NODES_EXCLUDE`) because it has zero isolation — any command runs on the host with n8n's own process permissions.

The goal is a new built-in node (`SecureExec`) that can execute arbitrary shell commands in isolated environments. The isolation backend is pluggable via a driver model to cover both n8n Cloud and self-hosted deployments.

---

## Architecture: Driver Model

```
SecureExec Node
      │
      ▼
ICommandExecutor (interface)
      │
      ├── HostDriver       — child_process.exec(), no isolation (dev/testing only)
      ├── BubblewrapDriver — Linux user-namespace sandbox via bwrap (self-hosted, no daemon required)
      └── DockerDriver     — Docker socket API, container-per-execution (cloud + self-hosted)
```

Driver selection (in priority order):
1. Explicit `N8N_SECURE_EXEC_DRIVER=host|bubblewrap|docker` env var
2. Auto-detect: Docker socket available → Docker; bwrap binary present (Linux) → Bubblewrap; fallback → Host with UI warning

---

## Technology Comparison

| | Bubblewrap | Docker |
|---|---|---|
| Isolation | Process/namespace (shared kernel) | Container (shared kernel) |
| Provisioning | `apt install bubblewrap` | Docker daemon |
| Cross-platform | Linux only | Linux/macOS/Windows |
| Cold start | ~5ms | ~100–500ms |
| Resource overhead | Minimal | Medium |
| Self-hosted friendly | ✅ No daemon needed | ✅ If Docker present |
| Cloud friendly | ⚠️ Weaker isolation | ✅ Standard |

**Recommendation:** Docker is the primary option for cloud and well-provisioned self-hosted. Bubblewrap fills the "Linux self-hosted, no Docker daemon" gap with near-zero overhead.

---

## Implementation Plan

### Phase 1 — Core node + Host + Docker + Bubblewrap drivers (POC)

**Files to create (all in `packages/nodes-base/`):**

```
nodes/SecureExec/
  SecureExec.node.ts          # INodeType implementation
  SecureExec.node.json        # Icon/metadata
  drivers/
    ICommandExecutor.ts       # Interface + shared types
    HostDriver.ts             # child_process.exec wrapper
    DockerDriver.ts           # Docker socket via dockerode
    BubblewrapDriver.ts       # bwrap subprocess
  DriverFactory.ts            # Auto-detect + instantiate driver
```

**Core interface** (`ICommandExecutor.ts`):
```typescript
interface ExecutionOptions {
  command: string;
  workspacePath?: string;   // directory to bind-mount into sandbox
  timeout?: number;
  env?: Record<string, string>;
  memoryMB?: number;
  cpuCount?: number;
}

interface ExecutionResult {
  stdout: string;
  stderr: string;
  exitCode: number;
}

interface ICommandExecutor {
  execute(options: ExecutionOptions): Promise<ExecutionResult>;
}
```

**Node properties UI:**
- `command` (code editor, multiline)
- `driver` (options: Auto-detect | Host | Docker | Bubblewrap) — advanced
- `workspacePath` (string, optional) — path on host to mount
- `containerImage` (string, default `ubuntu:24.04`) — shown only for Docker
- `timeout` (number, default 30s)
- `env` (fixedCollection, key-value pairs)
- Notice/warning block when HostDriver is active: `"⚠ Commands run directly on the host. Use only with trusted code."`

**DockerDriver implementation approach:**
- Use `dockerode` npm package (verify if already a dep, else add)
- `docker.run(image, ['sh', '-c', command], outputStream, { HostConfig: { Binds, Memory, CpuQuota, AutoRemove, NetworkMode: 'none' } })`
- Capture stdout/stderr via attached streams
- Enforce `AutoRemove: true`, `NetworkMode: 'none'` by default (allow override)

**BubblewrapDriver implementation approach:**
- Spawn `bwrap` subprocess with `--unshare-all`, `--new-session`
- Bind-mount workspace with `--bind <workspacePath> /workspace`
- Bind-mount necessary system dirs read-only (`/usr`, `/lib`, `/bin`, etc.)
- Capture stdout/stderr from the subprocess

**Register in `packages/nodes-base/package.json`** under `n8n.nodes`.

**Config addition** (`packages/@n8n/config/src/configs/`):
```
N8N_SECURE_EXEC_DRIVER=host|bubblewrap|docker|auto
N8N_SECURE_EXEC_DOCKER_IMAGE=ubuntu:24.04
N8N_SECURE_EXEC_DEFAULT_TIMEOUT_MS=30000
```

---

### Phase 2 — Persistent Volumes (B-Goal)

**Approach A (Workspace bind mount) — recommended for POC:**
- n8n creates `~/.n8n/workspaces/<execution-id>/` before execution
- Directory is bind-mounted into the sandbox (Docker: `Binds`, Bubblewrap: `--bind`)
- Workflow can write input files before execution, read output files after
- Directory persists across workflow steps until explicitly cleaned up

**Approach B (Named volumes as n8n resources — C-Goal, future):**
- Volumes become first-class n8n objects, manageable in the UI like data tables
- A "Volume" node creates/attaches a volume; SecureExec node references it by name
- Backend: Docker named volumes for Docker driver; directory bind for Bubblewrap

---

## Critical Files to Create/Modify

| File | Action |
|------|--------|
| `packages/nodes-base/nodes/SecureExec/SecureExec.node.ts` | Create |
| `packages/nodes-base/nodes/SecureExec/drivers/ICommandExecutor.ts` | Create |
| `packages/nodes-base/nodes/SecureExec/drivers/HostDriver.ts` | Create |
| `packages/nodes-base/nodes/SecureExec/drivers/DockerDriver.ts` | Create |
| `packages/nodes-base/nodes/SecureExec/drivers/BubblewrapDriver.ts` | Create |
| `packages/nodes-base/nodes/SecureExec/DriverFactory.ts` | Create |
| `packages/nodes-base/package.json` | Modify — register node |
| `packages/@n8n/config/src/configs/nodes.ts` (or similar) | Modify — add env vars |

**Reference files to reuse patterns from:**
- `packages/nodes-base/nodes/ExecuteCommand/ExecuteCommand.node.ts` — existing node pattern
- `packages/@n8n/node-cli/src/utils/child-process.ts` — subprocess spawning
- `packages/@n8n/config/src/configs/` — config schema pattern

---

## Open Questions

1. **Is `dockerode` already a dependency of `nodes-base`?** If not, alternative: use `docker` CLI subprocess instead to avoid a new dep.
2. **Timeout behavior**: should timeout kill the container immediately, or SIGTERM first?

---

## Verification

**Phase 1 (Docker driver):**
```bash
# Run n8n locally with Docker socket mounted
N8N_SECURE_EXEC_DRIVER=docker pnpm run dev

# In a workflow: add SecureExec node, set command to `id; whoami; ls /`
# Verify output shows container user (not host user)
# Verify container is removed after: docker ps -a

# Without Docker:
N8N_SECURE_EXEC_DRIVER=host pnpm run dev
# Verify warning notice appears in node UI
```

**Phase 1 (Bubblewrap driver):**
```bash
N8N_SECURE_EXEC_DRIVER=bubblewrap pnpm run dev
# Verify: `id` shows nobody/restricted user
# Verify: cannot access /etc/shadow or host paths outside workspace
```

**Tests to add:**
- Unit tests for each driver (mock Docker API, mock bwrap subprocess)
- Integration test for DockerDriver requiring Docker socket
- E2E test in CI with the full node via `ExecuteWorkflow`
