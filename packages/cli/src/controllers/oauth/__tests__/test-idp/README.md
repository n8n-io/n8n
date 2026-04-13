# Test IdP Server

A minimal OIDC-like Identity Provider for testing n8n's JWE token decryption flow.

## What it does

Mimics Meta's OIDC provider behavior:

1. **`/authorize`** - Redirects with an authorization code
2. **`/token`** - Returns JWE-encrypted nested JWTs (JWS inside JWE) with a custom `intern_oauth_token` claim
3. **`/configure-jwk`** - Accepts n8n's public encryption key (manual registration)
4. **`/.well-known/openid-configuration`** - OIDC discovery document
5. **`/.well-known/jwks.json`** - IdP's signing public key

## Token structure

The `/token` endpoint returns:

```json
{
  "access_token": "<JWE>",
  "token_type": "bearer",
  "expires_in": 3600,
  "id_token": "<JWE>"
}
```

After decrypting the JWE (RSA-OAEP + A256GCM), you get a signed JWT (RS256) with:

```json
{
  "sub": "test-user",
  "iss": "test-idp",
  "aud": "<client_id>",
  "intern_oauth_token": "the-actual-bearer-token-12345",
  "iat": 1234567890,
  "exp": 1234571490
}
```

## Usage

### Programmatic (in tests)

```typescript
import { startTestIdp } from './server';

const idp = await startTestIdp(3456);

// Configure n8n's public key
await fetch(`${idp.baseUrl}/configure-jwk`, {
  method: 'POST',
  body: JSON.stringify(n8nPublicJwk),
});

// Or auto-fetch from n8n's JWKS endpoint:
const idp = await startTestIdp(3456, 'http://localhost:5678/oauth2-credential/123/jwks.json');

// ... run tests ...

await idp.close();
```

### CLI (manual testing)

```bash
cd packages/cli
npx ts-node src/controllers/oauth/__tests__/test-idp/server.ts 3456
```

Then configure an OAuth2 credential in n8n with:
- **Authorization URL**: `http://localhost:3456/authorize`
- **Access Token URL**: `http://localhost:3456/token`
- **JWE Token Decryption**: enabled
- **Key Encryption Algorithm**: RSA-OAEP
- **Content Encryption Algorithm**: A256GCM

POST n8n's generated public key to `http://localhost:3456/configure-jwk`.
