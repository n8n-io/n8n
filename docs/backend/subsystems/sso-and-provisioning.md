---
title: SSO and provisioning
audience: Backend engineers new to n8n
tier: 3
reading_time: 5 min
last_reviewed: 2026-09-02
owner: "@n8n-io/iam"
---

# SSO and provisioning

Read this when you touch SAML, OIDC, LDAP, or the rules that map identity claims to n8n roles.

## What it is

SSO is three licensed backend modules, `sso-saml`, `sso-oidc`, and `ldap`, plus a shared `provisioning` module that maps identity claims to instance and project roles. Only one authentication method is active at a time, held in one setting, `userManagement.authenticationMethod`. Each provider stores its configuration as JSON in the `settings` table, links external identities through `auth_identity`, and finishes by calling the same `AuthService.issueCookie` as password login. No SCIM implementation exists.

## How it works

Shared helpers in `packages/cli/src/sso.ee/sso-helpers.ts` switch the active method and enforce the rule that email can switch to any method while an SSO method can only switch back to email. **SAML** lazy-loads its library, stores preferences under the settings key `features.saml`, exposes metadata, an SSO initiation route, and an assertion consumer route, maps attributes, asks the provisioning service whether login is allowed, then finds or creates the user. **OIDC** lazy-loads its client library, stores its configuration with the client secret encrypted, runs the authorization code grant, and looks up the identity by subject. **LDAP** is itself an auth handler for the core login controller, binds through an LDAP client, maps attributes, links or creates users, and runs a periodic synchronization recorded in `auth_provider_sync_history`. Its module README explains how to test it with a local directory server.

**Provisioning** is injected into SAML and OIDC. In claim mode it reads role claims from the identity token. In expression mode it evaluates ordered `RoleMappingRule` rows against a claims context. A rule can block access, which throws before any account or session is created. The module also registers a checker so that core cannot delete a role a rule still targets.

## Where to look

| Path | What |
|---|---|
| `packages/cli/src/sso.ee/sso-helpers.ts` | Switching the active method |
| `packages/cli/src/modules/sso-saml/` | Service, controller, middlewares |
| `packages/cli/src/modules/sso-oidc/` | Service, controller |
| `packages/cli/src/modules/ldap.ee/` | Service (also the auth handler), controller, sync, README |
| `packages/cli/src/modules/provisioning.ee/` | Role mapping, rule evaluation, block access |
| `packages/@n8n/config/src/configs/sso.config.ts` | Login toggles, just-in-time provisioning, claim names |

## What it owns

`auth_identity` and `auth_provider_sync_history` in `@n8n/db`. `role_mapping_rule` and its project join table. Settings rows `features.saml`, `features.oidc`, `features.ldap`, `features.provisioning`, and the active method.

## Flags

`feat:saml`, `feat:oidc`, and `feat:ldap` on the three modules. The provisioning module declares all three with any-of semantics, while its endpoints require SAML or OIDC. `N8N_SSO_JUST_IN_TIME_PROVISIONING` defaults to true. `N8N_SSO_SCOPES_*` name the claims. OIDC routes carry `@Licensed('feat:oidc')`. SAML uses license middlewares instead of the decorator.

## Per mode

Main only. No cloud branch in code. The public API also exposes LDAP configuration and synchronization.

## Was, is, goes

**Was.** SAML and OIDC lived in `packages/cli/src/sso.ee`, and LDAP in `packages/cli/src/ldap.ee`. All three became modules in January 2026. Only the helpers remain. Provisioning was created new in October 2025. **Is.** Provisioning grew from a config endpoint into expression-based rules with a block outcome during 2026. **Goes.** Several `TODO` markers remain in the SAML helpers and the OIDC service about attribute mapping and metadata validation. One comment in the LDAP module still names an old decorator.

## Terms

- **authentication method**: one of `email`, `ldap`, `saml`, `oidc`, exactly one active.
- **just-in-time provisioning**: creating the user on first SSO login.
- **role mapping rule**: an ordered expression over claims that yields a role or blocks access.

## Read more

- `packages/cli/src/modules/ldap.ee/README.md`
- [Authentication and sessions](authentication.md), [Authorization](authorization.md)
- docs.n8n.io: SAML, OIDC, and LDAP pages
