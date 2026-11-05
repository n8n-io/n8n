---
title: SSO and provisioning
audience: Backend engineers new to n8n
tier: 3
last_reviewed: 2026-11-05
contact: guillaumejacquart
---

# SSO and provisioning

Read this when you touch SAML, OIDC, LDAP, SCIM, or the rules that map identity claims to n8n roles.

## What it is

Single sign-on is three licensed backend modules: `sso-saml`, `sso-oidc`, and `ldap`. A shared `provisioning` module maps identity claims to instance and project roles. A newer `scim` module lets an identity provider create and remove users through SCIM 2.0. Each provider stores its configuration as JSON in the `settings` table. It links external identities through `auth_identity`. SAML and OIDC end with the same `AuthService.issueCookie` call as password login.

## Why it has this shape

- **One active method.** Exactly one authentication method is active at a time, in the setting `userManagement.authenticationMethod`. Email can switch to any method. An SSO method can only switch back to email. The helpers in `packages/cli/src/sso.ee/sso-helpers.ts` hold this rule.
- **LDAP is an auth handler.** LDAP checks a login id and a password, so it plugs into the core login route through `@AuthHandler()`. SAML and OIDC are redirect flows with their own controllers. LDAP also runs a periodic synchronization, recorded in `auth_provider_sync_history`.
- **Provisioning is shared.** SAML and OIDC both inject the provisioning service. In claim mode it reads role claims from the identity token. In expression mode it evaluates ordered role mapping rules against the claims. A rule can block access. The block happens before n8n creates an account or a session.
- **Core does not import the modules.** The provisioning module registers a checker on a core proxy. Core then cannot delete a role that a rule still targets. `ScimSwitchReader` connects core code to the SCIM switch in the same way.
- **SCIM depends on SSO.** SCIM provisioning works only while SAML or OIDC is on.

## Where it lives

| Part | File | Symbol |
|---|---|---|
| Switching the active method | `packages/cli/src/sso.ee/sso-helpers.ts` | `setCurrentAuthenticationMethod` |
| SAML login | `packages/cli/src/modules/sso-saml/saml.service.ee.ts` | `SamlService.handleSamlLogin` |
| OIDC login | `packages/cli/src/modules/sso-oidc/oidc.service.ee.ts` | `OidcService` |
| LDAP handler and sync | `packages/cli/src/modules/ldap.ee/ldap.service.ee.ts` | `LdapService` |
| Role mapping and block access | `packages/cli/src/modules/provisioning.ee/provisioning.service.ee.ts` | `ProvisioningService` |
| Role deletion guard | `packages/cli/src/modules/provisioning.ee/role-deletion-checker.ee.ts` | `ProvisioningRoleDeletionChecker` |
| SCIM 2.0 | `packages/cli/src/modules/scim/scim.module.ts` | `ScimModule` |
| SCIM switch for core code | `packages/cli/src/sso.ee/scim-switch-reader.ts` | `ScimSwitchReader` |
| Configuration | `packages/@n8n/config/src/configs/sso.config.ts` | `N8N_SSO_JUST_IN_TIME_PROVISIONING` |

The SSO modules and SCIM load on mains only. The provisioning module loads on every process type, and serves HTTP on mains only. Just-in-time provisioning creates the user on the first SSO login.

## What is moving

SCIM is new. The `feat:scim` license flag activates the module. Its routes answer only while `N8N_ENV_FEAT_SCIM` is `true`. Earlier, SAML and OIDC lived in `packages/cli/src/sso.ee`. They became modules in January 2026, together with LDAP. Only the helpers stay in the old folder.

## Read more

- `packages/cli/src/modules/ldap.ee/README.md`, which explains how to test LDAP with a local directory server
- [Authentication and sessions](authentication.md), [Authorization](authorization.md)
- docs.n8n.io: SAML, OIDC, and LDAP pages
