---
name: analyze-experiment
description: Analyze an experiment spec and produce an implementation plan with tasks, open questions, and risks.
disable-model-invocation: true
argument-hint: "[notion-page-id]"
compatibility:
  requires:
    - mcp: notion
      description: Core dependency — used to fetch the experiment spec from Notion
    - mcp: linear
      description: Used to search for related Linear tickets and prior art
    - cli: gh
      description: GitHub CLI — used to search for related PRs and issues. Must be authenticated (gh auth login)
  optional:
    - cli: curl
      description: Used to download attachments if referenced in the spec. Typically pre-installed.
---

# Analyze Experiment

Fetch an experiment spec from a Notion page and produce an implementation
plan with tasks, open questions, and risks.

## Prerequisites

**Required:**
- **Notion MCP** (`mcp__notion`): Must be connected. Without it the skill cannot fetch the experiment spec.
- **Linear MCP** (`mcp__linear`): Must be connected. Used to search for related tickets.
- **GitHub CLI** (`gh`): Must be installed and authenticated. Run `gh auth status` to verify.

**Optional (graceful degradation):**
- **curl**: Used to download attachments. Almost always available; if missing, skip downloads and note it.

If a required tool is missing, stop and tell the user what needs to be set up.

## Workflow

### 1. Fetch the Experiment Spec from Notion

- The Notion page ID is: **$ARGUMENTS**
- Use `mcp__notion__notion-fetch` with the page ID to retrieve the experiment spec
- If the page cannot be fetched, inform the user and stop
- Extract the experiment name from the page title or heading

### 2. Gather Context

**Read the spec thoroughly.** Understand the goal, target audience, variants,
success metrics, and any constraints.

**Check existing experiments** for implementation patterns:

- Read `packages/frontend/editor-ui/src/experiments/` directory structure
- Look at `app/constants/experiments.ts` for how experiments are registered
  (`createExperiment()`, `EXPERIMENTS_TO_TRACK`)
- Look at 1-2 existing experiment stores for the PostHog + Pinia + telemetry
  pattern
- Check `experiments/utils.ts` for shared helpers

**Check for related code** that the experiment will modify:

- Search the codebase for components, routes, or stores mentioned in the spec
- Identify integration points where the experiment hooks into existing UI

**Check Linear and GitHub** for any related tickets or prior art:

- Use `mcp__linear__search_issues` to search for the experiment name
- `gh search issues "<experiment name>" --repo n8n-io/n8n --limit 5`
- `gh search prs "<experiment name>" --repo n8n-io/n8n --limit 5`

### 3. Produce the Plan

Write a markdown file at `experiments/{experiment-name-slug}-plan.md` with
this structure:

```markdown
# {Experiment Name} — Implementation Plan

> Generated from [Notion spec](https://www.notion.so/{notion-page-id}) on {date}

## Summary

1-2 paragraph synopsis of what the experiment does, who it targets, and
what we hope to learn.

## Tasks

### 1. Implementation

All implementation work in a **single task**: experiment constant
registration, PostHog feature flag setup, Pinia store, frontend
components, backend changes (if any), telemetry events, and tests.

Break it down into a checklist:

- [ ] Register experiment in `app/constants/experiments.ts`
- [ ] Add to `EXPERIMENTS_TO_TRACK`
- [ ] Create experiment store with PostHog variant check
- [ ] Build components (list them)
- [ ] Wire into existing UI (list integration points)
- [ ] Add telemetry tracking events (list them)
- [ ] Write unit tests
- [ ] ...

Include effort estimate (S/M/L) and flag any blockers.

### 2. Design (conditional)

Only include this task if the spec mentions design, mockups, or visual
direction — or if the experiment clearly involves new UI that needs
design input. If included, describe what design deliverables are needed.

### 3. Cleanup

**Always separate from implementation.** This happens after experiment
results are in:

- [ ] Remove feature flag and experiment constant
- [ ] Promote winning variant to default (or remove experiment code)
- [ ] Remove experiment store and components
- [ ] Update tests

## Open Questions

Bullet list of anything unclear or unspecified. For each question:
- State what is ambiguous
- Suggest a sensible default if possible
- Mark as **blocker** if it prevents implementation from starting

**Design question rule:** If the spec does NOT mention design, mockups,
or visual direction, include an open question asking whether dedicated
design work is needed before implementation begins.

## Risks

Bullet list of technical or product risks:
- What could go wrong
- Likelihood (low/medium/high)
- Mitigation suggestion

## References

- Link to Notion spec page
- Links to related code (files that will be modified)
- Links to any Linear tickets or GitHub issues/PRs found
```

### 4. Commit and Push

- Stage the plan file: `git add {plan-file-path}`
- Commit with message: `docs: add implementation plan for {experiment name}`
- Push the current branch

### 5. Present to User

After writing and pushing the plan file, inform the user of:
- The output file path
- The branch name and push status
- A brief summary of key findings: number of tasks, number of open
  questions, and any blockers identified

## Rules

- **Single implementation task:** All implementation work — setup,
  frontend, backend, telemetry, testing — goes in ONE task. Only cleanup
  is separate.
- **Design is conditional:** Create a design task only when the spec
  mentions it or the experiment clearly requires new visual work.
  Otherwise, add an open question about whether design is needed.
- **Be pragmatic:** Offer sensible suggestions for open questions. Don't
  just list problems — propose solutions.
- **Mark blockers explicitly:** Any open question or risk that prevents
  work from starting must be marked as a **blocker**.
- **Follow existing patterns:** The plan should align with how existing
  experiments are implemented in the codebase (PostHog, Pinia stores,
  telemetry via `useTelemetry()`).