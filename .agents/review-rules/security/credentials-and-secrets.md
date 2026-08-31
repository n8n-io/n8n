# Credentials and secrets

Applies to: all backend packages.

Flag:

- Credential values reaching logs, error messages, response headers, or a REST
  response — a decrypted field returned "because the UI needs it" is the shape
- Hardcoded secrets, API keys, or tokens
- Credential encryption weakened, or `N8N_ENCRYPTION_KEY` reused for anything
  other than credential encryption (token signing, OAuth state)
- OAuth state/CSRF token handling that bypasses validation
- Webhook requests that don't sanitize auth cookies
- Credential access not respecting scope boundaries (instance/project/user), a
  credential resolved by name and type with no ownership filter, or an external
  secrets provider configured insecurely

A caught integration error interpolated into a message is a common way
credential material reaches a status field or an API response.
