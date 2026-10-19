# Instance AI backend

Follow the CLI and repository instructions.

## Agents boundary

- Call the focused Agent services directly. Use only the service and contract paths documented in [Agents guidance](../agents/AGENTS.md) and enforced by `agents-instance-ai-boundary`.
- Use the public `@n8n/agents` SDK entry points. Do not import its source files.
- Keep Assistant adapters, context presentation, required artifacts, and builder instructions here.
- Run Agent Builder tools in the orchestrator. Keep its model policy, billing, and run telemetry here. Do not restore the builder sub-agent runtime.
- Keep pending-artifact attestation and thread binding here. Bind the persisted draft before requesting its runnable state.
- Keep evaluation scenarios, mock responses, recording, and result orchestration here. Use the Agents preparation handle for data access and uncached runtime construction.
