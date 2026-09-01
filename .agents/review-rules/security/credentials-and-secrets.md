# Credentials and secrets

Applies to: all backend packages.

Flag:

- Credentials logged or exposed in error messages
- Hardcoded secrets, API keys, or tokens
- Changes to credential encryption/decryption that weaken security
- OAuth state/CSRF token handling that bypasses validation
- Webhook requests that don't sanitize auth cookies
- External secrets provider integrations with insecure configurations
- Credential access not respecting scope boundaries (instance/project/user)
- Data fetched via credentials being exposed to unauthorized user groups

An error message that interpolates a caught error from an integration is a
common way credential material reaches a persisted status field or an API
response. Sanitize before recording.
