# Experiment setup

Use `123_surface_mcp_to_claude_trial_users` with `control` and `variant` values.
Allocate at the instance group level. Keep the flag disabled until targeting and
integration checks are complete. No custom Cloud hook is required.

## Configuration

1. Configure the Cloud deployment condition.
2. Add an `instance.createdAt` filter for the rollout cutoff.
3. Allocate eligible instances equally between control and treatment.
4. Use `User entered MCP discovery experiment` as the custom exposure event.
5. Configure analysis before enabling rollout. Keep internal metrics and rollout
   decisions in the team's project documentation.

Do not use a flag payload for eligibility. Disabling the flag hides treatment
without deleting saved eligibility. The UI reacts when its existing PostHog
store receives the new value; the eligibility poll does not refresh flags.
A dashboard flag change may therefore require reloading the editor to receive it.
Keep the instance-group allocation stable during the experiment: live variants
are not pinned in the instance database.

## Verification

Run the experiment's backend, frontend, and PostHog tests. Use test-owned data
and keep local fixtures and scripts outside the repository.

Before rollout, verify:

- A real Cloud owner with a Claude onboarding answer can qualify. Admins and
  members cannot. Missing and unsupported answers do not qualify.
- A Cloud trial can qualify even if its license reports `Community`. A non-trial
  account cannot qualify. Missing trial status and Cloud API failures retry.
- The first eligibility check runs after Cloud owner initialization, without
  waiting for the next poll.
- A qualifying owner sees entry points on the first successful eligibility check,
  without a 30-minute delay or a page refresh. An owner still waiting under the
  previous version qualifies on the next check after the backend update.
- Both arms expand the sidebar once after eligibility and flag loading. A manual
  collapse remains after subsequent checks and editor reloads. Nonparticipants
  keep their sidebar state.
- Assistant edits at or before first login plus the configured delay exclude the
  owner. Edits after that cutoff do not. The delay is currently zero.
- Eligibility remains saved after reload and restart. Control/treatment follows
  the current PostHog value, including local overrides.
- All four placements open MCP settings before Claude connects, then open Claude in a new tab.
- While MCP is disabled, the expanded sidebar shows the title, description, and CTA
  button. The Assistant prefix stays outside its CTA button. After MCP is enabled,
  both placements show only the short CTA, with no extra copy. The collapsed sidebar
  shows only the icon.
- Modern and legacy Claude clients update the CTA connection state.
- A successful workflow write through Claude, another MCP client, or an unnamed
  client hides all four entry points. Reads, failed writes and zero-operation
  updates do not hide them.
- Connect stays prominent with non-Claude clients connected. It becomes neutral
  when Claude connects and prominent again when Claude disconnects.
- Revocation, API-key rotation, dismissal, and reconnect behave as specified.
- Disabled or absent flags hide treatment without clearing eligibility. Late
  flags enable treatment and resume completion polling without a page reload.
- Exposure is sent only after eligibility, for the live arm. A flag loaded before
  eligibility must not count the owner as participating yet.
- View and click events include `surface`, `cta_stage`, and experiment metadata.
- Keyboard navigation, narrow windows, dark mode, and collapsed sidebar work.

Unit tests do not replace the real Cloud and Claude checks. See [spec.md](spec.md)
for the behavior contract.
