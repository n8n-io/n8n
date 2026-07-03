# Dev Container

A ready-to-build n8n environment plus a Postgres database, defined via Docker
Compose. To launch it, see the one-click link in the
[Dev Container section of CONTRIBUTING.md](../CONTRIBUTING.md#dev-container), or
open the repo in VS Code and run **Dev Containers: Reopen in Container**.

## What's inside

- **`n8n`** – the dev shell (Node + pnpm). Your working tree is mounted at
  `/workspaces`. The container runs `sleep infinity`; you start n8n yourself.
- **`postgres`** – Postgres 16 used as the workflow database (data persists in
  the `postgres-data` volume). The `n8n` service is pre-wired to it.

On first create the container runs `pnpm install`, then builds all packages.

## Running n8n

From inside the container:

```bash
pnpm dev
```

This starts the backend (port **5678**) and the editor-ui dev server with hot
reload (port **8080**) in parallel. Both ports are forwarded to your host.

**Open the web UI at http://localhost:8080** (the dev server). On first launch
you'll create the owner account.

> The backend on **5678** also serves the production-built UI, so if you run the
> built server instead of `pnpm dev`, open http://localhost:5678 directly.

## Configuration

Copy [`.env.example`](.env.example) to `.env` (gitignored) to override defaults.

### `.n8n` storage (`N8N_DATA_MOUNT`)

Controls where n8n stores its local state (encryption key, binary data, cache,
community nodes — not the workflow DB, which is in Postgres).

- **Unset (default):** bind mounts the host's `~/.n8n`, sharing the encryption
  key and credentials with a local n8n install. Requires `$HOME` on the host
  (set under WSL2/macOS/Linux; not in native-Windows contexts).
- **`N8N_DATA_MOUNT=n8n-data`:** an isolated Docker named volume. Recommended on
  native Windows (no WSL2) and Codespaces.
- **`N8N_DATA_MOUNT=/absolute/path`:** bind a specific directory.

## SSH & signed commits

The container does **not** mount your `~/.ssh`. Instead it relies on VS Code's
automatic **SSH agent forwarding**: it forwards the agent from wherever VS Code's
local side runs (WSL2 if you opened the repo there, otherwise your host OS). Make
sure the agent is running and your key is added **before** opening the container.

`ssh-add` loads your default private key (`~/.ssh/id_ed25519`, `id_rsa`, …) from
disk into the agent's memory; only the agent — never the key file — is forwarded
into the container. No key yet? `ssh-keygen -t ed25519 -C "you@example.com"`.

**macOS** – the agent is already running; just add your key (optionally to the
Keychain so it persists):

```bash
ssh-add --apple-use-keychain ~/.ssh/id_ed25519
```

**Linux / WSL2** – start an agent if one isn't running, then add your key:

```bash
eval "$(ssh-agent -s)"
ssh-add ~/.ssh/id_ed25519
```

**Windows (native OpenSSH)** – enable the agent service once in an Administrator
PowerShell, then add your key in a normal terminal:

```powershell
Get-Service ssh-agent | Set-Service -StartupType Automatic; Start-Service ssh-agent
ssh-add $env:USERPROFILE\.ssh\id_ed25519
```

Verify with `ssh-add -l` (lists loaded keys). This covers git-over-SSH and SSH
commit signing without private keys ever entering the container. (GPG commit
signing is not set up in this image.)
