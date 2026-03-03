---
name: analyze-experiment
description: Analyze an experiment spec and produce an implementation plan with tasks, open questions, and risks.
disable-model-invocation: true
argument-hint: "[notion-page-id] [output-file-path]"
compatibility:
  requires:
    - mcp: notion
      description: Core dependency — used to fetch the experiment spec and add comments to the Notion page
  optional:
    - cli: curl
      description: Used to download attachments. Typically pre-installed.
---

# Analyze Experiment

Fetch an experiment spec from a Notion page and produce an implementation
plan with tasks, open questions, and risks.

## Prerequisites

**Required:**
- **Notion MCP** (`mcp__notion`): Must be connected. Used by the `notion-page-reader` and `notion-page-annotator` agents.
- **Custom agents:** The `notion-page-reader`, `notion-page-annotator`, `experiment-codebase-researcher`, and `experiment-discovery` agents must exist in `.claude/agents/`.

**Optional (graceful degradation):**
- **curl**: Used to download attachments. Almost always available; if missing, skip downloads and note it.

If a required tool is missing, stop and tell the user what needs to be set up.

## Workflow

### 1. Parse Arguments and Fetch the Experiment Spec

`$ARGUMENTS` contains: `<notion-page-id> <output-file-path>`

- Parse the first argument as the Notion page ID
- Parse the second argument as the output file path for the plan
- Launch the **notion-page-reader** agent via the Task tool, passing the
  Notion page ID. Ask it to fetch the full page content and any open
  comments and return everything as clean markdown.
- If the agent fails or returns empty content, inform the user and stop
- Extract the experiment name from the returned markdown's title

### 2. Gather Context

**Read the spec thoroughly.** Understand the goal, target audience, variants,
success metrics, and any constraints.

**Extract a spec summary** for the research agents:
- Experiment name
- Goal and what we hope to learn
- Target audience
- Variants being tested
- Success metrics
- Any specific UI components, routes, or stores mentioned

**Launch both research agents in parallel** using the Task tool:

- **experiment-codebase-researcher**: Pass the experiment name, goal,
  variants, and any mentioned UI components/routes/stores. The agent will
  explore existing experiment patterns and identify code the new experiment
  will need to modify.
- **experiment-discovery**: Pass the experiment name and a 1-2 sentence
  description. The agent will search Linear and GitHub for related tickets,
  issues, and PRs.

Collect the results from both agents before proceeding to Step 3. Use the
codebase researcher's findings for the implementation checklist and
integration points. Use the discovery agent's findings for the References
section.

### 3. Produce the Plan

Write the plan to the output file path from step 1 with this structure:

```markdown
---
experiment-name: "{Experiment Name}"
notion-page-id: "{notion-page-id}"
---

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

### 4. Annotate the Notion Spec

Prepare a list of comments from the plan's open questions and risks:
- For each **open question**: prefix with `[Open Question]` (or
  `[Blocker]` if it blocks implementation). Include the question and a
  suggested default. Include the relevant spec text as a content snippet
  for block matching.
- For each **risk**: prefix with `[Risk]`. Include the risk description,
  likelihood, and mitigation. Include the relevant spec text as a content
  snippet for block matching.
- For questions or risks not tied to a specific section, mark them as
  page-level.

Launch the **notion-page-annotator** agent via the Task tool, passing:
- The Notion page ID
- The list of comments with their content snippets

The agent will match comments to the relevant blocks and add them via
the Notion API using `$MCP_NOTION_TOKEN_GROWTH` from the
environment. Use its summary (comment count, any failures) in Step 7.

### 5. Commit and Push

- Stage the plan file: `git add {plan-file-path}`
- Commit with message: `docs: add implementation plan for {experiment name}`
- Push the current branch

### 6. Write Webhook Summary

Write a user-friendly markdown summary to `/tmp/skill-summary.md`. This
file is picked up by the CI workflow and sent to a webhook for visibility.

The summary should be concise and easy to scan. Derive the GitHub repo
URL from the git remote (e.g. `git remote get-url origin`), then use it
to build markdown links for the plan file and branch.

Use this structure:

```markdown
## {Experiment Name} — Analysis Complete

### Summary
1-2 sentence synopsis of the experiment.

### Key Findings
- **Tasks:** {count} ({list task names, e.g. "1 implementation, 1 design, 1 cleanup"})
- **Open Questions:** {count} ({blocker count} blockers)
- **Risks:** {count}
- **Effort Estimate:** {S/M/L from implementation task}

### Open Questions
{For each question, one bullet:}
- ⚠️ **[Blocker]** {question} — Suggested default: {suggestion}
- {question} — Suggested default: {suggestion}

### Risks
{For each risk, one bullet:}
- **{likelihood}** — {risk description}. Mitigation: {mitigation}

### Output
- **Plan file:** [{plan-file-path}]({repo-url}/blob/{branch}/{plan-file-path})
- **Branch:** [{branch-name}]({repo-url}/tree/{branch})
- **Notion comments:** {count} added
- **Notion spec:** [Link](https://www.notion.so/{notion-page-id})
```

If there are no open questions, replace that section with
"No open questions — spec is clear." Same for risks.

### 7. Present to User

After writing and pushing the plan file, inform the user of:
- The output file path
- The branch name and push status
- A brief summary of key findings: number of tasks, number of open
  questions, and any blockers identified
- Confirmation that questions and risks were added as comments on the
  Notion spec page

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
