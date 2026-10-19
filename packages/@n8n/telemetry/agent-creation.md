# Agent creation and runtime version events

Agent creation now means that a new Agent row and its initial configuration have committed. The shared backend creation operation emits the event. The caller supplies user, builder, or MCP attribution. The event profile describes the saved initial configuration.

| Event | New `event_version` |
| --- | --- |
| User created agent | `3` |
| Builder created agent | `3` |
| MCP created agent | `2` |
| User modified agent | `2` |
| Builder modified agent | `2` |
| MCP modified agent | `2` |
| Agent execution count | `4` |
| Agent session metrics | `2` |

Creation includes incomplete drafts, Agents with a default model, duplicates, and template starts. Opening an unsaved editor does not create an Agent. Internal evaluation seeds do not emit creation events.

The editor and MCP save available initial configuration in the creation transaction. AI generation and resource setup can still create an early draft. A later generation or setup failure does not undo that committed creation.

Adoption of an existing Agent does not change its configuration or emit creation again. A failed creation transaction emits nothing. A later tracked change emits modification, even when the Agent is incomplete. No-op and cosmetic-only updates keep their existing exclusions. Existing event names and payload fields remain available.

## Runtime versions

`Agent execution count` and `Agent session metrics` now include `version_id`. The runtime captures this value when it selects its configuration. Cached runtimes and running turns retain that value after a later save or publish. The buffers keep versions separate, even when their reported configuration dimensions match.

For production runs, join `agent_id` and `version_id` to the published Agent version. Test runs report the draft version. A draft version can contain several edits, so its ID does not identify an immutable configuration. Delegated runs report their selected child version in session metrics. Delegated token and tool counters keep their existing attribution to the parent runtime.

The value is `null` for inline Agents and older drafts or saved background runs without a captured version. It is also `null` when runtime initialization fails before the selected version can be captured. No current Agent lookup supplies a replacement version after a run. A session that spans versions contributes to each version bucket, so the sum of these session counts is not a distinct session total.

## Data rollout

Before shipping, send Data a Slack heads-up and add this change to the telemetry Notion note. Include the release or deployment boundary when it is known.

Suggested message:

> Agent creation events now report committed inserts. User and builder creation use event version 3. MCP creation and all modification events use version 2. Counts now include incomplete drafts, default-model Agents, duplicates, and template starts. Creation profiles describe the initial saved configuration. Later changes, including the first generated configuration of an early draft, report modification. Agent execution count version 4 and Agent session metrics version 2 add version_id and separate runtime versions within each buffer window. Production version IDs match the published version. Draft versions remain mutable. Please use the event versions when comparing counts and profiles across the rollout.

Keep Data's existing historical fallback. This change does not backfill missing historical events or runtime version IDs.
