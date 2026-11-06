---
title: Licensing
audience: Backend engineers new to n8n
tier: 3
last_reviewed: 2026-11-05
contact: afitzek
---

# Licensing

Paid features ship in every instance, also in free self-hosted ones. A license certificate decides if they run. This page explains how code asks that question. Read it before you add or change a paid feature or a limit.

## Names

Each paid feature has a name in `@n8n/constants`, such as `feat:sharing`. A limit has a name too, such as `quota:users`, and its value is a number. The value `-1` means no limit. The license server and Cloud use these names, so a rename breaks them.

`LicenseState` answers the question "is this feature licensed?" and gives the value of a quota. Routes, modules, and services ask it. The class `License` holds the certificate and renews it, and other code does not call it.

An instance without a certificate still has quota values. Some of them have no limit, and others are zero.

Files and folders with the suffix `.ee` hold code under the Enterprise license. The suffix does not limit anything by itself. It tells a reviewer that the code needs a license check on its path.

## Checks

| You limit | How |
|---|---|
| A route | `@Licensed('feat:...')` on the controller method. An unlicensed instance answers 403 |
| A whole module | `licenseFlag` on the module. The module does not start, but its tables exist |
| A decision inside a service | Ask `LicenseState`, then refuse or offer less |

A module that has free and paid parts uses `@Licensed` on its paid routes, not `licenseFlag`. n8n reads `licenseFlag` only at startup, so a new license starts a module only after a restart. `@Licensed` reads the license on each request.

The editor hides the features that an instance cannot use. The backend must still check, because a hidden button does not protect a route.

## Quiz

1. A module has free routes and paid routes. How do you limit the paid routes?
   - A. Set `licenseFlag` on the module.
   - B. Hide the routes in the editor.
   - C. Put `@Licensed` on the paid routes.
   - D. Add the suffix `.ee` to the files.
2. The editor hides a paid feature. Does the backend still need a check?
   - A. No. The editor check is enough.
   - B. Yes. A hidden button does not protect a route.
   - C. Only for the public API.
   - D. Only on Cloud.
3. What does the suffix `.ee` on a file do?
   - A. Nothing by itself. It tells a reviewer that the code needs a license check on its path.
   - B. It stops the file from loading without a license.
   - C. It removes the file from free builds.
   - D. It adds the `@Licensed` decorator.
4. A quota has the value `-1`. What does that mean?
   - A. The feature is off.
   - B. The license is not valid.
   - C. The quota is not loaded yet.
   - D. No limit.

<details>
<summary>Answers</summary>

1. C. `licenseFlag` stops the whole module, and n8n reads it only at startup. `@Licensed` reads the license on each request.
2. B. A caller can send the request without the editor.
3. A. The suffix marks code under the Enterprise license. The check must still be in the code.
4. D. A quota value is a number, and `-1` means no limit.

</details>
