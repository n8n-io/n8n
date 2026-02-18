---
name: loom-transcript
description: Fetch and display the full transcript from a Loom video URL. Use when the user wants to get or read a Loom transcript.
argument-hint: [loom-url]
compatibility:
	requires:
		- plugin: playwright
			description: Official Playwright plugin — provides browser automation tools for navigating Loom and extracting transcript content
---

# Loom Transcript Fetcher

Fetch the transcript from a Loom video using Playwright browser automation.

## Prerequisites

**Required:**
- **Playwright plugin** (`plugin_playwright`): This skill relies entirely on browser automation to load the Loom page and extract transcript content. Without it, the skill cannot function. The plugin must be installed from the official Claude Code plugin repository. If unavailable, stop and tell the user to install it via `/install-plugin playwright` or the equivalent command.

## Instructions

Given the Loom URL: $ARGUMENTS

1. First, load the Playwright tools using ToolSearch with query "+playwright navigate"

2. Navigate to the Loom URL using `mcp__plugin_playwright_playwright__browser_navigate`

3. Wait for the page to load, then look for a "Transcript" tab in the page snapshot

4. Click on the Transcript tab using `mcp__plugin_playwright_playwright__browser_click` with the appropriate ref

5. After clicking, the transcript content will appear in the page snapshot. Extract all transcript segments which include:
	- Timestamp (e.g., "0:00", "0:14", etc.)
	- Transcript text for that segment

6. Format and present the full transcript to the user with:
	- Video title (from page title)
	- Duration (if visible)
	- Full transcript organized by timestamp

## Example Output Format

**Video:** [Title]
**Duration:** [Duration]

---

**0:00** - First transcript segment text...

**0:14** - Second transcript segment text...

(continue for all segments)

---

## Notes

- If the Transcript tab is not immediately visible, the page may still be loading. Wait and retry.
- Some Loom videos may not have transcripts available.
- The transcript is auto-generated and may contain minor errors.
