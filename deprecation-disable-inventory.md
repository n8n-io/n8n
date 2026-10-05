# Deprecation disable inventory for PR #40168

Source: https://github.com/n8n-io/n8n/pull/40168

PR #40168 enables `typescript/no-deprecated` and adds a baseline for existing use of deprecated APIs. This document groups that baseline into ticket-sized migrations and records the related Linear issues.

## Linear tracking

- Parent: [DEVP-1225 Remove the typescript no-deprecated baseline](https://linear.app/n8n/issue/DEVP-1225/remove-the-typescript-no-deprecated-baseline)
- [DEVP-1231 Migrate license checks to LicenseState](https://linear.app/n8n/issue/DEVP-1231/migrate-license-checks-to-licensestate)
- [DEVP-1230 Replace deprecated database transaction and query APIs](https://linear.app/n8n/issue/DEVP-1230/replace-deprecated-database-transaction-and-query-apis)
- [DEVP-1233 Replace deprecated execution and workflow state fields](https://linear.app/n8n/issue/DEVP-1233/replace-deprecated-execution-and-workflow-state-fields)
- [DEVP-1226 Retire legacy HTTP request and URL APIs](https://linear.app/n8n/issue/DEVP-1226/retire-legacy-http-request-and-url-apis)
- [DEVP-1232 Update Agent runtime and MCP dependency APIs](https://linear.app/n8n/issue/DEVP-1232/update-agent-runtime-and-mcp-dependency-apis)
- [DEVP-1227 Replace deprecated list-query and controller APIs](https://linear.app/n8n/issue/DEVP-1227/replace-deprecated-list-query-and-controller-apis)
- [DEVP-1228 Remove persisted compatibility formats after support windows](https://linear.app/n8n/issue/DEVP-1228/remove-persisted-compatibility-formats-after-support-windows)
- [DEVP-1229 Replace remaining deprecated platform and tooling APIs](https://linear.app/n8n/issue/DEVP-1229/replace-remaining-deprecated-platform-and-tooling-apis)

## Baseline summary

The PR adds 214 `typescript/no-deprecated` disable directives across 108 files. A file-level directive can hide more than one deprecated use, so these numbers count directives, not diagnostics.

| Package | Directives | Files | Default owner |
| --- | ---: | ---: | --- |
| `packages/cli` | 146 | 66 | `@n8n-io/catalysts`, with path-specific owners |
| `packages/core` | 26 | 12 | `@n8n-io/catalysts` |
| `packages/@n8n/agents` | 20 | 12 | `@n8n-io/ai` |
| `packages/@n8n/backend-network` | 8 | 6 | `@n8n-io/catalysts` |
| `packages/@n8n/db` | 5 | 5 | `@n8n-io/catalysts` |
| `packages/@n8n/ai-workflow-builder.ee` | 3 | 1 | `@n8n-io/ai` |
| `packages/@n8n/instance-ai` | 2 | 2 | `@n8n-io/ai-assistant` |
| `packages/@n8n/errors` | 1 | 1 | `@n8n-io/catalysts` |
| `packages/@n8n/mcp-browser` | 1 | 1 | `@n8n-io/nodes` |
| `packages/@n8n/node-cli` | 1 | 1 | `@n8n-io/nodes` |
| `packages/@n8n/workflow-sdk` | 1 | 1 | `@n8n-io/ai-assistant` |

The package totals do not describe the best ticket boundaries. Most CLI disables belong to four cross-package themes: license access, execution state, workflow publication state, and transactions.

## Recommended tickets

### 1. Migrate CLI license checks from `License` to `LicenseState`

**Suggested owner:** `@n8n-io/iam`, with reviews from affected feature owners

**Why one ticket:** The deprecated methods are compatibility wrappers around `LicenseState`. Replacing them consistently avoids a partial migration in `FrontendService`, which currently concentrates many of the disables.

**Main scope:**

- `packages/cli/src/services/frontend.service.ts`
- `packages/cli/src/license.ts`
- `packages/cli/src/license/license.service.ts`
- Authentication, password reset, user, execution, workflow, source-control, community-package, and orchestration call sites under `packages/cli/src`
- Instance AI adapter call sites that use `License.isSharingEnabled()`

**Deprecated surface:** `isSharingEnabled`, `isLogStreamingEnabled`, `isLdapEnabled`, `isSamlEnabled`, `isAiAssistantEnabled`, `isAskAiEnabled`, `isAiCreditsEnabled`, `isAdvancedExecutionFiltersEnabled`, `isAdvancedPermissionsLicensed`, `isDebugInEditorLicensed`, `isBinaryDataS3Licensed`, `isMultiMainLicensed`, `isVariablesEnabled`, `isSourceControlLicensed`, `isExternalSecretsEnabled`, `isWorkerViewLicensed`, `isCustomNpmRegistryEnabled`, `isFoldersEnabled`, quota getters, and `isWithinUsersLimit`.

**Plan:**

1. Map each deprecated wrapper to its `LicenseState` equivalent.
2. Define how quota values and unlimited quotas are represented in `LicenseState`.
3. Migrate `FrontendService` first and verify the complete frontend settings payload.
4. Migrate feature-owned call sites in small commits or stacked PRs.
5. Remove wrappers from `License` only after all consumers are migrated.

**Acceptance criteria:**

- No `typescript/no-deprecated` disables remain for `License` methods.
- `FrontendService` produces the same settings for licensed, unlicensed, and unlimited plans.
- User quota, active workflow quota, variable quota, team project quota, and Gateway credits behavior have focused tests.
- The deprecated wrappers can be removed or have no internal consumers.

**Risk:** Medium. Several wrappers do more than rename a check, and the note on `getTriggerLimit()` says that a direct migration currently breaks tests.

### 2. Replace data-table `withTransaction` use with `TransactionRunner`

**Suggested owner:** `@n8n-io/adore`

**Why one ticket:** This is a contained module migration with 24 disables across its repository and DDL files.

**Scope:**

- `packages/cli/src/modules/data-table/data-table-column.repository.ts`
- `packages/cli/src/modules/data-table/data-table-ddl.service.ts`
- `packages/cli/src/modules/data-table/data-table-rows.repository.ts`
- `packages/cli/src/modules/data-table/data-table.repository.ts`

**Plan:**

1. Move transaction orchestration to `TransactionRunner`.
2. Replace optional `EntityManager` arguments with `OperationContext`.
3. Make repositories extend `BaseRepository` where required and use `managerFor(ctx)`.
4. Thread one context through compound table, column, and row operations.
5. Preserve DDL transaction behavior for SQLite and PostgreSQL.

**Acceptance criteria:**

- The module does not call deprecated `withTransaction`.
- Public service methods accept domain inputs and do not expose TypeORM transaction types.
- Existing transaction rollback tests pass for table creation, schema changes, row writes, and deletion.
- Package lint and typecheck pass without related disables.

**Risk:** Medium-high. DDL support and dynamic row tables use lower-level database APIs.

### 3. Replace remaining CLI `withTransaction` use by feature owner

**Suggested owners:** `@n8n-io/ai` for Chat Hub and `@n8n-io/iam` for API keys; Catalysts for shared persistence guidance

**Scope:**

- `packages/cli/src/modules/chat-hub/chat-hub-tool.service.ts`
- `packages/cli/src/modules/chat-hub/chat-message.repository.ts`
- `packages/cli/src/services/public-api-key.service.ts`

**Plan:** Use the same `TransactionRunner` and `OperationContext` pattern as the persistence boundary guidance. Keep Chat Hub and IAM changes as separate implementation PRs if ownership or release timing differs.

**Acceptance criteria:**

- No deprecated `withTransaction` calls remain outside migrations.
- Nested operations join an existing transaction instead of opening a second transaction.
- Rollback behavior has focused tests.

**Risk:** Medium.

### 4. Replace the deprecated execution `finished` field with execution status

**Suggested owner:** `@n8n-io/catalysts`; coordinate Public API changes with `@n8n-io/ligo` and Chat Hub changes with `@n8n-io/ai`

**Why one ticket:** `finished` is read and written throughout execution persistence, runners, webhooks, scaling, telemetry, public API mapping, and agent resumption. A local replacement can create inconsistent terminal-state behavior.

**Main scope:**

- `packages/@n8n/db/src/repositories/execution.repository.ts`
- `packages/cli/src/execution-lifecycle/`
- `packages/cli/src/executions/`
- `packages/cli/src/scaling/`
- `packages/cli/src/webhooks/`
- `packages/cli/src/workflow-runner.ts`
- `packages/cli/src/workflow-execute-additional-data.ts`
- `packages/cli/src/wait-tracker.ts`
- Execution event relays and Public API response mappers
- `packages/core/src/execution-engine/workflow-execute.ts`
- Agent and Chat Hub execution watchers

**Plan:**

1. Define the canonical terminal-state predicate from `ExecutionStatus`.
2. Replace internal reads of `finished` with that predicate.
3. Stop writing `finished` when status already expresses the state.
4. Preserve `finished` only at external compatibility boundaries that still require it.
5. Migrate repository filters such as `requireNotFinished` to status-based filters.
6. Decide the Public API compatibility and removal timeline separately from the internal migration.

**Acceptance criteria:**

- Internal execution lifecycle decisions use status, not `finished`.
- Waiting, canceled, crashed, errored, and successful executions have explicit tests.
- Queue-mode and regular-mode execution behavior is equivalent.
- Public API responses remain compatible until a separately approved API change.
- Remaining disables, if any, exist only on documented compatibility serialization boundaries.

**Risk:** High. The old Boolean does not map one-to-one to all execution statuses.

### 5. Remove internal use of deprecated workflow `active`

**Suggested owner:** `@n8n-io/catalysts`; coordinate Public API changes with `@n8n-io/ligo` and AI-owned consumers with their owners

**Why one ticket:** Workflow publication now uses active versions, but creation, execution, rollback, deletion, list responses, and AI workflows still read or assign `workflow.active`.

**Main scope:**

- `packages/@n8n/db/src/repositories/workflow-published-version.repository.ts`
- `packages/cli/src/workflows/`
- `packages/cli/src/node-execution/execute-node.service.ts`
- `packages/cli/src/modules/chat-hub/chat-hub-workflow.service.ts`
- `packages/cli/src/executions/execution.service.ts`
- `packages/cli/src/public-api/v1/controllers/workflows.public.controller.ts`
- `packages/cli/src/modules/instance-ai/eval/thread-restore.service.ts`

**Plan:**

1. Define the canonical internal published-state check from `activeVersionId` and publication data.
2. Remove assignments to `active` when creating temporary, archived, retry, and Chat Hub workflows.
3. Return explicit compatibility values at API boundaries instead of mutating entities.
4. Update rollback, delete, deactivate, and publication flows together.
5. Decide the persistence-column migration separately if the database field remains for compatibility.

**Acceptance criteria:**

- Internal business logic does not depend on `WorkflowEntity.active`.
- Publish, deactivate, rollback, delete, retry, and temporary workflow tests pass.
- Public API compatibility is maintained or versioned explicitly.
- Related disables are removed from CLI and DB repositories.

**Risk:** High. Publication is an active area and has required ownership review.

### 6. Replace deprecated list-query types and controller middleware

**Suggested owner:** `@n8n-io/catalysts`, with feature-owner reviews

**Scope:**

- `ListQuery.Options` aliases in credential, folder, and workflow repositories
- `listQueryMiddleware` use in workflow, credential, MCP, and test-run controllers
- `packages/cli/src/workflows/workflow-finder.service.ts`

**Plan:**

1. Identify the supported request DTO and repository query types.
2. Keep HTTP parsing in controllers and pass domain-shaped filters to repositories.
3. Replace legacy middleware on each endpoint.
4. Remove repository dependencies on the deprecated shared `ListQuery.Options` type.

**Acceptance criteria:**

- No repository accepts the legacy HTTP list-query type.
- Pagination, filtering, field selection, sorting, and relation loading remain covered.
- Controllers do not use deprecated list-query middleware.

**Risk:** Medium. Query behavior differs across workflows, credentials, folders, MCP, and evaluations.

### 7. Retire the legacy request and OAuth request stack

**Suggested owner:** `@n8n-io/catalysts`

**Why one ticket:** Whole-file disables in the adapters hide the largest unknown number of deprecated references. The compatibility stack spans `backend-network` and `core` and must preserve community-node behavior.

**Scope:**

- `packages/@n8n/backend-network/src/http/legacy-request.ts`
- `packages/@n8n/backend-network/src/http/axios/legacy.ts`
- Related request, utility, outbound HTTP, and testing helpers
- `packages/core/src/execution-engine/node-execution-context/utils/request-helpers/`
- `packages/core/src/execution-engine/eval-mock-helpers.ts`
- Credential test request helpers

**Deprecated surface:** `IRequestOptions`, `proxyRequestToAxios`, legacy `request`, `requestOAuth1`, `requestOAuth2`, pagination adapters, and associated Axios compatibility types.

**Plan:**

1. Inventory external and community-node contracts that still expose `helpers.request`.
2. Keep one explicit compatibility adapter at the public node boundary.
3. Convert internal code to `IHttpRequestOptions` and the supported HTTP client.
4. Move OAuth transformations to the supported request path.
5. Remove whole-file disables before removing the adapter itself.

**Acceptance criteria:**

- Internal callers use the current HTTP request API.
- OAuth1, OAuth2, proxy, pagination, binary response, redirect, and error behavior have parity tests.
- The compatibility API for shipped community nodes remains documented and tested.
- Whole-file `typescript/no-deprecated` disables are removed.

**Risk:** High. This is a shipped extension boundary and needs backward compatibility.

### 8. Migrate `@n8n/agents` to current AI SDK response APIs

**Suggested owner:** `@n8n-io/ai`

**Scope:**

- `runtime/loop/agent-runtime.ts`: `onStepFinish` compatibility
- Generate and stream sinks: deprecated response messages and provider metadata
- Observation, episodic memory, title generation, and tool-result memory
- Content tool-result part types in tool guards

**Plan:**

1. Replace `onStepFinish` fallback with `onStepEnd` at the package API boundary.
2. Use the AI SDK's final-step response and metadata fields consistently for generated and streamed results.
3. Update token-usage conversion to the current provider metadata location.
4. Migrate deprecated content tool-result shapes to the current output model.
5. Update fixtures and recorded integration cassettes only where request or response shapes change.

**Acceptance criteria:**

- No AI SDK deprecation disables remain in `@n8n/agents` runtime code.
- Generate and stream paths report equivalent messages, usage, finish reasons, and provider metadata.
- Observation memory and title generation tests cover provider metadata.
- Tool results preserve text, media, truncation, and offloading behavior.

**Risk:** Medium-high. A comment records that switching episodic memory to `finalStep.providerMetadata` currently breaks tests.

### 9. Replace deprecated MCP SSE transport in `@n8n/agents`

**Suggested owner:** `@n8n-io/ai`

**Scope:**

- `packages/@n8n/agents/src/runtime/mcp/mcp-connection.ts`
- `packages/@n8n/agents/src/__tests__/integration/mcp-server-helpers.ts`

**Plan:** Prefer Streamable HTTP for supported servers. Keep SSE only as an explicit compatibility fallback if the MCP SDK still supports that negotiation path.

**Acceptance criteria:**

- New connections use Streamable HTTP.
- Legacy SSE behavior has an explicit support decision and test.
- The `SSEClientTransport` disable is removed, or the remaining fallback has a time-bound removal issue.

**Risk:** Medium. Removing SSE without negotiation can disconnect existing MCP servers.

### 10. Migrate deprecated AI tool execution-context mutation methods

**Suggested owner:** `@n8n-io/catalysts`, with `@n8n-io/ai` review

**Scope:**

- `packages/core/src/execution-engine/node-execution-context/supply-data-context.ts`
- `packages/cli/src/scaling/job-processor.ts`

**Deprecated surface:** `addInputData` and `addOutputData`.

**Plan:** Replace direct run-data mutation with the current execution-context result and input APIs. Preserve the cloned supply-data context behavior and worker error reporting.

**Acceptance criteria:**

- AI tool input, success output, and error output appear correctly in execution data.
- Cloned supply-data contexts retain replacement input data.
- Main mode and worker mode have parity tests.
- All related disables are removed.

**Risk:** Medium-high. The PR review called out edge cases in `SupplyDataContext.cloneWith()`.

### 11. Complete Code Builder checkpoint migration

**Suggested owner:** `@n8n-io/ai`

**Scope:** `packages/@n8n/ai-workflow-builder.ee/src/code-builder/utils/code-builder-session.ts`

**Deprecated surface:** Legacy `userMessages` checkpoints migrated to `conversationEntries` on load.

**Plan:**

1. Measure whether legacy checkpoints still exist in supported deployments.
2. Define a retention or minimum-version boundary.
3. Backfill checkpoints or keep one isolated decoder until the boundary passes.
4. Remove `userMessages` from the steady-state session type.

**Acceptance criteria:**

- Current checkpoints use `conversationEntries` only.
- Legacy data has a tested migration or an approved end-of-support boundary.
- The three disables are removed after the compatibility window closes.

**Risk:** Low for code, medium for persisted data. Do not remove this compatibility path without a concrete data-retention decision.

### 12. Remove deprecated cron recurrence support

**Suggested owner:** `@n8n-io/catalysts`

**Scope:**

- `packages/core/src/execution-engine/node-execution-context/utils/scheduling-helper-functions.ts`
- `packages/core/src/execution-engine/scheduled-task-manager.ts`

**Plan:** Convert callers to the supported cron expression representation. Remove `CronContext['recurrence']` from scheduled task state when no shipped node requires it.

**Acceptance criteria:**

- Cron registration uses the supported schedule shape.
- Existing interval, timezone, activation, and restart tests pass.
- Both recurrence disables are removed.

**Risk:** Medium. Existing workflows can contain older schedule parameter shapes.

## Small standalone tickets

These are valid cleanups but should not block the larger migrations or be combined into one miscellaneous PR.

| Ticket | Owner | Sites | Exit condition |
| --- | --- | --- | --- |
| Replace deprecated OpenTelemetry proxy-provider APIs | `@n8n-io/ligo`, with AI review | `packages/cli/src/modules/otel/otel.service.ts`, Agents OTel test provider | Global-provider detection and no-op detection use supported public APIs; four disables removed. |
| Replace deprecated Node URL parsing | `@n8n-io/iam` and AI | SAML referer parsing, Chat server URL parsing, auth request URL parsing | Use `URL` or `URLSearchParams`; preserve relative URL and query behavior. |
| Replace deprecated SAML relay-state mutation | `@n8n-io/iam` | `packages/cli/src/modules/sso-saml/saml.service.ee.ts` | Pass relay state through the supported library API; add redirect and POST binding tests. |
| Replace TypeORM `.onConflict()` | MCP Registry owner | `packages/cli/src/modules/mcp-registry/registry/mcp-registry-server.repository.ts` | Preserve the conditional timestamp upsert without a deprecated query-builder API. |
| Replace generic user repository updates | `@n8n-io/iam` | MFA, token exchange, E2E ownership transfer | Add use-case-named repository methods; remove three disables from production code. |
| Remove legacy config-schema type traversal | `@n8n-io/catalysts` | `packages/cli/src/config/types.ts` | Move remaining consumers to `@n8n/config`; remove both type-level disables. |
| Remove CLI `execute --file` compatibility path | `@n8n-io/catalysts` | `packages/cli/src/commands/execute.ts` | Confirm replacement and removal policy; remove the deprecated flag reference. |
| Remove scaling job-finished V1 compatibility | `@n8n-io/catalysts` | `packages/cli/src/scaling/scaling.types.ts` | All supported workers send V2; remove V1 union and disable after compatibility window. |
| Remove workflow SDK `embeddings` alias | `@n8n-io/ai-assistant` | `packages/@n8n/workflow-sdk/src/workflow-builder/subnode-utils.ts` | Generated and handwritten consumers use `embedding`; keep a release-note or compatibility decision. |
| Remove Instance AI legacy verification and tarball aliases | `@n8n-io/ai-assistant` | `prepare-run.ts`, `pack-workspace-sdk.ts` | Migrate `verificationPinData` and `WorkspaceSdkTarball` consumers; remove two disables. |
| Replace deprecated `Document.write()` in MCP browser test | `@n8n-io/nodes` | `packages/@n8n/mcp-browser/src/sensitivity/html-probe.test.ts` | Build iframe test content through supported DOM APIs without changing probe coverage. |
| Remove deprecated ESLint config usage from node CLI | `@n8n-io/nodes` | `packages/@n8n/node-cli/src/configs/eslint.ts` | Complete the planned Oxlint replacement and remove the disable. |
| Stop re-exporting the deprecated compatibility error | `@n8n-io/catalysts` | `packages/@n8n/errors/src/index.ts` | Confirm external compatibility policy; remove the internal export or isolate it in a compatibility entry point. |
| Replace deprecated Axios error helper import | `@n8n-io/catalysts` | Core error reporter and workflow execution | Import the supported helper from its owning package or use the shared HTTP error guard; preserve sanitization behavior. |

## Explicit non-ticket baseline

`packages/@n8n/db/oxlint.config.mts` disables the rule for database migrations. Historical migrations must remain immutable and can intentionally use APIs that were current when the migration shipped. Keep this scoped override unless migration policy changes.

## Suggested order

1. Data-table and remaining `TransactionRunner` migrations.
2. License-to-`LicenseState` migration.
3. List-query migration.
4. Agent AI SDK migration and MCP transport migration.
5. Execution `finished` migration.
6. Workflow `active` migration.
7. Legacy request stack retirement.
8. AI tool execution-context migration.
9. Cron recurrence migration.
10. Persisted compatibility cleanup after retention boundaries are agreed.

The execution, workflow publication, and request-stack tickets should each use a short design note before implementation. They cross package or compatibility boundaries and are not safe mechanical replacements.

## Ticket template

Use this body when the plans move to Linear:

```markdown
## Context

PR #40168 enabled `typescript/no-deprecated` and added baseline disables for this deprecated API.

## Scope

- <paths and API surface>

## Plan

1. <migration step>

## Acceptance criteria

- The affected `typescript/no-deprecated` disables are removed.
- Focused tests cover old and new behavior.
- Package lint and typecheck pass.

## Compatibility and risk

<persisted data, public API, extension, or mixed-version deployment constraints>
```
