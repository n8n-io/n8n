# Node-usage flag conversion

Track this conversion in [CONTEXT-180](https://linear.app/n8n/issue/CONTEXT-180).
Keep the key `109_instance_ai_node_usage` and its per-user assignment.
Keep the current rollout eligibility and active state.

## Value contract

Only `variant` enables the `workflows(action="node-usage")` action and the
`nodeTypes` filter on `workflows(action="list")`.
Existing capability and permission checks still apply.
`control`, Boolean values, missing values, and unreadable assignments do not
enable these capabilities.

`N8N_INSTANCE_AI_NODE_USAGE_ENABLED=true` produces `variant`.
It takes priority over PostHog and `N8N_FEATURE_FLAG_OVERRIDES`.
A false or unset dedicated setting leaves the resolved assignment unchanged.
Local overrides also work when diagnostics are disabled.

Use either generic override form:

```sh
N8N_FEATURE_FLAG_OVERRIDES='{"109_instance_ai_node_usage":"variant"}'
N8N_FEATURE_FLAG_OVERRIDES='{"109_instance_ai_node_usage":{"value":"control"}}'
```

Both forms accept `variant` and `control`.
To force the feature off, use `control` and unset the dedicated force-on setting.

## Older versions

| Version contract | Enabled assignment | Dedicated force-on setting |
| --- | --- | --- |
| Before this change | Boolean `true` | Produces Boolean `true` |
| With this change | String `variant` | Produces string `variant` |

This change does not add a compatibility period.
Do not convert Production until all eligible instances that depend on PostHog
use a compatible release. Record their release versions in the deployment record.
An older version that receives `variant` leaves node usage unavailable.
An upgraded version that receives Boolean `true` also leaves it unavailable.

Coordinate the release and flag conversion in one deployment window.
Account for temporary unavailability between those two steps.
If uninterrupted use or mixed versions are required, prepare a compatibility
release before conversion. That release must accept both enabled values.
Then convert the flag and local overrides. Remove Boolean support after the
eligible instances and cached assignments use strings.

Keep the dedicated setting on instances where operators already force the
feature on. It works across both contracts. Do not add it to replace a partial
rollout: it enables the feature for every user on that instance.

## Staging verification

1. Record the current flag configuration, targeting, active state, and release.
2. Deploy the compatible release and update Boolean generic overrides to strings.
3. Configure `variant` and `control` without expanding rollout eligibility.
4. Restart the test backend or wait at least ten minutes for its flag cache.
5. Verify both capabilities with a user assigned to `variant`.
6. Verify that neither capability is available to a user assigned to `control`.
7. Verify that activity context and folder exploration retain their assignments.
8. Verify both generic override forms with diagnostics disabled.
9. Verify that the dedicated setting wins over generic `control`.
10. Record the results before the Production conversion.

## Production conversion and rollback

Save the full previous flag configuration before conversion.
Repeat the verified Staging procedure with the recorded compatible release.
Preserve targeting, eligibility, and active state.
Record the operator, time, release version, configuration, and verification result.

To stop node usage on the new release, assign `control` without changing
eligibility. Remove any dedicated force-on setting on affected instances.
Allow for the ten-minute cache or restart the affected backend processes.

To roll back the code, restore the Boolean flag configuration and Boolean local
overrides with the previous release. Restore the saved targeting and active state.
Coordinate these steps to avoid a value-contract mismatch.
Verify both capabilities after cached assignments expire or processes restart.

## Deployment record

The conversion is pending.
Complete this record after verification in each environment.

| Environment | Configuration verified | Compatible release | Conversion and verification |
| --- | --- | --- | --- |
| Staging | Pending | Pending | Pending |
| Production | Pending | Pending | Pending |
