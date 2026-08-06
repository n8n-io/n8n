---
name: hex
description: >
  Programmatically interact with the Hex data analytics platform (https://hex.tech). Create projects,
  add python and sql cells to notebooks, write queries against data connections, build
  stakeholder-facing dashboards, and hand off dashboard and app builds to the Hex agent.
allowed-tools: Bash(hex:*) Bash(jq:*)
metadata:
  author: hex
  version: "1.2026.07.28"
---

# Hex CLI -- Agent Skill

The `hex` CLI manages Hex projects, cells, runs, data connections, and workspace resources from the command line. Use it to automate Hex workflows, create and modify notebook cells, trigger runs, and inspect workspace state.

Hex projects include notebook (draft) and app (published) views. Users can create and modify cells in a project. **Draft notebook execution** uses `hex project run` (only `--no-cache`). **Published app runs** with input parameters, timeouts, and wait/async behavior use `hex app run`. Hex uses Python and SQL to execute code and query data connections.

Always pass `--json` when you need to parse output programmatically. JSON mode returns structured data; text mode is for human display only.

## Prerequisites

Before running any command, verify the user is authenticated:

```bash
hex auth status
```

If not logged in, prompt the user to run:

```bash
hex auth login
```

In an interactive terminal, this asks which Hex instance to log in to. When run non-interactively (e.g. by an agent, with `--json`, or without a TTY) it does **not** prompt and defaults to `app.hex.tech`. For any other instance, pass the host explicitly:

```bash
hex auth login --hostname eu.hex.tech
```

All SQL cells require a data connection (usually a data warehouse or sql database). Users should already have data connections configured. Before starting a complex workflow, query for available data connections and prompt the user to ask which one they would like to use:

```bash
hex connection list
```

If a user is using this skill in a repo that defines a warehouse or database schema, clarify if the data connection matches the desired schema. Use their local schema as context in authoring notebook cells queried against that connection.

Hex project YAML exports use the public JSON Schema at `https://static.hex.site/hex-file-schema.json`. For files named `*.hex.yaml`, schema-aware editors should discover this automatically through SchemaStore. When editing exported YAML, preserve `schemaVersion` and avoid changing generated IDs unless the user intentionally wants to create new objects on import.

## Global Flags

These flags work on every command:

| Flag               | Short | Description                                |
| ------------------ | ----- | ------------------------------------------ |
| `--json`           |       | Output as JSON (for scripting and parsing) |
| `--verbose`        | `-v`  | Show verbose output for debugging          |
| `--quiet`          | `-q`  | Suppress non-essential output              |
| `--no-color`       |       | Disable colored output                     |
| `--profile <name>` |       | Use a specific profile for this command    |

## Profile Management

Profiles can be used if the user has multiple Hex accounts or workspaces. Most users just have a single `default` profile.

```bash
# List all profiles; the active profile is marked with *
hex auth status

# See ### auth for full flags (hostname, web-hostname, token-from-env, etc.)
hex auth login [profile]
hex auth switch <profile>
hex auth logout [profile] [--delete]
hex auth rename <new_name>
```

## Command Reference

### auth

```bash
hex auth login [profile]   # Log in (optional profile name). OAuth device flow by default.
  [-H, --hostname <url>]   # Hex app/API base URL for this profile (e.g. https://app.hex.tech).
                           # If omitted in an interactive shell, prompts to choose an instance
                           # (app.hex.tech / eu.hex.tech / hc.hex.tech for HIPAA / Other);
                           # defaults to app.hex.tech otherwise.
  [-u, --update]           # Overwrite existing profile hostname / storage settings
  [--insecure-storage]     # Plain-text credential storage (not keyring)
  [--no-switch]            # Do not switch active profile after login
  [--token-from-env [VAR]] # Non-interactive: token from HEX_CLI_LOGIN_TOKEN or VAR

hex auth logout [profile] [--delete]   # Log out; --delete removes the profile from config
hex auth logout --all                 # Log out of every profile

hex auth status [profile]             # Show auth status (all profiles if name omitted)

hex auth switch <profile>             # Set the active profile

hex auth rename <new_name>            # Rename the current profile
```

### projects

```bash
# Create a project
hex project create <title> [-d <description>]

# List projects (default limit 25, supports cursor pagination)
hex project list [-n <limit>] [--after <cursor>] [--before <cursor>] \
  [--sort-by <created_at|last_edited_at|last_published_at>] [--sort-direction <asc|desc>] \
  [--status <published|draft|archived>] [--category <name>] \
  [--collection-id <uuid>] [--creator-email <email>] [--owner-email <email>] \
  [--include-archived] [--include-components] [--include-sharing] [--include-trashed]

# Get project details
hex project get <project_id>

# Open project in browser
hex project open <project_id>

# Run the draft notebook (full notebook recompute). Only SQL cache control is supported.
hex project run <project_id> [--no-cache]

# Export / import project as YAML (version defaults to draft)
hex project export <project_id> [--version <draft|version_number>] [-o <path>]
hex project import <file>
```

### app

```bash
# Run the published app (parameterized runs, wait/timeout). Not the same as `hex project run`.
hex app run <project_id> \
  [-i <key=value> ...] \
  [--input-file <path>] \
  [--no-cache] \
  [--wait | --no-wait] \
  [--timeout <duration>] \
  [--poll-interval <duration>]
```

With `--json`, the CLI waits for the run to finish by default unless `--no-wait` is passed. In plain text mode, pass `--wait` to block until completion.

### cells

```bash
# List cells in a project (default limit 25, supports cursor pagination)
hex cell list <project_id> [-n <limit>] [--after <cursor>] [--before <cursor>]

# Get a single cell
hex cell get <cell_id>

# Create a cell (-t is short for --cell-type)
hex cell create <project_id> \
  -t <code|sql|markdown> \
  -s <source> \
  [-l <label>] \
  [--data-connection-id <uuid>] \
  [--output-dataframe <name>] \
  [--after-cell-id <uuid>] \
  [--parent-cell-id <uuid>] \
  [--child-position <first|last>]

# Update a cell (source / connection only; cell type is not changed via the CLI)
hex cell update <cell_id> \
  [-s <source>] \
  [--data-connection-id <uuid>] \
  [--output-dataframe <name>]

# Delete a cell
hex cell delete <cell_id>

# Run a cell and its dependencies
hex cell run <cell_id> [--dry-run]
```

### connections

```bash
# List data connections (default limit 25, supports cursor pagination). There is no CLI filter by connection type — use `--json` and filter (e.g. `jq`) on `connection_type` if needed.
hex connection list [-n <limit>] [--after <cursor>] [--before <cursor>] \
  [--sort-by <created_at|name>] [--sort-direction <asc|desc>]

# Get connection details
hex connection get <connection_id>
```

### collections

```bash
# List collections (default limit 25, supports cursor pagination)
hex collection list [-n <limit>] [--after <cursor>] [--before <cursor>] \
  [--sort-by <name>]

# Get collection details
hex collection get <collection_id>
```

### groups

IMPORTANT: stop and ask permission from a user before making any changes to groups.

```bash
# List groups (default limit 25, supports cursor pagination)
hex group list [-n <limit>] [--after <cursor>] [--before <cursor>] \
  [--sort-by <created_at|name>] [--sort-direction <asc|desc>]

# Get group details
hex group get <group_id>

# Create a group
hex group create <name>

# Delete a group
hex group delete <group_id>
```

### users

```bash
# List users (default limit 25, supports cursor pagination)
hex user list [-n <limit>] [--after <cursor>] [--before <cursor>] \
  [--sort-by <name|email>] [--sort-direction <asc|desc>] \
  [--group-id <uuid>]

# Get user details (by ID or email)
hex user get <user_id_or_email>
```

### config

```bash
# Show all configuration
hex config list

# Get a config value
hex config get <key>

# Set a config value
hex config set <key> <value>

# Show config file path
hex config path
```

Config keys: `update_check`, `logging_enabled`, and `profiles` (read-only in `config get` / `config list`; use `hex auth` to change profiles).

### run

```bash
# List recent runs for a project
hex run list <project_id> [-n <limit>]

# Inspect a run (use --watch to poll until a terminal status)
hex run status <project_id> <run_id> [--watch] [--poll-interval <duration>]

# Cancel a run
hex run cancel <project_id> <run_id>
```

### threads

Threads send a prompt to the Hex agent, which plans and builds inside a project. Read "Prompting the Hex Agent" below before writing the prompt.

```bash
# Start a thread on an existing project, or have the agent create one
hex thread create <prompt> [--project <project_id> | --new-project] [--muted]

# Threads run async; poll until status is IDLE (or ERROR)
hex thread get <thread_id>

# Gets messages for a given thread. Within a page, messages are chronological (oldest
# first). By default the most recent page is returned; use --before for older messages and --after for newer ones.
hex thread messages <thread_id> [-n <limit>] [--after <cursor>] [--before <cursor>]

# Iterate in the same thread with focused follow-ups
hex thread continue <thread_id> <prompt>

# List threads in the workspace (requires Manager role or higher)
hex thread list [-n <limit>] [--after <cursor>] [--before <cursor>] \
  [--source <hex|slack|mcp|public_api>] \
  [--user-id <id>] \
  [--type <threads|notebook|modeling>] \
  [--roles <admin,manager,editor,explorer,member,guest>] \
  [--warnings <data_limitation,user_doubt,missing_context,other>] \
  [--topic-ids <id1,id2>] \
  [--resource-ids <id1,id2>] \
  [--has-feedback <true|false>] \
  [--num-days <n>]
```

`--roles`, `--warnings`, `--topic-ids`, and `--resource-ids` accept comma-separated values. `--resource-ids` filters to threads that accessed any supplied resource reference. `--has-feedback true` returns only threads with feedback, `false` only threads without. `--num-days` filters to threads created within the last N days. Use `hex context topic list` to discover topic IDs for `--topic-ids`; `hex thread get` displays resource IDs for a thread.

`thread list` and `thread get` also return thread metadata for triage and analytics — credits used, model, topics, warnings (with generation time), user feedback, and the thread summary/intent. `thread get` additionally lists resources accessed by the agent, including each resource's ID, name, and type. Use `--json` to consume these fields programmatically.

`thread create` and `thread continue` require the headless agent threads feature to be enabled for the workspace; if they are missing from `hex thread --help`, the feature is not available yet.

`--muted` hides non-project-backed threads from aggregated UI surfaces and user-facing statistics. The thread remains individually viewable. For project-backed threads, the flag is accepted but ignored by the server.

### suggestions

Suggestions are automatically generated proposed context changes that can include updates to guides, workspace context, data warehouse descriptions, or endorsements to improve agent performance in Hex. Agents and users can review these proposed changes, apply them in their preferred tool of choice, and then mark the suggestion as completed or dismissed.

```bash
# List suggestions (shows open suggestions only by default)
hex suggestion list [-n <limit>] [--after <cursor>] [--before <cursor>] \
  [--sort-by <created_date|evidence_count|last_source_added_date>] \
  [--sort-direction <asc|desc>] \
  [--status <open|completed|dismissed>]

# Get a suggestion's details, including associated warnings and proposed changes
hex suggestion get <suggestion_id>

# Trigger a review agent run on a suggestion to regenerate its proposed changes
# This is typically helpful in cases where existing proposed changes have gone stale
# due to existing workspace context that has changed since the review agent was last run.
hex suggestion run-review <suggestion_id>

# Mark a suggestion as completed or dismissed
hex suggestion update <suggestion_id> \
  --status <completed|dismissed> \
  [--dismiss-reason <reason>]

# Mark a proposed change as completed or dismissed
hex suggestion change update <suggestion_id> <change_id> \
  --status <completed|dismissed> \
  --update-target <file_update|data_warehouse_update> \
  [--dismiss-reason <reason>]
```

Typical workflow:

- List open suggestions using `hex suggestion list`
- Fetch details of an individual suggestion using `hex suggestion get` to inspect the associated warnings and proposed changes
- Review the proposed changes and, for each change, either apply it externally and mark it `completed`, or ignore it and mark as `dismissed`, using `hex suggestion change update`.
- After reviewing all proposed changes, you can close the suggestion by marking it as either `completed` or `dismissed` using `hex suggestion update`

### context

Context topics are the workspace-defined labels used to categorize agent threads. Use `context topic list` to discover topic IDs, then pass them to `hex thread list --topic-ids`.

```bash
# List thread topics (default limit 25, supports cursor pagination)
hex context topic list [-n <limit>] [--after <cursor>] [--before <cursor>]
```

Resources like guides and semantic projects are considered "context" for the Hex Agent. When these resources are managed externally, they can be synced to the Hex workspace using `context preview` and `context publish` commands.

A Hex context config file should exist in the repository (usually at the root, named `hex_context.config.json`). The file defines where to find the resources in the local file system.

| Property                            | Type                                   | Required | Description                                                               |
| ----------------------------------- | -------------------------------------- | -------- | ------------------------------------------------------------------------- |
| `"guides"`                          | `object[]`                             | No       | A list of guide configurations.                                           |
| `"guides.$"`                        | One of `{ "path" }` or `{ "pattern" }` | No       | A guide file configuration.                                               |
| `"guides.$.path"`                   | `string`                               | Yes      | The relative path to the file.                                            |
| `"guides.$.hexFilePath"`            | `string`                               | No       | The desired file path for the resource in the Hex workspace.              |
| `"guides.$.pattern"`                | `string`                               | Yes      | A relative glob pattern to match files.                                   |
| `"guides.$.transform"`              | `object`                               | No       | Options to transform the file path(s).                                    |
| `"guides.$.transform.stripFolders"` | `boolean`                              | No       | Whether to rewrite the file path(s) to only include the file name.        |
| `"semanticProjects"`                | `object[]`                             | No       | A list of semantic project configurations configurations.                 |
| `"semanticProjects.$.id"`           | `string`                               | Yes      | The unique ID (uuid) of the semantic project.                             |
| `"semanticProjects.$.path"`         | `string`                               | Yes      | The relative path to the directory containing the semantic project files. |

A semantic project must be created in Hex before it can be synced with the CLI. The user can obtain the unique ID from the setup flow or at anytime afterwards: (App) Home > Context Studio > Models > Table Row > Three-dots button > "Copy ID" or "View Sync instructions". This value must be the unique uuid and _not_ the unique SQL identifier.

There can be multiple guide configuration entries and multiple semantic projects configured.

Example:

```json
{
  "guides": [
    {
      "pattern": "hex-guides/**/*.md",
      "transform": {
        "stripFolders": true
      }
    }
  ],
  "semanticProjects": [
    {
      "id": "<uuid>",
      "path": "path/to/dir"
    }
  ]
}
```

Once changes are made to the resource files (e.g. guide files or semantic model files), they can be previewed _before_ publishing to the broader workspace.

```bash
# Preview the changes. Outputs an unique preview ID and an app URL where the user can view changed files, view compiled resources (semantic datasets, views, project files), and create test threads. The preview id can also be passed to some evals commands.
hex context preview
  [--config-path <path>]         # Optional, path to the context config file (default: "./hex_context.config.json")
  [--title <title>]              # Optional, a short, human-readable title for the preview
  [--description <description>]  # Optional, a long, human-readable description for the preview
  [--force]                      # Optional, overwrite guide files if they already exist from a different source (default: false)
  [--no-prune]                   # Optional, disable pruning of guides that are no longer present in the config (default: false)

# Publish the changes to the workspace.
hex context publish <preview_id> # Required, a preview ID from the `hex context preview` command (or `-` to use the last preview created in this session)
  [--title <title>]              # Optional, a short, human-readable title for the new version
  [--description <description>]  # Optional, a long, human-readable representation for the version
```

### evals

Evals measure agent quality. An eval **suite** is a set of cases (a prompt plus grading rubrics) defined in a YAML or JSON file; a **run** executes the suite against your workspace context and grades each case pass/fail. Use runs to check whether a context change (guides, warehouse descriptions, endorsements) improves or regresses agent behavior — optionally against a context preview before you publish it.

```bash
# Start a run from a local suite definition file (YAML or JSON). Prints a browser URL for the run.
hex eval run <path> \
  [--preview-id <id>] \                # Run against a context preview changeset instead of published context
  [--model <name> --effort <level>] \  # Override the suite's model + effort for this run (pass both together; falls back to the suite's modelSelection, then the workspace default)
  [--only <case_id>...] \              # Run only these cases
  [--except <case_id>...]              # Run every case except these (mutually exclusive with --only)

# Get a run's details: status, pass/fail rates, and per-case results
hex eval get <run_id>

# Cancel a running run
hex eval cancel <run_id>

# List recent runs (default limit 25, supports cursor pagination)
hex eval list [-n <limit>] [--after <cursor>] [--before <cursor>] \
  [--suite-id <id>] \                  # Filter to runs of a specific suite
  [--user-id <id>]                     # Filter to runs triggered by a specific user

# List public IDs of existing eval suites (default limit 25, supports cursor pagination)
hex eval suite ids [-n <limit>] [--after <cursor>] [--before <cursor>] \
  [--search <string>]

# Get a single case run's details: prompt, rubric grades, and the agent thread(s) it ran
hex eval case get <case_id>
```

Runs are asynchronous. Poll `hex eval get <run_id>` until `status` is `COMPLETED` (or `CANCELLED` / `ERRORED`), then drill into an individual case with `hex eval case get <case_id>` using a case-run ID from the `hex eval get` output.

`hex eval run` requires the evals feature to be enabled for the workspace; if it is not, the run is rejected with an error that evals are not enabled. Reading and cancelling existing runs is not gated.

### Other commands

`hex guide` and `hex install` are available for specialized workflows. Use `hex help` or `hex <command> --help` for the authoritative flag list.

## Prompting the Hex Agent

`hex thread` is an agent-to-agent handoff: the Hex agent is a specialist, not a code generator. It plans the app, writes the cells, and enforces Hex's house style (or the organization's styles specified in design.md Org Guide) for charts, layout, formatting, and more.

