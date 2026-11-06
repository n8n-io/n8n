---
title: Cloud contracts
audience: Backend engineers new to n8n
tier: 3
last_reviewed: 2026-11-05
contact: afitzek
---

# Cloud contracts

n8n Cloud configures and upgrades each instance from a control plane in another repository. That control plane depends on names and files in this repository, and no test here checks them. Read this page before you rename or move anything in the table below.

## Control plane

The control plane sets the environment variables of each instance from its plan and its version, including `N8N_DEPLOYMENT_TYPE=cloud`. It loads a compiled hooks file into the process, which adds the limits of each plan, usage reports, and some HTTP routes. It calls the health endpoints and reads the metrics.

Each instance runs a fixed version. An upgrade restarts the container with a new image, and n8n runs its migrations at that start. A rollback starts the previous image on the migrated database, so a migration must leave a schema that the previous version can still use.

## Contracts

| Contract | What breaks it |
|---|---|
| The external hooks: their names, their arguments, and when they run | A rename, new arguments, or a new moment. A hook can throw to stop an action, which is how a plan limit shows an upgrade message |
| Compiled files that the hooks file imports, and `HooksService` | A moved file or a removed method. Every Cloud instance then fails at startup. Search for "cloud hooks" before you move code |
| Environment variable names | A rename. Retire an old name with `DeprecationService`, which keeps it working for a release |
| Module names | A rename. Cloud turns modules on and off by name |
| License feature names | A rename. Cloud maps its plans to them |
| `/healthz`, `/healthz/readiness`, `/metrics` | A new path or new status codes |
| `n8n export:entities` and `n8n import:entities` | New flags or a new output layout |
| Table names that the SQLite backup copies | A rename of the tables for workflows, credentials, users, projects, or data tables |

Never edit `N8N_ENABLED_MODULES` by hand on a Cloud instance. A wrong value can stop the instance from starting.

## Deployment type

`N8N_DEPLOYMENT_TYPE=cloud` also changes some behavior inside n8n, for example in the settings of the Assistant. Before you add a branch on the deployment type, ask if a license feature or a setting can do the same job. Then self-hosted users can have the behavior too.

## Quiz

1. You must rename an environment variable. How do you keep Cloud instances working?
   - A. Rename it and tell the Cloud team after the release.
   - B. Add the new name only on Cloud.
   - C. Nothing. Cloud reads all variables by prefix.
   - D. Retire the old name with `DeprecationService`, which keeps it working for a release.
2. A Cloud upgrade fails, and the control plane starts the previous image. What must your migration allow?
   - A. Nothing. The rollback undoes the migration.
   - B. The migration must run again at the rollback.
   - C. The previous version must still work with the migrated schema.
   - D. The previous version must run `db:revert` first.
3. You move a compiled file that the Cloud hooks file imports. What happens?
   - A. Nothing. The hooks file finds the new path.
   - B. Every Cloud instance fails at startup.
   - C. Only new Cloud instances fail.
   - D. The hooks stop, but the instance runs.
4. You want a behavior only on Cloud. What do you check first?
   - A. If a license feature or a setting can do the same job.
   - B. If `N8N_DEPLOYMENT_TYPE` is set.
   - C. If the hooks file can add it.
   - D. If PostHog has a Cloud flag.

<details>
<summary>Answers</summary>

1. D. Cloud sets environment variables by name, so a rename breaks it.
2. C. A rollback starts the previous image on the migrated database.
3. B. Search for "cloud hooks" before you move code.
4. A. A license feature or a setting gives the behavior to self-hosted users too.

</details>
