# Developing on the v3 line

After the v3 cutover, `master` is the main development and release branch for n8n.
Branch from the latest `master` and target `master` for normal development. Do not
target the old `3.x` integration branch for new work.

Use the maintenance branches only for approved backports. See the
[backport conventions](./backport_conventions.md). Check the release plan before
making a breaking change or running a destructive migration. Follow the
[PR title conventions](./pull_request_title_conventions.md) for breaking changes.

## Develop behind a feature flag

Use an opt-in flag when a change needs staged rollout or testing before it is on
by default. n8n evaluates PostHog flags on the server and sends the results to the
frontend.

- **Frontend:** Follow the [experiments skill](../.agents/skills/experiments/SKILL.md)
  to register, configure, and test the flag in the editor.
- **Backend:** Define a shared flag key in `@n8n/api-types` when the frontend also
  uses it. If self-hosted operators need an override, define a boolean in
  `@n8n/config` and wire it in
  [`PostHogClient.applyEnvOverrides()`](../packages/@n8n/backend-services/src/services/posthog-client.ts).
  A `true` environment override enables the flag. `false` leaves the PostHog value
  in effect.

## Test a published build

The n8n v3 application ships as Docker images. Public libraries and developer
tools still ship to npm. For a repeatable container test, use the same exact
version for n8n and its runner, not floating tags.

The regular `nightly` images build from `master`. Use the matching runner variant
for your test. See the [workflow guide](./WORKFLOWS.md#release-lifecycle) for
release channels and promotion.

For community node development, use
[`n8n-node dev`](../packages/@n8n/node-cli/README.md#n8n-node-dev) with its
container-based development environment.