Your job in the prompt is to scope the app. The Hex agent's job is to design and build it. Over-specified prompts produce worse apps.

### Include — the agent cannot infer these

- **The user's request, in their own words** — quote it rather than translating it into a spec of your own.
- **Audience and the business question** the app answers ("for the customer success team: is our refund rate trending up?").
- **Hard constraints only**: a mandated brand color (e.g. "Read the design.md Org Guide for brand colors"), a required filter, cells it must not touch.

Optional – these are helpful if you already know them:

- **The metrics and breakdowns that matter**, roughly in priority order.
- **Data context**: which cells/dataframes feed the app, and any column semantics the agent could get wrong ("rate columns are fractions — format as percents, do not multiply by 100").

### Leave to the Hex agent — it should own these decisions

- Chart styling: colors and series color maps, heights, axis titles, gridlines, legend placement, line smoothing, data labels.
- Chart types, unless the type is itself a requirement. Describe the comparison ("monthly trend", "countries ranked by rate") and let the agent pick the encoding.
- Cell-by-cell construction steps and ordering. Describe the finished app, not the build sequence ("STEP 1… STEP 2…").
- Markdown scaffolding. Hand over the narrative; the agent writes the headers and copy, unless the user already knows the exact story to tell.

A rule of thumb: if the user said it, include it. If you inferred it, leave it out.

