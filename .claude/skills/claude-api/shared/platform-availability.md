# Platform Availability

Which features work on which provider platform. **This table is the single source of truth in this skill** - per-feature sections elsewhere point here instead of restating availability. When writing code for a third-party platform (Bedrock, Vertex, Foundry) or Claude Platform on AWS, check this table first; a feature not supported there means use the first-party Claude API surface or a different approach.

Columns: **1P** = first-party Claude API, **P-AWS** = Claude Platform on AWS (Anthropic-operated, same-day parity), **Bedrock** = Amazon Bedrock, **Vertex** = Google Cloud Vertex AI, **Foundry** = Microsoft Foundry. Yes = GA, beta = beta, No = not supported, unconfirmed = not verified either way when this was written.

| Feature | 1P | P-AWS | Bedrock | Vertex | Foundry | Notes |
|---|---|---|---|---|---|---|
| Messages, streaming, tool use | Yes | Yes | Yes | Yes | Yes | Core API |
| PDF input | Yes | Yes | Yes | Yes | Yes | |
| Structured outputs / strict tool use | Yes | Yes | Yes | Yes | Yes | |
| Adaptive thinking / effort | Yes | Yes | Yes | Yes | Yes | |
| Extended thinking | Yes | Yes | Yes | Yes | Yes | |
| Prompt caching (5m, 1h) | Yes | Yes | Yes | Yes | Yes | |
| Automatic prompt caching | Yes | Yes | Yes | Yes | Yes | The legacy Bedrock integration (Opus 4.6 and earlier) rejects top-level `cache_control` with a 400 - explicit breakpoints only there |
| Token counting | Yes | Yes | Yes | Yes | Yes | |
| Citations | Yes | Yes | Yes | Yes | Yes | |
| Search results content blocks | Yes | Yes | Yes | Yes | Yes | |
| Fine-grained tool streaming | Yes | Yes | Yes | Yes | Yes | Bedrock: `eager_input_streaming` on the newer serving stack only (Opus 4.7/4.8/5, Fable 5, Sonnet 4.6/5); older deployments (Opus 4.5/4.6, Sonnet 4.0/4.5, Haiku 4.5) 400 on the field |
| Compaction | beta | beta | beta | beta | beta | |
| Context editing | beta | beta | beta | beta | beta | |
| Context windows (1M) | Yes | Yes | Yes | Yes | Yes | |
| `inference_geo` (data residency) | Yes | Yes | No | No | No | |
| **Server-side tools** | | | | | | |
| &nbsp;&nbsp;Web search | Yes | Yes | No | Yes | Yes | Vertex: basic `web_search_20250305` only (no `_20260209` dynamic filtering). Foundry Hosted on Azure: basic `web_search_20250305` only |
| &nbsp;&nbsp;Web fetch | Yes | Yes | No | No | Yes | Foundry Hosted on Azure: basic `web_fetch_20250910` only |
| &nbsp;&nbsp;Code execution | Yes | Yes | No | No | Yes | Foundry: Hosted on Anthropic deployments only - Hosted on Azure returns a 400 |
| &nbsp;&nbsp;Tool search | Yes | Yes | Yes | Yes | Yes | Bedrock: InvokeModel API only, not Converse |
| &nbsp;&nbsp;Advisor tool | beta | beta | No | No | No | |
| **Client-implemented tools** | | | | | | |
| &nbsp;&nbsp;Bash, text editor, memory | Yes | Yes | Yes | Yes | Yes | |
| &nbsp;&nbsp;Computer use | beta | beta | beta | beta | beta | `computer_20251124` and older versions: beta on all five platforms. Claude Opus 5.5 accepts only `computer_toolset_20260801` (GA, no beta header) on the Claude API and Google Cloud, and still accepts `computer_20251124` on Amazon Bedrock (`shared/model-migration.md` -> Migrating to Claude Opus 5.5, breaking change 4). Claude Sonnet 5.5 accepts only the toolset on the Claude API and Google Cloud, but still accepts `computer_20251124` on Amazon Bedrock, and rejects `computer_20250124` everywhere (`shared/model-migration.md` -> Migrating to Claude Sonnet 5.5, breaking change 4) |
| **Agentic / orchestration** | | | | | | |
| &nbsp;&nbsp;Agent Skills (Messages API) | Yes | Yes | No | No | beta | Foundry: Hosted on Anthropic deployments only - Hosted on Azure returns a 400 |
| &nbsp;&nbsp;Programmatic tool calling | Yes | Yes | No | No | Yes | Foundry: Hosted on Anthropic deployments only - Hosted on Azure returns a 400 |
| &nbsp;&nbsp;MCP connector | beta | beta | No | No | beta | |
| &nbsp;&nbsp;Managed Agents | beta | beta | No | No | No | Foundry: No (inferred; not in Foundry docs either way) |
| &nbsp;&nbsp;Self-hosted sandboxes | beta | beta | No | No | No | P-AWS: worker authenticates with IAM/SigV4 or an AWS-Console API key + `AnthropicSelfHostedEnvironmentAccess` (Console environment keys don't work there); sessions on self-hosted environments cannot attach memory stores; `GET /v1/environments/{id}/work` list endpoint not supported, other work endpoints OK |
| **API endpoints** | | | | | | |
| &nbsp;&nbsp;Message Batches | Yes | Yes | No | No | No | |
| &nbsp;&nbsp;Files API | Yes | Yes | No | No | beta | Foundry: Hosted on Anthropic deployments only - Hosted on Azure returns a 400 |
| &nbsp;&nbsp;Models API | Yes | Yes | No | No | No | |
| **Other** | | | | | | |
| &nbsp;&nbsp;Mid-conversation system messages | Yes | Yes | Yes | Yes | No | Claude Opus 5, Claude Opus 5.5, Claude Opus 4.8, Claude Fable 5, Claude Fable 5.1, Claude Mythos 5, Claude Mythos 5.1, Claude Sonnet 5.5; not Claude Sonnet 5. Bedrock: InvokeModel passthrough, not ARN-versioned models |
| &nbsp;&nbsp;Mid-conversation tool changes | beta | beta | beta | beta | No | Same models as mid-conversation system messages; beta `mid-conversation-tool-changes-2026-07-01` |
| &nbsp;&nbsp;Turn-scoped (`clear_at`) system messages | beta | beta | beta | beta | No | Same models as mid-conversation system messages; beta `mid-conversation-system-clear-at-2026-08-21` (on Bedrock/Vertex pass the value as a beta) |
| &nbsp;&nbsp;Per-message `effort` (system message `output_config`) | beta | unconfirmed | unconfirmed | beta | unconfirmed | Claude Fable 5.1, Claude Mythos 5.1, Claude Opus 5, Claude Opus 5.5, Claude Sonnet 5.5 (thinking on only - a 400 with `between_tools`); beta `mid-conversation-output-config-2026-07-01`; on the Claude API and Google Cloud, open to any organization that sends the header (Claude Platform on AWS/Bedrock/Foundry unconfirmed; Claude Opus 5 excluded on Bedrock) |
| &nbsp;&nbsp;`thinking.display: "updates"` | beta | beta | beta | beta | beta | Claude Fable 5.1, Claude Mythos 5.1, Claude Fable 5, Claude Opus 5.5, Claude Sonnet 5.5 (with adaptive thinking); beta `thinking-display-updates-2026-08-18` (pass the beta value per platform); without it `"updates"` is rejected as an unknown `display` value |
| &nbsp;&nbsp;Thinking block-binding controls | beta | beta | beta | beta | unconfirmed | `thinking.block_binding` + `input_transformations`; beta `thinking-binding-controls-2026-08-01` (the same beta name on the Claude API, Claude Platform on AWS, Bedrock, and Vertex - Bedrock: the `anthropic_beta` body field, Vertex: the `anthropic-beta` HTTP header); Foundry unconfirmed; wherever the header is rejected, use strip-and-retry; the history-editing enforcement itself follows the account-age rule in `shared/model-migration.md` -> Migrating to Claude Fable 5.1 from Claude Fable 5 |
| &nbsp;&nbsp;Server-side `fallbacks` | beta | beta | No | No | No | `"default"` -> beta `server-side-fallback-2026-07-01`; array form -> beta `server-side-fallback-2026-06-01` |
| &nbsp;&nbsp;Fast mode | beta | No | No | No | No | Research preview, beta `fast-mode-2026-02-01`, first-party API only (Claude Opus 5 / Opus 4.8 at $10 / $50; Claude Opus 5.5 at $8 / $40) |
| &nbsp;&nbsp;Cache diagnostics | beta | No | No | No | No | First-party API only |
| &nbsp;&nbsp;Task budgets | beta | beta | No | No | No | Beta header `task-budgets-2026-03-13`; 3P availability not documented - assume unsupported |

