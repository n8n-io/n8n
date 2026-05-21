# Instance AI evals rubric — v1

The rubric defines the axes Instance AI's workflow-builder is scored on. Each axis is a named group of binary checks already running today; the rubric just gives them a taxonomy so per-axis pass/fail can be surfaced in reports and per-axis judge-vs-human agreement can be measured during calibration.

This is the M0 deliverable from `roadmap.md`. M2 takes this file and applies it mechanically: it tags each of the 28 binary checks in `packages/@n8n/instance-ai/evaluations/binaryChecks/checks/` with one of the seven axis names below, adds the union type, and emits per-axis Feedback alongside the existing per-check signal. The rubric does not invent new checks — it organizes the ones that already exist.

Seven axes for v1, scoring single-turn workflow artifacts. Two multi-turn axes (`clarification_quality`, `recovery`) are deferred to M3 when behaviour judges land.

```ts
export type RubricAxis =
  | 'structure'
  | 'connection_topology'
  | 'parameter_correctness'
  | 'intent_match'
  | 'ai_nodes'
  | 'quality'
  | 'security';
```

Scoring levels for v1 are pass/fail (matching the current binary checks). M2's Phase B optionally adds a `partial` level to LLM checks where the distinction between "wrong" and "incomplete" is worth capturing — out of scope for this file.

Anchors describe patterns in n8n workflow JSON — node shapes, connection structures, parameter values, expressions — rather than specific scenarios. The rubric applies to any workflow Instance AI produces, including future authored scenarios and real-user conversation traces from Phase E. The rubric is also additive: no existing check name, Feedback shape, or downstream consumer contract changes. Per-axis signal is layered on top of what's already running.

---

## `structure`

**Definition.** The workflow exists as a runnable artifact: at least one node, at least one trigger node, no nodes left disabled, and the trigger is wired to something downstream. This is the floor for being graded on anything else — if `structure` fails, downstream axes are usually meaningless.

**Positive anchor.** The saved workflow has a non-empty `nodes` array containing at least one trigger node (any of Schedule Trigger, Webhook, Form Trigger, Manual Trigger, Telegram Trigger, MCP Trigger, etc.). At least one trigger appears as a key in `connections` with `main[0]` populated by at least one downstream link object. No node has `disabled: true`. The artifact could be opened in n8n and an execution attempted from a trigger.

**Negative anchor.** The saved workflow has `nodes: []` — zero nodes — despite the agent's response describing what it built. Or: a single trigger node is present with no downstream nodes (the trigger appears in `nodes` but its key in `connections` is missing, or its `main` array is empty). Or: every node carries `disabled: true`, leaving scaffolding behind instead of finishing the build.

---

## `connection_topology`

**Definition.** Nodes in the workflow are wired correctly into the execution graph: every active node is reachable from a trigger via BFS through `connections`, no node is dangling, and routing nodes (Switch, IF, anything with multiple `main` outputs) have each enumerated branch populated with at least one downstream link.

**Positive anchor.** Every active node in `nodes` is reachable from some trigger by walking forward through `connections[source].main[i][j].node`. Routing nodes (Switch with N rules, IF with two branches, etc.) have an N-length `connections[name].main` array, each element being a non-empty list of downstream link objects — the count of populated branches matches the count of rules the node declares. No active node exists in `nodes` without being the target of some edge reachable from a trigger.

**Negative anchor.** A Switch node has `connections[name].main === []` — none of the branches are wired, even though the rules define them and the downstream action nodes exist elsewhere in `nodes`. The workflow looks complete on the canvas (correct nodes are present) but execution never reaches the routed actions; every routed path fails simultaneously because none are connected. A weaker variant: a Switch declares three rules but `connections[name].main` is `[ [link], [link], [] ]` — the third branch is an empty array, so items matching that rule are silently dropped. Or: an action node exists in `nodes` but no edge anywhere in `connections` targets it — it's dangling and `all_nodes_connected` fails.

---

## `parameter_correctness`

**Definition.** Individual node configurations are valid and meaningful: required parameters present with valid values, enum-typed parameters use legal values, expressions reference nodes and fields that exist upstream, `$fromAI()` used only where the tool API allows it, and parameter values match the prompt's stated intent (e.g. Bearer auth when the prompt says Bearer). Contrast with `intent_match`, which asks "does the workflow as a whole contain every feature the user asked for"; the two overlap on resource/operation correctness (a misconfigured operation may fire both `correct_node_operations` here and `fulfills_user_request` over in intent_match) — that's redundant detection, not a bug.

