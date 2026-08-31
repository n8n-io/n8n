# Rendering untrusted content

Applies to: `packages/frontend`.

Workflow names, node parameters, execution data, credential labels, and anything
arriving from a shared workflow or template are author-controlled strings. The
editor runs in an authenticated session with full REST access, so script
execution here is not a UI bug.

Flag NEW code that:

- Passes user-derived content to `v-html`, `innerHTML`, `outerHTML`,
  `insertAdjacentHTML`, or a render function concatenating markup, with no
  sanitizer in front of it
- Widens a sanitizer allowlist — new tags or attributes, `on*` handlers,
  `style`, `srcdoc` — or drops a sanitize call from an existing render path
- Puts a user-supplied value into `href`, `src`, `action`, or a
  `window.open`/router target without rejecting non-`http(s)` schemes.
  `javascript:` and `data:` survive naive checks; parse with `new URL()` rather
  than a regex, and never with the `m` flag, which makes `^` match any line start
- Renders markdown, JSON, or HTML returned by a node, an AI response, or a
  webhook body as trusted markup
- Loosens an iframe `sandbox` attribute or a CSP directive on a view that
  displays user content

Escaping is per context — HTML text, attribute, URL, and script each need a
different one — so a value that is safe in one slot is not safe moved to another.
