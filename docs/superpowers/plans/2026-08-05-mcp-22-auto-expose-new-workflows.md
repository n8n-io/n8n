# MCP-22 Auto-expose New Workflows Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** An owner/admin-only MCP setting that seeds `settings.availableInMCP = true` on every newly created workflow.

**Architecture:** A new instance setting (`mcp.autoExposeNewWorkflows`) stored via `SettingsRepository` + `CacheService`, delivered to the frontend through the MCP backend module's `settings()` hook, written through the existing `PATCH /rest/mcp/settings`, and applied in `WorkflowCreationService.createWorkflow()` — the single funnel every creation path passes through. Per-workflow reads are untouched.

**Tech Stack:** TypeScript, Express + `@n8n/decorators` controllers, `@n8n/di`, TypeORM via `@n8n/db`, zod DTOs, Vue 3 + Pinia, Vitest, `@n8n/i18n`, `@n8n/telemetry` registry.

**Spec:** [docs/superpowers/specs/2026-08-05-mcp-22-auto-expose-new-workflows-design.md](../specs/2026-08-05-mcp-22-auto-expose-new-workflows-design.md)

## Global Constraints

- **Branch:** `mcp-22-auto-expose-new-workflows-to-mcp-from-settings-via-toggle` (already created off latest master).
- **Setting key:** `mcp.autoExposeNewWorkflows`. Stored as the string `'true'`/`'false'`, `loadOnStartup: true`. Absent row reads as `false`.
- **Default state:** off.
- **Copy:** title **"Auto-expose new workflows"**, description **"Automatically expose newly created workflows to connected clients"**. Exact strings, via `@n8n/i18n` only — no hardcoded UI text.
- **Precedence:** default-only. Seed only when the caller did not specify `availableInMCP`. Never override an explicit `true` or `false`.
- **Permission:** `mcp:manage` (owner/admin). Backend endpoints keep `@GlobalScope('mcp:manage')`.
- **Experiment flag:** reuse `EXPOSE_ALL_WORKFLOWS_TO_MCP_EXPERIMENT` (`095_expose_all_workflows_to_mcp`). No new flag. The flag gates **UI visibility only** — never backend seeding behaviour.
- **No `any`**, no `as` casts outside test code. Errors: `UserError` / `OperationalError` / `UnexpectedError` — never `ApplicationError`.
- **TypeORM stays in the persistence layer.** This plan adds no new queries; it reuses `SettingsRepository`.
- **CSS:** variables only (`var(--spacing--*)`), no px literals. `data-testid` single-valued.
- **Commands run from the package directory.** `pnpm build > build.log 2>&1` when types cross packages.
- **Reads stay untouched.** Do not add "flag OR setting" logic to any `availableInMCP` read site.
- **Test conventions.** Both `packages/cli` and `packages/frontend/editor-ui` run
  **Vitest with globals** — `describe`/`test`/`it`/`expect`/`vi` need no import.
  Typed mocks come from `vitest-mock-extended`'s `mock<T>()`. Before writing any
  test, open the target file and match its local fixtures and naming; `as` casts
  are acceptable in test code only.

---

## File Structure

| File | Responsibility | Task |
|---|---|---|
| `packages/cli/src/modules/mcp/mcp.settings.service.ts` | Setting get/set + cache | 1 |
| `packages/cli/src/modules/mcp/dto/update-mcp-settings.dto.ts` | Both fields optional + refine | 2 |
| `packages/cli/src/modules/mcp/mcp.settings.controller.ts` | Presence-guarded writes | 2 |
| `packages/cli/src/modules/mcp/mcp.module.ts` | Expose setting to frontend (runtime value) | 3 |
| `packages/@n8n/api-types/src/frontend-settings.ts` | The `mcp` client-settings **type** — separate declaration from the hook above, and easy to miss | 6 |
| `packages/cli/src/workflows/workflow-creation.service.ts` | Default-only seeding | 4 |
| `packages/cli/src/modules/mcp/tools/workflow-builder/create-workflow-from-code.tool.ts` | Comment only | 4 |
| `packages/frontend/editor-ui/src/app/stores/workflows.store.ts` | **Delete** hardcoded `false` | 5 |
| `packages/frontend/editor-ui/src/features/ai/mcpAccess/mcp.api.ts` | API signature | 6 |
| `packages/frontend/editor-ui/src/features/ai/mcpAccess/mcp.store.ts` | Store state + action | 6 |
| `packages/@n8n/telemetry/src/events/mcp.ts` | Event definition | 7 |
| `packages/@n8n/telemetry/src/telemetry-events.ts` | Registry wiring | 7 |
| `packages/frontend/editor-ui/src/features/ai/mcpAccess/SettingsMCPView.vue` | The settings row — the top-level `/settings/mcp` page, before "Allowed callback URLs", **not** the workflows sub-page | 8 |
| `packages/frontend/@n8n/i18n/src/locales/en.json` | Copy | 8 |

Tasks 1–4 are backend and independently shippable. Task 5 is the one-line deletion that makes the feature live. Tasks 6–8 are the UI.

---

## Task 1: The setting in `McpSettingsService`

**Files:**
- Modify: `packages/cli/src/modules/mcp/mcp.settings.service.ts`
- Test: `packages/cli/src/modules/mcp/__tests__/mcp.settings.service.test.ts`

**Interfaces:**
- Consumes: existing `SettingsRepository`, `CacheService` (already injected).
- Produces: `getAutoExposeNewWorkflows(): Promise<boolean>` and `setAutoExposeNewWorkflows(enabled: boolean): Promise<void>` on `McpSettingsService`. Tasks 2, 3 and 4 call these.

Mirror the existing `getEnabled`/`setEnabled` pair exactly — same cache-then-DB read, same `upsert` with `loadOnStartup: true`.

- [ ] **Step 1: Write the failing test**

Append this `describe` block to `packages/cli/src/modules/mcp/__tests__/mcp.settings.service.test.ts`,
as a sibling of the existing `describe('getEnabled', ...)`. That file already
provides everything used below: bare `findByKey` / `upsert` spies (the repository
is assembled from them), a `cacheService` mock, a `service` instance rebuilt in
`beforeEach`, and `test(` rather than `it(`.

```typescript
	describe('getAutoExposeNewWorkflows', () => {
		test('returns false by default when no setting exists', async () => {
			cacheService.get.mockResolvedValue(undefined);
			findByKey.mockResolvedValue(null);

			await expect(service.getAutoExposeNewWorkflows()).resolves.toBe(false);
			expect(findByKey).toHaveBeenCalledWith('mcp.autoExposeNewWorkflows');
			expect(cacheService.set).toHaveBeenCalledWith('mcp.autoExposeNewWorkflows', 'false');
		});

		test('returns the cached value without hitting the database', async () => {
			cacheService.get.mockResolvedValue('true');

			await expect(service.getAutoExposeNewWorkflows()).resolves.toBe(true);
			expect(findByKey).not.toHaveBeenCalled();
		});

		test('reads through to the database on a cache miss', async () => {
			cacheService.get.mockResolvedValue(undefined);
			findByKey.mockResolvedValue({
				key: 'mcp.autoExposeNewWorkflows',
				value: 'true',
				loadOnStartup: true,
			} as Settings);

			await expect(service.getAutoExposeNewWorkflows()).resolves.toBe(true);
		});
	});

	describe('setAutoExposeNewWorkflows', () => {
		test('persists with loadOnStartup and primes the cache', async () => {
			await service.setAutoExposeNewWorkflows(true);

			expect(upsert).toHaveBeenCalledWith(
				{ key: 'mcp.autoExposeNewWorkflows', value: 'true', loadOnStartup: true },
				['key'],
			);
			expect(cacheService.set).toHaveBeenCalledWith('mcp.autoExposeNewWorkflows', 'true');
		});

		test('persists false without special-casing it', async () => {
			await service.setAutoExposeNewWorkflows(false);

			expect(upsert).toHaveBeenCalledWith(
				{ key: 'mcp.autoExposeNewWorkflows', value: 'false', loadOnStartup: true },
				['key'],
			);
		});
	});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd packages/cli && pnpm test src/modules/mcp/__tests__/mcp.settings.service.test.ts
```

Expected: FAIL — `service.getAutoExposeNewWorkflows is not a function`.

- [ ] **Step 3: Write minimal implementation**

