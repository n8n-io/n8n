---
description: Fetch and analyze Linear issue with all related context. Use when starting work on a Linear ticket, analyzing issues, or gathering context about a Linear issue.
argument-hint: "[issue-id]"
compatibility:
  requires:
    - mcp: linear
      description: Core dependency — used to fetch issue details, relations, and comments
    - cli: gh
      description: GitHub CLI — used to fetch linked PRs and issues. Must be authenticated (gh auth login)
  optional:
    - mcp: notion
      description: Used to fetch linked Notion documents. Skip Notion steps if unavailable.
    - skill: loom-transcript
      description: Used to fetch Loom video transcripts. Skip Loom steps if unavailable.
    - cli: curl
      description: Used to download images/attachments. Typically pre-installed.
---

# Linear Issue Analysis

Start work on Linear issue **$ARGUMENTS**

## Prerequisites

This skill depends on external tools. Before proceeding, verify availability:

**Required:**
- **Linear MCP** (`mcp__linear`): Must be connected. Without it the skill cannot function at all.
- **GitHub CLI** (`gh`): Must be installed and authenticated. Run `gh auth status` to verify. Used to fetch linked PRs and issues.

**Optional (graceful degradation):**
- **Notion MCP** (`mcp__notion`): Needed only if the issue links to Notion docs. If unavailable, note the Notion links in the summary and tell the user to check them manually.
- **Loom transcript skill** (`/loom-transcript`): Needed only if the issue contains Loom videos. If unavailable, note the Loom links in the summary for the user to watch.
- **curl**: Used to download images. Almost always available; if missing, skip image downloads and note it.

If a required tool is missing, stop and tell the user what needs to be set up before continuing.

## Instructions

Follow these steps to gather comprehensive context about the issue:

### 1. Fetch the Issue and Comments from Linear

Use the Linear MCP tools to fetch the issue details and comments together:

- Use `mcp__linear__get_issue` with the issue ID to get full details including attachments
- Include relations to see blocking/related/duplicate issues
- **Immediately after**, use `mcp__linear__list_comments` with the issue ID to fetch all comments

Both calls should be made together in the same step to gather the complete context upfront.

### 2. Check for Private/Security Issues (MANDATORY — do this before anything else)

After fetching the issue, immediately check its labels:

1. Look at the labels returned with the issue.
2. If any label is **`n8n-private`**:
   a. Run `git remote -v` (via Bash) to list all configured remotes.
   b. If **any** remote URL contains `n8n-io/n8n` without the `-private` suffix (i.e. matches the public repo), **stop immediately** and tell the user:

   > **This issue is marked `n8n-private` and must be developed in a clean clone of the private repository.**
   >
   > One or more of your remotes point to the **public** `n8n-io/n8n` repo. Mixed remotes are not allowed — you must work in a **separate local clone** of `n8n-io/n8n-private` with no references to the public repo.
   > For the full process, see: https://www.notion.so/n8n/Processing-critical-high-security-bugs-vulnerabilities-in-private-2f45b6e0c94f803da806f472111fb1a5

   Do **not** continue with any further steps — return after showing this message.

3. If the label is not present, or all remotes point exclusively to `n8n-io/n8n-private`, continue normally.

### 3. Analyze Attachments and Media (MANDATORY)

**IMPORTANT:** This step is NOT optional. You MUST scan and fetch all visual content from BOTH the issue description AND all comments.

**Screenshots/Images (ALWAYS fetch):**

1. Scan the issue description AND all comments for ALL image URLs:
	- `<img>` tags
	- Markdown images `![](url)`
	- Raw URLs (github.com/user-attachments, imgur.com, etc.)
2. For EACH image found (in description or comments):
	- Download using `curl -sL "url" -o /path/to/image.png` (GitHub URLs require following redirects) OR the linear mcp
	- Use the `Read` tool on the downloaded file to view it
	- Describe what you see in detail
3. Do NOT skip images - they often contain critical context like error messages, UI states, or configuration

**Loom Videos (ALWAYS fetch transcript):**

1. Scan the issue description AND all comments for Loom URLs (loom.com/share/...)
2. For EACH Loom video found (in description or comments):
	- Use the `/loom-transcript` skill to fetch the FULL transcript
	- Summarize key points, timestamps, and any demonstrated issues
3. Loom videos often contain crucial reproduction steps and context that text alone cannot convey

### 4. Fetch Related Context

**Related Linear Issues:**
- Use `mcp__linear__get_issue` for any issues mentioned in relations (blocking, blocked by, related, duplicates)
- Summarize how they relate to the main issue

**GitHub PRs and Issues:**
- If GitHub links are mentioned, use `gh` CLI to fetch PR/issue details:
	- `gh pr view <number>` for pull requests
	- `gh issue view <number>` for issues
- Download images attached to issues: `curl -H "Authorization: token $(gh auth token)" -L <image-url> -o image.png`

**Notion Documents:**
- If Notion links are present, use `mcp__notion__notion-fetch` with the Notion URL or page ID to retrieve document content
- Summarize relevant documentation

### 5. Review Comments

Comments were already fetched in Step 1. Review them for:
- Additional context and discussion history
- Any attachments or media linked in comments (process in Step 3)
- Clarifications or updates to the original issue description

### 6. Identify Affected Node (if applicable)

