# Decision node

The Decision node evaluates a state with typed questions and returns structured,
probabilistic decisions. It connects to a **Decision Model** sub-node, the same
way a Basic LLM Chain connects to a Chat Model.

## What a Decision Model is

A Decision Model answers closed questions about a state. It returns a value, a
probability for each possible answer, and a confidence. It generates no text,
holds no conversation, and calls no tools.

| | Chat Model | Decision Model |
|---|---|---|
| Input | messages | a state plus typed questions |
| Output | text or tool calls | typed answers with probabilities |
| Reads uncertainty | no | yes, through probabilities and confidence |
| Connection type | `ai_languageModel` | `ai_decisionModel` |

Use a Chat Model to write, summarize, or call tools. Use a Decision Model to
decide, classify, rate, or gate — the steps a workflow branches on.

The first provider is **TypeSafe Jev Decision Model**. TypeSafe calls Jev a
"System One" model. Jev is an early-access TypeSafe service, so check the
[TypeSafe docs](https://docs.typesafe.ai/introduction) for current availability.

## State

State is what the model evaluates: "The information the model should evaluate."

Put a plain string in the **State** field, or an expression such as
`{{ $json.ticket }}`. An expression that resolves to an object or an array is
sent as JSON, so a chat log or a record keeps its structure.

## Questions

Every question needs a **Question ID**. The ID becomes the key of that
question's result in the output, so `department` is read downstream as
`{{ $json.decisions.department.value }}`. IDs must be unique.

### Choice

The model selects exactly one of the options you configure. Each option has a
stable value and an optional description telling the model when it applies.

```json
{
  "type": "choice",
  "value": "billing",
  "confidence": 0.92,
  "probabilities": { "billing": 0.96, "technical": 0.02, "other": 0.02 }
}
```

### Score

The model rates the state against an ordered rubric. Describe each level from
lowest to highest; at least two levels are needed. The result is weighted across
the levels, so it can land between them: `1.7` sits between level 1 and level 2.

```json
{
  "type": "score",
  "value": 1.7,
  "confidence": 0.79,
  "probabilities": { "0": 0.05, "1": 0.3, "2": 0.65 },
  "legend": { "0": "Low impact", "1": "Material impact", "2": "Critical business impact" }
}
```

### Boolean probability

The model reports how likely an assertion is to be true. The output is a
probability, not an unquestionable fact. `value` resolves `probability` against
a 0.5 midpoint for convenience; read `probability` when you want your own cut-off.

```json
{
  "type": "booleanProbability",
  "value": true,
  "probability": 0.88
}
```

## Probabilities and confidence

`probabilities` is the model's distribution across the options or levels.
`confidence` collapses that distribution into one number from 0 to 1.

Confidence is not a guarantee of correctness. A confident answer can be wrong.
A low confidence means the model found no clear winner: the options overlap, the
state lacks the necessary information, or the question does not fit the state.

Set **Confidence Threshold** in Options to add `meetsConfidenceThreshold` to
every answer that reports confidence. The node routes nothing and drops nothing;
your workflow decides what to do. No threshold is right for every use case:
a threshold for a refund is not a threshold for a page title.

## Output

One item per input item, with paired-item information preserved:

```json
{
  "decisions": {
    "department": { "type": "choice", "value": "billing", "confidence": 0.92, "probabilities": {} },
    "urgency": { "type": "booleanProbability", "value": true, "probability": 0.88 },
    "severity": { "type": "score", "value": 1.7, "confidence": 0.79 }
  },
  "model": "jev-latest",
  "usage": { "inputTokens": 300, "outputTokens": 50 },
  "providerMetadata": { "answers": {} }
}
```

`providerMetadata` holds the provider's raw answers, which keeps
provider-specific wording available for debugging. Nothing downstream needs to
read it.

## Examples

### Ticket routing

```text
Webhook
→ Decision  (choice: department; score: severity; boolean probability: urgency)
   ↳ TypeSafe Jev Decision Model
→ Switch on {{ $json.decisions.department.value }}
```

Ask all three questions in one Decision node. One call answers every question,
which is cheaper and faster than one call per question.

An importable version of this workflow is in
[`test/integration/workflows/decision-ticket-routing.json`](test/integration/workflows/decision-ticket-routing.json).

### Low-confidence escalation

Set **Confidence Threshold** to the value your use case justifies, then branch
on the annotation before you act:

```text
Decision
→ If {{ $json.decisions.department.meetsConfidenceThreshold }}
   true  → act automatically
   false → assign to a human
```

For a costly action, read `confidence` directly and use a higher cut-off there
than for a recoverable one.

### LLM model routing

Decide how hard a request is before you pay for a large model:

```text
Decision  (score: complexity, levels "Trivial", "Moderate", "Needs deep reasoning")
   ↳ TypeSafe Jev Decision Model
→ If {{ $json.decisions.complexity.value > 1.5 }}
   true  → AI Agent with a large model
   false → AI Agent with a small model
```

## Credential setup

1. Create an API key in your TypeSafe account.
2. In n8n, add a **TypeSafe** credential and paste the key. Change **Base URL**
   only if TypeSafe gave you a different host.
3. The credential test calls `GET /v1/models`, which lists your models and runs
   no inference, so testing the credential costs nothing.

## Errors

The node reports a clear error and runs no request when a question is invalid:
a missing or duplicate ID, a choice without options, a score with fewer than two
levels, or an unknown type. It also fails when the model answers a question that
was not asked, picks an option that was never offered, or returns a malformed
response, rather than passing a wrong decision downstream.

Turn on **Continue On Fail** in the node settings to get `error` on the failing
item and keep processing the rest.
