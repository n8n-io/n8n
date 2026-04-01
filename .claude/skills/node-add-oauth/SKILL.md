---
name: node-add-oauth
description: Add OAuth2 credential support to an existing n8n node — creates the credential file, updates the node, adds tests, and keeps the CLI constant in sync. Use when the user says /node-add-oauth.
argument-hint: "[node-name] [optional: custom-scopes flag or scope list]"
---

## Overview

Add OAuth2 (Authorization Code / 3LO) support to an existing n8n node. Works for any
third-party service that supports standard OAuth2.

Before starting, read comparable existing OAuth2 credential files and tests under
`packages/nodes-base/credentials/` to understand the conventions used in this codebase
(e.g. `DiscordOAuth2Api.credentials.ts`, `MicrosoftTeamsOAuth2Api.credentials.ts`).

---

## Step 0 — Parse arguments

Extract:
- `NODE_NAME`: the service name (e.g. `GitHub`, `Notion`). Try to infer from the argument;
  if ambiguous, ask the user.
- `CUSTOM_SCOPES`: whether the credential should support user-defined scopes. If the
  argument does not make this clear, **ask the user** before proceeding:
  > "Should users be able to customise the OAuth2 scopes for this credential, or should
  > scopes be fixed?"

---

## Step 1 — Explore the node

Read the following (adjust path conventions for the specific service):

1. Node directory: `packages/nodes-base/nodes/{NODE_NAME}/`
   - Find `*.node.ts` (main node) and any `*Trigger.node.ts`
   - Find `GenericFunctions.ts` (may be named differently)
   - Check if an `auth` / `version` subdirectory exists
2. Existing credentials: `packages/nodes-base/credentials/` — look for existing
   `{NODE_NAME}*Api.credentials.ts` files to understand the naming convention and any
   auth method already in use.
3. `package.json` at `packages/nodes-base/package.json` — find where existing credentials
   for this node are registered (grep for the node name).

---

## Step 2 — Research OAuth2 endpoints

