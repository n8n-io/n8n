# @n8n/mcp-apps

UI resources and server helpers that let the n8n MCP server return **MCP
Apps** — small, sandboxed HTML/Vue experiences rendered inside MCP clients
that support the
[`@modelcontextprotocol/ext-apps`](https://www.npmjs.com/package/@modelcontextprotocol/ext-apps)
extension. The package owns both the runtime UI bundles and the small server
helpers used by `packages/cli` to register them as MCP resources and tools.

## What it provides

- **Server helpers** (`@n8n/mcp-apps/server`) for registering MCP App tools
  and the static HTML resources that back them.
- **Vue UI apps** under `src/apps/*`, built with Vite as standalone, fully
  inlined HTML files (CSS + JS in a single document) so they can be served
  directly as MCP resources.
- **i18n plumbing** powered by `vue-i18n`, with locale negotiation driven by
  the host context the MCP client provides at runtime.

Today the package ships a single app, `workflow-preview`, which is rendered
after the `create_workflow_from_code` MCP tool returns. It loads the sanitized
workflow graph through the existing `get_workflow_details` MCP tool, renders the
existing n8n demo canvas in an iframe, and keeps a button to open the freshly
created workflow in n8n. New apps can be added alongside it (see
[Adding a new app](#adding-a-new-app)).

## Package layout

```
src/
  apps-manifest.ts          # single source of truth for the apps registry
  apps/                     # Vue UI apps, each built into a standalone HTML
    workflow-preview/
      App.vue               # root component
      main.ts               # mounts App with i18n
      index.html            # entry HTML (built into dist/apps/<app>.html)
      tokens.scss           # design tokens / global styles
      types.ts              # workflow preview data types
      type-guards.ts        # workflow preview data guards
      composables/
        use-workflow-preview.ts # workflow preview state and host tool handling
      utils/
        url.ts              # defense-in-depth URL validation
  components/               # reusable MCP app Vue components
    workflow-preview/       # workflow-preview-specific reusable components
  composables/              # reusable MCP host/runtime composables
  i18n/                     # vue-i18n setup + host locale resolution
  locales/                  # flat-key locale files (en.json, …)
  server/                   # consumed by packages/cli
    apps/                   # MCP resource registrations for each UI app
    constants.ts            # shared URIs, MIME type, _meta keys
    register-mcp-app-tool.ts
    resource-loader.ts      # lazy reads built HTML from dist/apps
    index.ts                # public entry: @n8n/mcp-apps/server
  utils/                    # framework-agnostic client helpers
```

`apps-manifest.ts` is the canonical registry of MCP apps. Both the Vite
build (entry directory + output HTML filename per `--mode`) and the
server-side resource loader (compile-time union + runtime allow-list of
loadable HTML files) derive from it, so the build and runtime stay in
lockstep and there is no separate list to maintain.

The Vite build (`pnpm build:ui`) emits one inlined HTML file per app into
`dist/apps/<app>.html`. The TypeScript build (`pnpm build:server`) emits the
server helpers into `dist/server/`. Both run as part of `pnpm build`.

## UI runtime

Each app:

- Connects to the host via `@modelcontextprotocol/ext-apps`'s `App` class.
- Receives a `McpUiHostContext` (theme, style variables, host fonts, locale)
  through `onhostcontextchanged` and reflects it on the document.
- Reads the originating tool's `structuredContent` via `ontoolresult` to
  populate its own state.
- Calls `app.callServerTool(...)` when it needs fresh n8n data from the MCP
  server. The workflow preview uses this to call `get_workflow_details` with
  the created workflow ID.
- Calls `app.openLink({ url })` to ask the host to navigate — never opens
  links itself.

URL handling is locked down by `isAllowedWorkflowUrl` in
`src/apps/workflow-preview/utils/url.ts`: only `http(s)://` URLs with a non-empty
host are accepted, both when reading the tool result and right before calling
`openLink`. This is defense in depth on top of the host's own validation.

The workflow preview iframe uses a server-provided `previewUrl` when available.
Otherwise it uses the existing n8n preview service because instance routes are
commonly blocked or unreachable from MCP hosts. The resource metadata declares
broad `frameDomains` for `http` and `https` so hosts that enforce MCP Apps CSP
can load instance-specific or configured preview URLs. The framed n8n server's
own frame policy still applies, so the app falls back to the open-workflow
button when the preview cannot load.

## Internationalization

Locale files live under `src/locales/` and use flat, namespaced keys
(`workflowPreview.openButton`, `workflowPreview.ariaLabel.ready`, …). The
host's BCP 47 locale is resolved to a shipped locale via `resolveLocale`,
applied to the `vue-i18n` instance, and mirrored to `<html lang>` for
assistive tech. See `src/i18n/index.ts` for the full contract.

To add a new locale:

1. Drop `<code>.json` next to `en.json` in `src/locales/`.
2. Import it in `src/i18n/index.ts` and add the code to `SUPPORTED_LOCALES`.

The schema is derived from `en.json`, so other locales are type-checked
against the same key set.

## Adding a new app

1. Create `src/apps/<app-name>/` with `index.html`, `main.ts`, and an
   `App.vue` root component. Mount it through the shared `i18n` instance.
2. Add an entry to `MCP_APPS` in `src/apps-manifest.ts`:

   ```ts
   '<app-name>': {
     entry: '<app-name>',           // directory under src/apps/
     htmlFile: '<app-name>.html',   // output under dist/apps/
   },
   ```

   This single entry teaches Vite about the new `--mode`, expands the
   `McpAppHtmlFileName` type union, and adds the file to the
   `loadAppHtml` runtime allow-list. `pnpm build:ui --mode <app-name>`
   will then produce `dist/apps/<app-name>.html`.
3. Add the app's URI constant to `src/server/constants.ts` and a
   `register<App>App` helper in `src/server/apps/` that calls
   `server.resource(...)` with `loadAppHtml('<app-name>.html')`.
4. Re-export the helper and URI constant from `src/server/index.ts`.
5. Add any UI strings to `src/locales/en.json` under a new app-scoped
   key prefix.

## SDK version compatibility

`src/server/sdk-version.test.ts` asserts that the
`@modelcontextprotocol/sdk` version installed via the pnpm catalog satisfies
the peer range declared by `@modelcontextprotocol/ext-apps`. CI fails the
moment those two pins drift, so bumping one without the other is caught
immediately.

## Scripts

| Command            | Description                                             |
|--------------------|---------------------------------------------------------|
| `pnpm build`       | Build UI apps and server helpers                        |
| `pnpm build:ui`    | Build the Vue apps to inlined HTML in `dist/apps/`      |
| `pnpm build:server`| Build the server entry to `dist/server/`                |
| `pnpm typecheck`   | Run `vue-tsc` over the UI and `tsc` over the server     |
| `pnpm lint`        | Lint with the shared ESLint config                      |
| `pnpm test`        | Run unit tests with Vitest                              |
| `pnpm test:dev`    | Run Vitest in watch mode                                |
