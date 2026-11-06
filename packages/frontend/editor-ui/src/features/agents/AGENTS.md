# Agent frontend

Read `agents-design-language.md` before you change Agent interface behavior or
visuals. It is the source of truth for reusable Agent-specific patterns.

Keep feature-specific components in this module. Use the shared Design System
for primitives. Do not change the Design System for an Agent-only need unless
the user explicitly asks for this change.

For modal work, use `components/modals/AgentModal.vue`. Use
`components/modals/AgentModalMultiStep.vue` when the user selects an item before
they configure it.

## HTTP and browser API compatibility

Agents must support self-hosted instances served over HTTP on a hostname or LAN
IP address. These origins are not secure contexts. HTTP on `localhost` and
loopback addresses is a browser exception. A feature can work on `localhost`
and fail on an HTTP `.local` hostname on the same machine. See
[MDN: Secure contexts](https://developer.mozilla.org/en-US/docs/Web/Security/Defenses/Secure_Contexts).

Do not assume that a browser API exists because TypeScript defines it. Common
APIs that require a secure context include:

| API                                                                        | Required approach                                                                                             |
| -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| `crypto.subtle`, including `digest()`                                      | Use `sha256` from `@n8n/utils/sha256` for SHA-256 hashes. It includes an HTTP fallback.                       |
| Native `crypto.randomUUID()`                                               | Reuse the editor polyfill in `src/app/polyfills.ts`. Check app initialization before adding another fallback. |
| Async `navigator.clipboard` methods                                        | Use `useClipboard` from `@n8n/composables/useClipboard` for copy actions. It includes a fallback.             |
| `navigator.mediaDevices`, including microphone, camera, and screen capture | Check support before use. Keep text chat available when capture is unavailable.                               |
| `navigator.serviceWorker`                                                  | Check support before registration. Keep core Agent actions independent of service workers.                    |

`crypto.getRandomValues()` remains available on HTTP. The presence of `crypto`
does not imply that `crypto.subtle` or native `crypto.randomUUID()` exists. See
[MDN: getRandomValues()](https://developer.mozilla.org/en-US/docs/Web/API/Crypto/getRandomValues).

- Check the exact object and method before use. Use `window.isSecureContext`
  to diagnose the origin, not as a substitute for API support checks.
- Reuse shared helpers and app polyfills. Preserve the same hash and identifier
  formats across HTTP and HTTPS. Do not add a component-specific polyfill.
- Handle unavailable optional APIs and rejected calls at the feature boundary.
  Telemetry failures must not prevent an Agent from opening, saving, or sending
  a chat message.
- Check the API documentation before adding a browser capability. The table
  above is not exhaustive. See
  [MDN: Restricted features](https://developer.mozilla.org/en-US/docs/Web/Security/Defenses/Secure_Contexts/features_restricted_to_secure_contexts).

When a change uses a restricted API, add a regression test with that API absent.
For Web Crypto, retain `getRandomValues` while removing `subtle` and the native
`randomUUID` method. Load the app polyfill when the test relies on it. Exercise
the user action with the real helper, such as message submission. A mocked
fingerprint helper does not test HTTP compatibility. Restore globals after each
test.

For browser verification, test both `localhost` and HTTP on a hostname that
resolves to your machine, or a LAN IP address. Confirm that
`window.isSecureContext === false` for the HTTP check. Do not enable browser flags
that treat the HTTP origin as secure.
