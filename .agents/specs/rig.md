# rig: local n8n environments

`rig` is a CLI that creates and runs local n8n environments for testing. An
environment has a fixed topology: database, queue mode, number of mains and
workers, task runners, and engine v2. `rig` runs the services (Postgres,
Redis) in containers. It runs the n8n components as local processes from the
monorepo.

Status: phases 1 (MVP), 2 (global install), and 3 (developer experience) implemented. Phase 4 is open.

## Goals

- Create an environment from one command or a short wizard.
- Support every topology: SQLite or Postgres, regular or queue mode, single or
  multi-main, external task runners, and engine v2.
- Run one component in a terminal, or run all components in one terminal.
- Change env vars for the whole stack, for one role, or for one component.
  Show which processes the change affects and restart only those processes.
- Derive all ports, URLs, and wiring from the topology. The user never sets
  them by hand.

## Non-goals

- `rig` does not replace `pnpm services` or the `n8n-containers` stacks for
  Playwright. They stay. See [Relation to n8n-containers](#relation-to-n8n-containers).
- `rig` is not published to a registry. It is a private package.
- `rig` does not use a background daemon in phase 1.

## Decisions

| Topic | Decision |
|---|---|
| Name | `rig`. Package `@n8n/rig`, private |
| Location | `packages/quality/environments/rig` |
| Distribution | No publishing. `pnpm rig` runs the source with tsx. `rig install-global` copies a `tsdown` bundle from a checkout to a versions directory and writes a shim |
| Task runners | The launcher is the default (`runners.via: launcher`). Go is an accepted dependency on macOS |
| `pnpm services` | Stays. `rig` reads the same image tags. Containers, ports, and files stay separate |
| Service containers | Generated compose file per environment, run with Docker or Podman (`container.runtime`). No testcontainers, because environments must persist |
| Env var files | Dotenv files, one file per layer |
| Topology file | `env.yaml` |
| Prompts | `@clack/prompts` 1.x, for `autocomplete`. `@n8n/node-cli` keeps 0.11 |
| TypeScript | `typescript-tooling` catalog: TS 7 for typecheck, TS 6 JavaScript API at runtime for the env var catalog (same as `packages/cli`) |
| Catalog extraction | Deferred to phase 4. Phase 1 imports the pure modules directly |
| Restarts across terminals | Any terminal stops and starts a component with signals. The owner terminal follows the log file, so no control files are necessary |
| Reused pid detection | Compare the process start time from `ps -o lstart`. n8n changes its own command line (`n8n start`), so a command line check does not work |

## Concepts

```mermaid
flowchart TD
  E[Environment] --> T[Topology: env.yaml]
  E --> L[Env layers: env/*.env]
  T --> S[Services: postgres, redis]
  T --> C[Components]
  C --> M[main-N]
  C --> W[worker-N]
  C --> G[engine]
  C --> R[launcher@host]
  L --> C
```

- **Environment**: a named directory that holds the topology, the env layers,
  the data, the logs, and the runtime state.
- **Topology**: the declared shape of the environment. It is the only source
  of truth for components, ports, and wiring.
- **Service**: a container that a component needs (Postgres, Redis).
- **Component**: one local process. Each component has a name and a role.
- **Role**: a group of components with the same function: `main`, `worker`,
  `engine`, `launcher`, `runner-js`, `runner-py`.

## File layout

`rig` uses XDG directories from phase 1.

```
~/.config/rig/
  config.yaml                # global settings
  profiles/<name>.env        # reusable env snippets
  secrets.env                # global secrets, mode 0600

~/.local/share/rig/
  current                    # name of the default environment
  install.json               # global install: current version id and history
  versions/<id>/rig.mjs      # bundled global rig, id = <version>+<commit>[.dirty.<time>]
  versions/<id>/build.json   # build info and the checkout it was built from
  envs/<name>/
    env.yaml                 # topology
    env/
      shared.env
      main.env  worker.env  engine.env
      launcher.env  runner-js.env  runner-py.env
      <component>.env        # for example worker-2.env, launcher@worker-1.env
    secrets.env              # generated secrets, mode 0600
    compose.yaml             # generated, do not edit
    launcher/<host>.json     # generated launcher configs, do not edit
    data/<component>/        # N8N_USER_FOLDER of each n8n process
    data/storage/            # shared binary data path (engine remote mode)
    logs/<component>.log     # current run
    logs/<component>.1.log   # previous run
    state/<component>.json   # runtime state of a running component
    postgres-init.sql        # generated, creates the engine database
    engine-tls/              # CA and plane certificates with engineTls (keys 0600)

~/.cache/rig/
  launcher/<version>/task-runner-launcher   # downloaded or built launcher releases
  env-catalog/<hash>.json    # env var catalog of each checkout

~/.local/bin/rig             # shim of the global install (RIG_BIN_DIR)
```

### Public URL

```yaml
tunnel:
  provider: cloudflare      # `tunnel: cloudflare` is the short form
  target: main-1            # the main that the tunnel exposes
  hostname: n8n.example.com # optional: a named tunnel, needs CLOUDFLARE_TUNNEL_TOKEN in secrets.env
  image: auto               # auto = TEST_CONTAINER_IMAGES.cloudflared
  metricsPort: 20241        # cloudflared metrics, on 127.0.0.1
```

- **Quick tunnel** (no `hostname`): cloudflared runs
  `tunnel --url http://host.docker.internal:<target port>`. Cloudflare gives it
  a random `trycloudflare.com` hostname. No account.
- **Named tunnel** (`hostname`): cloudflared runs `tunnel run` with the token.
  The routes come from the Cloudflare dashboard. The public hostname must point
  at `http://host.docker.internal:<target port>`. `rig` passes the token in the
  environment of `compose`, so the compose file does not contain it.
- The tunnel is a compose service, not a component. A component restart does
  not change the URL. A quick tunnel keeps its URL while its container runs, so
  also across `rig up` sessions. `rig stop` and `rig services down` remove it.
- `rig` waits up to 60 seconds for `/ready` on the metrics port. For a quick
  tunnel it reads the hostname from `/quicktunnel`. It stores the URL in
  `state/tunnel.json`. `services down` deletes the file.
- Managed vars when the tunnel has a URL: `N8N_WEBHOOK_URL=<url>/` on every
  n8n process, and `N8N_PROXY_HOPS=1` on mains. `N8N_EDITOR_BASE_URL` stays
  unset: n8n builds OAuth callback URLs from the webhook URL, and the local
  editor keeps working. `WEBHOOK_URL` is deprecated, so `rig` does not set it.
- `rig up` and `rig run` watch `state/tunnel.json`. A new URL is drift.
- Interface: `rig create --tunnel`, a wizard question, `rig status` (the
  address column shows the URL), `rig open --public`, and the `p` key.

### Global config

Change it with `rig config set <key> <value>` and read it with
`rig config get`. Remove a value with `rig config unset <key>`.
`RIG_LAUNCHER_PATH` overrides `launcher.path`. `RIG_CONFIG_DIR`,
`RIG_DATA_DIR`, `RIG_CACHE_DIR`, and `RIG_BIN_DIR` move the directories
(tests use them).

```yaml
# ~/.config/rig/config.yaml
launcher:
  path: ~/work/task-runner-launcher   # optional: a local launcher checkout
  version: 1.6.0                      # optional: a release, when path is not set
repo: ~/work/n8n                      # default source outside a checkout
container:
  runtime: docker                     # docker | podman. Set on the first use
browser: firefox                      # set on the first URL, see Browser and editor
editor: cursor                        # set on the first edit
```

`RIG_CONTAINER_RUNTIME` overrides `container.runtime`.

### Topology file

```yaml
# ~/.local/share/rig/envs/<name>/env.yaml
name: mm
source: auto                # auto | repo:<path>. Phase 4: image:<tag>, npm:<version>
db: postgres                # sqlite | postgres
queue: true
mains: 2
workers: 2
runners:
  mode: external            # internal | external
  via: launcher             # launcher | direct
  languages: [js, python]
engine: off                 # off | in-process | remote
engineTls: false            # mutual TLS between main and engine (engine: remote)
tunnel: off                 # off | cloudflare, or the long form (see Public URL)
services:
  postgres:
    image: auto             # auto = TEST_CONTAINER_IMAGES.postgres
    port: 5432
  redis:
    image: auto
    port: 6379
slot: 0                     # port slot 0 to 9, see Ports
profiles: []                # profiles from ~/.config/rig/profiles, a later one wins
```

Validate `env.yaml` with a Zod schema. Report errors with the file path, the
key, and a fix.

## Commands

Phase numbers show when a command or flag arrives. Commands without a number
are in phase 1.

### Lifecycle

| Command | Function |
|---|---|
| `rig create [name]` | Create an environment. Without topology flags, in a terminal, start the wizard (see below) |
| `rig create <name> --preset <preset>` | Create from a preset |
| `rig create <name> --db postgres --queue --mains 2 --workers 2 --runners external --engine remote` | Create from flags |
| `rig ls` | List environments. Show the default environment and the running components |
| `rig use <name>` | Set the default environment |
| `rig reset [name] [--db] [--data]` | Delete data. Keep the configuration |
| `rig destroy <name>` | Stop everything. Delete containers, volumes, and the directory |
| `rig create … --slot <n\|auto> --engine-tls --runners direct` | Port slot, engine TLS, direct runners |
| `rig clone <src> <dst> [--slot]` | Copy env.yaml, the `env/` files, and own secrets (generated secrets are new). The copy starts with fresh data and, by default, the lowest free slot |

The environment is selected in this order: the `--env <name>` flag, the
`RIG_ENV` env var, the `current` file, then the only environment if there is
one. Put `--env` after the command name: citty takes the first word that does
not start with `-` as the command.

### Running

| Command | Function |
|---|---|
| `rig up` | Start services and all components. Show merged, prefixed logs |
| `rig run <component\|role>…` | Run components or roles in the foreground. A process also runs its launcher. `--no-launcher` skips it |
| `rig run <component> -e KEY=VAL` | Run with a one-off override. Do not save it |
| `rig services up\|down` | Start or stop only the containers |
| `rig stop [component]` | Stop one component, or all components and services |
| `rig restart <component\|role>` | Restart components in the terminal that owns them |
| `rig status` | Show a table: component, pid, port, health, owner terminal, env drift |
| `rig logs [component] [-f]` | Show or follow log files |
| `rig open [main-N] [--public]` | Open the editor, or the public URL of the tunnel, in the browser |
| `rig psql`, `rig redis-cli` | Open a shell in the service container |
| `rig up --split` | Open one tmux pane for each n8n process. Each pane runs `rig run <process> --no-services --wait-deps` |
| `rig run\|up --inspect`, `--inspect-brk` | Start the n8n processes (for `run`: the named ones) with the Node inspector at port block +5 |
| `rig run --wait-deps`, `--no-services` | Wait for dependencies without a prompt. Do not start the services |
| `rig logs --raw` | Show JSON log lines as they are |

### Env vars

| Command | Function |
|---|---|
| `rig env browse [--on <layer>] [--refresh]` | Interactive editor with every env var that n8n declares (see [Env var catalog](#env-var-catalog)) |
| `rig env set KEY=VAL [--on <role\|component>]` | Write to `shared.env`, a role file, or a component file |
| `rig env unset KEY [--on …]` | Remove a key from a layer file |
| `rig env edit [--on …]` | Open the layer file in the editor (see Browser and editor) |
| `rig edit` | Open env.yaml in the editor. Then validate it and report drift |
| `rig config edit` | Open the global config in the editor. Then validate it |
| `rig env ls [component]` | Show the resolved env and the layer of each key |
| `rig env explain KEY --on <component>` | Show every layer that sets the key, and which layer wins |
| `rig env diff <a> <b>` | Compare the resolved env of two components. `<env>:<component>` names a component of another environment |
| `rig env set KEY=VAL --secret` | Write to `secrets.env`. `--on global-secrets` writes to `~/.config/rig/secrets.env` |
| `rig env set\|unset\|edit --on profile:<name>` | Change a profile. The first value creates it |
| `rig profile on\|off <name…>`, `rig profile ls` | Turn profiles on or off. `on` moves a profile to the end, so it wins |

### Integrations

| Command | Function |
|---|---|
| `rig exec <component> -- <cmd…>` | Run a command with the resolved env of a component |
| `rig print <component> --format shell\|dotenv\|json` | Print the resolved env |
| `rig print <component> --format vscode` | Print a launch and an attach configuration for VS Code (n8n processes only). The env contains secrets |
| `rig config get [key]`, `rig config set <key> <value>`, `rig config unset <key>` | Read and change the global config |
| `rig doctor [--env <name>]` | Check Node, pnpm, Docker and Podman (the one in use fails, the other is information), the checkout and its build, the launcher, Go, `uv`, the ports of the environment, and the global install. Exit code 1 on a problem |
| `rig install-global [--from <path>] [--force]` | Build and install the global `rig` |
| `rig self-update [--from <path>] [--force] [--rollback]` | Rebuild the global `rig`, or point it to the previous version |
| `rig --version` | The running version, and the global version when it handed off |

### Wizard

The wizard uses arrow-key prompts from `@clack/prompts` (the version that
`@n8n/node-cli` uses).

1. **Topology**: one of the presets, or `custom`.
2. For `custom`, the questions depend on the previous answers:
   - Database: SQLite or Postgres.
   - Postgres only: execution mode, regular or queue.
   - Queue only: mains (1 to 4, more than 1 needs a license) and workers (0 to 4).
   - Postgres in regular mode only: engine v2, off, in-process, or remote.
     Remote only: TLS between the main and the engine, off or on.
   - Task runners: external via the launcher, external direct (runner
     components), or internal. For external, the languages (space bar toggles).
3. **Public HTTPS URL**: no, or a Cloudflare quick tunnel.
4. **Ports**: only when another environment uses slot 0. Own ports (the
   lowest free slot), or the default ports (slot 0). Own ports is preselected.
5. **Name**: the default is the preset name, or `local`, with a number when
   the name exists. An existing name is rejected.
6. **Summary**: the topology and the components with their ports, then a
   confirmation.

Ctrl+C cancels without changes. A name argument skips the name question.

### Presets

| Preset | Topology |
|---|---|
| `sqlite` | SQLite, regular mode, 1 main |
| `postgres` | Postgres, regular mode, 1 main |
| `queue` | Postgres, queue mode, 1 main, 1 worker |
| `multi-main` | Postgres, queue mode, 2 mains, 1 worker |
| `engine` | Postgres, 1 main, `engine: in-process` |
| `engine-remote` | Postgres, Redis, 1 main, `engine: remote` |

All presets use `runners: { mode: external, via: launcher, languages: [js, python] }`.
Flags after `--preset` override the preset values.

## Env var catalog

`rig env browse` needs every env var that n8n reads. `@n8n/config` keeps its
metadata in a private map, and the docs exporter is not in this repository, so
`rig` reads the source.

- `git grep` finds the files with `@Env('` under `packages/`, without tests and
  `packages/quality`. About 90 files.
- The TypeScript compiler API (TS 6 from the `typescript-tooling` catalog,
  because TS 7 has no JavaScript API) builds a program from them. The type
  checker resolves aliases and schemas, so `mode: EngineMode` becomes an enum.
- For each `@Env` property: name, JSDoc description, kind, options, separator,
  default (as written), config class (the group), and `path:line`.

| Property type | Kind | Editor input |
|---|---|---|
| `boolean` | `boolean` | List: `true`, `false` |
| `number` | `number` | Text, checked as a number |
| Union of string literals | `enum` | List of the options, plus a custom value |
| Array of a string literal union (`CommaSeparatedStringArray<'a' \| 'b'>`) | `enum-list` | Checkboxes, joined with the separator |
| Other array (`ColonSeparatedStringArray<string>`) | `list` | Text |
| `string` | `string` | Text |
| Anything else (records, JSON arrays) | `json` | Text, checked as JSON |

A name that is declared more than once keeps the declaration with a
description. The first run takes about 3 seconds for about 690 vars. The result
is cached in `~/.cache/rig/env-catalog/<checkout hash>.json` with the commit and
the modification times of the scanned files. A new file with `@Env` that is not
committed needs `--refresh`. The compiler API loads only when the cache is
stale.

The editor:

- Search: words match in any order in the name, group, and description.
  Results rank as exact name, name prefix, name segment, name, then the rest.
  The focus moves to the best match when the search text changes.
- Vars set in the layer come first, with their values. Empty search also
  shows `✓ Done`, `⇄ Change layer`, and `+ Other variable…`. A search that
  looks like a new name offers `+ <NAME>`.
- Details: description, kind, options, default, the value in the layer, and the
  value that up to four affected components run with, with its source.
- The guardrails of `rig env set` apply. In the editor they ask instead of
  failing.
- At the end, `rig` offers to restart the components with drift, the same as
  `rig env set`.

## Components

| Component | Role | Command | Working directory |
|---|---|---|---|
| `main-N` | `main` | `node bin/n8n start` | `packages/cli` |
| `worker-N` | `worker` | `node bin/n8n worker` | `packages/cli` |
| `engine` | `engine` | `node bin/n8n engine` | `packages/cli` |
| `launcher@<host>` | `launcher` | `<launcher-binary> javascript python` | env directory |
| `runner-js@<host>` (`via: direct`) | `runner-js` | `node dist/start.js` | `packages/@n8n/task-runner` |
| `runner-py@<host>` (`via: direct`) | `runner-py` | `uv run python src/main.py` | `packages/@n8n/task-runner-python` |

`<host>` is the n8n process that owns the broker, for example
`launcher@worker-1`.

### Direct runners

With `runners.via: direct`, the processes that would get a launcher get one
runner component for each language instead. Before each start, `rig` asks the
broker of the host for a grant token (`POST /runners/auth` with
`N8N_RUNNERS_AUTH_TOKEN`), as the launcher does, and passes it as
`N8N_RUNNERS_GRANT_TOKEN`. The token is single-use and is not part of the env
hash. A restart of a process also restarts its direct runners, because their
broker connection ends. Readiness is the runner health server
(`N8N_RUNNERS_HEALTH_CHECK_SERVER_*` at offset +3 or +4).

### Which processes get a launcher

When `runners.mode` is `external`, a launcher attaches to each n8n process
that runs tasks:

- In regular mode: each main.
- In queue mode: each worker.
- In queue mode: no main by default. `rig` sets the default
  `OFFLOAD_MANUAL_EXECUTIONS_TO_WORKERS=true` on every n8n process in every
  environment (n8n reads it only in queue mode), so the workers run manual
  executions too. A main gets a launcher when its resolved
  env sets the var to `false`.
- With `engine: remote`: the engine. The engine hosts its own task broker.

The launcher list is derived from the resolved env, so a change of
`OFFLOAD_MANUAL_EXECUTIONS_TO_WORKERS` adds or removes launchers.

### Role arguments

`rig run <role>` runs all components of the role in one terminal with
prefixed logs. Examples: `rig run worker`, `rig run launcher`.

`rig run` adds the launcher of each selected process, because a process
without its launcher cannot run Code nodes. `rig run worker` runs the workers
and their launchers.

## Ports

Ports are fixed for each slot (see below).

Each n8n process gets a block of 10 ports:

| Offset | Use |
|---|---|
| +0 | HTTP (`N8N_PORT` for mains, `QUEUE_HEALTH_CHECK_PORT` for workers) |
| +1 | Task broker (`N8N_RUNNERS_BROKER_PORT`) |
| +2 | Launcher health (`N8N_RUNNERS_LAUNCHER_HEALTH_CHECK_PORT`) |
| +3 | JS runner health |
| +4 | Python runner health |
| +5 | Node inspector (`--inspect`) |

| Process | Block base |
|---|---|
| `main-N` | `5678 + 10 * (N - 1)` |
| `worker-N` | `5778 + 10 * (N - 1)` |
| `engine` | `N8N_ENGINE_PORT=3000`, `N8N_ENGINE_CONTROL_PLANE_PORT=3001`. Launcher block base `5878` |

Limit: 10 mains and 10 workers.

Slots: `slot: k` (0 to 9) adds `1000 * k` to the port blocks, `10 * k` to the
engine ports (3000 + 10k, 3001 + 10k), and `k` to the Postgres, Redis, and
tunnel metrics ports. A step of 1000 for the engine would reach port 5000,
which macOS uses for AirPlay. Environments with different slots run at the
same time. `rig ls` shows a slot other than 0. `rig create --slot auto` and
`rig clone` take the lowest slot that no other environment uses. The wizard
asks only when another environment uses slot 0. `rig create` warns when
another environment has the same slot.

Before a component starts, `rig` checks that its ports are free. If a port is
in use by a running component of another environment, `rig` names it and
suggests a free slot. Otherwise it names the process that holds the port.

## Env resolution

The resolved env of a component merges these layers. A later layer wins.

| # | Layer | Source |
|---|---|---|
| 0 | Shell | Safe keys from the parent shell (see below) |
| 1a | Default | Developer defaults from `rig`. Layer files override them without a warning |
| 1b | Managed | Wiring derived from the topology by `rig`. `rig env set` warns before it overrides a key |
| 2 | Profiles | `~/.config/rig/profiles/<name>.env`, in the order of `profiles` |
| 3 | Shared | `env/shared.env` |
| 4 | Role | `env/<role>.env` |
| 5 | Component | `env/<component>.env` |
| 6 | Secrets | `~/.config/rig/secrets.env`, then `secrets.env`. Both mode 0600 |
| 7 | One-off | `rig run -e KEY=VAL` |

The resolved env starts from an empty object plus `PATH`, `HOME`, `TERM`,
`LANG`, and `NODE_OPTIONS` from the parent shell. Other parent shell vars do
not leak into components. `rig run --inherit-env` turns this off.

The runner `env-overrides` of a launcher use their own layers: default,
managed, `env/runner-js.env` (or `runner-py.env`), then
`env/runner-js@<host>.env`. They do not get `shared.env` or secrets.

A direct runner gets what a launcher would pass it: the keys in the
`allowed-env` list of its language from the launcher defaults, profiles, and
`shared.env`, then the runner defaults, the managed wiring, `env/runner-js.env`
(or `runner-py.env`), and `env/runner-js@<host>.env`. No secrets.

The engine rules for `shared.env` also apply to profiles and to the global
secrets.

The engine does not get control-plane-only keys (`DB_*`,
`N8N_ENCRYPTION_KEY`) from `shared.env` and secrets. A main in engine remote
mode does not get `N8N_ENGINE_DATABASE_URL` and `N8N_ENGINE_RESUME_SECRET`.
Without engine v2, components do not get `N8N_ENGINE_*` secrets. When a layer
sets `N8N_ENABLED_MODULES`, `rig` adds `engine-v2` to it if the topology uses
engine v2.

Dotenv parsing follows the `dotenv` rules. A line that starts with `#` is a
comment. A leading `export ` is allowed, so lines from shell scripts can be
pasted.

### Managed vars

`rig create` generates these secrets once and writes them to `secrets.env`:
`N8N_ENCRYPTION_KEY`, `N8N_RUNNERS_AUTH_TOKEN`, `N8N_ENGINE_AUTH_SECRET`, and
`N8N_ENGINE_RESUME_SECRET`. The engine secrets are 32 characters or longer.

| Condition | Vars |
|---|---|
| Always (default) | `N8N_DIAGNOSTICS_ENABLED=false`, `N8N_LOG_LEVEL=info`, `OFFLOAD_MANUAL_EXECUTIONS_TO_WORKERS=true` (in queue mode, mains need no launcher) |
| Always | `N8N_USER_FOLDER=data/<component>`, `N8N_RUNNERS_BROKER_PORT`, `N8N_RUNNERS_MODE` |
| `main-N` | `N8N_PORT` |
| `worker-N` | `QUEUE_HEALTH_CHECK_ACTIVE=true`, `QUEUE_HEALTH_CHECK_PORT` |
| `db: sqlite` | `DB_TYPE=sqlite` |
| `db: postgres` | `DB_TYPE=postgresdb`, `DB_POSTGRESDB_HOST=127.0.0.1`, `DB_POSTGRESDB_PORT`, `DB_POSTGRESDB_USER`, `DB_POSTGRESDB_PASSWORD`, `DB_POSTGRESDB_DATABASE=n8n` |
| `queue: true` | `EXECUTIONS_MODE=queue`, `QUEUE_BULL_REDIS_HOST=127.0.0.1`, `QUEUE_BULL_REDIS_PORT` |
| `queue: false` | `EXECUTIONS_MODE=regular` |
| `mains > 1` | `N8N_MULTI_MAIN_SETUP_ENABLED=true` |
| `runners.mode: external` | `N8N_RUNNERS_BROKER_LISTEN_ADDRESS=127.0.0.1` |
| `engine: in-process` | `engine-v2` added to `N8N_ENABLED_MODULES`, `N8N_ENGINE_MODE=in-process`, `N8N_ENGINE_DATABASE_URL`, `N8N_ENGINE_DEFAULT_TYPE=v2` |
| `engine: remote`, main | As in-process, plus `N8N_ENGINE_MODE=remote`, `N8N_ENGINE_BASE_URL=http://127.0.0.1:3000`, `N8N_ENGINE_CONTROL_PLANE_PORT=3001`, `N8N_ENGINE_TLS_INSECURE_ALLOW_PLAIN_HTTP=true`, `N8N_STORAGE_PATH=data/storage`, `N8N_DEFAULT_BINARY_DATA_MODE=filesystem`, Redis vars |
| `engine: remote`, engine | `engine-v2` in `N8N_ENABLED_MODULES`, `N8N_ENGINE_PORT=3000`, `N8N_ENGINE_HOST=127.0.0.1`, `N8N_ENGINE_DATABASE_URL`, `N8N_ENGINE_CONTROL_PLANE_BASE_URL=http://127.0.0.1:3001`, `N8N_ENGINE_TLS_INSECURE_ALLOW_PLAIN_HTTP=true`, the shared storage vars, Redis vars. No control-plane-only keys (same rule as `engineContainerEnv` in `n8n-containers`) |
| Launcher | `N8N_RUNNERS_TASK_BROKER_URI=http://127.0.0.1:<broker>`, `N8N_RUNNERS_LAUNCHER_HEALTH_CHECK_PORT`, `N8N_RUNNERS_CONFIG_PATH` |
| Launcher (default) | `N8N_RUNNERS_AUTO_SHUTDOWN_TIMEOUT=0`, `N8N_RUNNERS_LAUNCHER_LOG_LEVEL=info`, `N8N_RUNNERS_GRACEFUL_SHUTDOWN_TIMEOUT=2`, `N8N_RUNNERS_SHUTDOWN_FORCE_KILL_MARGIN=1` |
| `runner-js` (default) | `NODE_FUNCTION_ALLOW_BUILTIN=crypto`, `NODE_FUNCTION_ALLOW_EXTERNAL=moment` |
| `runner-py` (default) | `N8N_RUNNERS_STDLIB_ALLOW=`, `N8N_RUNNERS_EXTERNAL_ALLOW=` |
| `runner-py` | `PYTHONPATH=<repo>/packages/@n8n/task-runner-python` |

The launcher keeps a stopping runner available until the runner grace period
ends (30 seconds by default). The short launcher defaults make a restart take
seconds.

`N8N_ENGINE_DATABASE_URL` points to the `n8n_engine` database
(`ENGINE_DATABASE` in `n8n-containers`) on the environment's Postgres. The
compose file creates this database with an init script.

Paths in managed vars are absolute. The table shows them relative to the
environment directory.

With `engineTls: true` (needs `engine: remote`), `rig` creates a CA and a
certificate for each plane in `engine-tls/` with `generateTlsCerts` from
`n8n-containers/helpers/tls-certs`. Both certificates name `localhost` and
`127.0.0.1`. The CA key is deleted after signing. The certificates last 30
days. `rig` renews them when they expire within two days. The main gets
`N8N_ENGINE_BASE_URL=https://…` and its files. The engine gets
`N8N_ENGINE_CONTROL_PLANE_BASE_URL=https://…` and its files. Neither gets
`N8N_ENGINE_TLS_INSECURE_ALLOW_PLAIN_HTTP`. The engine readiness probe uses
HTTPS with the CA, because the engine serves `/healthz` on its TLS port.

### Guardrails

- `rig env set` warns when a key overrides a managed var, for example
  `N8N_PORT` on `main-2`. It names the managed value and asks for
  confirmation. Without a terminal, it needs `--force`. Defaults do not cause
  a warning.
- `rig env set` rejects a value that breaks the topology, for example
  `EXECUTIONS_MODE=regular` in a queue environment. `--force` writes it
  anyway.
- `rig env set --on <x>` rejects an unknown role or component name and
  suggests the closest match.

### `rig env explain` output

```
$ rig env explain N8N_LOG_LEVEL --on worker-2
N8N_LOG_LEVEL = debug
  ✓ component  env/worker-2.env:3     debug
  ✗ role       env/worker.env:1       info
  ✗ managed    (rig)                  info
```

## Launcher

### Binary resolution

| Order | Source | Phase |
|---|---|---|
| 1 | `launcher.path` in the global config (or `RIG_LAUNCHER_PATH`). `rig` runs `make build` when `bin/main` is older than the Go sources | 1 |
| 2 | A release in `~/.cache/rig/launcher/<version>/task-runner-launcher`. On Linux x64 and arm64, `rig` downloads the release archive and checks it against the `.sha256` asset. Elsewhere (macOS), it downloads the source tarball of the tag and runs `go build -o … ./cmd/launcher`. The tarball has no published checksum; HTTPS from GitHub is the trust anchor | 2 |
| 3 | `n8nio/runners:<version>` container, for `image:` sources | 4 |

The release version is `launcher.version` from the global config, else
`ARG LAUNCHER_VERSION` in `docker/images/runners/Dockerfile.debian` of the
checkout, else a default in the code. So each checkout uses the launcher that
its runners image ships. `rig` writes the binary to a temporary directory and
renames it into the cache, so parallel processes never see a partial file.

Note: the launcher Go module is `task-runner-launcher`, not a GitHub path. So
`go install <module>@<version>` does not work. Build from the source tarball.

### Generated config

`rig` writes `launcher/<host>.json` before it starts `launcher@<host>`:

- `command` for the JS runner is the real path of the Node binary
  (`realpath(process.execPath)`). Do not use version manager shim paths, such
  as `fnm_multishells`, because they belong to one shell session.
- `args` point to `packages/@n8n/task-runner/dist/start.js` in the source
  repo, with `--disallow-code-generation-from-strings` and
  `--disable-proto=delete`.
- The Python runner uses `uv --directory packages/@n8n/task-runner-python run python src/main.py`.
- `health-check-server-port` comes from the port block of the host.
- `env-overrides` holds the resolved env of the `runner-js` or `runner-py`
  layers. The user does not manage `allowed-env`. `rig` sets a minimal list
  (`PATH`, `HOME`, `NODE_OPTIONS`, `GENERIC_TIMEZONE`).
- `languages` controls which runner types are in the config and which
  arguments the launcher gets.

A change to `runner-js.env` or `runner-py.env` regenerates the config and
restarts the affected launchers.

## Services

`rig services up` writes `compose.yaml` and runs
`<runtime> compose -p rig-<name> -f compose.yaml up -d --remove-orphans`, where
`<runtime>` is `docker` or `podman`.

### Container runtime

- `container.runtime` in the global config, or `RIG_CONTAINER_RUNTIME`, names
  the runtime. Without a value, the first command that needs containers
  (`rig create` with services, `rig up`, `rig run`, `rig services up`) checks
  which CLIs are installed: with one, `rig` saves it; with both, `rig` asks in
  a terminal (the running one is the default) and saves the answer. Without a
  terminal it uses a running one, Docker first, and does not save it. With
  none, it fails with an install hint.
- Commands that only read or stop (`status`, `stop`, `destroy`, `doctor`) do
  not ask. They use the runtime without saving it, and skip the containers when
  it does not run.
- `podman compose` delegates to a compose provider (`docker-compose` or
  `podman-compose`), and the providers differ in `--wait` and in the output of
  `compose ps`. So `rig` uses `compose` only for `up` and `down`. It waits for
  readiness, reads the status, and runs `psql` and `redis-cli` with
  `<runtime> inspect` and `<runtime> exec` on the fixed container names
  (`rig-<name>-<service>`). `inspect` prints the same JSON fields in both
  runtimes. Older Podman versions name the health field `Healthcheck`.
- Both runtimes resolve `host.docker.internal` for the tunnel. The
  `host-gateway` mapping covers Docker on Linux.
- `rig` manages the containers only in the runtime that is set. Stop the
  services before a switch.

- Images come from `TEST_CONTAINER_IMAGES` in
  `packages/quality/environments/containers/test-containers.ts`, unless
  `env.yaml` sets an image.
- Postgres data uses the named volume `rig-<name>-pgdata`. Postgres 18 and
  later images mount it at `/var/lib/postgresql`. Older images mount it at
  `/var/lib/postgresql/data`.
- Ports bind to `127.0.0.1`.
- Redis has no volume.
- Containers have the label `n8n-rig=<name>`.
- Each service has a healthcheck. `rig` waits up to 120 seconds until each
  container runs and is healthy, and fails early when one exits or is unhealthy.
- The Postgres init script creates the `n8n` and `n8n_engine` databases.

`rig run` and `rig up` start the services that the topology needs, if they
are not running.

## Process supervision

There is no daemon. Terminals coordinate through files in `state/`.

### Start order

1. Services are healthy.
2. `main-1` is ready. It runs the database migrations. Other n8n processes
   wait for it, so migrations do not race.
3. Other mains, workers, and the engine start.
4. Each launcher starts when its host is ready.

Readiness checks:

| Component | Check |
|---|---|
| `main-N` | `GET /healthz/readiness` on `N8N_PORT` returns 200 |
| `worker-N` | `GET /healthz/readiness` on `QUEUE_HEALTH_CHECK_PORT` returns 200 |
| `engine` | `GET /healthz` on `N8N_ENGINE_PORT` returns 200 |
| `launcher@<host>` | The launcher health port answers |

### `rig run` and dependencies

When a dependency of the component is not running, `rig run` asks:

```
main-1 is not running.
  › Start it in the background (logs: rig logs main-1 -f)
    Wait for it (start it in another terminal)
    Abort
```

`--yes` picks the first option. `--wait-deps` picks the second option without a
prompt. `--no-deps` skips the check.

### Runtime state

`state/<component>.json` holds: `pid`, `ownerPid` (the `rig` process that
shows the logs and stops the component on exit, or `null` in the background),
`ownerTty`, `startedAt`, `processStart`, `ports`, `source`, `inspect` (so a
restart from any terminal keeps the inspector), and `envHash` (a hash of the
resolved env and, for launchers, the launcher config). The hash leaves out the
parent shell and the one-off values of `rig run -e`, so another terminal does
not report drift for them.

- A component writes its output to its log file, not to a terminal. Each
  component runs in its own process group (`detached`).
- `rig` detects stale state: the pid is dead, or the start time from
  `ps -o lstart` differs.
- `rig stop` sends `SIGTERM` to the group. After the grace period it sends
  `SIGKILL`. The grace period is `N8N_GRACEFUL_SHUTDOWN_TIMEOUT` plus 5
  seconds. For a launcher it is the launcher's own formula
  (`N8N_RUNNERS_LAUNCHER_GRACEFUL_SHUTDOWN_TIMEOUT`, else grace plus two
  margins) plus 5 seconds.
- Ctrl+C or `q` in an owner terminal stops the components that it owns, in
  reverse start order. The containers keep running.

### Restarts from other terminals

Any terminal can stop and start a component with signals. The new process
keeps the owner of the old one. The owner terminal follows the log file by
name, so it shows the output of the new process.

- A terminal that shows a component takes ownership when the component has
  no live owner, for example after a background start.
- The owner terminal checks the state files every second. It reports
  `restarted by another terminal` or `exited`.

### Logs

- Each component writes to `logs/<component>.log`. The previous run moves to
  `logs/<component>.1.log`.
- The terminal follows the log files with file events (`fs.watch`: kqueue on
  macOS, inotify on Linux), so a line shows within about 1 ms. A poll every
  second catches missed events. The follower reads once after it arms a watch,
  because a watch only reports writes from the next event loop turn. It writes
  the lines of one read with one terminal write, and decodes UTF-8 across reads.
- The monitor checks components every second with `kill(pid, 0)`. It runs `ps`
  only once for each new pid, to confirm the start time.
- The owner terminal also prints the output with a colored prefix.
- A JSON log line (`N8N_LOG_FORMAT=json`) shows as `time level message
  [scopes] key=value`, without `file` and `function`. A multi-line message gets
  the prefix on each line. The file keeps the raw lines. `rig logs` formats
  only for a terminal, and `--raw` turns it off.

### Env drift and restarts

- The owner terminal watches the environment's `env/` directory, `env.yaml`,
  and `secrets.env`.
- On a change, it resolves the env of each running component and compares the
  hash with `envHash`.
- It prints the components with drift and waits for a key:

```
⟳ env changed for worker-1, worker-2: press r to restart, R to restart all
```

- `--auto-restart` restarts without the prompt.
- `rig env set` prints the affected components and asks whether to restart
  them now. `--restart` and `--no-restart` skip the question.
- `rig status` shows a `drift` column.
- A change in `env.yaml` that changes the component list (for example,
  `workers: 3`) is not a restart. `rig` prints the components to start or stop.

### `rig up` screen

```
rig · mm · postgres · queue · 2 mains · 2 workers · runners: js via launcher
main-1    │ Editor is now accessible via: http://localhost:5678
worker-1  │ n8n worker is now ready
── [o] open http://localhost:5678/  [r] restart drifted  [R] restart all  [1-6] show only some logs [0] all  [q] quit ──
 1● main-1  2● main-2  3● worker-1  4◌ worker-2⟳  5● launcher@worker-1 …  │ ? keys
```

- The last row is a status line: one entry for each component of the
  terminal, with its number, `●` ready, `◌` starting, `✖` exited, `○` stopped,
  and `⟳` for env drift. The rows above are a scroll region (`DECSTBM`), so the
  logs scroll and the line stays. `rig` resets the region on exit and on a
  resize redraws the line. No status line without a terminal, or with fewer
  than 8 rows.
- Keys: `o` opens the editor URL of `main-1` (`N8N_EDITOR_BASE_URL` when a
  layer sets it, else built from `N8N_PROTOCOL`, `N8N_PORT`, and `N8N_PATH`),
  `p` the public URL, `r` restarts drifted components, `R` all, `1`–`9` add or
  remove a component from the log filter, `0` clears the filter, `?` prints
  the keys, `q` quits. Events (ready, exited, restarting) always show.
- The monitor probes readiness once a second for components that this
  terminal did not start, so the status line is right after an adoption.
- Without a terminal, a failed start ends the session with exit code 1,
  because nobody can press `R`.

When the terminal closes during a shutdown, writes to it fail. `rig` ignores
these errors, so the shutdown still stops every component.

## Browser and editor

`browser` and `editor` in the global config. `rig` asks for each the first time
it needs it, in a terminal, and saves the answer.

- **Browser** (`o`, `p`, `rig open`): values `default` (the system opener:
  `open` or `xdg-open`), a known id (`chrome`, `firefox`, `safari`, `arc`,
  `brave`, `edge`, `chromium`, `vivaldi`, `opera`, `zen`, `orion`, `dia`), or
  any other macOS app name (`open -a <name>`) or Linux command. Discovery:
  `<App>.app` in `/Applications` and `~/Applications` on macOS, commands on
  `PATH` on Linux. The question lists the system default and the browsers
  found. With one browser or none, or without a terminal, `rig` uses the
  default and does not ask.
- **Editor** (`rig edit`, `rig env edit`, `rig config edit`): values `env`
  (`$VISUAL`, then `$EDITOR`, then `vi`), a known id, or a command line that
  gets the file as the last argument. GUI editors (`code`, `cursor`,
  `windsurf`, `zed`, `subl`, `webstorm`, `idea`) run with `--wait`. Terminal
  editors (`nvim`, `vim`, `hx`, `micro`, `nano`, `emacs -nw`) take over the
  terminal. On macOS, an app without its shell command still works: `rig` uses
  the CLI inside the bundle (for example
  `Visual Studio Code.app/Contents/Resources/app/bin/code`). The question
  lists `$VISUAL`/`$EDITOR` first when set. With one choice, `rig` saves it
  without a question. Without a terminal, it uses the first choice and does
  not save it.
- In `rig up` and `rig run`, the browser question pauses the keys and holds
  the log output until it has an answer.
- `RIG_APPLICATIONS_DIRS` replaces the app directories (tests use it).
- `rig doctor` shows both settings, or the browsers and editors it finds.

## Validation

`rig create`, `rig up`, and `rig run` check the topology before they start
anything.

| Rule | Message |
|---|---|
| `mains > 1` requires `queue: true` | `Multi-main needs queue mode. Add --queue.` |
| `queue: true` requires `db: postgres` | `Queue mode needs Postgres. Add --db postgres.` |
| `queue: true` adds Redis | (no error) |
| `mains > 1` without a license var | Warning: `Multi-main needs a license. Set N8N_LICENSE_ACTIVATION_KEY or N8N_LICENSE_CERT.` |
| `engine` rules | Call `assertEngineSupported` from `n8n-containers`. Map `remote` to `container` |
| `engine: remote` adds Redis | (no error) |
| `workers > 0` requires `queue: true` | `Workers need queue mode. Add --queue.` |
| `runners.via: launcher` requires a launcher binary | A release is the default. On macOS without Go: `The task runner launcher <version> needs Go to build on darwin.` |
| `runners.languages` has `python` | Check that `uv` is on `PATH` |
| Source has no build | `packages/cli/dist is missing. Run pnpm build.` |
| `dist` is older than the last commit | Warning only |

## Source resolution

| Source | Phase | Rule |
|---|---|---|
| `auto` | 1 | Walk up from the current directory to the `package.json` with `"name": "n8n-monorepo"`. Use `INIT_CWD` when `pnpm` changed the directory. Outside a checkout, use `repo` from the global config (phase 2) |
| `repo:<path>` | 2 | Use the given checkout, also when `rig` runs in another checkout |
| `npm:<version>` | 4 | Install `n8n@<version>` into `~/.cache/rig/n8n/<version>` and run from there |
| `image:<tag>` | 4 | Run n8n components as containers with the same layers, ports, and logs |

With `source: auto`, an environment does not store the repo path. The same
environment runs against any worktree you start it from. `rig status` shows the
source path of each running component. A session keeps its checkout when it
reloads `env.yaml`. `rig doctor` shows the checkout and where it came from.

## Global install (phase 2)

`pnpm rig install-global`:

1. Bundles `rig` into one `dist/rig.mjs` file with `tsdown`
   (`tsdown.config.ts`, `--config-loader unrun`, because the package is
   CommonJS). All dependencies bundle, including the `n8n-containers` imports,
   which have no testcontainers dependency. `typescript` stays out: the env
   var catalog loads it from the checkout that it reads (see below). The
   build also writes `dist/build.json`: version, commit, dirty flag, and time.
2. Copies the file to `~/.local/share/rig/versions/<id>/rig.mjs`. The id is
   `<version>+<commit>`. When the rig package has uncommitted changes, the id
   gets `.dirty.<time>`, so each such build is a new version.
3. Writes the `~/.local/bin/rig` shim: `exec node '<versions>/<id>/rig.mjs' "$@"`.
   It runs `node` from `PATH`, so a Node version switch applies. The shim has
   a marker line. `rig` does not replace a `rig` file without the marker,
   unless `--force` is given.
4. Records the id in `install.json` and keeps the last five versions.
5. Checks that `~/.local/bin` is on `PATH`, and that the shell does not find
   another `rig` first.

Do not use `pnpm link --global`. It ties the binary to one working tree, so a
branch switch or a deleted worktree changes or breaks the global binary.

- The checkout to build from: `--from <path>`, then the checkout of the
  current directory, then `repo` in the global config, then the checkout of
  the installed version, then (from source) the checkout of the running code.
- `rig self-update` rebuilds the same way. `rig self-update --rollback`
  points the shim to the version before the current one in the history.
- **Hand-off**: when the bundled `rig` runs inside a checkout that contains
  `packages/quality/environments/rig/bin/rig.mjs`, it runs that file with
  the same arguments and sets `RIG_DELEGATED_FROM=<global id>`. It forwards
  signals and exits with the code or signal of the child. When that checkout
  has no `node_modules`, the global version runs and prints a note.
  `RIG_NO_DELEGATE=1` turns the hand-off off. `rig --version` shows both
  versions.
- Hints name the command that works: `pnpm rig …` when pnpm runs the script
  (`npm_lifecycle_event=rig`), else `rig …`.
- **TypeScript in the bundle**: `env-catalog/extract.ts` has only a type
  import of `typescript`. At run time it loads `typescript` with
  `createRequire` from the rig package of the checkout, then `packages/cli`,
  then the checkout root, and accepts only a module with the JavaScript
  compiler API (TS 6, not the native TS 7).

## Relation to n8n-containers

| Shared | Separate |
|---|---|
| `TEST_CONTAINER_IMAGES` (image tags, `postgres-versions.json`) | Containers: `n8n-svc-*` and `n8n-stack-*` (testcontainers) vs `rig-<name>-*` (compose) |
| `assertEngineSupported`, `ENGINE_DATABASE` | Files: `pnpm services` writes `packages/cli/bin/.env`. `rig` never writes into the repo |
| | Ports: testcontainers maps random host ports. `rig` uses fixed ports |

Phase 1 imports these files directly:

- `packages/quality/environments/containers/test-containers.ts`
- `packages/quality/environments/containers/services/engine.ts`

They import only Node built-ins, `postgres-versions.json`, and
`helpers/tls-certs.ts`. Do not import other `n8n-containers` modules, because
they pull in testcontainers. Add a lint rule or a test that fails when a
`rig` import reaches `testcontainers`.

Phase 4 moves the service catalog into a module without testcontainers imports.
Both tools then read images and env builders from that module.

Add a link to `rig` in the `n8n-containers` README, and a link back.

## Package structure

```
packages/quality/environments/rig/
  package.json              # @n8n/rig, private, bin: rig
  README.md
  bin/rig.mjs               # starts src/cli.ts with tsx, forwards signals
  tsdown.config.ts          # the bundle for the global install
  src/
    cli.ts                  # citty entry point, error and usage output
    environment.ts          # RigEnv: loads an environment, components, resolution
    errors.ts               # RigError: message and hint for the user
    source.ts               # monorepo detection, build checks
    commands/
      common.ts             # shared flags, stop and restart helpers, drift prompt
      lifecycle.ts          # create, ls, use, reset, destroy
      running.ts            # up, run, stop, restart, services, status, logs, open
      env.ts                # env set, unset, edit, ls, explain
      env-browse.ts         # env browse, the interactive editor
      layers.ts             # layer names, layer files, managed key conflicts
      tools.ts              # exec, print, psql, redis-cli, config
      doctor.ts             # rig doctor
      profile.ts            # profile ls, on, off
      clone.ts              # clone
      self.ts               # install-global, self-update, --version
      wizard.ts             # interactive rig create
    config/
      paths.ts              # XDG paths, EnvPaths
      global-config.ts
      env-yaml.ts           # Zod schema for env.yaml
      presets.ts
    topology/
      components.ts         # components (with direct runners), port blocks, slots, start stages
      slots.ts              # free slots, the environment that holds a port
      validate.ts
    env-catalog/
      extract.ts            # @Env discovery with the TypeScript compiler API
      catalog.ts            # cache, lazy load of the extractor
      search.ts             # ranking and short descriptions
    env/
      dotenv.ts             # parse and edit while keeping comments and order
      managed.ts            # defaults and wiring
      resolve.ts            # layer merge, explain traces, hashes
      secrets.ts
    services/
      compose.ts            # compose.yaml generation, compose up/down, inspect, exec
      runtime.ts            # Docker or Podman: selection, first-use question, checks
      tunnel.ts             # Cloudflare tunnel URL and token
      engine-tls.ts         # engine TLS certificates
    runtime/
      preflight.ts          # validation, build checks, launcher build, services
      session.ts            # foreground session: start order, keys, drift, monitor
      supervisor.ts         # spawn, stop, restart, adopt, log followers
      state.ts              # state files, stale detection
      health.ts             # readiness probes, port checks
      logs.ts               # log rotation, tail, file follower
      split.ts              # rig up --split with tmux
    launcher/
      binary.ts             # launcher source: checkout build, release download or source build
      config.ts             # launcher-config.json generation
    self/
      build-info.ts         # bundle build info, version ids, the command name for hints
      install.ts            # bundle build, versions directory, shim, rollback, PATH check
      delegate.ts           # hand-off from the global rig to the checkout rig
    ui/
      output.ts             # messages, prefixed lines, tables
      prompt.ts             # @clack/prompts wrappers (select, multiselect, text, confirm)
      status-line.ts        # the status line at the bottom of rig up
      log-format.ts         # readable JSON log lines
  test/
```

Root `package.json` script:

```json
"rig": "node packages/quality/environments/rig/bin/rig.mjs"
```

In a package directory, `pnpm rig` looks for a script in that package. Use
`pnpm -w rig` there. `bin/rig.mjs` keeps `INIT_CWD`, so `rig` finds the
checkout or worktree you run it from.

Dependencies: `citty`, `zod`, `yaml`, `picocolors`, `chokidar`, and `tsx` from
the pnpm catalog, `typescript` from the `typescript-tooling` catalog,
`@clack/prompts` 1.x for prompts, plus `@n8n/utils` (`sleep`) and
`n8n-containers` from the workspace. `tsdown` from the `typescript` catalog
builds the bundle.

`dotenv.ts` edits files in place. `rig env set` changes one line and keeps
comments, order, and commented-out keys. When a commented-out line has the
same key, `rig env set` uncomments and updates that line.

## Testing

- Unit tests (Vitest, `test/`): env-yaml schema, presets, validation, port
  blocks, launcher selection, start stages, layer resolution and traces,
  engine key filters, dotenv parsing and in-place edits, compose generation,
  launcher config generation.
- Env var catalog (`test/env-catalog.test.ts`): extraction from a fixture
  through the real compiler API (enums through aliases, enum lists, lists,
  numbers, booleans, JSON, duplicates), and search ranking.
- Guard test (`test/imports.test.ts`): runtime imports from `n8n-containers`
  must not reach `testcontainers`. Type-only imports do not count.
- Manual end-to-end checks for phase 1: `sqlite` (JS runner only), `queue`,
  and `engine-remote` presets with `rig up`; `rig run` in two terminals with a
  background dependency; `rig env set --restart` and `rig restart` from another
  terminal; quit with Ctrl+C. The `multi-main` preset needs a license: without
  one, `main-1` exits with `FeatureNotLicensedError`, and `rig` warns before
  the start.
- The wizard (preset and custom flows, name validation, Ctrl+C) and the `o`
  and `q` keys were tested in a pseudo-terminal.
- `rig env browse` was tested in a pseudo-terminal: search and ranking, an
  enum, an enum list, a number with a guardrail, a layer change, a boolean,
  and Ctrl+C in a value prompt and in the search.
- Log follower (`test/logs.test.ts`): latency without the fallback poll, a
  log file that a restart replaces, a UTF-8 character split across reads, and
  batches for a burst of lines.
- Tunnel (`test/tunnel.test.ts`): the short form, validation, compose output
  for quick and named tunnels (the token stays out of the file), URL storage,
  and the managed vars. Manual: a real quick tunnel served `/healthz/readiness`
  and the editor over HTTPS, kept its URL across two `rig up` sessions, and
  `p` opened it.
- Global install (`test/self.test.ts`): version ids, install with shim and
  build info, rollback, pruning to five versions, an existing foreign `rig`
  file, no hand-off from source, and a real `tsdown` build to a temporary
  directory (one file, no `typescript` or `testcontainers` import).
- Sources (`test/source.test.ts`): `auto` and `repo:<path>`, the global
  `repo` fallback, launcher version precedence, and a checksum mismatch with a
  mocked download.
- Manual for phase 2: `install-global` in a sandbox (`RIG_*_DIR`,
  `RIG_BIN_DIR`); outside a checkout, `rig up` with `repo` from the global
  config, the launcher built once from the 1.6.0 source tarball on macOS, and
  `env browse` from the bundle (TypeScript from the checkout); inside a
  checkout, the hand-off, `RIG_NO_DELEGATE`, `self-update`, `--rollback`, and
  Ctrl+C through shim, bundle, and checkout rig. The Linux download ran in a
  `node:24-slim` container: download, checksum, cache hit, and an unknown
  version.
- Phase 3 unit tests: `test/layers.test.ts` (profile order, profiles that are
  off, new profile targets, global and local secrets, mode 0600, `env diff`),
  `test/slots.test.ts` (ports of slot 2 for n8n, engine, and services, compose
  ports, free slots), `test/runners.test.ts` (no launchers or runners for
  mains in the queue presets, the `false` override, direct runner components, roles, affected
  layers, restart with the host, runner env, engine TLS env and HTTPS probe,
  inspector ports, VS Code configurations), `test/log-format.test.ts` (JSON
  lines, the status line cut). `test/setup.ts` points `RIG_*_DIR` at a
  temporary directory, so no test reads the real `~/.config/rig`.
- Manual for phase 3, in a sandbox: profiles, global secrets, `--secret`,
  `env diff` across environments, `clone` with an automatic slot; direct JS and Python runners registered with the broker, a runner
  restart from another terminal, a main restart that restarts its runners;
  `--inspect` (`/json/list` answered, kept after a restart); JSON log lines;
  the status line and the filter keys in a pseudo-terminal, rendered with
  `pyte` (logs scroll above a fixed last row); engine TLS on slot 2 (health
  over HTTPS, 401 without a client certificate); two environments in parallel
  and the port conflict hint; a failed start without a terminal exits with 1.
  `--split` ran against a fake `tmux` that records its arguments, and one pane
  command ran by hand (it waited for `main-1`). Not done: a run with real tmux,
  because tmux is not installed on the test machine.
- Container runtime (`test/runtime.test.ts`): fake `docker` and `podman` CLIs
  on `PATH`. The only installed runtime is saved, both installed without a
  terminal picks the running one and does not save it, Docker wins a tie, none
  fails, the saved value and `RIG_CONTAINER_RUNTIME`, and an invalid value.
  Manual with Podman 5.8 (compose provider `docker-compose`): the first-use
  question in a pseudo-terminal saved Podman; `services up`, `status`, and
  `psql` through `podman exec`; `rig up` of the queue preset with Postgres and
  Redis in Podman; a quick tunnel served `/healthz/readiness` over HTTPS through
  `host.docker.internal`; `destroy` removed the containers and the volume. The
  Docker path ran the same checks without a regression.
- Browser and editor (`test/integrations.test.ts`): macOS app discovery and
  `open -a`, Linux commands on `PATH`, no question without a terminal, the CLI
  inside a macOS app bundle, `--wait` and quoting, `$EDITOR`, and the choice
  without a terminal. Manual in a pseudo-terminal with fake `open` and `vim`:
  the browser question from `rig open` (Firefox, `open -a Firefox <url>`), the
  editor question from `rig env edit`, `rig edit` with the saved editor, and
  the browser question from `o` during `rig up` (the keys worked again after
  it).
- Not done: an automated integration test with Docker.

## Implementation TODO

### Phase 1: MVP (`pnpm rig`, inside a checkout)

- [x] Package scaffold `@n8n/rig`, root `rig` script, lint, typecheck, Vitest config
- [x] XDG paths and global config with `launcher.path`
- [x] `env.yaml` Zod schema and presets
- [x] Topology validation, with `assertEngineSupported` reused
- [x] Monorepo detection (`source: auto`, `INIT_CWD`)
- [x] Component list and port allocation
- [x] Managed vars for SQLite, Postgres, queue, multi-main, engine in-process, engine remote
- [x] Secret generation in `secrets.env`
- [x] Dotenv parse and in-place edit
- [x] Layer resolution with explain traces
- [x] Compose generation, Postgres init script, `rig services up|down`
- [x] Launcher binary from `launcher.path` and generated launcher configs
- [x] Process spawn with process groups, state files, stale detection
- [x] Start order and readiness checks
- [x] Log files and prefixed terminal output
- [x] `rig create` with flags, presets, and an arrow-key wizard with a custom topology flow
- [x] `rig ls`, `use`, `reset`, `destroy`
- [x] `rig run` with dependency prompt, `-e`, `--yes`, `--no-deps`
- [x] `rig up` with `o`, `r`, `R`, `q` (`o` and `q` tested in a pseudo-terminal)
- [x] `rig stop`, `restart` (with signals, not control files), `status`, `logs`, `open`
- [x] `rig env set|unset|edit|ls|explain` with guardrails
- [x] Env drift detection and restart prompt, `--auto-restart` (`--auto-restart` not tested yet)
- [x] `rig exec`, `rig print --format shell|dotenv|json`, `rig psql`, `rig redis-cli`
- [x] Port-in-use check
- [x] README and links to and from the `n8n-containers` README
- [x] Guard test: no `rig` import reaches `testcontainers`
- [x] `rig config get|set` (added during implementation)
- [x] `rig run` also runs the launchers of its processes, `--no-launcher` (added during implementation)
- [x] Owner adoption of components without a live owner (added during implementation)
- [x] `rig env browse`: interactive editor with the env var catalog from `@Env` (added after the MVP)
- [x] Readable output for `N8N_LOG_FORMAT=json` in the terminal (done in phase 3)

### Phase 2: global install

- [x] `tsdown` bundle. `typescript` stays external and loads from the checkout
- [x] `rig install-global`, shim, `PATH` check
- [x] `rig self-update`, `--rollback`
- [x] Hand-off to the repo version, `RIG_NO_DELEGATE`, `--version` output
- [x] `source: repo:<path>` and `repo` in the global config
- [x] Launcher build from the release source tarball into `~/.cache/rig/launcher`
- [x] Launcher release download on Linux with SHA-256 check
- [x] `rig doctor`
- [x] `rig config unset`, `launcher.version`, and the launcher version from the runners image (added during implementation)

### Phase 3: developer experience

- [x] `rig up` status line and the other keys (filter `1`–`9`/`0`, `?`)
- [x] Readable output for `N8N_LOG_FORMAT=json`
- [x] `rig up --split` with tmux (not tested with real tmux)
- [x] `--inspect` and `--inspect-brk` with the port at block +5
- [x] `runners.via: direct` with `runner-js@<host>` and `runner-py@<host>`
- [x] `rig print --format vscode`
- [x] Profiles and `rig profile on|off|ls`
- [x] Global secrets and `rig env set --secret`
- [x] `rig env diff`
- [x] `rig clone`
- [x] Mains in queue mode get no launcher: `OFFLOAD_MANUAL_EXECUTIONS_TO_WORKERS=true` by default in every environment (added after phase 3)
- [x] Port slots for parallel environments
- [x] Optional TLS between engine planes (`engineTls`)

### Phase 4: more sources and services

- [ ] Service catalog without testcontainers imports in `n8n-containers`
- [x] Cloudflare tunnel for a public HTTPS URL: quick and named tunnels (added early)
- [ ] Optional services: mailpit, ngrok, observability
- [ ] `source: npm:<version>`
- [ ] `source: image:<tag>` and minimum-version checks for topology rules
- [ ] `n8nio/runners` launcher containers
- [ ] Webhook processors (`webhook-N`)

### Container runtimes

- [x] Podman as an alternative to Docker: `container.runtime`, first-use detection and question
- [x] Browser and editor settings with discovery and a first-use question; `rig edit`, `rig config edit`

### Optional

- [ ] Ask the launcher team for darwin release builds

## Open questions

Resolved:

- The engine data plane hosts its own task broker, so it gets a launcher.
  Runners register with it (checked with the `engine-remote` preset).
- The engine exposes `GET /healthz` on its HTTP port
  (`packages/@n8n/engine/src/server/create-engine-server.ts`).
- The worker server listens on `QUEUE_HEALTH_CHECK_PORT`
  (`packages/cli/src/scaling/worker-server.ts`).
