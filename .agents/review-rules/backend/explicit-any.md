# `any` where a real type is available

Applies to: `packages/cli`, `packages/workflow`, `packages/nodes-base`,
`packages/@n8n/nodes-langchain`.

`@typescript-eslint/no-explicit-any` is downgraded to a warning in these
packages, and `pnpm lint` runs `--quiet`, so warnings never surface.

Flag a new `any` there when `unknown` plus a type guard, or an existing
interface, would do. Do not flag `any` in test code.
