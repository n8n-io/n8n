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
without deleting saved assignments. Cached evaluations can delay this by up to
ten minutes. An inactive editor session checks again on the next page load or
sign-in.

## Verification

Run the experiment's backend, frontend, and PostHog tests. Use test-owned data
and keep local fixtures and scripts outside the repository.

Before rollout, verify:

- A real Cloud owner with a Claude onboarding answer can qualify. Admins and
  members cannot. Missing and unsupported answers do not qualify.
- The first eligibility check runs after Cloud owner initialization, without
  waiting for the next poll.
- A qualifying owner sees entry points after the cutoff without refreshing.
- Assistant edits before the cutoff exclude the owner. Edits after it do not.
- Control and treatment keep one saved assignment after reload and restart.
- All four placements show the correct CTA and open MCP settings.
- Modern and legacy Claude clients update connection state and hide all four
  entry points after a successful workflow write. Failed writes do not hide them.
- Revocation, API-key rotation, dismissal, and reconnect behave as specified.
- Disabled or absent flags stop polling. PostHog failures retry and preserve the
  saved assignment.
- View and click events include `surface`, `cta_stage`, and experiment metadata.
- Keyboard navigation, narrow windows, dark mode, and collapsed sidebar work.

Unit tests do not replace the real Cloud and Claude checks. See [spec.md](spec.md)
for the behavior contract.
