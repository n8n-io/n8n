---
title: Licensing
audience: Backend engineers new to n8n
tier: 3
last_reviewed: 2026-11-06
contact: afitzek
---

# Licensing

[APIs](apis.md) showed that a route can need a license. Every instance has the same code, also self-hosted instances on the free plan. The license decides which paid features run. This page explains how n8n names paid features and limits, where code checks the license, and what usage n8n reports to the license server.

## License names

Each paid feature has a name in `@n8n/constants`, such as `feat:sharing`. A limit has a name too, such as `quota:users`, and its value is a number. The value `-1` means no limit. The license server and n8n Cloud use these names, so a rename breaks them.

`LicenseState` answers the question "is this feature licensed?" and gives the value of a quota. Routes, modules, and services ask it. The class `License` holds the certificate and renews it, and other code does not call it.

Files and folders with the suffix `.ee` hold code under the Enterprise license. The suffix does not limit anything by itself. It tells a reviewer that the code needs a license check on its path.

## Feature map

The main paid features, their modules, and their license names:

| Feature | Module | License feature | Explained on |
|---|---|---|---|
| SSO with SAML, OIDC, or LDAP | `sso-saml`, `sso-oidc`, `ldap` | `feat:saml`, `feat:oidc`, `feat:ldap` | [Authentication](authentication.md#sign-in-methods) |
| SCIM | `scim` | `feat:scim` | [Authentication](authentication.md#sign-in-methods) |
| Sharing and project roles | Core code | `feat:sharing`, `feat:projectRole:*` | [Permissions](permissions.md) |
| Custom roles and the admin role | Core code | `feat:customRoles`, `feat:advancedPermissions` | [Permissions](permissions.md#scopes-and-roles) |
| Policies | `policy-infrastructure`, `type-availability-policies` | `feat:typeAvailabilityPolicies` | [Permissions](permissions.md#policies) |
| Workflow reviews | `workflow-reviews` | `feat:workflowReviews` | [Governance](governance.md#workflow-reviews) |
| Multi-main | Core code | `feat:multipleMainInstances` | [Coordination](coordination.md#leader) |
| Worker pools | Core code | `feat:workerPools` | [Coordination](coordination.md#channels) |
| Binary data in S3 or Azure | Core code | `feat:binaryDataS3`, `feat:binaryDataAz` | [Persistence](persistence.md#binary-data) |
| Execution data in S3 or Azure | Core code | `feat:executionDataS3`, `feat:executionDataAz` | [Persistence](persistence.md#execution-data) |
| External secrets | `external-secrets` | `feat:externalSecrets` | [Credentials](credentials.md#external-secrets) |
| Dynamic credentials | `dynamic-credentials` | `feat:dynamicCredentials` | [Credentials](credentials.md#credentials) |
| Variables | Core code | `feat:variables` | [Credentials](credentials.md#variables) |
| Data redaction | `redaction` | `feat:dataRedaction` | [Governance](governance.md#data-redaction) |
| Log streaming | `log-streaming` | `feat:logStreaming` | [Observability](observability.md#events) |
| Insights | `insights` | `feat:insights:*` | [Governance](governance.md#insights-and-usage) |
| Environments | `source-control`, `promotions` | `feat:sourceControl`, `feat:promotions` | [Governance](governance.md#environments) |
| Gateway credits | Core code | `feat:aiGateway` | [Credentials](credentials.md#gateway-credits) |
| AI workflow builder | `workflow-builder` | `feat:aiBuilder` | [AI for building](ai-for-building.md#workflow-builder) |

The AI modules have no `licenseFlag`. The license gates parts of them from inside, for example Gateway credits with `feat:aiGateway`.

## Quotas

A **quota** limits how much of a feature an instance can use. Two plans can have the same feature with different quotas.

| Quota | Limits | n8n checks it |
|---|---|---|
| `quota:users` | The users who can sign in | At sign-in, and when a user accepts an invitation |
| `quota:activeWorkflows` | The active triggers | Never. The usage page shows it, and the license server receives it |
| `quota:maxTeamProjects` | The team projects | When a user creates a team project |
| `quota:maxVariables` | The variables | When a user creates a variable |
| `quota:workflowHistoryPrune` | How long n8n keeps workflow history | When n8n prunes workflow history |
| `quota:insights:*` | How far back Insights shows data, and how long it keeps data | In the `insights` module |
| `quota:evaluations:*` | The workflows with evals, and the concurrent test runs | [AI evals](ai-evals.md#workflow-evals) |
| `quota:aiCredits` | The credits of the AI workflow builder | [AI for building](ai-for-building.md#workflow-builder) |
| `quota:aiGatewayBudget` | The budget of Gateway credits | [Credentials](credentials.md#gateway-credits) |

When the license has no value for a quota, `LicenseState` uses a default. The default depends on the quota: `quota:users` has no limit, and `quota:maxTeamProjects` is 0.

## License checks

| You limit | How |
|---|---|
| A route | `@Licensed('feat:...')` on the controller method. An unlicensed instance answers 403 |
| A whole module | `licenseFlag` on the module. [Lifecycle](lifecycle.md#modules) explains when n8n starts a module |
| A decision inside a service | Ask `LicenseState`, then refuse or offer less |

n8n reads `licenseFlag` only at startup, so a new license starts a module only after a restart. `@Licensed` reads the license on each request. A module with free and paid parts therefore uses `@Licensed` on its paid routes.

A PostHog feature flag turns a part of a feature on or off during a rollout. [Roll out a backend change](how-to/roll-out-a-change.md) explains flags.

## Usage reporting

> **Do not change the meaning of a usage count without the agreement of the owners of the license server.** The license server records these counts for each instance.

Only the leader renews the license certificate, 72 hours before it expires. Each renewal sends these usage counts to the license server:

- Active workflows and all workflows
- Enabled users and all users
- Credentials
- Production executions, production root executions, and manual executions
- Active triggers
- Workflows with evals

The renewal also sends the IDs of up to 1000 active workflows. The license server forwards them to telemetry, to find instances that use more than their quotas.

## Quiz

1. A module has free routes and paid routes. How do you limit the paid routes?
   - A. Set `licenseFlag` on the module.
   - B. Hide the routes in the editor.
   - C. Put `@Licensed` on the paid routes.
   - D. Add the suffix `.ee` to the files.
2. A customer buys a license for a module that has a `licenseFlag`. When does the module start?
   - A. At once, when the license renews.
   - B. At the next request to one of its routes.
   - C. After the next restart, because n8n checks `licenseFlag` only at startup.
   - D. Only after the next release.
3. What does the suffix `.ee` on a file do?
   - A. Nothing by itself. It tells a reviewer that the code needs a license check on its path.
   - B. It stops the file from loading without a license.
   - C. It removes the file from free builds.
   - D. It adds the `@Licensed` decorator.
4. An instance has more active triggers than its `quota:activeWorkflows`. A user publishes another workflow. What happens?
   - A. n8n refuses the publication with 403.
   - B. The publication succeeds. n8n does not check this quota, but the usage page and the license server see the usage.
   - C. n8n stops the oldest trigger.
   - D. The leader stops renewing the license.

<details>
<summary>Answers</summary>

1. C. `licenseFlag` stops the whole module. `@Licensed` limits one route and reads the license on each request.
2. C. A restart is necessary, because the module checks run only at startup.
3. A. The suffix marks code under the Enterprise license. The check must still be in the code.
4. B. No code path refuses a publication over this quota. The count goes to the license server at each renewal.

</details>
