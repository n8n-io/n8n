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
every answer that reports confidence. With **Single Output** the node routes
nothing and drops nothing; your workflow decides what to do. With **Branch by
Choice** the threshold also adds a **Low Confidence** output. No threshold is
right for every use case: a threshold for a refund is not a threshold for a page
title.

## Output

Set **Output** to pick how the decisions leave the node.

### Single Output

The default. Every item goes to one output, and you branch later with a Switch
or If node. This keeps every question equal, so it fits a node that asks several.

### Branch by Choice

The node adds one output for each option of its choice question, in the order you
configured them, and sends each item to the option the model selected. This
classifies and routes in one node, so no Switch node repeats the option values:

```text
Decision  (choice: department — billing, technical, other)
 ├ billing   → Billing Team
 ├ technical → Technical Team
 └ other     → General Inbox
```

This needs exactly one choice question to branch on. Other question types still
answer normally and ride along in the item, so a Decision node can branch on
`department` while it also reports `severity` and `urgency`.

With a **Confidence Threshold** above 0, a last **Low Confidence** output is
added. An answer below the threshold goes there instead of to its option, so an
uncertain decision never takes a confident path:

```text
Decision  (choice: department, Confidence Threshold 0.8)
 ├ billing         → Billing Team
 ├ technical       → Technical Team
 ├ other           → General Inbox
 └ Low Confidence  → Flag for Review
```

An answer that reports no confidence is routed by its value, because a missing
confidence is not the same as doubt.

### Item shape

One item per input item, with paired-item information preserved. The shape is
the same in both output modes:

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
→ Decision  (Branch by Choice; choice: department; score: severity;
             boolean probability: urgency; Confidence Threshold 0.8)
   ↳ TypeSafe Jev Decision Model
   ├ billing         → Billing Team
   ├ technical       → Technical Team
   ├ other           → General Inbox
   └ Low Confidence  → Flag for Review
```

Ask all three questions in one Decision node. One call answers every question,
which is cheaper and faster than one call per question. The node classifies and
routes in one step, so `severity` and `urgency` stay on the item for the team
node that receives it.

An importable version of this workflow is in
[`test/integration/workflows/decision-ticket-routing.json`](test/integration/workflows/decision-ticket-routing.json).

### Low-confidence escalation

Set **Confidence Threshold** to the value your use case justifies. With **Branch
by Choice** the **Low Confidence** output does the escalation for you. With
**Single Output**, branch on the annotation before you act:

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

With **Branch by Choice**, the node also fails before any request when it has no
choice question to branch on, more than one, or a choice question with no
options. Switch **Output** back to **Single Output** to branch with a Switch node
instead.

The node reports a clear error and runs no request when a question is invalid:
a missing or duplicate ID, a choice without options, a score with fewer than two
levels, or an unknown type. It also fails when the model answers a question that
was not asked, picks an option that was never offered, or returns a malformed
response, rather than passing a wrong decision downstream.

Turn on **Continue On Fail** in the node settings to get `error` on the failing
item and keep processing the rest.