### Avoid the one-giant-prompt failure mode

A scoped app description one-shots well. A 60-line spec with per-chart styling does not: requirements get silently dropped when too many are packed into one prompt. If the user has many precise requirements, send the scoped build first, review, then apply them as `hex thread continue` follow-ups, one concern per message.

### Put durable preferences in guides, not prompts

If the user or their org has standing dashboard preferences, do not restate them in every prompt. Put them in a workspace guide, so every agent run inherits them — including iterations the user makes later inside Hex, where your prompt is no longer in the loop. For specific design guidance (brand palette, typography, chart conventions), suggest a `design.md` guide.

You can push guides from the CLI: `hex guide preview design.md` returns a preview link and a preview_id, and `hex guide publish <preview_id>` deploys it. Published guides apply to the whole workspace — get the user's confirmation before publishing.

### Example

Over-determined (fights the agent, gets dropped):

> STEP 3 — add a DUAL-AXIS chart: left Y total_orders as BARS colored #D9D4CF, right Y refund_rate as LINE colored #3A6EA5, smooth with visible points, remove both Y-axis titles, legend bottom-center, horizontal gridlines #88888826 only, height 300px…

Scoped (the agent owns the design):

> Build a single-page dashboard for the customer success team answering: is our refund rate trending up? At a minimum, include the latest month with MoM change (refund rate, refunded orders, total orders), then the monthly refund rate trend against order volume as the hero, then one section per breakdown. Call out the categories and sales channels with the highest refund rates. Include helpful filters.