Look up the service's OAuth2 documentation:
- Authorization URL
- Access Token URL
- Required auth query parameters (e.g. `prompt=consent`, `access_type=offline`)
- Default scopes needed for the node's existing operations
- Whether the API requires a cloudId / workspace ID lookup after the token exchange
  (Atlassian-style gateway APIs do; most services don't)

If you can't determine the endpoints confidently, ask the user to provide them.

---

## Step 3 — Create the credential file

File: `packages/nodes-base/credentials/{NODE_NAME}OAuth2Api.credentials.ts`

```typescript
import type { ICredentialType, INodeProperties } from 'n8n-workflow';

const defaultScopes = [/* minimum scopes for existing node operations */];

export class {NODE_NAME}OAuth2Api implements ICredentialType {
	name = '{camelCase}OAuth2Api';
	extends = ['oAuth2Api'];
	displayName = '{Display Name} OAuth2 API';
	documentationUrl = '{doc-slug}'; // matches docs.n8n.io/integrations/...

	properties: INodeProperties[] = [
		// Include service-specific fields the node needs to construct API calls
		// (e.g. domain, workspace URL) — add BEFORE the hidden fields below.

		{ displayName: 'Grant Type',        name: 'grantType',      type: 'hidden', default: 'authorizationCode' },
		{ displayName: 'Authorization URL', name: 'authUrl',        type: 'hidden', default: '{AUTH_URL}', required: true },
		{ displayName: 'Access Token URL',  name: 'accessTokenUrl', type: 'hidden', default: '{TOKEN_URL}', required: true },
		// Only include authQueryParameters if the service requires extra query params:
		{ displayName: 'Auth URI Query Parameters', name: 'authQueryParameters', type: 'hidden', default: '{QUERY_PARAMS}' },
		{ displayName: 'Authentication',    name: 'authentication', type: 'hidden', default: 'header' },

		// ── Custom scopes block (ONLY when CUSTOM_SCOPES = yes) ──────────────
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
		// ── End custom scopes block ───────────────────────────────────────────

		{
			displayName: 'Scope',
			name: 'scope',
			type: 'hidden',
			// Custom scopes: expression toggles between user value and defaults.
			// Fixed scopes: use the literal defaultScopes string instead.
			default:
				'={{$self["customScopes"] ? $self["enabledScopes"] : "' + defaultScopes.join(' ') + '"}}',
		},
	];
}
```

**Rules:**
- No `authenticate` block — `oAuth2Api` machinery handles Bearer token injection automatically.
- No `test` block — the OAuth dance validates the credential.
- `defaultScopes` at module level is the single source of truth: it populates both the
  `enabledScopes` default and the `scope` expression fallback. Update it in one place.
- If the service needs a domain / workspace URL for API call construction, add it as a
  visible `string` field **before** the hidden fields.

---

## Step 4 — Register the credential in `package.json`

File: `packages/nodes-base/package.json`

Find the `n8n.credentials` array and insert the new entry near other credentials for this
service (alphabetical ordering within the service's block):

```json
"dist/credentials/{NODE_NAME}OAuth2Api.credentials.js",
```

---

## Step 5 — Update `GENERIC_OAUTH2_CREDENTIALS_WITH_EDITABLE_SCOPE` (custom scopes only)

**Only do this step when CUSTOM_SCOPES = yes.**

File: `packages/cli/src/constants.ts`

Add `'{camelCase}OAuth2Api'` to the `GENERIC_OAUTH2_CREDENTIALS_WITH_EDITABLE_SCOPE`
array. Without this, n8n deletes the user's custom scope on OAuth2 reconnect.

```typescript
export const GENERIC_OAUTH2_CREDENTIALS_WITH_EDITABLE_SCOPE = [
	'oAuth2Api',
	'googleOAuth2Api',
	'microsoftOAuth2Api',
	'highLevelOAuth2Api',
	'mcpOAuth2Api',
	'{camelCase}OAuth2Api', // ← add this
];
```

---

## Step 6 — Update `GenericFunctions.ts`

### 6a — Standard services (token works directly against the instance URL)

Add an `else if` branch before the existing `else` fallback:

```typescript
} else if ({versionParam} === '{camelCase}OAuth2') {
	domain = (await this.getCredentials('{camelCase}OAuth2Api')).{domainField} as string;
	credentialType = '{camelCase}OAuth2Api';
} else {
```

### 6b — Gateway services requiring a workspace/cloud ID lookup

When the OAuth token is scoped for a gateway URL rather than the direct instance URL
(Atlassian's `api.atlassian.com` is the canonical example), add a module-level cache and
lookup helper **before** the main request function:

```typescript
// Module-level cache: normalised domain → site/cloud ID
export const _cloudIdCache = new Map<string, string>();

async function getSiteId(
	this: IHookFunctions | IExecuteFunctions | ILoadOptionsFunctions,
	credentialType: string,
	domain: string,
): Promise<string> {
	const normalizedDomain = domain.replace(/\/$/, '');
	if (_cloudIdCache.has(normalizedDomain)) return _cloudIdCache.get(normalizedDomain)!;

	const resources = (await this.helpers.requestWithAuthentication.call(this, credentialType, {
		uri: '{ACCESSIBLE_RESOURCES_ENDPOINT}',
		json: true,
	})) as Array<{ id: string; url: string }>;

	const site = resources.find((r) => r.url === normalizedDomain);
	if (!site) {
		throw new NodeOperationError(
			this.getNode(),
			`No accessible site found for domain: ${domain}. Make sure the domain matches your site URL exactly.`,
		);
	}

	_cloudIdCache.set(normalizedDomain, site.id);
	return site.id;
}
```

Then in the main request function:

```typescript
} else if ({versionParam} === '{camelCase}OAuth2') {
	const rawDomain = (await this.getCredentials('{camelCase}OAuth2Api')).domain as string;
	credentialType = '{camelCase}OAuth2Api';
	const siteId = await getSiteId.call(this, credentialType, rawDomain);
	domain = `{GATEWAY_BASE_URL}/${siteId}`;
} else {
```

The existing `uri: \`${domain}/rest${endpoint}\`` construction then produces the correct
gateway URL automatically.

Add `NodeOperationError` to the `n8n-workflow` import if not already present.

---

## Step 7 — Update the node file(s)

### Main node (`*.node.ts`)

**Credentials array** — add an entry for the new credential type:

```typescript
{
	name: '{camelCase}OAuth2Api',
	required: true,
	displayOptions: { show: { {versionParam}: ['{camelCase}OAuth2'] } },
},
```

**Version/auth options** — add to the `{versionParam}` (or equivalent) options list:

```typescript
{ name: '{Display Name} (OAuth2)', value: '{camelCase}OAuth2' },
```

Keep `default` unchanged — existing workflows must not be affected.

### Trigger node (`*Trigger.node.ts`, if present)

Same two changes. Preserve any `displayName` label pattern already used by other credential
entries in that trigger node's credentials array.

---

## Step 8 — Write credential tests

File: `packages/nodes-base/credentials/test/{NODE_NAME}OAuth2Api.credentials.test.ts`

Use `ClientOAuth2` from `@n8n/client-oauth2` and `nock` for HTTP mocking. Follow the
structure in `MicrosoftTeamsOAuth2Api.credentials.test.ts`.

Required test cases:
1. **Metadata** — name, extends array, `enabledScopes` default, auth URL, token URL,
   `authQueryParameters` default (if applicable).
2. **Default scopes in authorization URI** — call `oauthClient.code.getUri()`, assert each
   default scope is present.
3. **Token retrieval with default scopes** — mock the token endpoint with `nock`, call
   `oauthClient.code.getToken(...)`, assert `token.data.scope` contains each scope.
4. **Custom scopes in authorization URI** _(skip when CUSTOM_SCOPES = no)_.
5. **Token retrieval with custom scopes** _(skip when CUSTOM_SCOPES = no)_.
6. **Minimal / different scope set** _(skip when CUSTOM_SCOPES = no)_ — assert scopes not
   in the set are absent from both the URI and token response.

Lifecycle hooks required:
```typescript
beforeAll(() => { nock.disableNetConnect(); });
afterAll(() => { nock.restore(); });
afterEach(() => { nock.cleanAll(); });
```

---

## Step 9 — Update `GenericFunctions.test.ts`

In the credential-routing `describe` block:

1. If a site-ID cache (`_cloudIdCache`) was added, import it and call
   `_cloudIdCache.clear()` (or equivalent) in `afterEach`.
2. Add/update the OAuth2 routing test case:
   - **Simple routing**: assert `getCredentials` was called with the correct credential
     name and `requestWithAuthentication` was called with the correct name and URI.
   - **Gateway lookup**: mock `requestWithAuthentication` to return the accessible-resources
     payload on the first call and `{}` on the second. Assert the first call targets the
     resources endpoint and the second call uses the gateway base URL with the site ID.

---

## Step 10 — Verify

```bash
# From packages/nodes-base/
pnpm test credentials/test/{NODE_NAME}OAuth2Api.credentials.test.ts
pnpm test nodes/{NODE_NAME}/__test__/GenericFunctions.test.ts
pnpm typecheck
pnpm lint

# Only when constants.ts was changed:
pushd ../cli && pnpm typecheck && popd
```

Fix any type errors before finishing. Never skip `pnpm typecheck`.
