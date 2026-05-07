---
description: Add user-editable custom OAuth2 scopes to an existing n8n credential that currently has fixed scopes. Use when the user says /node-add-custom-scopes, references the "Add custom scopes to ALL OAuth based nodes" Linear project, or asks to make scopes configurable for an existing OAuth2 credential.
argument-hint: "[credential-file-or-service-name]"
---

## Overview

Refactor an existing `*OAuth2Api.credentials.ts` file so users can override the
default scopes from the UI. The credential already exists and works — this skill
only adds the toggle, the editable field, and the expression-based scope default.

If the user wants to *create* a brand-new OAuth2 credential, use
`n8n:node-add-oauth` instead.

Reference implementations to read before starting:
- `packages/nodes-base/credentials/MicrosoftExcelOAuth2Api.credentials.ts` — canonical minimal case
- `packages/nodes-base/credentials/JiraSoftwareCloudOAuth2Api.credentials.ts` — extends `oAuth2Api` directly
- `packages/nodes-base/credentials/SlackOAuth2Api.credentials.ts` — non-standard variant (uses `userScope` + `authQueryParameters`)
- `packages/nodes-base/credentials/test/MicrosoftExcelOAuth2Api.credentials.test.ts` — test template

---

## Step 0 — Identify the target credential

Resolve the argument to a single credential file at
`packages/nodes-base/credentials/{Name}OAuth2Api.credentials.ts`.

Refuse to proceed and ask the user if any of these are true:
- The file already has a `customScopes` property (already done).
- The file does not have a `scope` property of `type: 'hidden'` (non-standard
  shape — Slack-style; needs human design input).
- The credential is `OAuth2Api` itself, `googleOAuth2Api`, or `microsoftOAuth2Api`
  (these are parent credentials — change the child instead).

---

## Step 1 — Hoist `defaultScopes` to module level

Find the existing `scope` property's `default` string. Split it on spaces and
move it above the class as a `const`. Keep the doc-link comment if one exists.

```typescript
// https://example.com/oauth/scopes
const defaultScopes = ['scope.one', 'scope.two', 'offline_access'];
```

This becomes the single source of truth — both `enabledScopes.default` and the
`scope` expression read from it.

---

## Step 2 — Insert the three custom-scope properties

Insert these three properties **before** the existing hidden `scope` property:

```typescript
{
  displayName: 'Custom Scopes',
  name: 'customScopes',
  type: 'boolean',
  default: false,
  description: 'Define custom scopes',
},
{
  displayName:
    'The default scopes needed for the node to work are already set. If you change these the node may not function correctly.',
  name: 'customScopesNotice',
  type: 'notice',
  default: '',
  displayOptions: { show: { customScopes: [true] } },
},
{
  displayName: 'Enabled Scopes',
  name: 'enabledScopes',
  type: 'string',
  displayOptions: { show: { customScopes: [true] } },
  default: defaultScopes.join(' '),
  description: 'Scopes that should be enabled',
},
```

Match the surrounding file's quote style and indentation exactly. Do not change
unrelated properties.

---

## Step 3 — Switch the hidden `scope` default to an expression

Replace the literal string default with the expression form:

```typescript
{
  displayName: 'Scope',
  name: 'scope',
  type: 'hidden',
  default:
    '={{$self["customScopes"] ? $self["enabledScopes"] : "' + defaultScopes.join(' ') + '"}}',
},
```

Existing users keep the same effective default (the `false` branch produces the
old literal string), so this is non-breaking.

---

## Step 4 — Update `GENERIC_OAUTH2_CREDENTIALS_WITH_EDITABLE_SCOPE`

File: `packages/cli/src/constants.ts`

This step is **conditional**:

| Credential's `extends` value          | Action                                                                 |
|---------------------------------------|------------------------------------------------------------------------|
| `['oAuth2Api']`                       | **Add** the credential's `name` to the array                           |
| `['googleOAuth2Api']`                 | Skip — parent is already in the list                                   |
| `['microsoftOAuth2Api']`              | Skip — parent is already in the list                                   |
| `['highLevelOAuth2Api']` / other      | Check whether the parent is in the list; only add if it is not         |

