# Community PR Readiness Check — teams and labels

Owner resolution, the GitHub-team → Linear-team → label mapping, and the Linear ticket label rules used when triaging.

## Contents

- Identifying the owning team
- GitHub team → Linear team → GitHub label
- Linear ticket label rules
  - Always-on label
  - Type label (based on PR title prefix)
  - Team-specific extra label
  - Worked examples

---

## Identifying the owning team

Use the canonical owners script at `.github/scripts/owners.mjs`. It parses `.github/OWNERS` with last-match-wins semantics and returns allocations sorted by file count with a `share` percentage. Using the script keeps this skill consistent with whatever CI uses.

1. Write the PR's changed file paths (from the `files` list) to a temp file, one per line:
   ```bash
   printf '%s\n' <path1> <path2> ... > /tmp/pr-<number>-files.txt
   ```
2. Run the script:
   ```bash
   node .github/scripts/owners.mjs /tmp/pr-<number>-files.txt
   ```
3. The script prints JSON of the form:
   ```json
   {
     "totalFiles": 12,
     "allocations": [
       { "team": "@n8n-io/ai", "fileCount": 10, "share": 83, "files": [...] },
       { "team": "@n8n-io/catalysts", "fileCount": 2, "share": 17, "files": [...] }
     ]
   }
   ```
   Allocations are already sorted by `fileCount` descending — take the first entry as the winning team.
4. Clean up: `rm /tmp/pr-<number>-files.txt`.
5. Strip the `@n8n-io/` prefix from `allocations[0].team` — the GitHub team slug is `nodes`, `iam`, `ai`, etc. If `allocations` is empty (no file matched any rule, which is possible only if `.github/OWNERS` lost its catch-all), fall back to `catalysts`.
6. Map the GitHub team slug to its Linear team name and PR label using the table below. The `team` field in the JSON output is the **Linear team name**. If the resolved GitHub team slug has no entry in the table, fall back to `Engineering`.

**Sub-agent fallback**: if `node` execution is denied by the sandbox, read `.github/OWNERS` directly and apply last-match-wins by hand. All the active rules fit on one screen.

## GitHub team → Linear team → GitHub label

| GitHub team (`@n8n-io/…`) | Linear team             | GitHub team label  |
|---------------------------|-------------------------|--------------------|
| `catalysts`               | Catalysts               | `team:cats`        |
| `adore`                   | Adore                   | `team:adore`       |
| `ai`                      | AI                      | `team:ai`          |
| `nodes`                   | NODES                   | `team:nodes`       |
| `design`                  | Design                  | `team:design`      |
| `iam`                     | Identity & Access       | `team:identity`    |
| `ligo`                    | Lifecycle & Governance  | `team:lifecycle`   |
| `instance-ai`             | instanceAI              | `team:instance-ai` |
| `frontend`                | Adore                   | `team:adore`       |
| `qa-dx`                   | Developer Platform      | `team:qa-dx`       |
| `migrations-review`       | Catalysts               | `team:cats`        |

The **GitHub team label** column is what gets applied to the PR after a successful Linear assignment (see `reference/label-flow.md`).

## Linear ticket label rules

When calling `mcp__linear-server__save_issue` to assign a ticket to a team, pass a `labels` array composed of three pieces:

### Always-on label

- `GitHub` — every community PR ticket carries this. In the Linear UI it renders as `source > GitHub`; the `source` prefix is a label-group parent, not part of the API name.

### Type label (from PR title prefix)

| PR title type                                                                          | Linear label   |
|----------------------------------------------------------------------------------------|----------------|
| `feat`                                                                                 | `feature`      |
| `fix`                                                                                  | `bug`          |
| anything else (`perf`, `refactor`, `docs`, `ci`, `chore`, `build`, `test`, `revert`)   | `enhancement`  |

Pass the **child** label name only — Linear silently drops unknown labels, so don't include `type > ` prefixes.

### Team-specific extra label

| Destination team | Extra label    |
|------------------|----------------|
| Catalysts        | `Community PR` |
| NODES            | `community-pr` |
| other teams      | _(no extra)_   |

### Worked examples

- `feat` PR going to Catalysts: `["GitHub", "feature", "Community PR"]`
- `fix` PR going to NODES: `["GitHub", "bug", "community-pr"]`
- `perf` PR going to AI: `["GitHub", "enhancement"]`
- `chore` PR going to Lifecycle & Governance: `["GitHub", "enhancement"]`

## Destination state

| Destination team | Linear state |
|------------------|--------------|
| NODES            | `Review`     |
| any other team   | `Triage`     |

NODES has a dedicated `Review` lane; every other team handles routing inside their own triage.