**Positive anchor.** Every node's required parameters are populated with valid values (`url` non-empty on HTTP Request, `assignments.assignments` non-empty on Set, conditions populated on Filter/IF). Enum parameters use values from the legal set. Expressions like `={{ $json.fieldName }}` reference fields that the immediately upstream node actually outputs; expressions like `={{ $('Other Node').item.json.field }}` reference both a node that exists in the workflow and a field that node produces. `$fromAI()` appears only inside tool node parameters. Authentication-type parameters align with what the prompt requested (Bearer prompts → `httpBearerAuth`, custom-header prompts → `httpHeaderAuth`).

**Negative anchor.** An expression references `$('Build Caption')` but the workflow has no node named exactly "Build Caption" (only "Build caption" — case mismatch). Or: an expression references `$json.transcript` but the upstream node's output schema doesn't include that field. Or: a Set node has `assignments.assignments: []` — present but does nothing at runtime. Or: an HTTP Request node has `url: ''` or a missing required parameter. Or: a regular (non-tool) Set or HTTP Request node has `$fromAI("level")` inside a value — `$fromAI` is only legal inside tool node parameters. Or: the prompt says "Authorization: Bearer ..." and the builder picks `genericAuthType: 'httpHeaderAuth'` (custom header type) instead of `'httpBearerAuth'`. Or: an HTTP Request intended to GET a resource is configured with `method: 'POST'` and an empty body — schema-valid but semantically wrong for the request being made.

---

## `intent_match`

**Definition.** The workflow does what the user asked for: every explicitly requested feature has a node of the right type *and* the right operation, and iteration over collections matches the use case. A node existing with the right name but the wrong operation does not count as fulfilling the request.

**Positive anchor.** For each feature the prompt explicitly requests, the workflow contains a node of the correct type configured with the correct `resource` and `operation` (e.g., a node intended to fetch captions has `resource: 'caption'` rather than `resource: 'video'`). If the prompt requires per-item processing of a returned collection (an API returning `{ records: [...] }`, a list endpoint, a multi-row response), the workflow includes the iteration mechanism (Split Out, Loop Over Items, or equivalent) so downstream nodes execute per item rather than once on the wrapping object.

**Negative anchor.** A node with the right type is present but its operation is wrong — e.g., a node named "Get Captions" with `resource: 'video'` when the prompt asks for captions (which require `resource: 'caption'`). The node has the right name; it does the wrong thing. Or: the prompt asks for N independent actions (notify + log + email) and only N−1 are present in `nodes` — one feature is silently missing. Or: an API returns a list envelope (`{ records: [...] }`) and the workflow posts the raw envelope to a downstream action once, instead of iterating and acting per item.

---

## `ai_nodes`

**Definition.** AI-specific sub-node wiring and configuration is correct: Agent nodes have a language model attached via `ai_languageModel`, dynamic prompts use expressions (not hardcoded strings), memory nodes connect to a parent via `ai_memory` and key sessions by an explicit named-node reference rather than `$json`, vector stores have embeddings via `ai_embedding`, and tool nodes are configured with at least the parameters they need. Only graded when AI nodes are present in the workflow.

**Positive anchor.** Each Agent node has at least one `ai_languageModel` edge feeding it from a chat-model node. Memory nodes connect back to a parent Agent via `ai_memory` and use a session key like `={{ $('Telegram Trigger').first().json.message.chat.id }}` — an explicit named-node reference, so the session boundary is anchored to the trigger and stable across branches. Vector store nodes have an embeddings model wired via `ai_embedding`. Tool nodes have non-empty `parameters` (or are one of the parameterless tool types like `toolCalculator` / `toolWikipedia`). Agent `text` parameters contain expressions referencing trigger payload (e.g., `={{ $json.message.text }}`); `options.systemMessage` is a non-empty instruction string.

**Negative anchor.** An Agent node exists with no `ai_languageModel` edge feeding it. Or: a memory node sits in `nodes` but is not the source of any `ai_memory` connection — it's wired into nothing. Or: a memory node's `sessionKey` is `={{ $json.chat.id }}` (implicit upstream); under branching or merging this silently couples session scope to whichever node flows in at execution time, not to the trigger. Or: an Agent's `text` parameter is a literal string with no `{{ ... }}` expression — the agent receives the same prompt regardless of payload. Or: a tool node was added but `parameters: {}` and the tool type isn't in the parameterless allowlist.

---

## `quality`

**Definition.** Soft signals about workflow craft: nodes have meaningful names, the workflow uses built-in nodes rather than Code nodes for transformations already supported, and the agent's spoken response accurately describes the workflow it actually built. The most opinionated axis — `no_unnecessary_code_nodes` is explicitly overridable per scenario via `annotations.code_necessary: true`. Quality is informational; it surfaces preference and craft, not correctness.

