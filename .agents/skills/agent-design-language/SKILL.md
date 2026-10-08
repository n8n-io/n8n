---
name: n8n:agent-design-language
description: Design or review Agent Builder interfaces. Use for Agent configuration patterns, modal flows, responsive behavior, status treatments, and other Agent-only UI work.
---

# Agent design language

Use this skill only for interface work in
`packages/frontend/editor-ui/src/features/agents`.

Before you change code:

1. Read `packages/frontend/editor-ui/src/features/agents/AGENTS.md`.
2. Read `packages/frontend/editor-ui/src/features/agents/agents-design-language.md`
   completely.
3. Use [ui-design](../ui-design/SKILL.md) for visual implementation rules.
4. Use [content-design](../content-design/SKILL.md) when you add or change UI
   text.

Keep Agent-specific components in the Agent feature. Do not change the Design
System unless the user explicitly asks for this change.

Update the design language document when you establish a reusable Agent
interface pattern. Add or update tests for the behavior that you change.
