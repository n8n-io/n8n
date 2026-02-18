---
name: extract-linear-bug-info
description: "Extract structured information from a Linear bug ticket, identify missing required fields, and generate follow-up questions for the reporter. Expects issue context to already be fetched via fetch-linear-issue."
---

# Linear Bug Info Extraction

Extract all actionable information from a bug ticket, flag what's missing, and generate clear follow-up questions for the reporter.

## When to use this skill

Use this skill after `fetch-linear-issue` has retrieved the issue context and `categorize-linear-issue` has classified it as `bug` or `security`. Analyze the title, description, comments, and any media summaries already gathered.

---

## Step 1: Extract Required Information

Parse the issue content (description, comments, and media summaries from the fetched context) and extract the following fields. For each field, record whether it was **found**, **partially found**, or **missing**.

### 1a. Issue Title (What Broke)
A clear, specific description of what is broken. Vague titles like "bug in workflow" or "something broken" do not count — the title must communicate the specific failure.

- Good: "Edit Fields output not accessible after Switch node"
- Bad: "n8n bug", "workflow issue"

### 1b. Reproduction Evidence
At least **one** of the following must be present:

| Type | Acceptable? | Conditions |
|---|---|---|
| **Video** | Yes | Sufficient on its own — no written steps required |
| **Workflow file** (`.json` export) | Yes | Must be accompanied by written steps or description explaining what to do with it |
| **Written reproduction steps** | Yes | Must be specific enough to follow without prior knowledge of the issue |
| **Screenshot** | Partial | Never acceptable alone — always requires a written explanation of what the screenshot shows and how it relates to the bug |

**Important judgment calls:**
- A video alone is sufficient even without written steps.
- Written steps must be actionable — "try to use the webhook" is not enough; "click Publish, then trigger the webhook from Gitlab" is.
- If only a screenshot is present, treat this as **partially missing** (screenshot found, explanation missing).
- If multiple evidence types are present, assess each one individually.
- **Reproduction steps can be omitted** if the ticket clearly identifies the specific part of the code where the issue occurs and explains why it's wrong (e.g. "In `Switch.node.ts` line 142, the output mapping drops field references because it doesn't account for expressions"). In this case, treat reproduction evidence as **found** — the code reference itself is sufficient for an engineer to investigate.

### 1c. Problem Description (What Actually Happens)
A clear statement of the actual (broken) behavior — error messages, unexpected output, or visible symptoms. Error messages quoted verbatim count strongly here.

### 1d. Expected Behavior
What the user expected to happen instead. This is distinct from the problem description.

### 1e. n8n Version
The specific version number. Acceptable sources: debug info block, ticket body, or comments.

### 1f. Environment / Hosting Info
At minimum: hosting type (self-hosted or cloud). Additional context (OS, Node.js version, database, execution mode) is a bonus but not strictly required.

### 1g. Proposed Solution or Change Request (Optional)
If the reporter has explicitly suggested a fix or a specific change to implement, extract it. This is optional — its absence is not a gap.

---

## Step 2: Assess Completeness

After extraction, determine which required fields are found, partially found, or missing. This drives what follow-up questions to ask — it does not need to be shown in the output.

---

## Step 3: Build the Structured Summary

Output a clean summary using this format:

---

### Bug Ticket: [TICKET-ID] — [Title]

**What broke:** [One sentence: the specific failure]

**How to reproduce:**
Write this section for an engineer who will follow these steps cold, without having read the original ticket. Consolidate all reproduction information from the ticket body, comments, and attachments into a single clear numbered sequence. Rephrase vague or passive descriptions into direct instructions (e.g. "The user tries to access the field" becomes "Access the field using `{{ $('Edit Field').item.json.text }}`"). If a video or workflow file is attached, reference it explicitly (e.g. "Import the attached workflow file, then..." or "See attached video"). If steps are incomplete or missing, note that clearly rather than inventing steps.

**Actual behavior:** [What happens, including any error messages verbatim]

**Expected behavior:** [What should happen]

**Version:** [n8n version, or "Not specified"]

**Environment:** [Hosting type, OS, Node.js, DB if available — or "Not specified"]

**Proposed solution:** [If present — otherwise omit this field entirely]

---

## Step 4: Generate Follow-up Questions

Only generate questions for **missing or unclear required fields**. Do not ask about optional fields unless they would significantly help resolution.

### Question Writing Rules

Follow-up questions will be sent directly to the reporter, who may be an end user (non-technical). Write accordingly:

- **Be specific** — tell the reporter exactly what you need, not just that something is missing
- **Be concrete** — give examples of what a good answer looks like
- **One question per gap** — don't bundle multiple asks into one question
- **No jargon** — avoid terms like "reproduction steps", "workflow JSON", "execution mode" without explaining them
- **Friendly but direct** — these will be sent verbatim or near-verbatim

### Question Templates by Gap

Use these as starting points, adapting to the specific ticket context:

**Missing reproduction steps (no video, no file, no steps):**
> "Could you walk us through the exact steps to reproduce this? For example: 'I opened workflow X, clicked Y, then saw Z.' The more specific, the faster we can track it down."

**Screenshot without explanation:**
> "Thanks for the screenshot! Could you add a short description of what we're looking at and what's wrong in it? For example: 'This shows the error that appears after clicking Publish.'"

**Workflow file present but no steps:**
> "Thanks for sharing the workflow file! Could you describe what steps to follow once we import it? For example: which node to run first, what trigger to use, and what to look for."

**Missing actual behavior / error message:**
> "What exactly happens when the bug occurs? If there's an error message, could you copy and paste the full text?"

**Missing expected behavior:**
> "What did you expect to happen instead?"

**Missing version:**
> "Which version of n8n are you running? You can find this in Settings → About, or in the debug info at the bottom of the bug report form."

**Missing hosting/environment:**
> "Are you using n8n Cloud, or is this a self-hosted setup?"

---

## Step 5: Output Format

Present the output in two clearly separated sections:

1. **Structured Summary** (from Step 3)
2. **Follow-up Questions** — only if there are gaps. If the ticket is complete, say so explicitly: "This ticket has all the information needed to begin investigation. No follow-up required."

Do not include fields in the summary that are entirely absent — omit them cleanly. Do not pad the output or repeat information.

---

## Judgment Guidance

### The "good ticket" bar
A ticket meets the bar if an engineer can:
1. Understand what broke and why it matters
2. Reproduce the issue independently
3. Know what "fixed" looks like

### Handling messy-but-useful tickets
Some tickets are poorly structured but contain the necessary information scattered across the description, comments, and debug blocks. Extract and consolidate what's there — don't penalize structure if the substance is present.

### Handling well-structured but thin tickets
A ticket with perfect formatting but vague reproduction steps ("just use the node") is worse than a messy ticket with detailed steps. Prioritize substance over structure in your assessment.