In `mcp.settings.service.ts`, add the key constant next to the existing two (near `const KEY` / `const REDIRECT_URIS_KEY`):

```typescript
const AUTO_EXPOSE_NEW_WORKFLOWS_KEY = 'mcp.autoExposeNewWorkflows';
```

Add the two methods directly after `setAllowedRedirectUris`:

```typescript
	async getAutoExposeNewWorkflows(): Promise<boolean> {
		const cached = await this.cacheService.get<string>(AUTO_EXPOSE_NEW_WORKFLOWS_KEY);

		if (cached !== undefined) {
			return cached === 'true';
		}

		const row = await this.settingsRepository.findByKey(AUTO_EXPOSE_NEW_WORKFLOWS_KEY);

		const enabled = row?.value === 'true';

		await this.cacheService.set(AUTO_EXPOSE_NEW_WORKFLOWS_KEY, enabled.toString());

		return enabled;
	}

	async setAutoExposeNewWorkflows(enabled: boolean): Promise<void> {
		await this.settingsRepository.upsert(
			{ key: AUTO_EXPOSE_NEW_WORKFLOWS_KEY, value: enabled.toString(), loadOnStartup: true },
			['key'],
		);

		await this.cacheService.set(AUTO_EXPOSE_NEW_WORKFLOWS_KEY, enabled.toString());
	}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd packages/cli && pnpm test src/modules/mcp/__tests__/mcp.settings.service.test.ts
```

Expected: PASS, including the pre-existing tests in the file.

- [ ] **Step 5: Commit**

```bash
git add packages/cli/src/modules/mcp/mcp.settings.service.ts packages/cli/src/modules/mcp/__tests__/mcp.settings.service.test.ts
git commit -m "feat(core): Add auto-expose new workflows MCP setting"
```

---

## Task 2: DTO + controller — presence-guarded partial updates

**Files:**
- Modify: `packages/cli/src/modules/mcp/dto/update-mcp-settings.dto.ts`
- Modify: `packages/cli/src/modules/mcp/mcp.settings.controller.ts`
- Test: `packages/cli/src/modules/mcp/__tests__/mcp.settings.controller.test.ts`

**Interfaces:**
- Consumes: `McpSettingsService.setAutoExposeNewWorkflows` (Task 1).
- Produces: `PATCH /rest/mcp/settings` accepting `{ mcpAccessEnabled?: boolean, autoExposeNewWorkflows?: boolean }`, at least one required; response echoes only the fields that were written.

**Why this is delicate.** `mcpAccessEnabled` is currently **required**, so `{}` is rejected today. Making both fields optional silently turns that 400 into a 200-that-does-nothing — hence the `.refine()`. The handler must also stop calling `setEnabled` unconditionally, or toggling auto-expose would rewrite the master switch.

- [ ] **Step 1: Write the failing test**

Create or append to `packages/cli/src/modules/mcp/__tests__/mcp.settings.controller.test.ts`:

The empty-body assertion belongs at the handler level, since the DTO itself now
accepts `{}` by design:

```typescript
import { UpdateMcpSettingsDto } from '../dto/update-mcp-settings.dto';

describe('UpdateMcpSettingsDto', () => {
	it('accepts either field alone, and both together', () => {
		expect(UpdateMcpSettingsDto.safeParse({ mcpAccessEnabled: true }).success).toBe(true);
		expect(UpdateMcpSettingsDto.safeParse({ autoExposeNewWorkflows: true }).success).toBe(true);
		expect(
			UpdateMcpSettingsDto.safeParse({ mcpAccessEnabled: false, autoExposeNewWorkflows: true })
				.success,
		).toBe(true);
	});
});

describe('empty body', () => {
	it('is rejected by the handler', async () => {
		const dto = UpdateMcpSettingsDto.parse({});

		await expect(controller.updateSettings(req, res, dto)).rejects.toThrow(BadRequestError);
	});
});
```

Add the matching real-HTTP assertion to
`packages/cli/src/modules/mcp/__tests__/mcp.settings.controller.api.test.ts`:
`PATCH /mcp/settings` with `{}` returns 400.

Add controller behaviour tests in the same file. Follow the existing mocking style in `packages/cli/src/modules/mcp/__tests__/`; construct the controller with `mock<T>()` dependencies.

```typescript
describe('McpSettingsController.updateSettings', () => {
	it('does not touch MCP access when only autoExposeNewWorkflows is patched', async () => {
		const dto = UpdateMcpSettingsDto.parse({ autoExposeNewWorkflows: true });

		await controller.updateSettings(req, res, dto);

		expect(mcpSettingsService.setAutoExposeNewWorkflows).toHaveBeenCalledWith(true);
		expect(mcpSettingsService.setEnabled).not.toHaveBeenCalled();
		expect(eventService.emit).not.toHaveBeenCalledWith('mcp-access-updated', expect.anything());
	});

	it('does not touch autoExpose when only mcpAccessEnabled is patched', async () => {
		const dto = UpdateMcpSettingsDto.parse({ mcpAccessEnabled: true });

		await controller.updateSettings(req, res, dto);

		expect(mcpSettingsService.setEnabled).toHaveBeenCalledWith(true);
		expect(mcpSettingsService.setAutoExposeNewWorkflows).not.toHaveBeenCalled();
		expect(eventService.emit).toHaveBeenCalledWith('mcp-access-updated', {
			user: req.user,
			enabled: true,
		});
	});

	it('rejects any patch when MCP settings are managed by env', async () => {
		instanceSettingsLoaderConfig.mcpManagedByEnv = true;
		const dto = UpdateMcpSettingsDto.parse({ autoExposeNewWorkflows: true });

		await expect(controller.updateSettings(req, res, dto)).rejects.toThrow(ForbiddenError);
		expect(mcpSettingsService.setAutoExposeNewWorkflows).not.toHaveBeenCalled();
	});
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd packages/cli && pnpm test src/modules/mcp/__tests__/mcp.settings.controller.test.ts
```

Expected: FAIL — `{}` currently parses as invalid for the *wrong* reason (missing required field) and `autoExposeNewWorkflows` is stripped as unknown.

- [ ] **Step 3: Write minimal implementation**

Replace the whole body of `dto/update-mcp-settings.dto.ts`:

```typescript
import { Z } from '@n8n/api-types';
import { z } from 'zod';

export class UpdateMcpSettingsDto extends Z.class({
	mcpAccessEnabled: z.boolean().optional(),
	autoExposeNewWorkflows: z.boolean().optional(),
}) {}
```

`Z.class` takes a `ZodRawShape`, so it cannot carry an object-level refinement
("at least one of these two fields"). Enforce emptiness **in the handler** with an
explicit guard — do **not** reassign the class's static `parse`/`safeParse` with a
refined schema. That monkey-patches a class after definition, is used nowhere else
among the repo's ~169 `Z.class(...)` DTOs, and is silently bypassed by any caller
that reaches for `.schema.safeParse()` directly.

So the DTO file stays trivial:

```typescript
import { Z } from '@n8n/api-types';
import { z } from 'zod';

// `Z.class` takes a `ZodRawShape`, so it can't carry an object-level refine.
// Both fields are optional so a settings-scoped update can touch just one of
// them — the "at least one field present" check lives in the controller handler.
export class UpdateMcpSettingsDto extends Z.class({
	mcpAccessEnabled: z.boolean().optional(),
	autoExposeNewWorkflows: z.boolean().optional(),
}) {}
```

and the guard is the handler's first statement, before the env check (a malformed
body is a 400 regardless of instance configuration, matching how the registry
already returns 400 for type errors):

```typescript
		if (dto.mcpAccessEnabled === undefined && dto.autoExposeNewWorkflows === undefined) {
			throw new BadRequestError(
				'Provide at least one of mcpAccessEnabled or autoExposeNewWorkflows',
			);
		}
```

Import `BadRequestError` from `@/errors/response-errors/bad-request.error`.

Because rejection now lives in the handler rather than the DTO, the empty-body
test must assert at the **handler** level, and a real-HTTP test must cover the 400
through the actual Express stack — a DTO-only unit test would pass vacuously.

Rewrite `updateSettings` in `mcp.settings.controller.ts`:

```typescript
	@GlobalScope('mcp:manage')
	@Patch('/settings')
	async updateSettings(req: AuthenticatedRequest, _res: Response, @Body dto: UpdateMcpSettingsDto) {
		if (this.instanceSettingsLoaderConfig.mcpManagedByEnv) {
			throw new ForbiddenError('MCP settings are managed via environment variables');
		}

		const response: { mcpAccessEnabled?: boolean; autoExposeNewWorkflows?: boolean } = {};

		if (dto.mcpAccessEnabled !== undefined) {
			await this.mcpSettingsService.setEnabled(dto.mcpAccessEnabled);
			this.eventService.emit('mcp-access-updated', {
				user: req.user,
				enabled: dto.mcpAccessEnabled,
			});
			response.mcpAccessEnabled = dto.mcpAccessEnabled;
		}

		if (dto.autoExposeNewWorkflows !== undefined) {
			await this.mcpSettingsService.setAutoExposeNewWorkflows(dto.autoExposeNewWorkflows);
			response.autoExposeNewWorkflows = dto.autoExposeNewWorkflows;
		}

		try {
			await this.moduleRegistry.refreshModuleSettings('mcp');
		} catch (error) {
			this.logger.warn('Failed to sync MCP settings to module registry', {
				cause: error instanceof Error ? error.message : String(error),
			});
		}

		return response;
	}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd packages/cli && pnpm test src/modules/mcp/__tests__/mcp.settings.controller.test.ts
```

Expected: PASS. Then check no existing caller relied on the old required-field response shape:

```bash
cd packages/cli && pnpm test src/modules/mcp
```

- [ ] **Step 5: Commit**

```bash
git add packages/cli/src/modules/mcp/dto/update-mcp-settings.dto.ts packages/cli/src/modules/mcp/mcp.settings.controller.ts packages/cli/src/modules/mcp/__tests__/mcp.settings.controller.test.ts
git commit -m "feat(core): Support partial MCP settings updates"
```

---

## Task 3: Expose the setting through the module hook

**Files:**
- Modify: `packages/cli/src/modules/mcp/mcp.module.ts`
- Create: `packages/cli/src/modules/mcp/__tests__/mcp.module.test.ts` (does not exist yet)

**Interfaces:**
- Consumes: `McpSettingsService.getAutoExposeNewWorkflows` (Task 1).
- Produces: `settings()` returns `{ mcpAccessEnabled, mcpManagedByEnv, serverUrl, autoExposeNewWorkflows }`. Task 6 reads `moduleSettings.mcp.autoExposeNewWorkflows`.

There is **no** `GET /rest/mcp/settings`; the frontend gets this through the module `settings()` hook. (Note: `getMcpSettings()` in `mcp.api.ts` calls that non-existent endpoint but has zero callers — dead code. Leave it alone; removing it is out of scope.)

- [ ] **Step 1: Write the failing test**

Create `packages/cli/src/modules/mcp/__tests__/mcp.module.test.ts`. `settings()`
resolves its dependencies through the DI `Container` at call time, so stub the
container rather than injecting constructor mocks:

```typescript
import { Container } from '@n8n/di';
import { mock } from 'vitest-mock-extended';

import { McpModule } from '../mcp.module';
import { McpSettingsService } from '../mcp.settings.service';

describe('McpModule.settings', () => {
	const mcpSettingsService = mock<McpSettingsService>();

	beforeEach(() => {
		vi.restoreAllMocks();
		mcpSettingsService.getEnabled.mockResolvedValue(true);
		mcpSettingsService.getAutoExposeNewWorkflows.mockResolvedValue(true);

		// `settings()` resolves its dependencies from the container at call time,
		// so stub the container rather than injecting constructor mocks.
		vi.spyOn(Container, 'get').mockImplementation((token: unknown) =>
			token === McpSettingsService ? mcpSettingsService : mock(),
		);
	});

	it('exposes autoExposeNewWorkflows to the frontend', async () => {
		const settings = await new McpModule().settings();

		expect(settings).toMatchObject({ autoExposeNewWorkflows: true });
	});

	it('reports the setting as off when disabled', async () => {
		mcpSettingsService.getAutoExposeNewWorkflows.mockResolvedValue(false);

		const settings = await new McpModule().settings();

		expect(settings).toMatchObject({ autoExposeNewWorkflows: false });
	});
});
```

`packages/cli` runs Vitest with globals (`describe`/`it`/`expect`/`vi` need no
import) and uses `vitest-mock-extended` for `mock<T>()`. `Container.get` is
stubbed for **all** tokens because `settings()` also resolves
`McpProtectedResource` and `InstanceSettingsLoaderConfig`; the catch-all `mock()`
keeps those harmless. The `vi.spyOn` return may need `as never` to satisfy
`Container.get`'s overloads — acceptable in test code.

- [ ] **Step 2: Run test to verify it fails**

```bash
cd packages/cli && pnpm test src/modules/mcp/__tests__/mcp.module.test.ts
```

Expected: FAIL — `autoExposeNewWorkflows` is `undefined`.

- [ ] **Step 3: Write minimal implementation**

In `mcp.module.ts`, inside `settings()`:

```typescript
		const mcpSettingsService = Container.get(McpSettingsService);
		const mcpAccessEnabled = await mcpSettingsService.getEnabled();
		const autoExposeNewWorkflows = await mcpSettingsService.getAutoExposeNewWorkflows();
```

and extend the return:

```typescript
		return { mcpAccessEnabled, mcpManagedByEnv, serverUrl, autoExposeNewWorkflows };
```

Update the JSDoc above `settings()` to list the new key alongside the existing three.

- [ ] **Step 4: Run test to verify it passes**

```bash
cd packages/cli && pnpm test src/modules/mcp/__tests__/mcp.module.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/cli/src/modules/mcp/mcp.module.ts packages/cli/src/modules/mcp/__tests__/mcp.module.test.ts
git commit -m "feat(core): Expose auto-expose setting in MCP module settings"
```

---

## Task 4: Seed `availableInMCP` at creation

**Files:**
- Modify: `packages/cli/src/workflows/workflow-creation.service.ts`
- Modify: `packages/cli/src/modules/mcp/tools/workflow-builder/create-workflow-from-code.tool.ts` (comment only, line ~295)
- Test: `packages/cli/src/workflows/__tests__/workflow-creation.service.test.ts`

**Interfaces:**
- Consumes: `McpSettingsService.getAutoExposeNewWorkflows` (Task 1).
- Produces: no new exports. Behaviour: `createWorkflow()` sets `newWorkflow.settings.availableInMCP = true` when the caller left it `undefined` and the setting is on.

This is the whole feature. `createWorkflow()` is the single funnel for UI, public API, import, duplicate, and MCP's own builder — the reason seeding lives here and not in a controller or the frontend store.

**Precedence is default-only.** `undefined` → seed. Explicit `true` or `false` → untouched.

`McpSettingsService` lives in a backend module, but inject it via the constructor
with a normal top-level import — **not** a lazy `await import()` plus
`Container.get`. This same file already depends on a module service exactly that
way (`InstanceRedactionEnforcementService` from `@/modules/redaction/`, imported at
the top and injected in the constructor), and `resolveMcpExposureOnCreate` sits
directly beside the method that uses it. A dynamic import here would be
inconsistent with its own neighbour and forces a token-blind
`vi.spyOn(Container, 'get')` stub in the tests. There is no circular-import
problem: `mcp.settings.service.ts` does not depend on `WorkflowCreationService`.

- [ ] **Step 1: Write the failing test**

Append to `packages/cli/src/workflows/__tests__/workflow-creation.service.test.ts`, following the existing setup in that file:

```typescript
describe('auto-expose new workflows', () => {
	it('seeds availableInMCP when unset and the setting is on', async () => {
		mcpSettingsService.getAutoExposeNewWorkflows.mockResolvedValue(true);
		const workflow = makeWorkflow({ settings: {} });

		await service.createWorkflow(user, workflow);

		expect(workflow.settings?.availableInMCP).toBe(true);
	});

	it('seeds availableInMCP when settings is entirely absent', async () => {
		mcpSettingsService.getAutoExposeNewWorkflows.mockResolvedValue(true);
		const workflow = makeWorkflow({ settings: undefined });

		await service.createWorkflow(user, workflow);

		expect(workflow.settings?.availableInMCP).toBe(true);
	});

	it('respects an explicit false from the caller', async () => {
		mcpSettingsService.getAutoExposeNewWorkflows.mockResolvedValue(true);
		const workflow = makeWorkflow({ settings: { availableInMCP: false } });

		await service.createWorkflow(user, workflow);

		expect(workflow.settings?.availableInMCP).toBe(false);
	});

	it('respects an explicit true from the caller', async () => {
		mcpSettingsService.getAutoExposeNewWorkflows.mockResolvedValue(false);
		const workflow = makeWorkflow({ settings: { availableInMCP: true } });

		await service.createWorkflow(user, workflow);

		expect(workflow.settings?.availableInMCP).toBe(true);
	});

	it('does not seed when the setting is off', async () => {
		mcpSettingsService.getAutoExposeNewWorkflows.mockResolvedValue(false);
		const workflow = makeWorkflow({ settings: {} });

		await service.createWorkflow(user, workflow);

		expect(workflow.settings?.availableInMCP).toBeUndefined();
	});
});
```

`makeWorkflow` is a local helper — if the test file has no equivalent, add one that builds a minimal valid `WorkflowEntity` (name, `nodes: []`, `connections: {}`, plus the passed `settings`) reusing whatever fixture the file already uses for other create tests.

- [ ] **Step 2: Run test to verify it fails**

```bash
cd packages/cli && pnpm test src/workflows/__tests__/workflow-creation.service.test.ts
```

Expected: FAIL — `availableInMCP` is `undefined` in the first two cases.

- [ ] **Step 3: Write minimal implementation**

Add the private method to `WorkflowCreationService`, directly after `resolveRedactionPolicyOnCreate`:

```typescript
	/**
	 * Default-only: the instance setting seeds MCP exposure for callers that didn't
	 * express an intent. An explicit `availableInMCP` — from the public API, an
	 * import, or the MCP builder — always wins.
	 */
	private async resolveMcpExposureOnCreate(newWorkflow: WorkflowEntity): Promise<void> {
		if (newWorkflow.settings?.availableInMCP !== undefined) return;

		if (!(await this.mcpSettingsService.getAutoExposeNewWorkflows())) return;

		newWorkflow.settings = { ...(newWorkflow.settings ?? {}), availableInMCP: true };
	}
```

Add the top-level import `import { McpSettingsService } from '@/modules/mcp/mcp.settings.service';`
(extensionless, like the existing `@/modules/redaction/...` import) and
`private readonly mcpSettingsService: McpSettingsService,` to the constructor.
The test supplies a `mock<McpSettingsService>()` as that constructor argument —
no `Container.get` stubbing.

Call it inside the create transaction, immediately after the existing `resolveRedactionPolicyOnCreate(...)` call:

```typescript
			await this.resolveMcpExposureOnCreate(newWorkflow);
```

Then add a comment at `create-workflow-from-code.tool.ts` line ~295, above the `settings:` line:

```typescript
				// Explicit `true` — a client that just built this workflow must be able to keep
				// working on it, regardless of the `mcp.autoExposeNewWorkflows` instance setting.
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd packages/cli && pnpm test src/workflows/__tests__/workflow-creation.service.test.ts
```

Expected: PASS. Then confirm no existing creation test regressed:

```bash
cd packages/cli && pnpm test src/workflows
```

- [ ] **Step 5: Commit**

```bash
git add packages/cli/src/workflows/workflow-creation.service.ts packages/cli/src/workflows/__tests__/workflow-creation.service.test.ts packages/cli/src/modules/mcp/tools/workflow-builder/create-workflow-from-code.tool.ts
git commit -m "feat(core): Seed MCP exposure on workflow creation"
```

---

## Task 5: Delete the frontend's hardcoded `false`