## Workflow Examples

IMPORTANT: always open the project in a user's browser when making changes to cells:

```bash
# Opens the project in the default browser (needed for interactive review; cell execution uses the API from this CLI)
hex project open "$PROJECT_ID"
```

### Create a project and add cells

```bash
# List projects to find the target
PROJECT_ID=$(hex project list --json | jq -r '.projects[0].id')

# Create a Python code cell
hex cell create "$PROJECT_ID" -t code -s "import pandas as pd
df = pd.read_csv('data.csv')
df.head()"

# Create a SQL cell after the first one
FIRST_CELL=$(hex cell list "$PROJECT_ID" --json | jq -r '.cells[0].id')
hex cell create "$PROJECT_ID" -t sql -s "SELECT * FROM my_table LIMIT 10" \
  --after-cell-id "$FIRST_CELL" --data-connection-id "$DATA_CONNECTION_ID"

# Verify cells were created
hex cell list "$PROJECT_ID"
```

### Discover data connections and create SQL cells

```bash
# List available connections
hex connection list --json

# Ask the user which connection to use, then create a SQL cell with it
CONNECTION_ID="<selected-connection-id>"
hex cell create "$PROJECT_ID" -t sql \
  -s "SELECT count(*) FROM users" \
  --data-connection-id "$CONNECTION_ID" \
  --output-dataframe "user_count"

# Run the cell
CELL_ID=$(hex cell list "$PROJECT_ID" --json | jq -r '.cells[-1].id')
hex cell run "$CELL_ID"
```

