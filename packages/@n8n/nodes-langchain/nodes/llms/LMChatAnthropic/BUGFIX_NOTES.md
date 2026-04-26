# Anthropic Chat Model — Bugfix Notes

Mapping of the Anthropic Chat Model node source. Documentation only — no code changes.

## Files in this directory

| File | Purpose |
|------|---------|
| [LmChatAnthropic.node.ts](LmChatAnthropic.node.ts) | Main node implementation. Declares `INodeType`, builds the `INodeTypeDescription` (model/options properties across versions 1 → 1.4), and implements `supplyData()` which constructs the `ChatAnthropic` LangChain client. |
| [methods/searchModels.ts](methods/searchModels.ts) | `listSearch` method used by the `resourceLocator` model field (v1.3+). Calls `GET {baseURL}/v1/models` via the `anthropicApi` credential, optionally filters by substring, and sorts by `created_at` descending. |
| [methods/__tests__/searchModels.test.ts](methods/__tests__/searchModels.test.ts) | Unit tests for `searchModels` (URL handling, sorting, filtering, case-insensitive search). |
| [test/LmChatAnthropic.test.ts](test/LmChatAnthropic.test.ts) | Unit tests for the node itself: description shape, version-aware parameter reads, options propagation, thinking mode, gateway URL handling, error enrichment, and version defaults. |
| [anthropic.svg](anthropic.svg) / [anthropic.png](anthropic.png) | Node icon assets. |

---

## 1. Where the thinking config is constructed

