# @n8n/ui-extension-runtime

The runtime of side panel views. A view is code that an MCP client writes. The
editor runs each view in a sandboxed iframe, and this runtime is the code that
the frame loads before the view.

The runtime gives a view:

- `Vue`: the Vue 3 API, with the template compiler.
- `n8n.useContext()`: a read-only ref to the page context that the editor sends.
- `n8n.t(key)`: the translated string for `key`.
- These design-system components, registered globally: `N8nText`, `N8nHeading`,
  `N8nCard`, `N8nButton`, `N8nBadge`, `N8nIcon`, `N8nCallout` and `N8nTag`.

The build writes one IIFE (`dist/runtime.iife.js`) and one stylesheet
(`dist/runtime.css`). `n8n-editor-ui` imports both as strings (`?raw`) and puts
them in the `srcdoc` of the frame. The package is private and a devDependency of
the editor only, because the editor build inlines it.

The frame protocol is in `@n8n/api-types` (`ui-extensions.ts`).

```bash
pnpm turbo build --filter=@n8n/ui-extension-runtime
pnpm turbo test --filter=@n8n/ui-extension-runtime
```