### Open, update, and run

```bash
# Get project details
hex project get "$PROJECT_ID" --json

# Open in browser for the user to review
hex project open "$PROJECT_ID"

# List cells and update one
CELLS=$(hex cell list "$PROJECT_ID" --json)
CELL_ID=$(echo "$CELLS" | jq -r '.cells[0].id')
hex cell update "$CELL_ID" -s "print('updated code')"

# Run the updated cell
hex cell run "$CELL_ID"
```

### Hand off a dashboard build to the Hex agent

```bash
# Prerequisite: project exists with QA'd SQL cells already pushed and run
PROJECT_ID="<project with prepared query cells>"

# Send one scoped prompt (see "Prompting the Hex Agent" above for the shape)
THREAD_ID=$(hex thread create "Build a single-page dashboard for the customer success team answering: is our refund rate trending up? ..." \
  --project "$PROJECT_ID" --json | jq -r '.thread_id')

# Poll until the agent finishes (status IDLE), then open for review
hex thread get "$THREAD_ID" --json
hex project open "$PROJECT_ID"

# Iterate with focused follow-ups — one concern per message
hex thread continue "$THREAD_ID" "Show order volume behind the refund rate trend in the hero chart."
```

### Run app with parameters and monitor

```bash
# Trigger a published app run with input parameters (not supported on `hex project run`)
hex app run "$PROJECT_ID" \
  -i start_date=2024-01-01 \
  -i end_date=2024-12-31 \
  -i threshold=0.95 \
  --timeout 30m

# Or run async and monitor separately
hex app run "$PROJECT_ID" -i region=us-east-1 --no-wait --json
# Returns: {"run_id": "...", "project_id": "...", "status": "PENDING", "run_url": "..."}

RUN_ID="<run_id from above>"
hex run status "$PROJECT_ID" "$RUN_ID" --watch
```

