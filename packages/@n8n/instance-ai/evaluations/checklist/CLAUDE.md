# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with the checklist evaluation system.

## Checklist Evaluation System

The `evaluations/checklist/` directory contains an evaluation framework that measures instance-ai agent quality across two dimensions: **build correctness** (does the workflow match the spec?) and **execution correctness** (does the workflow produce correct output?).

### Commands

All commands run from **the instance-ai package directory** (`packages/@n8n/instance-ai`).

```bash
# Local evaluation (no LangSmith)
pnpm eval:checklist                          # Run all synthetic prompts
pnpm eval:checklist --complexity simple      # Filter by complexity
pnpm eval:checklist --tags build,webhook     # Filter by tags
pnpm eval:checklist --grep "slack"           # Filter by prompt substring
pnpm eval:checklist --concurrency 1          # Serial execution
pnpm eval:checklist --skip-execution-eval    # Skip runtime testing (faster)
pnpm eval:checklist --max-examples 5         # Limit number of prompts

# Subcommands
pnpm eval:checklist report                   # Regenerate HTML report from saved runs
pnpm eval:checklist refresh-checklists       # Clear cache and re-extract all checklists

# LangSmith evaluation
pnpm eval:checklist:langsmith:general        # Run "general agent" dataset
pnpm eval:checklist:langsmith:builder        # Run "builder" dataset
pnpm eval:upload-datasets                    # Upload prompts to LangSmith
pnpm eval:generate-refs:general              # Generate golden references
pnpm eval:generate-refs:builder

# Standard dev commands
pnpm test                                    # Run Jest tests
pnpm typecheck                               # Type check
pnpm lint                                    # ESLint
```

### Environment Variables

```bash
# Required for local eval
N8N_EVAL_EMAIL=admin@n8n.io        # n8n login
N8N_EVAL_PASSWORD=password
N8N_EVAL_URL=http://localhost:5678 # or use --n8n-url flag

# Required for checklist extraction/verification (Claude-powered)
ANTHROPIC_API_KEY=...              # or N8N_AI_ANTHROPIC_KEY

# Required for LangSmith mode
LANGSMITH_API_KEY=...
```

### Evaluation Flow

```
┌─────────────────────────────────────────────────────────┐
│ Phase 1: Checklist Extraction                           │
│   Prompt → Claude → 5-15 ChecklistItems (cached)       │
│   Categories: structure, data, behavior, execution      │
├─────────────────────────────────────────────────────────┤
│ Phase 2: Run Agent                                      │
│   SSE connect → POST chat → capture events → outcomes   │
│   Auto-approves confirmation-requests                   │
│   Snapshots pre/post workflows to find created ones     │
├─────────────────────────────────────────────────────────┤
│ Phase 3: Execution Eval (optional)                      │
│   Claude generates test inputs from workflow JSON       │
│   Pin data on trigger node → force-execute workflow     │
│   Verify outputs against execution checklist            │
├─────────────────────────────────────────────────────────┤
│ Phase 4: Verification                                   │
│   Build artifact → Claude verifies each checklist item  │
│   Score = passed / total for both build + execution     │
└─────────────────────────────────────────────────────────┘
```

### Key Module Responsibilities

| Module | Role |
|--------|------|
| `cli.ts` | CLI entry point, argument parsing, orchestration |
| `runner.ts` | Runs a single prompt end-to-end (SSE → events → outcome → verify) |
| `checklist.ts` | Claude-powered checklist extraction and verification |
| `verification.ts` | Builds verification artifact, handles execution testing with pin data |
| `n8n-client.ts` | HTTP client for n8n REST API and instance-ai endpoints |
| `sse-client.ts` | Lightweight SSE stream parser |
| `credentials.ts` | Test credential fixtures (Slack, Notion, GitHub, Gmail, etc.) |
| `synthetic-prompts.ts` | Test prompt dataset with complexity and tag metadata |
| `langsmith-runner.ts` | LangSmith `evaluate()` harness with feedback extractors |
| `storage.ts` | File-based run storage (`evaluations/.data/instance-ai-runs/`) |
| `report.ts` | HTML report generation (`evaluations/.data/instance-ai-report.html`) |
| `system-prompts/` | Claude system prompts for extraction and verification |

### Data Locations

- **Run results**: `evaluations/.data/instance-ai-runs/{uuid}.json`
- **Checklist cache**: `evaluations/.data/checklist-cache/{hash}.json` (keyed by prompt SHA256)
- **HTML report**: `evaluations/.data/instance-ai-report.html`

### How Execution Evaluation Works

After the agent builds a workflow, the system optionally tests it:

1. Claude analyzes the workflow JSON + original prompt → generates 2-8 test scenarios with inputs
2. For each scenario, pin data is applied to the trigger node (supports webhook, form, manual, schedule)
3. The workflow is force-executed via the n8n API
4. Node outputs and errors are extracted and verified against the execution checklist
5. Skipped when: `--skip-execution-eval`, no workflows created, workflow requires real external API credentials, or workflow is trivial

### Credential Seeding

Before evaluation runs, test credentials are seeded into the n8n instance:
- Parsed from prompt `requiredCredentials` fields
- Pre-flight check verifies n8n can create/delete credentials (catches missing encryption key)
- Credentials use placeholder values (e.g., `xoxb-eval-placeholder-token`)
- Automatically cleaned up after the run completes
