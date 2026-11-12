# Assistant Hub skill use

The existing `Instance AI instance-context turn completed` event carries optional
`hub_skill_*` properties. It fires when an Assistant segment completes, fails,
is cancelled, or pauses for input. A failed skill call still records attempted
use. A pause reports attempts even if the user never returns.

## Aggregation

Group by instance, `thread_id`, and `run_id`. Select the row with the highest
`hub_skill_snapshot_sequence`. Hub metrics are cumulative across the logical run.
Do not sum them across segments. Existing token and tool-call properties remain
per-segment values. Older rows have no Hub properties; do not treat them as zero.

The collector counts each main load or reference read once per tool-call ID.
Model retries and repeated delivery of the same tool event do not add attempts.
A new tool call is a new attempt, even when it retries a failed load. Checkpoints
retain the counters and operation IDs across process restart and resume. SSE
history replay does not enter the collector.

## Meanings

| Property suffix | Meaning |
| --- | --- |
| `attempt_count`, `attempted_ids` | Main skill calls, including failures and pending calls. This measures Assistant selection intent. |
| `load_count`, `loaded_ids` | Main instructions returned successfully. This does not prove that the model followed them. |
| `failure_count` | Main calls that failed. Derive pending calls as `attempt_count - load_count - failure_count`. |
| `reference_attempt_count`, `reference_read_count`, `reference_failure_count` | Reference operations, separate from main skill loads. |
| `failures` | Counts by main/reference operation and a bounded reason: `temporarily_unavailable`, `unavailable`, `invalid_reference`, or `tool_error`. |

Canonical Hub IDs come from trusted catalog metadata. A missing Hub ID can still
contribute an attempt count when its runtime identifier has the Hub hash format.
An unresolvable free-text name cannot be attributed to the Hub and is excluded.
No payload contains names, paths, instructions, reference bodies, prompts, raw
errors, or tool-call arguments. Built-in skills are excluded.

## Delivery limits

This uses the existing best-effort telemetry transport. A process failure before
a segment boundary can lose its unreported activity. Checkpoint persistence and
telemetry delivery are not one transaction. Consumers must select snapshots,
not sum delivered rows. No new event name is introduced, so this change requires
no new downstream event allow-list entry. Property ingestion must retain the
additive fields.

## Local verification

The Assistant service tests capture the actual call to `Telemetry.track` for
completed, suspended, and errored runs after a failed skill load. They validate
the captured payload against the registry and check checkpoint state. Collector
tests cover successful loads, temporary failures, references, and duplicate
prevention.
These checks use local mocks; they do not send analytics to production.
