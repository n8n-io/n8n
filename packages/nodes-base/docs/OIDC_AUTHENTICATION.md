# OIDC Authentication for Trigger Nodes

## Overview

OIDC (OpenID Connect) authentication enables trigger nodes (Webhook, Form Trigger, Chat Trigger) to validate incoming Bearer tokens using your identity provider's JWKS (JSON Web Key Set). This is ideal for enterprise environments using Azure AD, Okta, Auth0, Keycloak, or any OIDC-compliant provider.

## Supported Nodes

- **Webhook** (`n8n-nodes-base.webhook`)
- **Form Trigger** (`n8n-nodes-base.formTrigger`) - v2+
- **Chat Trigger** (`@n8n/n8n-nodes-langchain.chatTrigger`)

## How It Works

1. Client sends request with `Authorization: Bearer <token>` header
2. n8n fetches JWKS from the OIDC discovery endpoint (cached for performance)
3. Token is validated against JWKS, expected issuer, and audience
4. If valid, request proceeds; if invalid, 401/403 is returned

```mermaid
sequenceDiagram
    participant C as Client
    participant N as n8n Trigger
    participant I as Identity Provider
    
    C->>N: Request + Bearer Token
    N->>I: Fetch JWKS (cached)
    I-->>N: JWKS Keys
    N->>N: Verify JWT signature, iss, aud
    alt Valid Token
        N-->>C: 200 OK + Execute Workflow
    else Invalid Token
        N-->>C: 401/403 Unauthorized
    end
```

## Configuration

### 1. Create OIDC Credential

In n8n, go to **Credentials → New → OIDC Auth** and configure:

| Field | Description | Example |
|-------|-------------|---------|
| **Discovery URL** | OIDC `.well-known/openid-configuration` endpoint | `https://login.microsoftonline.com/{tenant}/v2.0/.well-known/openid-configuration` |
| **Expected Issuer** | Token `iss` claim value | `https://login.microsoftonline.com/{tenant}/v2.0` |
| **Expected Audience** | Token `aud` claim value | `api://your-app-id` |

### 2. Configure Trigger Node

1. Add a Webhook, Form Trigger, or Chat Trigger node
2. Set **Authentication** to **OIDC Auth**
3. Select your OIDC credential

## Provider-Specific Setup

### Azure AD (Microsoft Entra)

```
Discovery URL: https://login.microsoftonline.com/{tenant-id}/v2.0/.well-known/openid-configuration
Issuer: https://login.microsoftonline.com/{tenant-id}/v2.0
Audience: api://{application-id} or {application-id}
```

### Okta

```
Discovery URL: https://{domain}.okta.com/.well-known/openid-configuration
Issuer: https://{domain}.okta.com
Audience: Your API audience URI
```

### Auth0

```
Discovery URL: https://{tenant}.auth0.com/.well-known/openid-configuration
Issuer: https://{tenant}.auth0.com/
Audience: Your API identifier
```

### Keycloak

```
Discovery URL: https://{host}/realms/{realm}/.well-known/openid-configuration
Issuer: https://{host}/realms/{realm}
Audience: Your client ID
```

## Client Usage

Send requests with the Bearer token in the Authorization header:

```bash
curl -X POST https://your-n8n.com/webhook/your-path \
  -H "Authorization: Bearer eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json" \
  -d '{"data": "example"}'
```

## Error Responses

| Status | Meaning |
|--------|---------|
| 401 | No Bearer token provided |
| 403 | Token validation failed (expired, wrong issuer/audience, invalid signature) |
| 500 | OIDC configuration incomplete or discovery endpoint unreachable |

## Security Notes

- JWKS is cached per discovery URL for performance
- Tokens are validated for signature, issuer (`iss`), and audience (`aud`)
- Token expiration (`exp`) is automatically checked
- Always use HTTPS for both n8n and your IdP
