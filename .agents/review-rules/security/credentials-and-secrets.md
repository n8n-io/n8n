# Credentials and secrets

Applies to: all backend packages.

Flag:

- Credential values reaching logs, error messages, response headers, or a REST response — a decrypted field returned "because the UI needs it" is the shape
- Hardcoded secrets, API keys, or tokens
- Credential encryption weakened, or `N8N_ENCRYPTION_KEY` reused for token signing, OAuth state, or anything but credential encryption
- OAuth state/CSRF validation bypassed, or webhook requests keeping auth cookies
- Credential access ignoring scope boundaries (instance/project/user), or a credential resolved by name and type with no ownership filter

A caught integration error interpolated into a message is a common way credential material reaches a status field or an API response.