**Files:**
- Modify: `packages/frontend/editor-ui/src/app/stores/workflows.store.ts` (remove lines ~298–302)
- Test: `packages/frontend/editor-ui/src/app/stores/workflows.store.test.ts` (or the store's existing test file)

**Interfaces:**
- Consumes: nothing.
- Produces: `createNewWorkflow()` no longer sends `settings.availableInMCP`, so `undefined` reaches the backend and Task 4's seeding can fire.

**Without this task the feature is inert for every UI-side creation path.** The client's explicit `false` beats default-only seeding. This one line also covers duplicate, extract-to-subworkflow, share-as-new, onboarding, templates and several experiment stores — all of which reach `createNewWorkflow()`.

Verified: this is the only write in the store, and nothing reads `availableInMCP` optimistically before the POST response, which carries the saved `settings`.

- [ ] **Step 1: Write the failing test**

```typescript
it('does not send availableInMCP, letting the backend decide exposure', async () => {
	const store = useWorkflowsStore();

	await store.createNewWorkflow({ name: 'Test', nodes: [], connections: {} });

	const [, , , payload] = vi.mocked(makeRestApiRequest).mock.calls[0];
	expect((payload as { settings?: { availableInMCP?: boolean } }).settings?.availableInMCP)
		.toBeUndefined();
});
```

Match the existing mocking of `makeRestApiRequest` in the store's test file; if the file mocks `@n8n/rest-api-client` differently, follow that.

- [ ] **Step 2: Run test to verify it fails**

```bash
cd packages/frontend/editor-ui && pnpm test src/app/stores/__tests__/workflows.store.test.ts
```

Expected: FAIL — received `false`, expected `undefined`.

- [ ] **Step 3: Write minimal implementation**

In `createNewWorkflow()`, delete these lines entirely:

```typescript
		// When activation is false, ensure MCP is disabled
		if (!sendData.settings) {
			sendData.settings ??= {};
		}
		sendData.settings.availableInMCP = false;
```

Keep `sendData.active = false;` immediately above them.

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd packages/frontend/editor-ui && pnpm test src/app/stores/__tests__/workflows.store.test.ts
```

Expected: PASS. Then check nothing downstream assumed the field was always present:

```bash
cd packages/frontend/editor-ui && pnpm test src/app/stores
```

- [ ] **Step 5: Commit**

```bash
git add packages/frontend/editor-ui/src/app/stores/workflows.store.ts packages/frontend/editor-ui/src/app/stores/workflows.store.test.ts
git commit -m "fix(editor): Let the backend decide MCP exposure for new workflows"
```

---

## Task 6: Frontend API + store

**Files:**
- Modify: `packages/@n8n/api-types/src/frontend-settings.ts` — add `autoExposeNewWorkflows: boolean` to the `mcp` client-settings type, **required**, matching its siblings (`mcpAccessEnabled`, `mcpManagedByEnv`). The backend hook returns it unconditionally, so optional would under-describe the contract. Rebuild the package afterwards, and expect the required field to break distant `moduleSettings.mcp` fixtures — fix every one typecheck flags.
- Modify: `packages/frontend/editor-ui/src/features/ai/mcpAccess/mcp.api.ts`
- Modify: `packages/frontend/editor-ui/src/features/ai/mcpAccess/mcp.store.ts`
- Test: `packages/frontend/editor-ui/src/features/ai/mcpAccess/mcp.store.test.ts`

Note the type and the runtime value are **two separate declarations**: Task 3 added the value to the module's `settings()` hook; this task adds the type. Neither implies the other.

**Interfaces:**
- Consumes: `PATCH /rest/mcp/settings` partial updates (Task 2), `moduleSettings.mcp.autoExposeNewWorkflows` (Task 3).
- Produces:
  - `updateMcpSettings(context: IRestApiContext, settings: { mcpAccessEnabled?: boolean; autoExposeNewWorkflows?: boolean }): Promise<McpSettingsResponse>`
  - `McpSettingsResponse = { mcpAccessEnabled?: boolean; autoExposeNewWorkflows?: boolean }`
  - store: `autoExposeNewWorkflows` (computed `boolean`) and `setAutoExposeNewWorkflows(enabled: boolean): Promise<boolean>`. Task 8 uses both.

**Breaking-change note:** `updateMcpSettings` currently takes a positional `enabled: boolean`. Changing it to an object means updating the one existing caller, `setMcpAccessEnabled` in `mcp.store.ts`.

- [ ] **Step 1: Write the failing test**

Append to `mcp.store.test.ts`:

```typescript
describe('autoExposeNewWorkflows', () => {
	it('reads the flag from module settings', () => {
		const settingsStore = useSettingsStore();
		settingsStore.moduleSettings.mcp = {
			mcpAccessEnabled: true,
			mcpManagedByEnv: false,
			autoExposeNewWorkflows: true,
		};

		expect(useMCPStore().autoExposeNewWorkflows).toBe(true);
	});

	it('defaults to false when module settings are absent', () => {
		const settingsStore = useSettingsStore();
		settingsStore.moduleSettings.mcp = undefined;

		expect(useMCPStore().autoExposeNewWorkflows).toBe(false);
	});

	it('patches only autoExposeNewWorkflows and updates local state', async () => {
		vi.mocked(updateMcpSettings).mockResolvedValue({ autoExposeNewWorkflows: true });
		const settingsStore = useSettingsStore();
		settingsStore.moduleSettings.mcp = {
			mcpAccessEnabled: true,
			mcpManagedByEnv: false,
			autoExposeNewWorkflows: false,
		};

		const result = await useMCPStore().setAutoExposeNewWorkflows(true);

		expect(updateMcpSettings).toHaveBeenCalledWith(expect.anything(), {
			autoExposeNewWorkflows: true,
		});
		expect(result).toBe(true);
		expect(settingsStore.moduleSettings.mcp?.autoExposeNewWorkflows).toBe(true);
		expect(settingsStore.moduleSettings.mcp?.mcpAccessEnabled).toBe(true);
	});
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd packages/frontend/editor-ui && pnpm test src/features/ai/mcpAccess/mcp.store.test.ts
```

Expected: FAIL — `autoExposeNewWorkflows` is not exported from the store.

- [ ] **Step 3: Write minimal implementation**

In `mcp.api.ts`, replace the response type and the update function:

```typescript
export type McpSettingsResponse = {
	mcpAccessEnabled?: boolean;
	autoExposeNewWorkflows?: boolean;
};

export async function updateMcpSettings(
	context: IRestApiContext,
	settings: { mcpAccessEnabled?: boolean; autoExposeNewWorkflows?: boolean },
): Promise<McpSettingsResponse> {
	return await makeRestApiRequest(context, 'PATCH', '/mcp/settings', settings);
}
```

In `mcp.store.ts`, add the computed next to `mcpManagedByEnv`:

```typescript
	const autoExposeNewWorkflows = computed(
		() => !!settingsStore.moduleSettings.mcp?.autoExposeNewWorkflows,
	);
```

Update the existing `setMcpAccessEnabled` call site to the object signature:

```typescript
		const { mcpAccessEnabled: updated } = await updateMcpSettings(rootStore.restApiContext, {
			mcpAccessEnabled: enabled,
		});
```

Because the response type is now optional-valued, guard the assignment:

```typescript
		settingsStore.moduleSettings.mcp = {
			mcpManagedByEnv: false,
			...(settingsStore.moduleSettings.mcp ?? {}),
			mcpAccessEnabled: updated ?? enabled,
		};
		return updated ?? enabled;
```

Add the new action after `setMcpAccessEnabled`:

```typescript
	async function setAutoExposeNewWorkflows(enabled: boolean): Promise<boolean> {
		const { autoExposeNewWorkflows: updated } = await updateMcpSettings(
			rootStore.restApiContext,
			{ autoExposeNewWorkflows: enabled },
		);
		const next = updated ?? enabled;
		settingsStore.moduleSettings.mcp = {
			mcpManagedByEnv: false,
			...(settingsStore.moduleSettings.mcp ?? {}),
			autoExposeNewWorkflows: next,
		};
		return next;
	}
```

Add both to the store's `return { ... }` block: `autoExposeNewWorkflows,` and `setAutoExposeNewWorkflows,`.

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd packages/frontend/editor-ui && pnpm test src/features/ai/mcpAccess/
```

Expected: PASS, including the pre-existing `setMcpAccessEnabled` tests. Then:

```bash
cd packages/frontend/editor-ui && pnpm typecheck
```

- [ ] **Step 5: Commit**

```bash
git add packages/frontend/editor-ui/src/features/ai/mcpAccess/mcp.api.ts packages/frontend/editor-ui/src/features/ai/mcpAccess/mcp.store.ts packages/frontend/editor-ui/src/features/ai/mcpAccess/mcp.store.test.ts
git commit -m "feat(editor): Add auto-expose setting to MCP store"
```

---

## Task 7: Telemetry event

**Files:**
- Create: `packages/@n8n/telemetry/src/events/mcp.ts`
- Modify: `packages/@n8n/telemetry/src/telemetry-events.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: `TELEMETRY_EVENT.MCP.AUTO_EXPOSE_NEW_WORKFLOWS_TOGGLED`, payload `{ enabled: boolean }` plus the experiment payload fields spread in by the caller. Task 8 fires it.

Log the **resulting state**, not "was toggled" — otherwise enable and disable are indistinguishable. The experiment variant is needed to split the experiment.

Only this one event. Per the spec, success is measured by cohort comparison against existing `USER_CALLED_MCP_TOOL_EVENT` data — no per-workflow provenance field.

- [ ] **Step 1: Write the event definition**

Create `packages/@n8n/telemetry/src/events/mcp.ts`:

```typescript
import { z } from 'zod/v4';

import { defineTelemetryEvents } from '../define';

export const MCP_TELEMETRY = defineTelemetryEvents({
	AUTO_EXPOSE_NEW_WORKFLOWS_TOGGLED: {
		name: 'User toggled auto-expose new workflows to MCP',
		description:
			'An admin turned the "Auto-expose new workflows" MCP setting on or off. Reports the resulting state so enabling and disabling are distinguishable.',
		properties: z.object({
			enabled: z.boolean().describe('Resulting state of the setting, not the prior one'),
		}),
	},
});
```

- [ ] **Step 2: Wire it into the registry**

In `packages/@n8n/telemetry/src/telemetry-events.ts`:

```typescript
import { MCP_TELEMETRY } from './events/mcp';
```

and add to the object:

```typescript
	MCP: MCP_TELEMETRY,
```

- [ ] **Step 3: Verify the registry validates and the catalog lists it**

```bash
cd packages/@n8n/telemetry && pnpm test && pnpm catalog | grep -i "auto-expose"
```

Expected: tests pass; the catalog prints the new event. If the registry has an `allowExtraProperties`-style requirement for spread-in experiment fields, follow the pattern used by an existing experiment event (see `PLATFORM.USER_IS_PART_OF_EXPERIMENT`) and adjust the schema accordingly.

- [ ] **Step 4: Build so the type is available to editor-ui**

```bash
cd packages/@n8n/telemetry && pnpm build
```

Expected: clean build.

- [ ] **Step 5: Commit**

```bash
git add packages/@n8n/telemetry/src/events/mcp.ts packages/@n8n/telemetry/src/telemetry-events.ts
git commit -m "feat(core): Register auto-expose new workflows telemetry event"
```

---

## Task 8: The settings row

**Files:**
- Modify: `packages/frontend/editor-ui/src/features/ai/mcpAccess/SettingsMCPView.vue`
- Modify: `packages/frontend/@n8n/i18n/src/locales/en.json`
- Test: `packages/frontend/editor-ui/src/features/ai/mcpAccess/SettingsMCPView.test.ts`

**Interfaces:**
- Consumes: `mcpStore.autoExposeNewWorkflows`, `mcpStore.setAutoExposeNewWorkflows` (Task 6); `TELEMETRY_EVENT.MCP.AUTO_EXPOSE_NEW_WORKFLOWS_TOGGLED` (Task 7); `useExposeAllWorkflowsToMcpStore` for `isEnabled` and the experiment telemetry payload.
- Produces: no exports. `data-test-id="mcp-auto-expose-toggle"`.

**This is `SettingsMCPView.vue` — the top-level `/settings/mcp` page — not
`SettingsMCPWorkflowsView.vue`.** The latter is a drill-down sub-page reached by
clicking "Workflows exposed"; the ticket asks for the row on the main MCP
settings page, before the existing "Allowed callback URLs" row. Placing it in
the workflows sub-page was tried once and was wrong — worth stating plainly so
it isn't repeated.

The target page already has almost everything this task needs:
- `canManageMcpInstance` (the `mcp:manage` gate) already exists as a computed —
  reuse it, don't redeclare it.
- `hasPermission` is already imported from `@/app/utils/rbac/permissions` (note
  the real path — `@/app/rbac/permissions` does not exist).
- The page already imports and uses `useExposeAllWorkflowsToMcpOffer` from the
  same experiment, so `useExposeAllWorkflowsToMcpStore` needs adding but the
  experiment is not new context for this file.
- `SettingsMCPView.test.ts` already hoists `hasPermissionMock` and already
  mocks `useExposeAllWorkflowsToMcpStore` via `mockedStore` — reuse both
  directly rather than inventing parallel mocking.
- The page has no `useTelemetry()` call yet — add it.

**Placement inside the template:** the "Allowed callback URLs" row lives in the
*second* `N8nSettingsRowGroup` of the "Access" section
(`i18n.baseText('settings.mcp.access.title')`), gated
`v-if="canManageMcpInstance"`:

```vue
			<N8nSettingsSection :title="i18n.baseText('settings.mcp.access.title')">
				<N8nSettingsRowGroup>
					<!-- "Workflows exposed" / "Agents exposed" rows -->
				</N8nSettingsRowGroup>
				<N8nSettingsRowGroup v-if="canManageMcpInstance">
					<!-- "Allowed callback URLs" row -->
				</N8nSettingsRowGroup>
			</N8nSettingsSection>
```

Add a **new** `N8nSettingsRowGroup`, gated on the experiment flag in addition to
`canManageMcpInstance`, immediately **before** the callback-URLs group — so it
renders above it, still inside the "Access" section:

```vue
			<N8nSettingsSection :title="i18n.baseText('settings.mcp.access.title')">
				<N8nSettingsRowGroup>
					<!-- "Workflows exposed" / "Agents exposed" rows — unchanged -->
				</N8nSettingsRowGroup>
				<N8nSettingsRowGroup v-if="canManageMcpInstance && exposeAllWorkflowsToMcpStore.isEnabled">
					<N8nSettingsRow
						:title="i18n.baseText('settings.mcp.autoExpose.title')"
						:description="i18n.baseText('settings.mcp.autoExpose.description')"
					>
						<template #action>
							<ElSwitch
								data-test-id="mcp-auto-expose-toggle"
								:model-value="mcpStore.autoExposeNewWorkflows"
								:disabled="mcpStore.mcpManagedByEnv"
								:loading="autoExposeSaving"
								@update:model-value="onAutoExposeSwitchUpdate"
							/>
						</template>
					</N8nSettingsRow>
				</N8nSettingsRowGroup>
				<N8nSettingsRowGroup v-if="canManageMcpInstance">
					<!-- "Allowed callback URLs" row — unchanged -->
				</N8nSettingsRowGroup>
			</N8nSettingsSection>
```

Using `N8nSettingsRow` + `N8nSettingsRowConfigure`-less `#action` slot (an
`ElSwitch` directly in the action slot, matching how `McpStatusControl` sits in
the "MCP status" row above) keeps this row visually consistent with every other
row on this page — a bespoke flex div (as an earlier attempt did) would look
inconsistent next to `N8nSettingsRow`'s own spacing.

Gate on **all three**: `mcp:manage` (via the page's existing
`canManageMcpInstance`), the experiment flag, and `mcpManagedByEnv` for the
disabled-not-hidden state.

- [ ] **Step 1: Write the failing test**

Append to `SettingsMCPView.test.ts`, reusing its existing `hasPermissionMock`,
`mockedStore(useExposeAllWorkflowsToMcpStore)`, and render helper — do not
introduce a second mocking pattern:

```typescript
describe('auto-expose toggle', () => {
	it('renders for a user with mcp:manage when the experiment is on', async () => {
		hasPermissionMock.mockReturnValue(true);
		exposeAllWorkflowsToMcpStore.isEnabled = true;

		const { getByTestId } = renderComponent();
		await waitAllPromises();

		expect(getByTestId('mcp-auto-expose-toggle')).toBeTruthy();
	});

	it('is hidden without the experiment flag', async () => {
		hasPermissionMock.mockReturnValue(true);
		exposeAllWorkflowsToMcpStore.isEnabled = false;

		const { queryByTestId } = renderComponent();
		await waitAllPromises();

		expect(queryByTestId('mcp-auto-expose-toggle')).toBeNull();
	});

	it('is hidden for a user without mcp:manage', async () => {
		hasPermissionMock.mockReturnValue(false);
		exposeAllWorkflowsToMcpStore.isEnabled = true;

		const { queryByTestId } = renderComponent();
		await waitAllPromises();

		expect(queryByTestId('mcp-auto-expose-toggle')).toBeNull();
	});

	it('persists the new state and tracks the resulting value', async () => {
		hasPermissionMock.mockReturnValue(true);
		exposeAllWorkflowsToMcpStore.isEnabled = true;
		mcpStore.setAutoExposeNewWorkflows.mockResolvedValue(true);

		const { getByTestId } = renderComponent();
		await waitAllPromises();

		await userEvent.click(getByTestId('mcp-auto-expose-toggle').querySelector('input')!);

		expect(mcpStore.setAutoExposeNewWorkflows).toHaveBeenCalledWith(true);
		expect(telemetry.track).toHaveBeenCalledWith(
			TELEMETRY_EVENT.MCP.AUTO_EXPOSE_NEW_WORKFLOWS_TOGGLED,
			expect.objectContaining({ enabled: true }),
		);
	});
});
```

Assert against `TELEMETRY_EVENT.MCP.AUTO_EXPOSE_NEW_WORKFLOWS_TOGGLED` (the
event-definition object), not the bare name string — the object is what
`telemetry.track` is actually called with.

- [ ] **Step 2: Run test to verify it fails**

```bash
cd packages/frontend/editor-ui && pnpm test src/features/ai/mcpAccess/SettingsMCPView.test.ts
```

Expected: FAIL — no element with `mcp-auto-expose-toggle`.

- [ ] **Step 3: Add the i18n strings**

In `packages/frontend/@n8n/i18n/src/locales/en.json`, alongside the other `settings.mcp.*` keys:

```json
  "settings.mcp.autoExpose.title": "Auto-expose new workflows",
  "settings.mcp.autoExpose.description": "Automatically expose newly created workflows to connected clients",
  "settings.mcp.autoExpose.error.title": "Could not update setting",
```

- [ ] **Step 4: Write the component change**

Add to the `<script setup>` block of `SettingsMCPView.vue`:

```typescript
import { ElSwitch } from 'element-plus';
import { useTelemetry } from '@n8n/composables/useTelemetry';
import { TELEMETRY_EVENT } from '@n8n/telemetry';
import { useExposeAllWorkflowsToMcpStore } from '@/experiments/exposeAllWorkflowsToMcp/stores/exposeAllWorkflowsToMcp.store';

const telemetry = useTelemetry();
const exposeAllWorkflowsToMcpStore = useExposeAllWorkflowsToMcpStore();

const autoExposeSaving = ref(false);

const onAutoExposeSwitchUpdate = (value: string | number | boolean) => {
	void onToggleAutoExpose(value === true);
};

const onToggleAutoExpose = async (value: boolean) => {
	autoExposeSaving.value = true;
	try {
		const updated = await mcpStore.setAutoExposeNewWorkflows(value);
		telemetry.track(TELEMETRY_EVENT.MCP.AUTO_EXPOSE_NEW_WORKFLOWS_TOGGLED, {
			enabled: updated,
		});
	} catch (error) {
		toast.showError(error, i18n.baseText('settings.mcp.autoExpose.error.title'));
	} finally {
		autoExposeSaving.value = false;
	}
};
```

`canManageMcpInstance` already exists in this file — do not redeclare it.
`ElSwitch`'s `@update:model-value` hands back `string | number | boolean`;
narrow with the wrapper above rather than casting.

Add the template block from the Placement section above, inside the "Access"
`N8nSettingsSection`, between the existing two row groups.

No new `<style>` is needed — the row uses `N8nSettingsRow`'s own layout, matching every other row on the page.

- [ ] **Step 5: Run tests to verify they pass**

```bash
cd packages/frontend/editor-ui && pnpm test src/features/ai/mcpAccess/SettingsMCPView.test.ts
```

Expected: PASS, including every pre-existing test in the file — this page has
significant existing coverage (empty state, capacity notice, callback URLs
dialog, etc.) that must not regress.

- [ ] **Step 6: Lint and typecheck**

```bash
cd packages/frontend/editor-ui && pnpm lint && pnpm typecheck
```

Expected: clean.

- [ ] **Step 7: Commit**

```bash
git add packages/frontend/editor-ui/src/features/ai/mcpAccess/SettingsMCPView.vue packages/frontend/editor-ui/src/features/ai/mcpAccess/SettingsMCPView.test.ts packages/frontend/@n8n/i18n/src/locales/en.json
git commit -m "feat(editor): Add auto-expose new workflows toggle to MCP settings"
```

---

## Task 9: Full verification

**Files:** none — verification only.

- [ ] **Step 1: Build the repo**

```bash
pnpm build > build.log 2>&1; tail -n 20 build.log
```

Expected: no errors. The telemetry package and `mcp.module.ts` return-type change cross package boundaries, so a full build is required before the repo-wide checks.

- [ ] **Step 2: Run the affected test suites**

```bash
cd packages/cli && pnpm test src/modules/mcp src/workflows
```

```bash
cd packages/frontend/editor-ui && pnpm test src/features/ai/mcpAccess src/app/stores
```

Expected: all pass.

- [ ] **Step 3: Repo-wide lint and typecheck**

```bash
pnpm lint && pnpm typecheck
```

Expected: clean.

- [ ] **Step 4: Manual smoke test**

```bash
pnpm dev
```

Then, as an owner with the experiment flag on:
1. Open `/settings/mcp/workflows` — the row renders above the table.
2. Toggle it on. Reload — it stays on (proves persistence + the module hook).
3. Create a new workflow from a blank canvas and save it. Open its settings — "Available in MCP" is on.
4. Duplicate an existing workflow — the copy is also exposed (proves the deleted store line covered more than blank creates).
5. Toggle the setting off, create another workflow — not exposed.
6. Confirm the master MCP access toggle is unchanged throughout (proves the presence-guarded PATCH).

- [ ] **Step 5: Commit any fixes and open the PR**

Title must satisfy `.github/pull_request_title_conventions.md`:

```bash
gh pr create --draft --title "feat(core): Auto-expose new workflows to MCP via instance setting" --body "$(cat <<'EOF'
## Summary

Adds an owner/admin MCP setting that seeds `settings.availableInMCP = true` on newly created workflows. Existing workflows are untouched. Behind the `095_expose_all_workflows_to_mcp` experiment.

https://linear.app/n8n/issue/MCP-22

## Review notes

- Seeding lives in `WorkflowCreationService.createWorkflow()` — the single funnel for UI, public API, import, duplicate and MCP's own builder.
- Precedence is default-only: an explicit `availableInMCP` from any caller always wins.
- `PATCH /rest/mcp/settings` now accepts partial updates, so toggling one setting no longer rewrites the other. An empty body is still rejected.
- The frontend's hardcoded `availableInMCP = false` on create is removed; without that the feature would be inert for every UI-side path.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

---

---

## Task 10 (added post-launch): Auto-enable the setting when a user accepts "expose all workflows"

**Context.** `SettingsMCPView.vue`'s `onToggleMCPAccess` offers a modal
(`ExposeAllWorkflowsToMcpModal.vue`, behind the same
`EXPOSE_ALL_WORKFLOWS_TO_MCP_EXPERIMENT` flag) when a user turns MCP access on.
Accepting it calls `mcpStore.toggleWorkflowsMcpAccess({ allWorkflows: true },
true)` → `PATCH /mcp/workflows/toggle-access` →
`McpSettingsController.toggleWorkflowsMCPAccess` →
`McpSettingsService.bulkSetAvailableInMCP`. The product ask: accepting that
modal should also turn on `mcp.autoExposeNewWorkflows`, so new workflows stay
exposed going forward instead of reverting to per-workflow opt-in the moment
the user creates one.

**Where this lives: the backend, inside `bulkSetAvailableInMCP` — not the
frontend modal.** `{ allWorkflows: true, availableInMCP: true }` is the DTO's
own unambiguous encoding of "expose every workflow" (`allWorkflows` is
`z.literal(true)`, and the modal is the *only* caller in the codebase that ever
sends it — verified by searching every `allWorkflows: true` call site). Keying
off that combination server-side means any future caller of this same bulk
endpoint gets the correct behavior automatically, with no frontend-side
special-casing to keep in sync. This mirrors why creation-seeding itself lives
in the backend funnel rather than a UI call site.

**Failure semantics.** The bulk-expose is the primary action and must not fail
because of this side effect. Enabling the setting is fire-and-forget:
attempted after the bulk update succeeds, its own failure is caught and
logged, and never rethrown or surfaced to the response. A partial failure here
means the instance falls back to its old default (per-workflow opt-in) — not a
broken state, just a missed convenience — matching how
`offerToExposeAllWorkflows()`'s own eligibility probe already swallows
failures the same way.

**Telemetry: reuse the existing toggle-changed event**, `enabled: true`, fired
from the same place a manual toggle fires it would be — except this path has
no experiment-variant context available in the *backend* service the way the
frontend toggle handler does. Emit it from the frontend modal's success path
instead (`ExposeAllWorkflowsToMcpModal.vue`'s `onExposeAll`, after
`toggleWorkflowsMcpAccess` resolves), reading `mcpStore.autoExposeNewWorkflows`
to confirm the backend actually turned it on before tracking — if the fetched
state disagrees (e.g. it was already on, or the backend's fire-and-forget
write failed), do not fire a stale `enabled: true`.

**Precedence unaffected.** This task only changes *when* the setting turns on;
Task 4's default-only seeding logic in `createWorkflow()` is untouched, and so
is every existing per-workflow opt-out.

**Files:**
- Modify: `packages/cli/src/modules/mcp/mcp.settings.service.ts`
- Modify: `packages/frontend/editor-ui/src/experiments/exposeAllWorkflowsToMcp/components/ExposeAllWorkflowsToMcpModal.vue`
- Test: `packages/cli/src/modules/mcp/__tests__/mcp.settings.service.test.ts`
- Test: `packages/frontend/editor-ui/src/experiments/exposeAllWorkflowsToMcp/components/ExposeAllWorkflowsToMcpModal.test.ts`

**Interfaces:**
- Consumes: `getAutoExposeNewWorkflows` / `setAutoExposeNewWorkflows` (Task 1, already on the same service); `TELEMETRY_EVENT.MCP.AUTO_EXPOSE_NEW_WORKFLOWS_TOGGLED` (Task 7); `mcpStore.autoExposeNewWorkflows` (Task 6).
- Produces: no new exports.

- [ ] **Step 1: Write the failing backend test**

Add to `mcp.settings.service.test.ts`, in the `describe('bulkSetAvailableInMCP', ...)` block (or sibling to it — match the file's existing structure):

```typescript
describe('bulkSetAvailableInMCP auto-expose side effect', () => {
	test('enables auto-expose when scope is allWorkflows and availableInMCP is true', async () => {
		findByKey.mockResolvedValue(null); // no prior autoExposeNewWorkflows row
		workflowFinderService.findAllWorkflowIdsForUser.mockResolvedValue([]);

		await service.bulkSetAvailableInMCP(user, { availableInMCP: true, allWorkflows: true });

		expect(upsert).toHaveBeenCalledWith(
			{ key: 'mcp.autoExposeNewWorkflows', value: 'true', loadOnStartup: true },
			['key'],
		);
	});

	test('does not touch auto-expose for a scoped (non-allWorkflows) update', async () => {
		workflowFinderService.findWorkflowIdsWithScopeForUser.mockResolvedValue(new Set(['wf1']));

		await service.bulkSetAvailableInMCP(user, {
			availableInMCP: true,
			workflowIds: ['wf1'],
		});

		expect(upsert).not.toHaveBeenCalledWith(
			expect.objectContaining({ key: 'mcp.autoExposeNewWorkflows' }),
			['key'],
		);
	});

	test('does not enable auto-expose when allWorkflows is used to turn access OFF', async () => {
		workflowFinderService.findAllWorkflowIdsForUser.mockResolvedValue([]);

		await service.bulkSetAvailableInMCP(user, { availableInMCP: false, allWorkflows: true });

		expect(upsert).not.toHaveBeenCalledWith(
			expect.objectContaining({ key: 'mcp.autoExposeNewWorkflows' }),
			['key'],
		);
	});

	test('does not fail the bulk update if enabling auto-expose throws', async () => {
		workflowFinderService.findAllWorkflowIdsForUser.mockResolvedValue([]);
		upsert.mockImplementationOnce(() => {
			throw new Error('db unavailable');
		});

		await expect(
			service.bulkSetAvailableInMCP(user, { availableInMCP: true, allWorkflows: true }),
		).resolves.toBeDefined();
	});
});
```

Adapt the mock setup to whatever `resolveCandidateIds`/`findAllWorkflowIdsForUser` shape the file already establishes for its existing `allWorkflows` tests — read those first rather than guessing the fixture.

- [ ] **Step 2: Run test to verify it fails**

```bash
cd packages/cli && pnpm test src/modules/mcp/__tests__/mcp.settings.service.test.ts
```

Expected: FAIL — `upsert` is never called with the auto-expose key.

- [ ] **Step 3: Write minimal implementation**

In `bulkSetAvailableInMCP`, immediately after the existing scope-count validation (`if (scopeCount !== 1) { throw ... }`) and before `resolveCandidateIds`, add:

```typescript
		if (allWorkflows && availableInMCP) {
			try {
				await this.setAutoExposeNewWorkflows(true);
			} catch (error) {
				this.logger.warn('Failed to enable auto-expose after bulk-exposing all workflows', {
					cause: error instanceof Error ? error.message : String(error),
				});
			}
		}
```

Placed before candidate resolution so it doesn't wait on (or get skipped by) the
bulk write's own chunking loop, and so a candidate-resolution failure later in
the method can't prevent it from having already fired. `this.logger` is
already injected in this service (used elsewhere in the same file) — reuse it,
don't add a new dependency.

- [ ] **Step 4: Run test to verify it passes**

```bash
cd packages/cli && pnpm test src/modules/mcp/__tests__/mcp.settings.service.test.ts
```

Expected: PASS, including every pre-existing `bulkSetAvailableInMCP` test in
the file (this method has substantial existing coverage — chunking, checksums,
scope resolution — none of which this change should touch).

- [ ] **Step 5: Write the failing frontend test**

In `ExposeAllWorkflowsToMcpModal.test.ts`, add a case asserting the telemetry
call — read the file's existing render/store-mock setup first and reuse it:

```typescript
it('tracks auto-expose enabled after a successful expose-all', async () => {
	mcpStore.toggleWorkflowsMcpAccess.mockResolvedValue({ updatedCount: 3, unchangedCount: 0 });
	mcpStore.autoExposeNewWorkflows = true;

	const { getByTestId } = renderComponent();
	await userEvent.click(getByTestId('expose-all-workflows-mcp-confirm-button'));

	expect(telemetry.track).toHaveBeenCalledWith(
		TELEMETRY_EVENT.MCP.AUTO_EXPOSE_NEW_WORKFLOWS_TOGGLED,
		expect.objectContaining({ enabled: true }),
	);
});

it('does not track auto-expose when the backend never turned it on', async () => {
	mcpStore.toggleWorkflowsMcpAccess.mockResolvedValue({ updatedCount: 3, unchangedCount: 0 });
	mcpStore.autoExposeNewWorkflows = false;

	const { getByTestId } = renderComponent();
	await userEvent.click(getByTestId('expose-all-workflows-mcp-confirm-button'));

	expect(telemetry.track).not.toHaveBeenCalledWith(
		TELEMETRY_EVENT.MCP.AUTO_EXPOSE_NEW_WORKFLOWS_TOGGLED,
		expect.anything(),
	);
});
```

`mcpStore.autoExposeNewWorkflows` is a computed backed by
`settingsStore.moduleSettings.mcp` — the test needs to drive it through
whatever the store mock's existing convention is (a mocked computed, or the
underlying `moduleSettings.mcp` object), matching how Task 8's tests already
do this for the same store.

- [ ] **Step 6: Run test to verify it fails**

```bash
cd packages/frontend/editor-ui && pnpm test src/experiments/exposeAllWorkflowsToMcp/components/ExposeAllWorkflowsToMcpModal.test.ts
```

Expected: FAIL — `telemetry` is not imported/called yet.

- [ ] **Step 7: Write minimal implementation**

In `ExposeAllWorkflowsToMcpModal.vue`, add to the script setup:

```typescript
import { useTelemetry } from '@n8n/composables/useTelemetry';
import { TELEMETRY_EVENT } from '@n8n/telemetry';

const telemetry = useTelemetry();
```

In `onExposeAll`, after the `Promise.all([...])` call succeeds and before
`closedByAction.value = true;`, add:

```typescript
		if (mcpStore.autoExposeNewWorkflows) {
			telemetry.track(TELEMETRY_EVENT.MCP.AUTO_EXPOSE_NEW_WORKFLOWS_TOGGLED, {
				enabled: true,
			});
		}
```

Reading the store's own computed (rather than assuming the backend call
succeeded) is deliberate: it reports what is actually true of instance state,
not what this request attempted, so a fire-and-forget backend failure doesn't
produce a telemetry event that doesn't match reality. No experiment-payload
spread here — unlike Task 8's manual toggle, this path already carries
`experimentStore.trackConfirmed()` a few lines below for the "did the modal
convert" question; duplicating the variant payload on the settings event isn't
required by the spec and would need `currentVariant`, which this component
doesn't otherwise use.

- [ ] **Step 8: Run tests to verify they pass**

```bash
cd packages/frontend/editor-ui && pnpm test src/experiments/exposeAllWorkflowsToMcp
```

Expected: PASS, including every pre-existing test in the modal's suite
(confirm, decline, dismiss, agents-included copy, error toast).

- [ ] **Step 9: Full verification**

```bash
cd packages/cli && pnpm test src/modules/mcp && pnpm typecheck
cd packages/frontend/editor-ui && pnpm test src/experiments/exposeAllWorkflowsToMcp src/features/ai/mcpAccess && pnpm typecheck
```

- [ ] **Step 10: Commit**

```bash
git add packages/cli/src/modules/mcp/mcp.settings.service.ts packages/cli/src/modules/mcp/__tests__/mcp.settings.service.test.ts packages/frontend/editor-ui/src/experiments/exposeAllWorkflowsToMcp/components/ExposeAllWorkflowsToMcpModal.vue packages/frontend/editor-ui/src/experiments/exposeAllWorkflowsToMcp/components/ExposeAllWorkflowsToMcpModal.test.ts
git commit -m "feat(core): Auto-enable new-workflow exposure when a user exposes all workflows"
```

---

## Self-Review

**Spec coverage**

| Spec requirement | Task |
|---|---|
| `mcp.autoExposeNewWorkflows` setting, cache + `loadOnStartup` | 1 |
| Extend existing PATCH, both fields optional + refine | 2 |
| Empty-body still rejected | 2 |
| `settings()` exposes the field (no GET) | 3 |
| Seed in `createWorkflow()`, default-only | 4 |
| MCP builder's explicit `true` left alone, commented | 4 |
| Delete `workflows.store.ts` hardcoded `false` | 5 |
| Store computed + action | 6 |
| One telemetry event, resulting state + variant | 7 |
| Row gated on `mcp:manage` + experiment + `managedByEnv` | 8 |
| Exact copy strings via i18n | 8 |
| Reads untouched | all — no read site is modified |
| Unit coverage per spec's test table | 1, 2, 3, 4, 5, 6, 8 |

No spec requirement is unassigned. Out-of-scope items (MCP-7 bulk expose, agents, `search_workflows` filtering, provenance stamping) have no tasks, as intended.

**Type consistency**

- `getAutoExposeNewWorkflows` / `setAutoExposeNewWorkflows` — same names in Tasks 1, 2, 3, 4.
- `autoExposeNewWorkflows` — the same property name in the DTO (2), module settings (3), API type (6), store computed (6), and template (8).
- `updateMcpSettings` object signature defined in Task 6 and used only there.
- `TELEMETRY_EVENT.MCP.AUTO_EXPOSE_NEW_WORKFLOWS_TOGGLED` — defined in 7, consumed in 8.
- `mcp-auto-expose-toggle` — same test id in Task 8's test and template.

**Known risks flagged inline, not left as placeholders**

- Task 2 Step 3 carries a fallback if the controller registry bypasses the static `parse`/`safeParse` override.
- Task 7 Step 3 carries a fallback if the registry rejects spread-in experiment properties.
- Task 8 Step 6 carries the `ElSwitch` payload-narrowing fix.
