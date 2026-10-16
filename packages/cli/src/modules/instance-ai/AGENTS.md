# Instance AI backend

Follow the CLI and repository instructions.

## Agents boundary

- Import backend Agent operations and contracts only from `@/modules/agents/public-api`.
- Use the public `@n8n/agents` SDK entry points. Do not import its source files.
- Keep Assistant adapters, context presentation, required artifacts, and builder instructions here.
- Resolve builder model policy here. Capture the user, Agent, visible thread, and host run in the memory usage callback. The callback can outlive foreground streaming.
- Keep pending-artifact attestation and thread binding here. Bind the persisted draft before requesting its runnable state.
- Keep evaluation scenarios, mock responses, recording, and result orchestration here. Use the Agents preparation handle for data access and uncached runtime construction.
