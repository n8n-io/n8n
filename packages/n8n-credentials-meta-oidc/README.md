# n8n-credentials-meta-oidc

Custom n8n credential type for Meta's OIDC provider.

## What it does

Meta's OIDC provider returns JWE-encrypted nested JWTs from the token endpoint. The inner JWT contains a custom `intern_oauth_token` claim which holds the actual Bearer token for API calls.

This credential:
1. **Extends `oAuth2Api`** — inherits the full OAuth2 flow including JWE decryption
2. **Pre-configures JWE settings** — RSA-OAEP + A256GCM, enabled by default
3. **Extracts the Bearer token** — via `preAuthentication`, decodes the JWT payload and extracts the `intern_oauth_token` claim before each API request

## Requirements

- **n8n with JWE support** — requires n8n version with:
  - JWE token decryption in `OAuth2Api` credentials
  - `preAuthentication` support in the OAuth2 request pipeline
  - JWKS URI endpoint for public key distribution

## Installation

Install as a community node package:

```bash
# In your n8n instance
npm install n8n-credentials-meta-oidc
```

Or for self-hosted, add to your n8n custom extensions directory.

## Setup

1. Create a new **Meta OIDC OAuth2 API** credential in n8n
2. Fill in your **Authorization URL**, **Access Token URL**, **Client ID**, and **Client Secret**
3. **Save** the credential — n8n generates a JWE key pair automatically
4. Copy the **JWE Public Key** and register it with Meta's OIDC provider (or provide the JWKS URI)
5. Click **Connect** to authenticate

## Configuration

| Field | Default | Description |
|-------|---------|-------------|
| Access Token Claim | `intern_oauth_token` | JWT claim name containing the actual Bearer token |

All JWE settings (algorithm, encryption) are pre-configured and hidden.

## How it works

```
Token endpoint response:
  { access_token: "<JWE>", id_token: "<JWE>" }
                    │
  n8n OAuth2Api decrypts JWE (generic)
                    │
  access_token = "<JWS>" (signed JWT)
                    │
  MetaOidcOAuth2Api.preAuthentication() runs on each API request:
    1. Decodes JWT payload (base64url)
    2. Extracts intern_oauth_token claim
    3. Replaces access_token with extracted value
                    │
  HTTP request sent with: Authorization: Bearer <extracted-token>
```

## Development

```bash
pnpm install
pnpm build
```
