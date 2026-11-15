---
title: Licensing
last_reviewed: 2026-11-06
contact: martintsch
---

# Licensing

The n8n license decides which paid features an instance has access to, and to what extent.

This page explains how n8n checks the license, how quotas limit a feature, and what usage n8n reports to the license server.

## Licensed features

A license turns on paid features. It also sets **quotas** that limit how much of a feature an instance can use, e.g. the number of users. Code asks `LicenseState` if a feature is on, or for the value of a quota. n8n checks a quota where the code uses it, e.g. when a user creates a team project. `LICENSE_FEATURES` and `LICENSE_QUOTAS` in `@n8n/constants` list all features and quotas.

Files and folders with `.ee` in the name are under the n8n Enterprise License, not the Sustainable Use License. n8n does not check this suffix at runtime, so paid code still needs a license check.

## License checks

Code can check the license at three levels:

- **Route:** Add `@Licensed('feat:...')` to a controller method.
- **Module:** Set `licenseFlag` on a module. The [Lifecycle](lifecycle.md#modules) page explains how n8n starts modules.
- **Service:** Ask `LicenseState` if the feature is on.

n8n reads `licenseFlag` only at startup, so a new license starts a module only after a restart. `@Licensed` reads the license on each request. A module with free and paid parts therefore should use `@Licensed` on its paid routes.

## Usage reporting

The leader renews the license certificate before it expires. Each renewal sends usage counts to the license server, e.g. active workflows, users, credentials, and executions. The license server records these counts for each instance.

> [!WARNING]
> **Ask the License and Billing team before you change how n8n computes a usage count.**

## Quiz

1. What does the suffix `.ee` on a file do?
   - A. It sets the source code license only.
   - B. It stops the file from loading without a license.
   - C. It removes the file from free builds.
   - D. It makes n8n check the license on each call.
2. A module has free routes and paid routes. How do you limit the paid routes?
   - A. Set `licenseFlag` on the module.
   - B. Hide the routes in the editor.
   - C. Put `@Licensed` on the paid routes.
   - D. Add the suffix `.ee` to the files.
3. A customer buys a license for a module that has a `licenseFlag`. When does the module start?
   - A. At once, when the license renews.
   - B. At the next request to one of its routes.
   - C. After the next restart.
   - D. Only after the next release.

<details>
<summary>Answers</summary>

1. A. The suffix sets the source code license. n8n does not check it at runtime, so paid code still needs a license check.
2. C. `licenseFlag` stops the whole module. `@Licensed` limits one route and reads the license on each request.
3. C. n8n reads `licenseFlag` only at startup, so a new license starts a module only after a restart.

</details>
