# AGENT-963: Production n8n Chat Infrastructure

Status: Backend implemented. The channel storage design was revised on 2026-09-24. Focused unit, API, repository, and recorded model tests pass.

## Goal

Let an authenticated user chat with a published agent through n8n Chat. Keep the agent editor preview on the draft. Use separate endpoints and execution sources. Share the chat transport and agent runtime.

Production chat is available only when the active published version includes the n8n Chat channel. Draft edits do not change production availability. Unpublish and deletion make the channel unavailable.

## Channel Configuration

- The n8n Chat integration implementation is always registered. Preview injects its tools per run and does not require a configured channel.
- A draft `n8n_chat` entry in `Agent.integrations` enables the production channel on the next publish. Remove the entry to disable it on the next publish.
- The entry is credential-free. The shared config schema normalizes its unused `credentialId` to an empty string. The connect endpoint remains for credential-backed channels.
- A publish stores only the n8n Chat entry from draft integrations in `AgentHistory.schema.integrations`. This uses the existing versioned JSON column. It adds no database column or migration. Slack, Telegram, Linear, and Discord keep their current unversioned behavior.
- A historical republish uses that version's saved channel entry. Reverting a version does not change the draft channel list.
- Production admission reads `Agent.activeVersion.schema.integrations`. It does not read mutable draft integrations. AGENT-960 discovery must use the same published entry for its SQL filter.
- The status response derives draft and published availability from these two sources. It reports n8n Chat as a channel without an external adapter or status row.
- External connection startup, reconciliation, credential checks, and credential grants skip n8n Chat. Its context and action tools remain per-run injections.

## Execution and Access

- Keep the existing preview routes, draft configuration, instruction, and recorded source unchanged.
- Record production runs with `n8n_chat_production`. Keep `n8n_chat` as the integration type for tool injection. Do not add the production source to preview source checks.
- Use the active published agent configuration for production turns, HITL resume, sub-workflow resume, and wake.
- Keep published tool and credential access project-scoped, as for Slack and Telegram. Use the authenticated user for request access, private thread ownership, attribution, and telemetry.
- Give production chat a separate user memory scope. Verify the thread source, owner, project, agent, checkpoint scope, and sandbox principal before continuation.
- Reject new and resumed turns when the active published channel is unavailable. Permit a suspended session after republish if its tool still exists.
- Do not cancel an established execution solely because the HTTP stream closes.

## Backend API

All production routes use `/projects/:projectId/agents/v2/:agentId/n8n-chat`. Preview keeps `/:agentId/chat`.

| Operation | Route suffix | Scope |
| --- | --- | --- |
| Send a message and stream a reply | `POST /` | `agent:execute` |
| Resume an HITL action | `POST /resume` | `agent:execute` |
| Cancel a running execution | `DELETE /:threadId/executions/:executionId` | `agent:execute` |
| Cancel a suspended run | `DELETE /runs/:runId` | `agent:execute` |
| Reload a private transcript | `GET /:threadId/messages` | `agent:read` |
| Read a stored attachment | `GET /attachments/:attachmentId` | `agent:read` |

Production returns an `agent_unavailable` SSE error when the active channel is unavailable. Foreign session reads return not found. The routes reuse the preview message DTOs, SSE transport, attachment handling, and execution core.

## Validation

- [x] Cover channel config, publish snapshots, historical republish, unpublish, and private thread access with unit and database tests.
- [x] Cover preview and production source isolation, cross-user access, and unavailable agents with API tests.
- [x] Cover streamed messages, HITL resume, images, and cancellation with a real agent and recorded model responses.
- [x] Keep live and record modes available locally. Replay model traffic in CI without a provider key.
- [x] Keep n8n Chat out of external adapter startup and reconciliation.
- [x] Keep generated database schema unchanged.
- [x] Recheck package lint, format, and typecheck after the channel storage change. API types pass. CLI lint and changed-file format pass. CLI typecheck has baseline errors outside the changed files.
- [ ] Coordinate AGENT-960 discovery with the published snapshot. Its current PR filters the mutable draft `integrations` column.
- [ ] Coordinate AGENT-949's channel UI with the `n8n_chat` entry in the draft config.

Run the model suite from `packages/cli` with `pnpm test:integration test/integration/agents/n8n-chat-production.model.test.ts`. Set `AGENT_N8N_CHAT_MODEL_TESTS=1` for local runs. Set `VCR_MODE=record` to write cassettes. Set `VCR_MODE=replay` to use them without a live key. CI uses replay automatically.

## Out of Scope

- Frontend implementation and execute-only transcript reads.
- A cross-project production session list and transcript clearing.
- Rate limiting.
- Versioning credential-backed channels.
- Recovery when a new published version removes a tool needed by a suspended run.
