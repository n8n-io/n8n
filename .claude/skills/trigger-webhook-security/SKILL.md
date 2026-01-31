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

| File | Test File Required |
|------|-------------------|
| `{NodeName}TriggerHelpers.ts` | `__tests__/{NodeName}TriggerHelpers.test.ts` |
| `{NodeName}Trigger.node.ts` | `__tests__/{NodeName}Trigger.node.test.ts` |

**Every changed file must have a corresponding test file covering the changes.**

## Key Requirements

- Use `timingSafeEqual` for constant-time comparison (prevent timing attacks)
- Backwards compatible: return `true` if no secret configured
- Return 401 Unauthorized for invalid signatures
- Store secret in `webhookData.webhookSecret` (workflow static data)
- **All tests must pass before creating PR**

## Workflow

1. **Read Linear ticket** → get node name and requirements
2. **Assign ticket to me** with `no-docs-needed` label
3. **Create branch** per AGENTS.md conventions
4. **Research API docs** → find signature header, format, algorithm
5. **Implement** based on pattern that fits
6. **Write tests** for every changed file (study existing test files for patterns)
7. **Run tests** → `pnpm test {NodeName}` - must all pass
8. **Validate** → run from `packages/nodes-base/`: `pnpm lint`, `pnpm typecheck`
9. **Create PR** using `create-pr` skill

## If API Doesn't Support Signatures

Comment on Linear ticket with:
- Documentation URLs reviewed
- Finding: what's missing (no signing endpoint, no signature headers, etc.)
- Do NOT implement partial solutions

## Success Criteria

- [ ] Signature verification implemented
- [ ] Every changed file has corresponding test file
- [ ] All tests pass
- [ ] Lint passes (in `packages/nodes-base/`)
- [ ] Typecheck passes (in `packages/nodes-base/`)
- [ ] PR created: `feat({NodeName} Trigger Node): Add webhook signature verification`
