---
name: trigger-webhook-security
description: Implements webhook signature verification for trigger nodes. Use when adding security to trigger nodes like FigmaTrigger, LinearTrigger, or any webhook-based trigger node. Reads Linear tickets, researches APIs, implements solutions, runs tests, and creates PRs.
allowed-tools: Bash(git:*), Bash(gh:*), Bash(pnpm:*), Bash(curl:*), Read, Grep, Glob, Write, StrReplace, WebSearch, WebFetch
---

# Trigger Webhook Security

Add HMAC signature verification to webhook trigger nodes.

## Goal

Given a Linear ticket (NODE-XXXX) for a trigger node, implement webhook signature verification so only authentic requests are processed.

## Available Resources

**Linear MCP** (server: `user-Linear`):
- `get_issue` - Read ticket details (node name, requirements, branch name)
- `create_comment` - Report findings or blockers

**Reference implementations** in `packages/nodes-base/`:
- GitHub: `nodes/Github/GithubTrigger.node.ts` + `GithubTriggerHelpers.ts`
- Zendesk: `nodes/Zendesk/ZendeskTrigger.node.ts` + `ZendeskTriggerHelpers.ts`
- Slack: `nodes/Slack/SlackTrigger.node.ts` + `SlackTriggerHelpers.ts`

## Implementation Patterns

| Pattern | When | Secret Source |
|---------|------|---------------|
| Auto-generate | API accepts secret on webhook creation | `randomBytes(32).toString('hex')` |
| Fetch from API | API provides secret after creation | `GET /webhooks/{id}/signing_secret` |
| User-provided | User configures in credentials | `this.getCredentials()` |

## What to Implement

1. **`{NodeName}TriggerHelpers.ts`** - `verifySignature()` function using HMAC-SHA256
2. **`{NodeName}Trigger.node.ts`** - Store secret in `create()`, verify in `webhook()`, cleanup in `delete()`
3. **`__tests__/`** - Tests for valid/invalid signatures, backwards compatibility

## Key Requirements

- Use `timingSafeEqual` for constant-time comparison (prevent timing attacks)
- Backwards compatible: return `true` if no secret configured
- Return 401 Unauthorized for invalid signatures
- Store secret in `webhookData.webhookSecret` (workflow static data)

## Workflow

1. **Read Linear ticket** → get node name and requirements
2. **Create branch** per AGENTS.md conventions
3. **Research API docs** → find signature header, format, algorithm
4. **Implement** based on pattern that fits
5. **Write tests** → study existing test files for patterns
6. **Validate** → `pnpm lint`, `pnpm typecheck`, `pnpm test`
7. **Create PR** using `create-pr` skill

## If API Doesn't Support Signatures

Comment on Linear ticket with:
- Documentation URLs reviewed
- Finding: what's missing (no signing endpoint, no signature headers, etc.)
- Do NOT implement partial solutions

## Success Criteria

- [ ] Signature verification working
- [ ] Tests passing
- [ ] Lint/typecheck passing
- [ ] PR created with proper title: `feat({NodeName} Trigger Node): Add webhook signature verification`