**Positive anchor.** Nodes have purpose-descriptive names ("Fetch GitHub Issues", "Filter Bug Label", "Create Notion Page") rather than generic defaults. The workflow uses built-in nodes (Set, Filter, IF, Switch, Split Out, Merge, Aggregate, Sort) for transformations they natively handle, instead of a Code node. The agent's text response accurately describes the nodes added and connections made — if the response says "I added a Slack node and connected it to the Filter," the saved workflow contains exactly that node and that connection.

**Negative anchor.** Nodes are named `"HTTP Request1"`, `"HTTP Request2"`, `"Set"`, `"Code"`, `"IF"` — defaults that obscure purpose at a glance on the canvas. Or: a Code node containing `return items.flatMap(item => item.json.records)` is doing array unwrapping a Split Out node handles natively (and no scenario annotation marks the Code node as necessary). Or: a Code node maps fields with `return items.map(i => ({ json: { caption: i.json.title } }))` when a Set node would do the same. Or: the agent's response claims "I created a Slack node and wired it to the trigger," but the saved workflow contains no Slack node — or contains a Discord node instead. The text and the artifact disagree.

---

## `security`

**Definition.** No hardcoded credentials in node parameters (headers, query params, Set values), and inbound trigger nodes (webhook, form, chat, MCP) keep authentication disabled unless the prompt explicitly asks for protected access. Security stays a distinct axis so any regression in this class surfaces clearly — credentials in workflow JSON are a separate kind of bad outcome from a misconfigured field.

**Positive anchor.** HTTP Request nodes use either `authentication: 'genericCredentialType'` with a named credential reference, or credential expressions like `=Bearer {{ $credentials.token }}` — actual token values never appear as literal strings in the saved JSON. Inbound trigger nodes (Webhook, Form Trigger, Chat Trigger, MCP Trigger) carry `authentication: 'none'` unless the prompt explicitly asked for protected access. Sensitive Set assignments use `={{ $credentials.<field> }}` expressions, never raw strings.

**Negative anchor.** A header parameter has `{ name: 'Authorization', value: 'Bearer sk-prod-1234...' }` — a real-looking token baked into the saved workflow. Or: a Set assignment is `apiKey: 'AKIA1234...'` as a literal string. Or: the prompt asks for a public form trigger (no auth mentioned) and the builder configures the Form Trigger with `authentication: 'basicAuth'` — friction the user didn't ask for. Or: a query parameter named `api_key` carries a literal value rather than a credential expression.

---

## Mapping: 28 binary checks → axes

This is the M0 commit. M2 applies it by adding `axis: RubricAxis` to each `BinaryCheck` entry.

| Check | Axis | Kind | Notes |
|---|---|---|---|
| `has_nodes` | `structure` | det | |
| `has_trigger` | `structure` | det | |
| `has_start_node` | `structure` | det | Borderline — see open question 1 |
| `no_disabled_nodes` | `structure` | det | |
| `all_nodes_connected` | `connection_topology` | det | |
| `no_unreachable_nodes` | `connection_topology` | det | |
| `switch_fallback_output_enabled` | `connection_topology` | det | Catches the Switch `main: []` family |
| `expressions_reference_existing_nodes` | `parameter_correctness` | det | |
| `valid_field_references` | `parameter_correctness` | det | |
| `valid_node_config` | `parameter_correctness` | det | Required params, valid enums |
| `no_empty_set_nodes` | `parameter_correctness` | det | |
| `no_invalid_from_ai` | `parameter_correctness` | det | |
| `http_generic_auth_type_matches_prompt` | `parameter_correctness` | det | Uses prompt — see open question 2 |
| `correct_node_operations` | `parameter_correctness` | LLM | |
| `valid_data_flow` | `parameter_correctness` | LLM | LLM sibling of `valid_field_references` — see open question 3 |
| `fulfills_user_request` | `intent_match` | LLM | |
| `handles_multiple_items` | `intent_match` | LLM | Borderline — see open question 4 |
| `agent_has_dynamic_prompt` | `ai_nodes` | det | |
| `agent_has_language_model` | `ai_nodes` | det | |
| `memory_properly_connected` | `ai_nodes` | det | |
| `memory_session_key_expression` | `ai_nodes` | det | |
| `vector_store_has_embeddings` | `ai_nodes` | det | |
| `tools_have_parameters` | `ai_nodes` | det | |
| `no_hardcoded_credentials` | `security` | det | |
| `inbound_trigger_auth_defaults` | `security` | det | |
| `no_unnecessary_code_nodes` | `quality` | det | Opinionated; overridable via `annotations.code_necessary` |
| `descriptive_node_names` | `quality` | LLM | |
| `response_matches_workflow_changes` | `quality` | LLM | Agent-honesty check — see open question 5 |