### Workspace management

```bash
# List users and groups (JSON output includes pagination cursors)
hex user list --json
hex group list --json

# Create a new group
hex group create "Data Engineering"
```

### Troubleshooting a failed run

```bash
# Check run status
hex run status "$PROJECT_ID" "$RUN_ID" --json
# Look at the "status" field: COMPLETED, ERRORED, KILLED, UNABLE_TO_ALLOCATE_KERNEL

# If a run is stuck, cancel and retry
hex run cancel "$PROJECT_ID" "$RUN_ID"
hex project run "$PROJECT_ID" --no-cache
```

### Run an eval suite and inspect results

```bash
# Start a run from a suite definition file and capture the run ID
RUN_ID=$(hex eval run ./eval-suite.yaml --json | jq -r '.eval_suite_run_id')

# Runs are async — re-run this until status leaves RUNNING (terminal: COMPLETED, CANCELLED, or ERRORED)
hex eval get "$RUN_ID" --json | jq '{status, pass_percentage, fail_percentage}'

# Inspect the first failing case for its rubric grades and agent thread
CASE_ID=$(hex eval get "$RUN_ID" --json | jq -r 'first(.case_runs[] | select(.status == "FAIL") | .id)')
hex eval case get "$CASE_ID" --json

# Compare a pending context change: re-run the same suite against a context
# preview (e.g. a preview_id from `hex guide preview`), then diff pass rates
PREVIEW_ID="<preview_id from hex guide preview>"
PREVIEW_RUN_ID=$(hex eval run ./eval-suite.yaml --preview-id "$PREVIEW_ID" --json | jq -r '.eval_suite_run_id')
hex eval get "$PREVIEW_RUN_ID" --json | jq '{status, pass_percentage}'
```