Determine whether this issue is specific to a particular n8n node (e.g. a trigger, action, or tool node). Look for clues in:
- The issue title (e.g. "Linear trigger", "Slack node", "HTTP Request")
- The issue description and comments mentioning node names
- Labels or tags on the issue (e.g. `node:linear`, `node:slack`)
- Screenshots showing a specific node's configuration or error

If the issue is node-specific:

1. **Find the node type ID.** Use `Grep` to search for the node's display name (or keywords from it) in `packages/frontend/editor-ui/data/node-popularity.json` to find the exact node type ID. For reference, common ID patterns are:
   - Core nodes: `n8n-nodes-base.<camelCaseName>` (e.g. "HTTP Request" → `n8n-nodes-base.httpRequest`)
   - Trigger variants: `n8n-nodes-base.<name>Trigger` (e.g. "Gmail Trigger" → `n8n-nodes-base.gmailTrigger`)
   - Tool variants: `n8n-nodes-base.<name>Tool` (e.g. "Google Sheets Tool" → `n8n-nodes-base.googleSheetsTool`)
   - LangChain/AI nodes: `@n8n/n8n-nodes-langchain.<camelCaseName>` (e.g. "OpenAI Chat Model" → `@n8n/n8n-nodes-langchain.lmChatOpenAi`)

2. **Look up the node's popularity score** — first check for a Flaky assessment (see below), otherwise use the popularity file:

   **Primary: Check for Flaky's assessment in Linear comments.** Flaky is an auto-triage agent that posts issue analysis as a comment. Search the comments already fetched in Step 1 for a comment from a user named "Flaky" (or containing "Flaky" in the author name) — do not re-fetch comments. If found, extract the popularity score and level directly from Flaky's analysis and use those values.

   **Fallback (if no Flaky comment exists):** Look up the node's popularity score from `packages/frontend/editor-ui/data/node-popularity.json`. Use `Grep` to search for the node ID in that file. The popularity score is a log-scale value between 0 and 1. Use these thresholds to classify:

   | Score | Level | Description | Examples |
   |-------|-------|-------------|----------|
   | ≥ 0.8 | **High** | Core/widely-used nodes, top ~5% | HTTP Request (0.98), Google Sheets (0.95), Postgres (0.83), Gmail Trigger (0.80) |
   | 0.4–0.8 | **Medium** | Regularly used integrations | Slack (0.78), GitHub (0.64), Jira (0.65), MongoDB (0.63) |
   | < 0.4 | **Low** | Niche or rarely used nodes | Amqp (0.34), Wise (0.36), CraftMyPdf (0.33) |

   Include the raw score and the level (high/medium/low) in the summary, and note whether it came from Flaky or the popularity file.

3. If the node is **not found** in the popularity file (and no Flaky comment exists), note that it may be a community node or a very new/niche node.

### 7. Assess Effort/Complexity

**Primary: Check for Flaky's effort estimate in Linear comments.** Search the comments already fetched in Step 1 for a Flaky comment — do not re-fetch. If found, extract the effort/complexity estimate directly from it and use that as your assessment.

**Fallback (if no Flaky comment exists):** After gathering all context, assess the effort required to fix/implement the issue. Use the following T-shirt sizes:

| Size | Approximate effort |
|------|--------------------|
| XS   | ≤ 1 hour           |
| S    | ≤ 1 day            |
| M    | 2-3 days           |
| L    | 3-5 days           |
| XL   | ≥ 6 days           |

To make this assessment, consider:
- **Scope of changes**: How many files/packages need to be modified? Is it a single node fix or a cross-cutting change?
- **Complexity**: Is it a straightforward parameter change, a new API integration, a new credential type, or an architectural change?
- **Testing**: How much test coverage is needed? Are E2E tests required?
- **Risk**: Could this break existing functionality? Does it need backward compatibility?
- **Dependencies**: Are there external API changes, new packages, or cross-team coordination needed?
- **Documentation**: Does this require docs updates, migration guides, or changelog entries?

Provide the T-shirt size along with a brief justification explaining the key factors that drove the estimate. Note whether it came from Flaky or your own assessment.

### 8. Present Summary

**Before presenting, verify you have completed:**
- [ ] Downloaded and viewed ALL images in the description AND comments
- [ ] Fetched transcripts for ALL Loom videos in the description AND comments
- [ ] Fetched ALL linked GitHub issues/PRs via `gh` CLI
- [ ] Listed all comments on the issue
- [ ] Checked whether the issue is node-specific and looked up popularity if so
- [ ] Assessed effort/complexity with T-shirt size

After gathering all context, present a comprehensive summary including:

1. **Issue Overview**: Title, status, priority, assignee, labels
2. **Description**: Full issue description with any clarifications from comments
3. **Visual Context**: Summary of screenshots/videos (what you observed in each)
4. **Affected Node** (if applicable): Node name, node type ID (`n8n-nodes-base.xxx`), popularity score with level (e.g. `0.64 — medium popularity`)
5. **Related Issues**: How this connects to other work
6. **Technical Context**: Any PRs, code references, or documentation
7. **Effort Estimate**: T-shirt size (XS/S/M/L/XL) with justification
8. **Next Steps**: Suggested approach based on all gathered context

## Notes

- The issue ID can be provided in formats like: `AI-1975`, `node-1975`, or just `1975` (will search)
- If no issue ID is provided, ask the user for one
