# Agent frontend

Read `agents-design-language.md` before you change Agent interface behavior or
visuals. It is the source of truth for reusable Agent-specific patterns.

Keep feature-specific components in this module. Use the shared Design System
for primitives. Do not change the Design System for an Agent-only need unless
the user explicitly asks for this change.

For modal work, use `components/modals/AgentModal.vue`. Use
`components/modals/AgentModalMultiStep.vue` when the user selects an item before
they configure it.
