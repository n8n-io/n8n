# Instance AI Proxy Maintainability Follow-ups

## Context

The `ins-643-support-openai-proxy-models-in-instance-ai` branch adds OpenAI
support for Instance AI proxy models, reasoning summary propagation, OpenAI
Responses replay safety, eval user-proxy strict structured output support, and
reload-time restoration of suspended setup confirmations.

A strict code-quality review found five maintainability issues to address before
the branch should be considered structurally clean.

## Goals

- Keep current runtime behavior.
- Delete duplicated confirmation parsing logic.
- Keep OpenAI strict structured-output compatibility out of the eval user-proxy
  domain model.
- Move provider-specific replay and persistence rules out of generic message
  conversion.
- Use one registry for Instance AI proxy providers.
- Stop `message-parser.ts` from absorbing more unrelated responsibilities.

## Non-Goals

- No new model providers beyond current Anthropic and OpenAI support.
- No UI behavior changes.
- No changes to public API response shapes.
- No broad rewrite of Instance AI message parsing.

## Constraints

- OpenAI strict response formats require JSON schemas of `type: "object"` with
  all object properties listed in `required`.
- OpenAI Responses state identifiers such as `itemId` and `responseId` must not
  be replayed when requests use `store: false`.
- Reasoning replay metadata is provider-specific:
  - Anthropic uses replay fields such as `signature` and `redactedData`.
  - OpenAI Responses uses `reasoningEncryptedContent`.
- Live SSE confirmation requests and reload-hydrated confirmation cards must be
  interpreted identically.

## Design

### 1. Single Source of Truth for Suspended Confirmation Mapping

Current issue: `InstanceAiMemoryService` reconstructs `InstanceAiConfirmation`
from checkpoint `pendingToolCalls` with a hand-written field list, while
`@n8n/instance-ai/src/stream/map-chunk.ts` independently parses the same
`suspendPayload` for live SSE events.

Target design:

- Extract a pure helper in `@n8n/instance-ai`, for example
  `src/stream/confirmation-request.ts`.
- The helper owns all parsing/defaulting for suspended tool-call confirmation
  payloads.
- Both live stream mapping and checkpoint hydration call this helper.

Suggested contract:

```ts
export interface SuspendedToolCallConfirmationInput {
	toolCallId: unknown;
	toolName: unknown;
	input: unknown;
	suspendPayload: unknown;
}

export interface ParsedSuspendedConfirmation {
	payload: InstanceAiConfirmationRequestPayload;
	confirmation: InstanceAiConfirmation;
}

export function parseSuspendedToolCallConfirmation(
	input: SuspendedToolCallConfirmationInput,
): ParsedSuspendedConfirmation | undefined;
```

Expected behavior:

- Return `undefined` when `toolCallId` or effective `requestId` is missing.
- Default `requestId` to `toolCallId`.
- Default `toolName` to `''`.
- Default `args` to `{}`.
- Default `severity` to `info`.
- Default `message` to `Confirmation required`.
- Preserve all existing optional confirmation fields:
  `credentialRequests`, `projectId`, `inputType`, `questions`,
  `introMessage`, `tasks`, `planItems`, `domainAccess`, `webSearch`,
  `credentialFlow`, `setupRequests`, `workflowId`, and `resourceDecision`.

Implementation notes:

- `mapSuspendedChunk()` should become a thin wrapper:
  parse the confirmation, then wrap `payload` in an `InstanceAiEvent`.
- `InstanceAiMemoryService` should only collect suspended pending tool calls and
  use `confirmation` from the helper.
- Do not duplicate schema parsing or field copying in CLI code.

### 2. Separate Eval User-Proxy Wire Schema from Domain Decision Model

Current issue: `decisionSchema` was flattened into a nullable mega-object to
satisfy strict response-format requirements. This makes every downstream caller
handle impossible nullable combinations.

Target design:

- Keep a strict wire schema solely for model structured output.
- Convert the wire shape into a discriminated internal `Decision` union at the
  boundary.
- Keep `encodeConfirmationDecision()` operating only on the discriminated union.

Suggested contracts:

