---
name: analyze-linear-issue
description: "Full analysis pipeline for a Linear issue: fetch context, categorize, and for bugs/security issues extract structured info and follow-up questions. Outputs JSON."
argument-hint: "[issue-id]"
compatibility:
  requires:
    - mcp: linear
      description: Core dependency — used to fetch issue details and comments
  optional:
    - skill: loom-transcript
      description: Used to fetch Loom video transcripts. Skip Loom steps if unavailable.
    - cli: curl
      description: Used to download images/attachments. Typically pre-installed.
---

# Analyze Linear Issue

Analyze Linear issue **$ARGUMENTS** and output structured JSON.

## Workflow

1. Run the `fetch-linear-issue` skill to gather issue context (description, comments, media)
2. Run the `categorize-linear-issue` skill to classify the issue
3. If the category is `bug` or `security`, run the `extract-linear-bug-info` skill
4. Output the result as JSON

## Output Format

**Always output valid JSON and nothing else.** No commentary, no markdown, no explanation — just the JSON object.

### For `bug` or `security` issues:

```json
{
  "ticket_id": "ENG-123",
  "category": "bug",
  "title": "Edit Fields output not accessible after Switch node",
  "what_broke": "One sentence describing the specific failure",
  "reproduction_steps": [
    "Step 1",
    "Step 2",
    "Step 3"
  ],
  "actual_behavior": "What happens, including verbatim error messages",
  "expected_behavior": "What should happen instead",
  "version": "1.45.1 or null if not specified",
  "environment": "Self-hosted, Docker, etc. or null if not specified",
  "proposed_solution": "Reporter's suggestion or null if not present",
  "follow_up_questions": [
    "Question 1 for the reporter",
    "Question 2 for the reporter"
  ]
}
```

Field rules:
- `reproduction_steps`: Array of strings. If steps are missing entirely, use `null`. If a video or workflow file serves as reproduction, include a single entry referencing it (e.g. `"See attached video"` or `"Import the attached workflow file"`).
- `version`, `environment`, `proposed_solution`: Use `null` when not specified. Do not use placeholder strings like "Not specified".
- `follow_up_questions`: Array of question strings for missing/unclear fields. Empty array `[]` if the ticket is complete.

### For all other categories (`feature request`, `expected behavior`, `outdated`, `other`):

```json
{
  "ticket_id": "ENG-123",
  "category": "feature request"
}
```

No additional fields needed. **Always output valid JSON and nothing else.** No commentary, no markdown, no explanation — just the JSON object.
