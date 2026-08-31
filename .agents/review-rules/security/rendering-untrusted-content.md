# Rendering untrusted content

Applies to: `packages/frontend`, and backend paths serving HTML or user bytes.

Workflow names, node parameters, and execution data are author-controlled
strings, rendered in a session with full REST access.

Flag NEW code that:

- Passes user-derived content to `v-html`, `innerHTML`, `insertAdjacentHTML`, or a render function concatenating markup, with no sanitizer in front of it
- Widens a sanitizer allowlist — tags, attributes, `on*` handlers, `srcdoc` — or drops a sanitize call from an existing render path
- Puts a user-supplied value into `href`, `src`, or a `window.open` target without rejecting non-`http(s)` schemes. `javascript:` and `data:` survive naive checks; parse with `new URL()`, never a regex with the `m` flag, which makes `^` match any line start
- Renders markdown or HTML returned by a node, an AI response, or a webhook body as trusted markup
- Serves user-controlled bytes from the n8n origin without `Content-Disposition: attachment` or an equivalent inline-render guard
- Loosens an iframe `sandbox` attribute or a CSP directive on a view or response carrying user content
