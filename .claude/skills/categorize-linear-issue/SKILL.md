---
name: categorize-linear-issue
description: "Determine which category a Linear issue falls into. Expects issue context to already be fetched via fetch-linear-issue. Use when someone wants an issue categorized, triaged, or classified."
---

# Categorize Linear Issue

Categorize a Linear issue into one of six categories based on its content.

## When to use this skill

Use this skill after `fetch-linear-issue` has already retrieved the issue context. Analyze the title, description, comments, and any media summaries to determine the category.

## Categories

### `security`

The issue involves a security vulnerability, data exposure, authentication/authorization flaw, or any other security concern. **Security always takes priority** — if an issue could be classified as both a bug and a security issue, use `security`.

### `bug`

The issue describes unintended or broken behavior (and is not a security issue).

### `feature request`

The issue asks for new functionality, an enhancement, or a change to how something works — not a report of something being broken.

### `expected behavior`

The behavior described is working as intended. The reporter may be confused about how the product works, or the behavior is intentional and documented. This is NOT a bug.

### `outdated`

The issue has already been resolved — either by a fix that has been shipped, or by the reporter themselves (e.g. they found a workaround or misconfiguration). Look for evidence in comments, linked PRs, or the issue status. **Be careful:** a fix being merged does not automatically mean the issue is outdated — if comments indicate the problem persists after the fix, classify based on the current state of the issue (likely `bug`), not the attempted fix.

### `other`

The issue doesn't fit into any of the above categories (e.g. question, task, documentation request, vague/unclear report).

---

## Categorization Logic

Follow this order when deciding:

1. Does the issue involve a **security vulnerability or concern**? → `security` (always wins, even if it also looks like a bug)
2. Has the issue **already been resolved** (fix shipped or reporter resolved it themselves)? → `outdated` — but only if there is no indication the problem persists after the fix. If comments suggest the issue is still happening despite a fix, do NOT use `outdated`.
3. Does the issue describe something **broken or unintended**? → `bug`
4. Is it requesting **new or changed functionality**? → `feature request`
5. Is the behavior **working as designed** (user confused or behavior is documented/intentional)? → `expected behavior`
6. Otherwise → `other`

**Distinguishing bug vs. expected behavior:** If it's unclear whether the behavior is intentional, check the codebase before deciding. Look for logic that explicitly produces the reported behavior — if the code clearly implements it on purpose, it's `expected behavior`. If the code doesn't justify the behavior or appears to be a mistake, it's a `bug`. Default to `bug` if the code doesn't give you a clear answer.

**Distinguishing bug vs. feature request:** Some issues are written in the language of a feature request ("it would be great if X worked") but are actually describing broken behavior. If the reported functionality is something the product is supposed to support, check the codebase — if the code suggests it should already work but doesn't, classify it as `bug`, not `feature request`.

---

## Output Format

State the category name only. Do not add commentary unless the user asks for it.
