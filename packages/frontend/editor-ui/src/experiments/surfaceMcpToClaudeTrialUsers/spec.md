# Surface MCP to Claude trial users

## Eligibility

- Target Cloud instance owners whose account onboarding answers include Claude.
  The question allows multiple selections. Admins and members do not qualify.
- Read the answer through the existing owner-only Cloud account API. The editor
  waits for the Cloud store's owner check to be ready, then sends `pickedClaude`
  to the backend. This boolean controls experiment targeting, not MCP permissions.
- Read `metadata.group` from the existing owner-only `/admin/cloud-plan` API
  before each visit until assignment. Only `trial` qualifies; Free and paid plans
  do not. Send the result as `isTrial` to the backend with `pickedClaude`.
  Do not use `userIsTrialing`: Cloud also sets it for Free accounts.
  These values control targeting, not access permissions. Missing plan data or
  request failures remain unknown and retry. Do not use the license plan name:
  Cloud certificates can omit it. Saved assignments survive later plan changes.
- Use PostHog instance-date targeting to select new instances. The backend does
  not repeat the date filter.
- Evaluate Assistant activity at first login plus 30 minutes. A successful
  Builder workflow or agent creation/edit at or before that cutoff excludes the
  owner. Match the four existing Builder creation and modification events.
  Manual edits, MCP actions, failed saves, and empty agent shells do not count.
- If the owner returns after the cutoff, assign on return. Later Assistant
  activity does not change eligibility. Missing login or survey data does not
  imply eligibility. First-login persistence runs in the background and can fail
  without blocking authentication.
- Do not exclude an owner because an MCP client is connected or the instance is
  activated. The first eligible owner saves an instance-wide assignment. Later
  eligible owners inherit its variant.

## UI

Control retains the existing UI. Treatment adds four Claude entry points:
sidebar, Create menu, empty workflow canvas, and Assistant empty state.
On the empty canvas, Claude replaces the Build with AI option. The initial
Build an agent / Build a workflow screen does not change.

| State | CTA |
| --- | --- |
| MCP disabled | Build with Claude |
| MCP enabled, Claude not connected | Connect Claude |
| Claude connected, no successful workflow write | Build with Claude |
| First successful Claude workflow write | Hide all four entry points |

When MCP is disabled, only the expanded sidebar entry adds the subtext `Connect to n8n`.
Before Claude connects, all four CTAs open MCP settings in the same tab.
After Claude connects, all four open `https://claude.ai/new` in a new tab.
Treatment also changes the MCP settings copy and Connect button styling. These
settings changes remain after the four entry points disappear.

Show the dark Connect coachmark when MCP is enabled and Claude is not connected.
Got it and Connect save dismissal across sessions. Escape and outside click hide
it for the current visit. Do not autofocus the coachmark.

## Connection and exit

Recognize the shared Claude client names and `Anthropic/Toolbox`. Legacy MCP tool
requests can omit the client name. In that case, use the connection recorded at
handshake for the same user and OAuth client or API-key ID. An explicit name from
another client does not use this fallback.

Count successful `create_workflow_from_code` and `update_workflow` results that
return a workflow ID. Ignore errors, input-required responses, reads, and updates
with zero applied operations. The exit is per user and persists across sessions.
Removing consent or rotating an API key can reset connection state, but does not
reset successful use.

Empty claim values are unfinished writes. They do not count as a connection or
successful use. An unfinished Assistant timestamp keeps eligibility unknown until
the value is available. Assignment claims can be completed on a later visit.

## Refresh and telemetry

Check on initialization and every 60 seconds while waiting, unknown, or showing
entry points. Stop for control, excluded, inactive, or completed treatment users.
A successful PostHog response without the flag is inactive. Request failures,
quota limits, and evaluation errors remain unknown and can retry. Successful
flag results, including absent flags, use a ten-minute cache.

Keep participation tracking centralized. Entry-point view and click events carry
`surface`, `cta_stage`, and experiment metadata. Record views once per surface
per editor session. User-object replacements with the same identity do not reset
exposure or view tracking.