The check at `packages/cli/src/oauth/oauth.service.ts:356` uses
`credential.type` directly (not the inheritance chain), and falls back to
`hasEditableScopeProperty` which only returns true when `scope` is **not**
hidden. Because we keep `scope` as `type: 'hidden'`, the constant is the only
mechanism that prevents n8n from wiping a user's custom scopes on reconnect for
direct `oAuth2Api` extenders.

Insertion is alphabetical-ish; match the surrounding style:

```typescript
export const GENERIC_OAUTH2_CREDENTIALS_WITH_EDITABLE_SCOPE = [
  'oAuth2Api',
  'googleOAuth2Api',
  'microsoftOAuth2Api',
  'highLevelOAuth2Api',
  'mcpOAuth2Api',
  'wordpressOAuth2Api',
  '{camelCase}OAuth2Api', // ← add when the credential extends oAuth2Api directly
];
```

---

## Step 5 — Write the credential test

File: `packages/nodes-base/credentials/test/{Name}OAuth2Api.credentials.test.ts`

Use `MicrosoftExcelOAuth2Api.credentials.test.ts` as the template. Substitute:
- `defaultScopes` from your file
- The auth and token URLs from the credential's `authUrl` / `accessTokenUrl`
- A realistic `customScopes` set (default scopes plus a couple of extras)

Required cases:
1. **Metadata** — `name`, `extends`, `enabledScopes` default, `authUrl`,
   `accessTokenUrl`. Include `authQueryParameters` if the credential defines one.
2. **Default scopes — auth URI** — assert each default scope appears in the
   query string (URL-encoded; spaces may be `+` or `%20`).
3. **Default scopes — token exchange** — `nock` the token endpoint, assert each
   default scope is present in `token.data.scope`.
4. **Custom scopes — auth URI** — assert the extra scopes appear and any
   removed scope does not.
5. **Custom scopes — token exchange** — same as (3) for the custom set.
6. **Minimal / different scope set** — assert default scopes are absent when
   replaced.

Required lifecycle hooks:

```typescript
beforeAll(() => { nock.disableNetConnect(); });
afterAll(() => { nock.restore(); });
afterEach(() => { nock.cleanAll(); });
```

If the service uses URL-encoded scope characters (e.g. Jira's
`read:jira-user` → `read%3Ajira-user`), match the encoded form in
auth-URI assertions and the decoded form in `token.data.scope` assertions.

---

## Step 6 — Verify

Run from `packages/nodes-base/`:

```bash
pnpm test credentials/test/{Name}OAuth2Api.credentials.test.ts
pnpm typecheck
pnpm lint
```

Only when `constants.ts` was changed, also run:

```bash
pushd ../cli && pnpm typecheck && popd
```

Do not skip typecheck. Fix errors before reporting done.

---

## Commit & PR

Branch name: `node-{ticket-id}-add-custom-scopes-to-{service}` (use the Linear
suggestion if a ticket exists).

Commit message format:
```
feat: Add support for custom scopes in the {Service} credential
```

PR description should reference the Linear project
`https://linear.app/n8n/project/add-custom-scopes-to-all-oauth-based-nodes-that-support-them-9c7a07056dc6`
and the specific issue, if one exists.

---

## Edge cases

- **Slack-style credentials** where the editable field is `userScope` and the
  expression lives in `authQueryParameters` rather than `scope`: do not apply
  this skill mechanically. Read `SlackOAuth2Api.credentials.ts` and adapt.
- **Credentials with a non-string scope default** (e.g. `'global'` for
  Wordpress): the expression form still works — keep the original string as
  the `false` branch literal.
- **Credentials extending a wrapper that already supports custom scopes**
  (e.g. `googleOAuth2Api`): the parent already exposes `customScopes`. Verify
  in the UI before duplicating the properties on the child.
