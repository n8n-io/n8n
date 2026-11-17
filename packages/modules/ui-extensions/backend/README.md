# @n8n/backend-module-ui-extensions

Backend feature module. The n8n runtime loads the module through the lazy import in
`packages/cli/src/modules/modules.manifest.ts`.

```bash
pnpm turbo typecheck --filter=@n8n/backend-module-ui-extensions
pnpm turbo lint --filter=@n8n/backend-module-ui-extensions
pnpm turbo test --filter=@n8n/backend-module-ui-extensions
```

Go through Turbo. It builds this package's workspace dependencies first.

## What it stores and serves

The module stores the side panel views and the sidebar pages of each user. A
record has a `kind`: `view` or `page`. A record without a kind is a view. Each
kind has its own limit. All records of a user are one JSON row in the
`settings` table (`uiExtensions.views.<userId>`), so the module needs no
migration.

- `GET /rest/ui-extensions/views` lists the records of the user.
- `DELETE /rest/ui-extensions/views/:id` removes a record of the user. An ID
  that the user does not have, a built-in ID included, gives 404.

Both routes need the global scope `mcpApiKey:create`, because only MCP clients
add records. The MCP tools in `packages/cli/src/modules/mcp/tools/` call
`UiExtensionViewsService` too.

After each save or removal, the service emits `ui-extension-changed`
(`src/ui-extensions.events.ts`). The cli relay
`UiExtensionsPushEventRelay` pushes it to the user, so every open editor of
that user loads the records again.

Read `docs/backend/how-to/build-a-backend-module.md` for the module lifecycle, REST controller,
service, repository, entity, configuration, and testing patterns.

## Import rules

- Do not import from `packages/cli` or from the `n8n` package.
- Declare each workspace and third-party import in this package.
- Export APIs for other packages from `src/index.ts`.
- Keep the module entrypoint in the `./module` export. Do not export it from `src/index.ts`.
  Importing the entrypoint runs the `@BackendModule` decorator.
- Use dynamic imports inside the module entrypoint. This keeps disabled modules unloaded.
- Keep TypeORM imports in entity and repository files. A repository composes a
  file-private `BaseRepository` table and exposes only use-case methods. It does
  not extend `BaseRepository`.
