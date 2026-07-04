# Workflow SDK mock output rules

Rules for declaring `output` fixtures on SDK nodes and webhook trigger mocks.
Read when branch verification depends on simulated upstream data.

## Contents

- Required fields in mocks
- Cardinality
- Webhook trigger envelope shape
- SDK output vs Code node return shape

## Required fields in mocks

Whenever a node declares mock `output` for verification, include every field
later referenced by `$json` expressions, including optional trigger fields used
in filters (for example Slack `subtype`, `bot_id`, `text`, `user`, `ts`,
`channel`). Missing optional fields make expression-path validation fail.

## Cardinality

Match real cardinality in mock `output`. When a node's real response is a
collection (HTTP list endpoints, search results, a top-level array such as
Binance klines or a bare array of IDs), declare at least two items so
single-item assumptions like `$input.first()` break during verification instead
of on the user's first run. A single-item mock hides array-vs-single bugs.

## Webhook trigger envelope shape

Match the real payload SHAPE in webhook trigger mocks. When a third-party
platform calls the webhook (voice agents, payment providers, messaging
platforms), that platform's documented envelope fixes the shape — mock it
faithfully instead of inventing a flattened body. Tool-call style webhooks from
AI/voice platforms nest arguments in an OpenAI-compatible envelope
(`body.message.toolCalls[0].function.arguments`), not at the body root and not
under `call.arguments`. Coding against an invented flat mock self-verifies
green, then every field parses empty on the first real call.

## SDK output vs Code node return shape

SDK node `output` mocks are raw `$json` objects. Do not wrap mock items in n8n
runtime item envelopes like `{ json: { ... } }` unless downstream expressions
intentionally read `$json.json.*`. Correct:
`output: [{ orderId: 'ord_123', total: 42 }]`; wrong:
`output: [{ json: { orderId: 'ord_123', total: 42 } }]`.
Code node `jsCode` may still return runtime items like `[{ json: { ... } }]`;
this rule applies to SDK `node({ output: [...] })` mocks.
