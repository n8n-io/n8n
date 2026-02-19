---
name: fetch-linear-issue
description: "Fetch a Linear issue with all relevant context: description, comments, and embedded media. Use when starting work on a Linear ticket or as the first step in a triage pipeline."
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

# Fetch Linear Issue

Fetch Linear issue **$ARGUMENTS** and gather all context needed for analysis.

## Prerequisites

- **Linear MCP** (`mcp__linear`): Must be connected. Without it the skill cannot function.

If Linear MCP is not available, stop and tell the user.

## Instructions

### 1. Fetch Issue and Comments

Use the Linear MCP tools to fetch the issue and its comments together in one step:

- `mcp__linear__get_issue` with the issue ID to get full details
- `mcp__linear__list_comments` with the issue ID to get all comments

Note: Linear issues can be moved between teams and correspondingly change their issue keys (e.g. from `ENG-123` to `SUPPORT-456`).

### 2. Fetch Embedded Media

Scan the issue description AND all comments for visual content. This step is mandatory — images and videos often contain critical information like error messages, reproduction steps, and UI state.

**Images:**

1. Find all image URLs in description and comments:
   - `<img>` tags
   - Markdown images `![](url)`
   - Raw URLs (github.com/user-attachments, imgur.com, etc.)
2. For each image:
   - Download: `curl -sL "url" -o /tmp/image-N.png`
   - View the downloaded file
   - Note what the image shows

**Loom Videos:**

1. Find all Loom URLs (loom.com/share/...) in description and comments
2. For each video, use the `/loom-transcript` skill to fetch the full transcript
3. If the loom-transcript skill is unavailable, note the Loom URLs for the user to review manually

### 3. Output

Pass through the following structured data. Do not summarize, reformat, or add commentary — downstream skills will handle interpretation.

- **Title**
- **Status**, **Priority**, **Labels**, **Assignee**
- **Description** (full body, unmodified)
- **Comments** (all, in chronological order, unmodified)
- **Media** (what each image shows; Loom transcript summaries with timestamps)

### 4. Extended Context (only when explicitly requested)

These steps add useful background but are not needed for triage. Only run them if the user asks for deep context, or if invoked standalone (not as part of a pipeline).

**Related Linear Issues:**
- Fetch any issues mentioned in relations (blocking, blocked by, related, duplicates) via `mcp__linear__get_issue`
- Summarize how they relate

**GitHub PRs and Issues:**
- If GitHub links appear, use `gh pr view <number>` or `gh issue view <number>`
- Requires GitHub CLI installed and authenticated (`gh auth status`)

**Notion Documents:**
- If Notion links appear, use `mcp__notion__notion-fetch` to retrieve content
- Requires Notion MCP connected

If extended context is skipped, note any links to related issues, PRs, or Notion docs that were found but not fetched so downstream skills or the user can follow up if needed.

## Notes

- The issue ID can be provided as: `AI-1975`, `node-1975`, or just `1975` (will search)
- If no issue ID is provided, ask the user for one
