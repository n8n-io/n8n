# Surface MCP to Claude trial users

## Eligibility

- Target Cloud instance owners whose account onboarding answers include Claude.
  The question allows multiple selections. Admins and members do not qualify.
- Read the answer through the existing owner-only Cloud account API. The editor
  waits for the Cloud store's owner check to be ready, then sends `pickedClaude`
  to the backend. This boolean controls experiment targeting, not MCP permissions.
- Read `metadata.group` from the existing owner-only `/admin/cloud-plan` API
  before each visit until eligibility is confirmed. Only `trial` qualifies; Free and paid plans
  do not. Send the result as `isTrial` to the backend with `pickedClaude`.
  Do not use `userIsTrialing`: Cloud also sets it for Free accounts.
  These values control targeting, not access permissions. Missing plan data or
  request failures remain unknown and retry. Do not use the license plan name:
  Cloud certificates can omit it. Saved eligibility is retained after later plan changes.
- Use PostHog instance-date targeting to select new instances. The backend does
  not repeat the date filter.
- Evaluate Assistant activity at first login plus 30 minutes. A successful
  Builder workflow or agent creation/edit at or before that cutoff excludes the
  owner. Match the four existing Builder creation and modification events.
  Manual edits, MCP actions, failed saves, and empty agent shells do not count.
- If the owner returns after the cutoff, save eligibility on return. Later Assistant
  activity does not change eligibility. Missing login or survey data does not
  imply eligibility. First-login persistence runs in the background and can fail
  without blocking authentication.
- Do not exclude an owner because an MCP client is connected or the instance is
  activated. Save the user's eligibility cutoff on the backend. Select control
  or treatment through the editor's standard PostHog `getVariant()` path, with
  instance-group allocation configured in PostHog. Do not persist a variant.
  The endpoint's `assigned` status means eligibility was confirmed; the UI also
  requires a current `control` or `variant` flag. Changing the flag can change
  the user's arm without changing saved eligibility.

## UI

After eligibility and a live variant are available, expand the sidebar once in
both control and treatment. Save the marker in browser storage, shared across
users on the same origin. Later manual collapses remain after reload. Clearing
browser storage or using another browser allows this step to run again.
The existing `067_sidebar_expanded` experiment sets only the initial sidebar
state; this experiment expands it once when the owner qualifies.

Control has no Claude entry points. Treatment adds four Claude entry points:
sidebar, Create menu, empty workflow canvas, and Assistant empty state.
On the empty canvas, Claude replaces the Build with AI option. The initial
Build an agent / Build a workflow screen does not change.

| State | CTA |
| --- | --- |
| MCP disabled | Build with Claude |
| MCP enabled, Claude not connected | Connect Claude |
| Claude connected, no successful workflow write | Build with Claude |
| First successful workflow write through any MCP client | Hide all four entry points |

When MCP is disabled, only the expanded sidebar entry adds the subtext `Connect to n8n`.
Before Claude connects, all four CTAs open MCP settings in the same tab.
After Claude connects, all four open `https://claude.ai/new` in a new tab.
Treatment also changes the MCP settings copy and Connect button styling. These
settings changes remain after the four entry points disappear. Connect stays
solid until Claude connects, then becomes outline. Other MCP clients do not
remove its emphasis. If Claude disconnects, Connect becomes solid again.

Show the dark Connect coachmark when MCP is enabled and Claude is not connected.
Got it and Connect save dismissal across sessions. Escape and outside click hide
it for the current visit. Do not autofocus the coachmark.

## Connection and exit

Use the shared Claude client names and `Anthropic/Toolbox` to choose the CTA stage.
Track Claude connections by user and OAuth client or API-key ID. This connection
check is separate from the condition that hides the entry points.

Hide all four entry points after a successful `create_workflow_from_code` or
`update_workflow` result from any MCP client, including clients without a name.
Require a workflow ID. Ignore errors, input-required responses, reads, and updates
with zero applied operations. The exit is per user and persists across sessions.
A write does not identify the client as Claude. Removing consent or rotating an
API key can reset connection state, but does not reset successful MCP use.

Empty claim values are unfinished writes. They do not count as a connection or
successful use. An unfinished Assistant timestamp keeps eligibility unknown until
the value is available. Empty eligibility claims can be completed on a later visit.

## Refresh and telemetry

Retry unknown data after one minute twice, then after two, four, and at most five
minutes. Keep retrying so temporary failures can recover. Reset the delay when
data becomes available or the user changes. Reject a known non-Claude answer
without waiting for the deadline.

Check on initialization and every 60 seconds while waiting or showing
entry points. Stop for control, excluded, inactive, or completed treatment users.
Variant selection uses the existing editor flag lifecycle; this experiment does
not fetch PostHog flags separately. Missing, disabled or unrecognized variants
show no treatment and emit no exposure. If flags arrive after saved eligibility,
the UI reacts without another visit; treatment resumes completion polling.
Waiting/unknown eligibility checks continue independently of flag availability.
An API failure does not clear eligibility already loaded in the editor.

Keep participation tracking centralized and gated by confirmed eligibility.
Record custom exposure for both arms, once per variant per editor session, using
that same live variant. Do not report an instance assignment timestamp: there is
no longer a stored variant assignment. Entry-point view and click events carry
`surface`, `cta_stage`, and experiment metadata. Record views once per surface
per editor session. User-object replacements with the same identity do not reset
exposure or view tracking.