```ts
export const wireDecisionSchema = z.object({
	action: z.enum([
		'answer_questions',
		'apply_setup_wizard',
		'approve_or_reject',
		'respond_to_domain_access',
		'pick_resource_decision',
		'send_follow_up_message',
		'declare_done',
	]),
	answers: z.array(wireAnswerSchema).nullable(),
	nodeParametersJson: z.string().nullable(),
	approved: z.boolean().nullable(),
	userInput: z.string().nullable(),
	response: z.enum(['allow_once', 'allow_all', 'deny']).nullable(),
	decision: z.string().nullable(),
	message: z.string().nullable(),
});

export type Decision =
	| { action: 'answer_questions'; answers: Answer[] }
	| { action: 'apply_setup_wizard'; nodeParametersJson: string }
	| { action: 'approve_or_reject'; approved: boolean; userInput?: string }
	| { action: 'respond_to_domain_access'; response: DomainAccessAction }
	| { action: 'pick_resource_decision'; decision: string }
	| { action: 'send_follow_up_message'; message: string }
	| { action: 'declare_done' };

export function parseWireDecision(value: WireDecision): Decision | undefined;
```

Expected behavior:

- `createUserProxyAgent()` uses `wireDecisionSchema` for structured output.
- Immediately after generation, parse the wire decision into `Decision`.
- Missing action-required fields should fail at the boundary and return
  `undefined`, preserving the existing fallback behavior.
- `encodeConfirmationDecision()` should not contain nullable-field guards for
  action-required fields.
- Tests should still assert the wire schema is OpenAI strict-compatible.

### 3. Extract Provider Replay and Persistence Policy

Current issue: `runtime/model/messages.ts` now contains OpenAI-specific state
stripping and provider-specific reasoning replay rules directly inside generic
message conversion.

Target design:

- Create a dedicated provider policy module in `@n8n/agents`, for example
  `src/runtime/model/provider-metadata-policy.ts`.
- Message conversion should call policy helpers, not know provider-specific
  blacklist or replay details.

Suggested contract:

```ts
export function sanitizeProviderMetadataForReplay(
	metadata: Record<string, unknown> | undefined,
): Record<string, unknown> | undefined;

export function sanitizeProviderOptionsForReplay(
	options: ProviderOptions | undefined,
): ProviderOptions | undefined;

export function getReasoningReplayProviderOptions(
	reasoning: ContentReasoning,
): ProviderOptions | undefined;

export function hasReplayableReasoningProviderOptions(
	options: ProviderOptions | undefined,
): boolean;
```

Expected behavior:

- Strip OpenAI transient Responses state from metadata/options:
  `itemId`, `responseId`, and `phase`.
- Strip null or undefined OpenAI `reasoningEncryptedContent`.
- Preserve OpenAI `reasoningEncryptedContent` when it is a string.
- Preserve Anthropic `signature` and `redactedData` replay metadata.
- Preserve non-empty provider options for other providers.
- Keep generic message conversion focused on:
  - content part conversion,
  - tool result splitting,
  - role mapping.

### 4. Use a Proxy Provider Registry

Current issue: supported proxy providers are parsed in
`InstanceAiSettingsService` and dispatched again in `InstanceAiModelService`.
Adding another provider would require editing several parallel condition chains.

Target design:

- Introduce a single registry for provider-specific proxy model behavior.
- Use the registry for validation, route selection, and model factory creation.

Suggested contract:

```ts
type InstanceAiProxyProvider = 'anthropic' | 'openai';

interface InstanceAiProxyProviderDefinition {
	route: `${string}/v1`;
	createModel: (input: {
		modelName: string;
		baseUrl: string;
		fetch: CustomFetch;
	}) => Promise<ModelConfig>;
}

export const INSTANCE_AI_PROXY_PROVIDERS: Record<
	InstanceAiProxyProvider,
	InstanceAiProxyProviderDefinition
>;
```

Expected behavior:

- `resolveProxyModelParts()` validates provider names against registry keys.
- `resolveProxyModel()` uses the selected provider definition.
- Proxy URL normalization happens once.
- Tests use table cases over registry-supported providers.
- User model preferences remain ignored in proxy mode.

### 5. Decompose Message Parser Responsibilities

Current issue: `message-parser.ts` is already a large file and this branch adds
more responsibilities: empty snapshot filtering, checkpoint confirmation
hydration inputs, snapshot pairing, group propagation, and dedupe behavior.

Target design:

- Keep `parseStoredMessages()` as the orchestration entry point.
- Extract focused helpers for the new and existing clusters of responsibility.

