# Activity context flag conversion

Tracking issue: [CONTEXT-179](https://linear.app/n8n/issue/CONTEXT-179).

## Contract

Keep the key `114_instance_activity_context`.
Only `variant` enables activity recording, Assistant context, MCP context tools,
and context tool visibility during MCP consent. Existing permissions and module
checks still apply. `control`, booleans, missing values, unexpected strings, and
failed evaluations leave the feature disabled.

Evaluate the flag for the instance group. The PostHog group type is `company`.
The dashboard calls this group type `instance`. The distinct ID is
`company_<instanceId>`. User assignments must not select this feature.

## Local overrides

Enable the feature with a string override:

```sh
N8N_FEATURE_FLAG_OVERRIDES='{"114_instance_activity_context":"variant"}' pnpm dev:be
```

Disable the feature with `control`:

```sh
N8N_FEATURE_FLAG_OVERRIDES='{"114_instance_activity_context":"control"}' pnpm dev:be
```

Object values also work:

```json
{"114_instance_activity_context":{"value":"variant"}}
```

Use `{"value":"control"}` for the disabled assignment. Both forms work with
diagnostics disabled. Preserve other entries in the override map.
Restart the process after an environment variable change.

## Before the conversion

1. Read the live flag in Staging and Production.
2. Save each environment's flag configuration, active state, targeting rules,
   rollout percentage, and current assignments for the verification instances.
3. Verify instance-group targeting in both environments.
4. Record the approved variant weights. Preserve the current rollout eligibility
   and active state unless a separate rollout decision changes them.
5. Inventory all deployed versions that can receive this flag. Include managed
   and self-hosted instances. Older code requires boolean `true` and rejects
   `variant`. The final code requires `variant` and rejects boolean `true`.
6. Record how each eligible older version will move to the new contract before
   changing Production. Do not convert an environment with unhandled older versions.

## Release sequence

Use Staging to validate this sequence before Production:

1. On managed instances, preserve each current assignment with a temporary local
   override. Use `true` or `false` with the older code.
2. Deploy the final code and its string override together. Map `true` to `variant`
   and `false` to `control`. Apply the same assignment to all processes of an
   instance. These overrides preserve the assignment while PostHog still returns
   booleans.
3. Convert the PostHog flag to the `variant` and `control` variants. Use the saved
   eligibility rules, active state, and approved weights.
4. Remove the temporary overrides after all eligible versions support the final
   contract. Restart those processes. Verify the remote assignment after removal.
5. Verify recording, Assistant context, MCP tools, the MCP context resource, and
   consent visibility for both variants. Use two users on one instance. Check
   that user flags cannot change the shared assignment.
6. Record the release, configuration change, override removal, and verification
   results in the tracking issue.

If the deployment inventory cannot support this sequence, define a separate
compatibility release before deploying the final contract. Record its supported
values and its removal release. This change includes no boolean compatibility.

Non-empty remote flag results are cached for ten minutes in each process.
After a remote change, wait for cache expiry or restart every affected process
before evaluating the result. Local overrides take precedence over cached results.

## Rollback

For an immediate stop, set `control` on the final code or `false` on older code.
Apply the override to all affected processes and restart them.

For a code rollback, preserve each assignment with a local override first.
Deploy the older code with the matching boolean override. Restore the saved
PostHog configuration after the affected instances use the older contract.
Remove the temporary overrides and restart those processes. Verify recording
and retrieval together. A PostHog-only rollback is not sufficient for final code.

## Conversion record

Complete this record in the tracking issue before closing it.

| Environment | Live configuration checked | Release and version inventory | Conversion and verification | Overrides removed | Rollback reference |
| --- | --- | --- | --- | --- | --- |
| Staging | Pending | Pending | Pending | Pending | Pending |
| Production | Pending | Pending | Pending | Pending | Pending |
