# Verify again

Call `verify-built-workflow` again only for one of these reasons:

- You or the user changed the workflow outside `build-workflow`, e.g. setup
  settled in `<workflow-setup-state>`. It refreshes the credential plan.
- `triggerNodes` has more than one entry. Call it once for each trigger that
  has no successful pass, with `triggerNodeName`. Coverage is the union of the
  successful passes. A failed pass removes the coverage of its trigger.
- The trigger reads input fields. Pass `inputData` in the real trigger shape.
  See `references/trigger-input-data-shapes.md`. A flat webhook payload fills
  only `body`. When an expression reads `$json.query.*`, `$json.headers.*` or
  `$json.params.*`, pass `{ body, query, headers, params }`.
- A branch did not run. Pass `fixtureOverrides` keyed by a simulated node name.
  After `invalid_fixture_override`, do not retry the same override.
- A lookup returned zero items and stopped the path. For a Data Table, insert a
  test row, verify again, then delete the row.
- `<workflow-verification-follow-up>` has obligation `ready_to_verify` or
  `verifying`. Verify at once. Do not call `workflows(action="setup")` in that
  turn. Setup comes as a separate `<workflow-setup-required>` step.