[LmChatAnthropic.node.ts:359-377](LmChatAnthropic.node.ts#L359-L377) — `supplyData()`:

```ts
if (options.thinking) {
    invocationKwargs = {
        thinking: {
            type: 'enabled',
            // If thinking is enabled, we need to set a budget.
            // We fallback to 1024 as that is the minimum
            budget_tokens: options.thinkingBudget ?? MIN_THINKING_BUDGET,
        },
        // The default Langchain max_tokens is -1 (no limit) but Anthropic requires a number
        // higher than budget_tokens
        max_tokens: options.maxTokensToSample ?? DEFAULT_MAX_TOKENS,
        // These need to be unset when thinking is enabled.
        // Because the invocationKwargs will override the model options
        // we can pass options to the model and then override them here
        top_k: undefined,
        top_p: undefined,
        temperature: undefined,
    };
}
```

Supporting constants:

- [LmChatAnthropic.node.ts:80](LmChatAnthropic.node.ts#L80) — `const MIN_THINKING_BUDGET = 1024;`
- [LmChatAnthropic.node.ts:81](LmChatAnthropic.node.ts#L81) — `const DEFAULT_MAX_TOKENS = 4096;`

`invocationKwargs` is then passed into the `ChatAnthropic` constructor at [LmChatAnthropic.node.ts:425](LmChatAnthropic.node.ts#L425).

### Behavioural notes on the current construction

- **Always-on when toggled.** `options.thinking === true` unconditionally builds the `thinking: { type: 'enabled', budget_tokens }` block. There is no per-model gating, no "auto/adaptive" mode, and no off-switch path other than leaving the boolean unchecked.
- **Budget floor is implicit, not enforced.** The `?? MIN_THINKING_BUDGET` only fires when the user leaves the field undefined. If the user enters a value below 1024 (the field's `default` is `MIN_THINKING_BUDGET` but it is a plain `type: 'number'` with no `minValue` typeOption — see [LmChatAnthropic.node.ts:296-307](LmChatAnthropic.node.ts#L296-L307)), the lower value is forwarded to the API as-is.
- **`max_tokens` ≥ `budget_tokens` is not validated.** The comment at [LmChatAnthropic.node.ts:367-368](LmChatAnthropic.node.ts#L367-L368) calls out the requirement, but the code does not enforce it; `max_tokens` falls back to `DEFAULT_MAX_TOKENS = 4096` independently of `budget_tokens`.
- **Sampling params are force-cleared via `invocationKwargs` overrides.** `top_k`, `top_p`, `temperature` are set to `undefined` in `invocationKwargs` to override whatever was passed to the `ChatAnthropic` constructor (see also the UI-side `displayOptions.hide.thinking: [true]` on those three options at [LmChatAnthropic.node.ts:255-288](LmChatAnthropic.node.ts#L255-L288)).

---

## 2. Current parameter shape being sent

The complete `options` collection that `supplyData()` reads ([LmChatAnthropic.node.ts:334-341](LmChatAnthropic.node.ts#L334-L341)):

```ts
const options = this.getNodeParameter('options', itemIndex, {}) as {
    maxTokensToSample?: number;
    temperature: number;
    topK?: number;
    topP?: number;
    thinking?: boolean;
    thinkingBudget?: number;
};
```

UI definitions for these fields live at [LmChatAnthropic.node.ts:232-309](LmChatAnthropic.node.ts#L232-L309). Defaults and constraints:

| UI field | Param name | Type | Default | Constraints | Hidden when |
|----------|-----------|------|---------|-------------|-------------|
| Maximum Number of Tokens | `maxTokensToSample` | number | `4096` (`DEFAULT_MAX_TOKENS`) | none | — |
| Sampling Temperature | `temperature` | number | `0.7` | min 0, max 1, precision 1 | `thinking: [true]` |
| Top K | `topK` | number | `-1` | min -1, max 1, precision 1 | `thinking: [true]` |
| Top P | `topP` | number | `1` | min 0, max 1, precision 1 | `thinking: [true]` |
| Enable Thinking | `thinking` | boolean | `false` | — | — |
| Thinking Budget (Tokens) | `thinkingBudget` | number | `1024` (`MIN_THINKING_BUDGET`) | none | shown only when `thinking: [true]` |

### What goes onto the wire

Two layers of configuration end up at the `ChatAnthropic` LangChain client ([LmChatAnthropic.node.ts:415-427](LmChatAnthropic.node.ts#L415-L427)):

1. **Constructor args** (LangChain top-level options):
   - `anthropicApiKey` — from `anthropicApi` credential
   - `model` — selected model id (resolved per version, see §3)
   - `anthropicApiUrl` — `credentials.url ?? 'https://api.anthropic.com'`
   - `maxTokens` — `options.maxTokensToSample` (no fallback at this level)
   - `temperature` — `options.temperature`
   - `topK` — `options.topK`
   - `topP` — `options.topP`
   - `callbacks: [new N8nLlmTracing(this, { tokensUsageParser })]`
   - `onFailedAttempt: makeN8nLlmFailedAttemptHandler(this, gatewayErrorHandler)`
   - `invocationKwargs` (see below)
   - `clientOptions: { fetchOptions: { dispatcher: getProxyAgent(baseURL) }, defaultHeaders? }`

2. **`invocationKwargs`** (forwarded raw to the Anthropic Messages API request body, overriding constructor-level fields with the same name):
   - When `options.thinking !== true`: `{}` (empty).
   - When `options.thinking === true`:
     ```ts
     {
       thinking: { type: 'enabled', budget_tokens: <budget> },
       max_tokens: <maxTokensToSample ?? 4096>,
       top_k: undefined,
       top_p: undefined,
       temperature: undefined,
     }
     ```

3. **Post-construction mutations on the model instance** ([LmChatAnthropic.node.ts:430-437](LmChatAnthropic.node.ts#L430-L437)):
   - If `options.topP === undefined` → `delete model.topP` (works around LangChain's `-1` default which Anthropic rejects).
   - If `options.topP !== undefined && options.temperature === undefined` → `delete model.temperature` (avoids sending both when the user only set `topP`).

4. **Custom auth header passthrough** ([LmChatAnthropic.node.ts:388-397](LmChatAnthropic.node.ts#L388-L397)): if the credential has `header: true` plus a non-empty `headerName`/`headerValue`, those are added to `clientOptions.defaultHeaders`. Used for AI gateways that authenticate via a non-Anthropic header.

---

## 3. How the node detects which model is selected

The selection mechanism is **node-version dependent**. Versions are declared at [LmChatAnthropic.node.ts:95-96](LmChatAnthropic.node.ts#L95-L96): `version: [1, 1.1, 1.2, 1.3, 1.4]`, `defaultVersion: 1.4`.

### UI side (the `model` property)

Five separate property entries are declared, each gated by `displayOptions.show['@version']`:

| Version condition | Type | Default | Defined at |
|-------------------|------|---------|-----------|
| `@version: [1]` | `options` (full legacy list incl. Claude 2/Instant) | `'claude-2'` | [LmChatAnthropic.node.ts:129-136](LmChatAnthropic.node.ts#L129-L136) |
| `@version: [1.1]` | `options` (same list) | `'claude-3-sonnet-20240229'` | [LmChatAnthropic.node.ts:137-145](LmChatAnthropic.node.ts#L137-L145) |
| `@version: [{ _cnd: { lte: 1.2 } }]` | `options` (LEGACY entries filtered out) | `'claude-3-5-sonnet-20240620'` | [LmChatAnthropic.node.ts:146-157](LmChatAnthropic.node.ts#L146-L157) |
| `@version: [1.3]` | `resourceLocator` (`list` via `searchModels` + `id` string) | `claude-sonnet-4-5-20250929` ("Claude Sonnet 4.5") | [LmChatAnthropic.node.ts:158-194](LmChatAnthropic.node.ts#L158-L194) |
| `@version: [{ _cnd: { gte: 1.4 } }]` | `resourceLocator` (`list` via `searchModels` + `id` string) | `claude-sonnet-4-6` ("Claude Sonnet 4.6") | [LmChatAnthropic.node.ts:195-231](LmChatAnthropic.node.ts#L195-L231) |

Note: the `lte: 1.2` clause fires on versions 1, 1.1, and 1.2 — meaning the v1 / v1.1 entries above and the v≤1.2 entry both match for those versions; the harness applies the most-specific match. (See test asserting v1.3 default at [test/LmChatAnthropic.test.ts:557-571](test/LmChatAnthropic.test.ts#L557-L571) and v1.4 default at [test/LmChatAnthropic.test.ts:573-588](test/LmChatAnthropic.test.ts#L573-L588).)

The `searchModels` list-mode dynamically queries `/v1/models` from the configured base URL — so for v1.3 and v1.4 the available options come from the live Anthropic API (or the configured AI gateway), not from a static list.

### Runtime side (in `supplyData`)

[LmChatAnthropic.node.ts:322-332](LmChatAnthropic.node.ts#L322-L332):

```ts
const version = this.getNode().typeVersion;
const modelName =
    version >= 1.3
        ? (this.getNodeParameter('model.value', itemIndex) as string)
        : (this.getNodeParameter('model', itemIndex) as string);

if (!modelName) {
    throw new NodeOperationError(this.getNode(), 'No model selected. Please choose a model.', {
        itemIndex,
    });
}
```

So the detection rule is:

- **`typeVersion >= 1.3`** — read `model.value` (the resolved value of the `resourceLocator`, regardless of whether the user used the `list` mode or the manual `id` mode).
- **`typeVersion < 1.3`** — read `model` directly (plain string from the legacy `options` field).

There is no normalisation, model-id parsing, or capability lookup — whatever string comes out is forwarded verbatim to `ChatAnthropic` as `model`. Empty string is the only rejected value (throws `NodeOperationError`).

### Builder hint (separate from runtime detection)

[LmChatAnthropic.node.ts:22-25](LmChatAnthropic.node.ts#L22-L25) defines `ANTHROPIC_MODEL_BUILDER_HINT`, attached to every `model` field via `builderHint`:

```ts
const ANTHROPIC_MODEL_BUILDER_HINT = {
    message:
        'Default to claude-sonnet-4-6 (latest Sonnet); use claude-opus-4-7 when the user needs the most capable model. Never use Claude Sonnet 4.5, Claude 3.x, Claude 2, or LEGACY options — those are superseded and are not valid choices.',
};
```

This is metadata for the AI workflow builder agent — it does **not** affect runtime model selection. It tells the builder to prefer `claude-sonnet-4-6` and use `claude-opus-4-7` when maximum capability is needed.

---

## 4. Where tests live for this node file

Two test files cover this directory.

### `test/LmChatAnthropic.test.ts`

Covers the node itself ([test/LmChatAnthropic.test.ts](test/LmChatAnthropic.test.ts)). All tests mock `@langchain/anthropic` and `@n8n/ai-utilities`. Key blocks:

- **`node description`** ([test/LmChatAnthropic.test.ts:76-100](test/LmChatAnthropic.test.ts#L76-L100)) — asserts displayName, name, group, version array `[1, 1.1, 1.2, 1.3, 1.4]`, credentials and outputs.
- **`supplyData` — basic configuration**
  - v ≥ 1.3 reads `model.value` ([test/LmChatAnthropic.test.ts:103-140](test/LmChatAnthropic.test.ts#L103-L140))
  - v < 1.3 reads `model` ([test/LmChatAnthropic.test.ts:142-162](test/LmChatAnthropic.test.ts#L142-L162))
- **Custom base URL** ([test/LmChatAnthropic.test.ts:164-188](test/LmChatAnthropic.test.ts#L164-L188)) — credential `url` propagates to `anthropicApiUrl`.
- **All-options propagation** ([test/LmChatAnthropic.test.ts:190-221](test/LmChatAnthropic.test.ts#L190-L221)) — `maxTokensToSample`, `temperature`, `topK`, `topP` all forwarded.
- **`topP` / `temperature` post-construction cleanup**
  - `topP` deleted when undefined in options ([test/LmChatAnthropic.test.ts:223-241](test/LmChatAnthropic.test.ts#L223-L241))
  - `topP` retained when explicitly set ([test/LmChatAnthropic.test.ts:243-260](test/LmChatAnthropic.test.ts#L243-L260))
  - `temperature` deleted when only `topP` is set ([test/LmChatAnthropic.test.ts:262-281](test/LmChatAnthropic.test.ts#L262-L281))
  - both retained when both are set ([test/LmChatAnthropic.test.ts:283-302](test/LmChatAnthropic.test.ts#L283-L302))
- **Thinking mode**
  - explicit budget + max tokens ([test/LmChatAnthropic.test.ts:304-337](test/LmChatAnthropic.test.ts#L304-L337))
  - default budget = `MIN_THINKING_BUDGET` (1024) and default max = `DEFAULT_MAX_TOKENS` (4096) ([test/LmChatAnthropic.test.ts:339-367](test/LmChatAnthropic.test.ts#L339-L367))
  - sampling params (`top_k`/`top_p`/`temperature`) forced to `undefined` in `invocationKwargs` even when set on the constructor ([test/LmChatAnthropic.test.ts:369-407](test/LmChatAnthropic.test.ts#L369-L407))
- **Tracing & failed-attempt handler**
  - `N8nLlmTracing` wired with `tokensUsageParser` ([test/LmChatAnthropic.test.ts:409-426](test/LmChatAnthropic.test.ts#L409-L426))
  - no gateway handler when using default URL ([test/LmChatAnthropic.test.ts:428-440](test/LmChatAnthropic.test.ts#L428-L440))
  - gateway handler installed for custom URL ([test/LmChatAnthropic.test.ts:442-462](test/LmChatAnthropic.test.ts#L442-L462))
  - model-not-found errors enriched with gateway URL hint ([test/LmChatAnthropic.test.ts:464-498](test/LmChatAnthropic.test.ts#L464-L498))
- **Validation**
  - throws when `model.value` is empty (v1.3) ([test/LmChatAnthropic.test.ts:500-513](test/LmChatAnthropic.test.ts#L500-L513))
  - throws when `model` is empty (v1.2) ([test/LmChatAnthropic.test.ts:515-528](test/LmChatAnthropic.test.ts#L515-L528))
- **Gateway-provided model passthrough** — arbitrary `model.value` (e.g. `my-org/claude-3-sonnet`) is forwarded verbatim ([test/LmChatAnthropic.test.ts:530-555](test/LmChatAnthropic.test.ts#L530-L555))
- **Version defaults**
  - v1.3 default → Claude Sonnet 4.5 (`claude-sonnet-4-5-20250929`) ([test/LmChatAnthropic.test.ts:557-571](test/LmChatAnthropic.test.ts#L557-L571))
  - v1.4+ default → Claude Sonnet 4.6 (`claude-sonnet-4-6`) ([test/LmChatAnthropic.test.ts:573-588](test/LmChatAnthropic.test.ts#L573-L588))
- **`methods.listSearch.searchModels` registration** ([test/LmChatAnthropic.test.ts:591-599](test/LmChatAnthropic.test.ts#L591-L599))

### `methods/__tests__/searchModels.test.ts`

Covers the `listSearch` method ([methods/__tests__/searchModels.test.ts](methods/__tests__/searchModels.test.ts)):

- Default Anthropic API URL when credential `url` is unset ([methods/__tests__/searchModels.test.ts:58-69](methods/__tests__/searchModels.test.ts#L58-L69))
- Custom URL passthrough ([methods/__tests__/searchModels.test.ts:71-86](methods/__tests__/searchModels.test.ts#L71-L86))
- Null `url` falls back to default ([methods/__tests__/searchModels.test.ts:88-102](methods/__tests__/searchModels.test.ts#L88-L102))
- Sort order: `created_at` descending ([methods/__tests__/searchModels.test.ts:104-113](methods/__tests__/searchModels.test.ts#L104-L113))
- Substring filter ([methods/__tests__/searchModels.test.ts:115-124](methods/__tests__/searchModels.test.ts#L115-L124))
- Case-insensitive filter ([methods/__tests__/searchModels.test.ts:126-135](methods/__tests__/searchModels.test.ts#L126-L135))
- Empty result when filter matches nothing ([methods/__tests__/searchModels.test.ts:137-141](methods/__tests__/searchModels.test.ts#L137-L141))

### What is **not** currently tested

Things that may matter for the upcoming Opus 4.7 / adaptive-thinking change but have no coverage yet:

- Model-specific behaviour (e.g. whether the resolved model is Opus 4.7 or another model, and whether thinking config should differ per model).
- Lower-bound validation on `thinkingBudget` (values < 1024 are not blocked at runtime; not asserted).
- Relationship between `thinkingBudget` and `maxTokensToSample` (Anthropic requires `max_tokens > budget_tokens`; not asserted).
- Behaviour when `thinking: false` but `thinkingBudget` is somehow set (it is hidden in UI but `getNodeParameter` could still surface a stale value).
- Response-side parsing of `thinking` blocks in the assistant message (not handled in this node — left to LangChain's `@langchain/anthropic`).
