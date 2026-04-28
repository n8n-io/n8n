---
description: Applies n8n's RBAC scope decorators to REST endpoints. Use when creating a new @RestController, adding any @Get/@Post/@Put/@Patch/@Delete route to an existing controller, or reviewing endpoint authorization. Every authenticated endpoint must be gated by @ProjectScope or @GlobalScope.
---

# Protect REST endpoints with RBAC

**Rule:** every authenticated route on a `@RestController` MUST carry an access-scope decorator. If you add a route without one, the IDOR/permission bypass is on you.

## Decision

```
URL has :projectId  → @ProjectScope('<resource>:<op>')
URL has no project  → @GlobalScope('<resource>:<op>')
skipAuth: true      → no decorator + comment explaining alternate auth
```

`@ProjectScope` succeeds if the user has the scope **globally OR in the project named in the URL**. `@GlobalScope` ignores project relations entirely.

Both decorators come from `@n8n/decorators`. The middleware lives in `packages/cli/src/controller.registry.ts` (`createScopedMiddleware`) and resolves access via `userHasScopes` in `packages/cli/src/permissions.ee/check-access.ts`.

## Apply the decorator

```ts
import { Get, Post, ProjectScope, RestController } from '@n8n/decorators';

@RestController('/projects/:projectId/widgets')
export class WidgetsController {
  @Post('/')
  @ProjectScope('widget:create')          // create
  async create(...) { ... }

  @Get('/:widgetId')
  @ProjectScope('widget:read')            // read one
  async get(...) { ... }

  @Get('/')
  @ProjectScope('widget:list')            // list
  async list(...) { ... }

  @Patch('/:widgetId')
  @ProjectScope('widget:update')          // update
  async update(...) { ... }

  @Delete('/:widgetId')
  @ProjectScope('widget:delete')          // delete
  async delete(...) { ... }
}
```

Conventions:
- One decorator per route, placed directly under the HTTP-method decorator.
- Use the most specific scope that fits. Reuse `*:update` for state-changing actions like `publish`/`unpublish`/`build` unless the resource needs to gate them separately (see `workflow:publish` for the precedent).
- Routes without `:projectId` and not global-only operations are usually a design smell — flag it.

## When the scope doesn't exist yet

Add the resource and ops in `packages/@n8n/permissions/`:

1. **`src/constants.ee.ts`** — add to `RESOURCES` (alphabetical):
   ```ts
   widget: [...DEFAULT_OPERATIONS, 'execute'] as const,
   ```
   The `Scope` union (`<resource>:<op>` template-literal type) auto-derives.
2. **`src/scope-information.ts`** — add a display name + description per scope.
3. **`src/roles/scopes/project-scopes.ee.ts`** — add to project roles. Match the `workflow` precedent unless product says otherwise:
   - `REGULAR_PROJECT_ADMIN_SCOPES`, `PERSONAL_PROJECT_OWNER_SCOPES`, `PROJECT_EDITOR_SCOPES` → all CRUDL+execute scopes.
   - `PROJECT_VIEWER_SCOPES` → read/list/execute only.
   - `PROJECT_CHAT_USER_SCOPES` → execute only (if applicable).
4. **`src/roles/scopes/global-scopes.ee.ts`** — add to `GLOBAL_OWNER_SCOPES` (admin inherits via `concat()`). Do **not** add to member/chat-user globals — they get scopes via project relations.
5. **Personal-space publishing**: if you add a `<resource>:publish` scope, also append it to `PERSONAL_SPACE_PUBLISHING_SETTING.scopes` in `constants.ee.ts` so personal-owner gating matches `workflow:publish`.
6. **Frontend wiring** — three files in the editor; skipping any of them means the new scopes will not appear in the project-role configuration UI:
   - `packages/frontend/editor-ui/src/app/stores/rbac.store.ts` — add `<resource>: {}` to `scopesByResourceId` (typecheck will fail otherwise).
   - `packages/frontend/editor-ui/src/features/project-roles/projectRoleScopes.ts` — add the resource to `UI_OPERATIONS` (operations to render in the permissions matrix, in display order) **and** to `SCOPE_TYPES` (the order the resource group appears on the page).
   - `packages/frontend/@n8n/i18n/src/locales/en.json` — add `projectRoles.<resource>:<op>` (column label) and `projectRoles.<resource>:<op>.tooltip` (hover description) for every op, plus `projectRoles.type.<resource>` (the group header).
7. **Snapshot** — update `packages/@n8n/permissions/src/__tests__/__snapshots__/scope-information.test.ts.snap` to include the new `<resource>:*` entries.

No DB migration needed — `AuthRolesService.init()` syncs scopes/roles on every startup. Custom team roles created in the UI are **not** auto-updated; mention this in the PR description.

## Public / unauthenticated routes

`{ skipAuth: true }` skips the auth middleware → `req.user` is undefined → adding `@ProjectScope` would 401 every call. Public routes (third-party webhooks, signed callbacks) must:

1. **Omit the scope decorator.**
2. Authenticate via signature/HMAC verification inside the handler (or another route-specific mechanism).
3. Carry a comment explaining why no scope is applied, so the next reviewer doesn't try to "fix" it.

Example:
```ts
// Third-party webhook callback: do not add @ProjectScope. Auth happens
// via per-platform signature verification inside webhookHandler, and
// :projectId is unused in the (agentId, platform) lookup.
@Post('/:agentId/webhooks/:platform', { skipAuth: true, allowBots: true })
async handleWebhook(...) { ... }
```

## Verify with a route-metadata test

Add a regression test that fails when a future route is added without a scope. Iterate every route on the controller via `ControllerRegistryMetadata` and assert the gate.

```ts
import { ControllerRegistryMetadata } from '@n8n/decorators';
import { Container } from '@n8n/di';
import { WidgetsController } from '../widgets.controller';

const UNAUTHENTICATED_HANDLERS = new Set<string>(); // add public handler names here

const metadata = Container.get(ControllerRegistryMetadata).getControllerMetadata(
  WidgetsController as never,
);
const routeCases = Array.from(metadata.routes.entries()).map(([handlerName, route]) => ({
  handlerName, route,
}));

describe('WidgetsController route access scopes', () => {
  it.each(routeCases)(
    '$handlerName is gated by a project-scoped widget:* check',
    ({ handlerName, route }) => {
      if (UNAUTHENTICATED_HANDLERS.has(handlerName)) {
        expect(route.accessScope).toBeUndefined();
        expect(route.skipAuth).toBe(true);
        return;
      }
      expect(route.accessScope).toBeDefined();
      expect(route.accessScope?.globalOnly).toBe(false);
      expect(route.accessScope?.scope.startsWith('widget:')).toBe(true);
    },
  );
});
```

## Defense in depth (still required)

Decorator alone is not enough when handlers leak data via downstream calls. Service/repository methods should still **filter by `projectId`** (or user-scoped helpers like `findByUser`). The decorator gates *who can call this URL*; the service gates *what they can read*. Both, always.

## Reference patterns

- Project-scoped CRUD: `packages/cli/src/workflows/workflows.controller.ts`, `packages/cli/src/credentials/credentials.controller.ts`, `packages/cli/src/modules/data-table/data-table.controller.ts`.
- Mixed global + project: `packages/cli/src/controllers/project.controller.ts`.