Counts: `structure` 4 · `connection_topology` 3 · `parameter_correctness` 8 · `intent_match` 2 · `ai_nodes` 6 · `quality` 3 · `security` 2 = 28.

---

## Open questions and things flagged

**1. `has_start_node` straddles `structure` and `connection_topology`.** The check passes when a trigger has at least one downstream edge. That's a connection. I'm assigning it to `structure` because the failure mode in practice is "the builder committed an empty or trivial workflow" (e.g., a trigger and nothing else) — which is a structural problem upstream of any topology question. If somebody disagrees and prefers `connection_topology`, the rubric still works.

**2. `http_generic_auth_type_matches_prompt` uses the user prompt to score a parameter.** I've kept it in `parameter_correctness` because the failure-mode answer is "the parameter value was wrong." But it has prompt context like the LLM intent checks do. If we later split parameter_correctness into "intrinsic" vs "intent-aware" sub-categories, this and `correct_node_operations` move together.

**3. `valid_data_flow` is in `parameter_correctness`, not `intent_match`.** The strategy doc's Phase A proposal originally placed it under `intent_match` (its name suggests something semantic). After reading the check, it's a near-exact LLM-version sibling of `valid_field_references` — both ask "do expressions reference fields that exist upstream?" Keeping them together makes the parameter_correctness axis a coherent group (anything that fails per-node config validation, including expressions). This deviation from the strategy doc proposal is intentional but worth flagging. It also leaves `intent_match` thin — see open question 6 below.

**4. `handles_multiple_items` could fit `connection_topology` instead of `intent_match`.** The check is about loop/iteration shape — is there a Split Out where one is needed, an aggregate where one is needed. That's structural data-flow shape more than user intent. But the LLM judge uses the prompt to know what "right for the use case" means. Leaving it in intent_match for now; flag for revisit if calibration shows it correlates more with topology failures than intent failures.

**5. `response_matches_workflow_changes` doesn't really fit any axis.** It scores agent communication honesty, not workflow quality. I've parked it under `quality` because that's the least-bad home in the v1 axes. If multi-turn brings axes like `clarification_quality` and `recovery`, this might belong with them in a future `agent_communication` axis. Worth a follow-up after M3 when we see what shape those axes take.

**6. `intent_match` is thin (2 checks, both LLM).** Only `fulfills_user_request` and `handles_multiple_items` sit under this axis, and both are LLM checks — the whole axis depends on judge calibration, with no deterministic intent signal. This is intrinsic to the problem (intent is judged against the prompt, which is in English) but worth knowing: a regression in the judge prompt or model will hit this entire axis at once.

**7. Error-handling structure is a chronic failure mode that no check directly scores.** In current evals, scenarios that test partial-failure handling (one branch erroring while others should still complete) have never passed in any baseline — the builder almost never adds on-error branching to action nodes. None of the 28 checks specifically scores "does the workflow have on-error wiring for actions the scenario tests failure for." This is a known gap; if we want axis-level signal to drive these specific chronic failures down, we'd need a new check (probably in `connection_topology` or a new `error_handling` axis). Out of scope for M0, but flag for the M2 PR — the gap exists in the *underlying check set*, not in the rubric. Adding a check is the fix; the rubric just makes the gap visible.

**8. `execution_outcome` is missing from this rubric on purpose.** The strategy doc (Section 6, rollout step 3) talks about adding an `execution_outcome` axis from the post-execution verifier, alongside the artifact-level binary checks. That's not in v1 because the rubric is scoped to the artifact-level binary checks in this milestone. M2 binds these seven axes to the binary checks; whenever the execution verifier joins the same rubric (later in M2 or in M4 close-out), the union type adds `execution_outcome`. Worth signposting that the rubric isn't finished growing — we lock these seven now and add the eighth alongside the execution-verifier integration.

**9. `descriptive_node_names` and `no_unnecessary_code_nodes` are preferences, not correctness.** Both pass `quality` checks today. Worth being explicit when calibration starts: low judge-vs-human agreement here doesn't necessarily mean the judge is broken — it may mean humans disagree on taste. Calibration should report κ separately for `quality` and not flag low κ on this axis as a system-broken signal the way low κ on `intent_match` would be.

---

## Deferred — multi-turn axes

`clarification_quality` and `recovery` get defined when M3 prep begins. They score conversational behaviour (was the clarification on-topic? did the agent re-plan after a tool error?), not single-turn workflow artifacts. They'll plug into the same `RubricAxis` union when defined.

M3 is intended to be additive — adding two axes for multi-turn behaviour without restructuring the seven above. One likely exception: `response_matches_workflow_changes` (see open question 5) may move into a new `agent_communication` axis if that proves the right shape. That decision belongs to M3.