Suggested modules:

```text
packages/cli/src/modules/instance-ai/message-parser/
  index.ts
  tool-call-state.ts
  snapshot-correlation.ts
```

Responsibilities:

- `tool-call-state.ts`
  - `extractToolInvocations()`
  - `buildToolCallState()`
  - confirmation-map application
- `snapshot-correlation.ts`
  - empty snapshot filtering
  - chronological orphan snapshot insertion
  - assistant/snapshot pairing
  - message group propagation
  - assistant dedupe with snapshot-tree transfer
- `index.ts` or existing `message-parser.ts`
  - user-message cleaning
  - assistant-message assembly
  - final orchestration

Expected behavior:

- No output shape changes.
- Existing parser tests continue to pass.
- New helper modules receive targeted tests only where they clarify edge cases.
- The top-level parser becomes easier to scan and stops growing from unrelated
  state-recovery concerns.

## Implementation TODO

- [x] Extract suspended confirmation parsing from stream mapping into one pure
      helper.
- [x] Replace live stream confirmation mapping with the shared helper.
- [x] Replace checkpoint confirmation reconstruction with the shared helper.
- [x] Add parity tests proving live and reload confirmation payloads match.
- [x] Introduce `wireDecisionSchema` for strict eval structured output.
- [x] Restore `Decision` as a discriminated internal union.
- [x] Add `parseWireDecision()` boundary conversion and logging/fallback tests.
- [x] Simplify `encodeConfirmationDecision()` to operate on valid domain
      decisions only.
- [x] Extract provider metadata/replay policy from `messages.ts`.
- [x] Move OpenAI Responses state stripping into the provider policy module.
- [x] Move Anthropic/OpenAI reasoning replay option logic into the provider
      policy module.
- [x] Add provider policy tests independent of full message conversion tests.
- [x] Add an Instance AI proxy provider registry.
- [x] Refactor proxy model parsing and model creation to use the registry.
- [x] Keep proxy-mode user preference bypass covered by tests.
- [x] Split message parser tool-call state helpers out of the main parser.
- [x] Split message parser snapshot correlation/dedupe helpers out of the main
      parser.
- [x] Keep current message parser behavior covered by existing reload and
      empty-snapshot tests.

## Verification

Run focused tests:

```bash
pushd packages/@n8n/agents
pnpm test src/runtime/model/__tests__/messages.test.ts src/runtime/__tests__/agent-runtime-conversion.test.ts
pnpm typecheck
popd

pushd packages/@n8n/instance-ai
pnpm test evaluations/__tests__/user-proxy.test.ts src/agent/__tests__/apply-agent-thinking.test.ts
popd

pushd packages/cli
pnpm test src/modules/instance-ai/__tests__/instance-ai-model.service.test.ts src/modules/instance-ai/__tests__/instance-ai-settings.service.test.ts src/modules/instance-ai/__tests__/instance-ai-memory.service.test.ts src/modules/instance-ai/__tests__/message-parser.test.ts
popd
```

Run lint/typecheck for touched packages after implementation. If broad CLI
typecheck still fails because of unrelated master migration issues, record the
first unrelated failure and verify the touched files with focused lint and tests.

Verification completed:

- `packages/@n8n/agents`: focused tests, `pnpm typecheck`, and `pnpm lint`.
- `packages/@n8n/instance-ai`: focused tests, `pnpm typecheck`, and
  `pnpm lint`.
- `packages/cli`: focused Instance AI tests and `pnpm lint`.
- `packages/cli pnpm typecheck` still fails on unrelated existing integration
  test matcher/nullability issues and an unrelated `@n8n/constants` export in
  `node-definition-resolver.ts`; no reported errors were in the changed files.

## Acceptance Criteria

- No duplicate suspend-payload confirmation field mapping remains.
- Eval user-proxy code has a strict wire schema and a non-nullable discriminated
  domain `Decision` model.
- `messages.ts` contains no OpenAI-specific state key lists or provider replay
  branching.
- Instance AI proxy provider support is registry-driven.
- `message-parser.ts` delegates tool-call-state and snapshot-correlation logic
  to focused modules.
- Existing behavior for OpenAI proxy models, reasoning replay, setup
  confirmation reloads, and eval user-proxy decisions is preserved.
