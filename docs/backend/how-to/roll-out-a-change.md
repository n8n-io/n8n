---
title: Roll out a backend change
last_reviewed: 2026-11-06
contact: ivov
---

# Roll out a backend change

A risky backend change should be released behind a flag that is disabled by default, and then rolled out to a growing share of instances on n8n Cloud. This page shows how to choose a flag mechanism, what to monitor during the rollout, and what a rollback does not undo.

## Choose a flag mechanism

| Mechanism | Enables change for | Takes effect | Consumed by |
|---|---|---|---|
| n8n Cloud instance flag | A share of n8n Cloud instances | At the next upgrade of each instance | A `@Config` class, through an env var |
| [PostHog](https://eu.posthog.com) flag | A share of instances or users, on n8n Cloud and self-hosted | Within 10m of an update in PostHog | `PostHogClient` |

Use an n8n Cloud instance flag when your code reads the setting once, at startup. Use a PostHog flag when you must be able to disable the flag without a restart.

Keep in mind:

- An instance with `N8N_DIAGNOSTICS_ENABLED=false` reads every PostHog flag as disabled. Self-hosted users can still enable your change with `N8N_FEATURE_FLAG_OVERRIDES`.
- A PostHog flag also reaches self-hosted instances. To limit it to n8n Cloud, add a condition on `n8n_deployment_type` in PostHog.
- A flag that you read with `PostHogClient.getFeatureFlags(user)` can differ between two users on one instance. Use `getFeatureFlagForInstance(name)` for one value per instance.

## Create your flag

- **n8n Cloud instance flag:** In the `n8n-cloud` repository, add the flag with your first percentage and the first n8n version with your code. In the same PR, map the flag to your env var. For an example, see [the PR that added `nativeEvaluationVerify`](https://github.com/n8n-io/n8n-cloud/pull/5401).
- **PostHog flag:** Create the flag disabled in the staging and production PostHog projects, with a key `NNN_name`. Put its constant in `@n8n/api-types`. [PostHog Feature Flags](https://app.notion.com/p/3ff5b6e0c94f802ead22d77426d62def) in Notion describes the full process.

## Try the change on staging internal

If applicable, consider enabling your change on staging internal. This instance runs the [beta release](https://docs.n8n.io/release-notes) in queue mode with multi-main. The n8n Cloud control plane does not manage it, so n8n Cloud instance flags do not reach it.

- **Env var:** Follow the [runbook](https://app.notion.com/p/2ee5b6e0c94f80ce958ded2c4302b91f).
- **PostHog flag:** Add a condition on the instance ID of staging internal.

Announce the change in `#mission-internal-instance`.

> [!CAUTION]
> **Staging internal runs business-critical workflows.** Before you merge, know how to roll back your change. After you merge, monitor the [instance load](https://grafmon.app.n8n.cloud/d/load-internal/n8n-staging-internal-c2b7-instance-load?orgId=1&from=now-6h&to=now&timezone=browser&var-datasource=ea3389f8-972a-4261-93f7-7c911602172d&var-topk=5&refresh=30s) and [Postgres performance](https://grafmon.app.n8n.cloud/d/pgss-internal/n8n-staging-internal-c2b7-postgres-performance?orgId=1&from=now-6h&to=now&timezone=browser&var-datasource=ea3389f8-972a-4261-93f7-7c911602172d&var-topk=5&refresh=30s) dashboards, and the [Sentry issues](https://n8nio.sentry.io/issues/?groupStatsPeriod=auto&project=4503924908883968&query=is%3Aunresolved%20server_name%3An8n-internal-instance-stage&referrer=issue-list&sort=date&statsPeriod=14d) of the instance.

## Roll out on n8n Cloud

For an n8n Cloud instance flag:

1. Raise the percentage in a PR to `n8n-cloud`. Open one PR for each raise.
2. Announce the raise in `#mission-n8n-cloud` after you merge the PR.
3. The raise reaches production when its release PR merges, as the [n8n Cloud release process](https://github.com/n8n-io/n8n-cloud/blob/main/docs/release-process.md) describes.
4. Each instance gets the flag only at its next upgrade, plan change, or creation.

Typical rollouts use 10%, then 50%, then 100%, with about two weeks between raises.

For a PostHog flag, change the rollout percentage in PostHog.

When the rollout reaches 100%, remove the flag.

## Monitor the rollout

Before the first raise, make your change observable:

- Add [metrics](../observability.md#metrics-logs-traces) for what your change does, and [telemetry events](../observability.md#telemetry) if appropriate.
- Label your metrics by whether the flag is enabled.
- Build a [Grafana](https://grafmon.app.n8n.cloud/) dashboard that compares instances with and without the flag, on the same n8n versions.
- Decide which values stop the rollout.

## Roll back

- **n8n Cloud instance flag:** Set the percentage back to 0% in a PR, and release it. Instances that already have the flag keep it. To disable the flag on each of them, run the [medic CLI](https://github.com/n8n-io/n8n-cloud/tree/main/scripts/medic-cli):

  ```bash
  medic set-overrides ivov \
    '{"instanceFeatureFlags":{"memoryGuard":false}}'
  ```

  The command redeploys the instance. The override stays until you remove it.
- **PostHog flag:** Disable the flag in PostHog. Each process reads the update within 10m.

## What a rollback does not undo

Before you release, check your change against each item:

- [Migrations](write-a-database-migration.md#how-n8n-runs-migrations) stay applied. To undo one, run `n8n db:revert` before the downgrade.
- Rows in a new format stay. Release the code that reads them one version before the code that writes them.
- Instance settings that your change saved in the `settings` table (e.g. the SSO configuration) stay.
- Overrides keep their value, both in `N8N_FEATURE_FLAG_OVERRIDES` and from medic.
- External systems (e.g. an identity provider or a webhook caller) keep what they did in response to your change.
