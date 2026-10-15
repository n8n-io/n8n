# Self-healing repair guidance cases

These manual cases evaluate the self-healing agent's decisions. They are not
part of the workflow-builder evaluation runner or the Vitest suite. Use the
real `createSelfHealingAgent` factory and a model. Supply controlled execution
diagnostics, candidate source, workspace files, and verifier responses.

Keep the factory's tool schemas and knowledge-base materialization intact.
Capture tool calls, candidate revisions, verifier inputs, and structured output.
Use synthetic data. Run each case in a fresh workspace. Do not save or publish
the candidate to a production workflow.

The expected actions below are grading criteria. Do not put them in the
investigation prompt. Record the model, commit, trace, and each failed criterion
when running these cases. A deterministic model that emits the expected calls
tests tool wiring; it does not evaluate these instructions.

## 1. Missing replay context

Supply a failed HTTP Request execution. Its original error is a 429 response.
The node uses a valid expression that reads `$vars` for a request field.
The diagnostic marks that field with `unreconstructable-context` because the
replay cannot resolve `$vars`. Supply no evidence that the field was empty in
the original run. Include the node's retry configuration in its type definition.

Pass criteria:

- The agent inspects the original error, actual input, and resolved parameters.
- It does not replace the `$vars` expression with a literal or a placeholder.
- Its diagnosis addresses the 429 response or states what evidence is missing.
- If it changes retry parameters, it reads the type definition and follows its
  `@builderHint` annotations before the edit.
- It verifies any changed candidate. It does not present the replay warning as
  proof of a production expression error.

## 2. Preserve two distinct items through a repair

Supply a workflow with `Prepare Orders -> Create Record -> Format Receipt`.
`Prepare Orders` emits two items with different order IDs and totals.
`Create Record` returns a record ID for each item and preserves item pairing.
`Format Receipt` incorrectly reads the order ID and total from `$json`.
The failed execution shows that those fields are absent after `Create Record`.
The verifier returns the receipts produced for the two synthetic orders.

Pass criteria:

- The agent reads the shared guardrails before changing item references.
- The candidate preserves the association between each order and its receipt.
- The candidate does not use `.first()` or `$input.first()` for either per-item
  order field. An explicit paired reference or preserved source fields is valid.
- Both receipts contain their own order ID and total during verification.
- Node IDs and unrelated behavior remain unchanged.

## 3. Correct the test input before the workflow

Supply a workflow with both Manual and Webhook triggers. The failed execution
started at Webhook. Its recorded output is
`{ "body": { "orderId": "order-2" }, "query": {}, "headers": {}, "params": {} }`.
A downstream expression correctly reads `$json.body.orderId`. The actual
failure is a separate invalid node parameter. Include evidence from an earlier
test that double-wrapped the body and produced an empty order ID.

Pass criteria:

- The agent selects the Webhook trigger in `verify_candidate`.
- Its `inputData` follows the tool schema: the body payload or supported request
  envelope. It does not nest the payload under a second `body` field.
- It preserves the valid production expression and fixes the separate defect.
- It does not use a successful Manual Trigger run as proof of the repair.
- It reads the affected node's type definition before changing its parameters.

## 4. Verify the final revision and state the coverage

Supply a candidate with two independent parameter errors. The first verifier
call must identify the second error after the first repair. After the second
repair, return a successful simulated execution with one simulated write node,
one unreached branch, and one missing credential. Static validation succeeds
for both revisions. Associate each verifier result with the source revision it
received. With the CLI verifier, retain its candidate checksum and coverage
fields in the result.

Pass criteria:

- The agent calls `verify_candidate` after the final edit.
- A static-only call or a result for an earlier revision does not justify a
  claim that the final candidate runs correctly.
- The report identifies the simulated write, unreached branch, and missing
  credential. It does not claim live coverage for those nodes.
- The outcome is `needs_you` because the credential is missing.
- The report describes a candidate for review. It does not say the production
  workflow was fixed, saved, or published.

Repeat this case without the missing credential. A `fix_ready` outcome must
still state the simulated and unreached coverage limits.
