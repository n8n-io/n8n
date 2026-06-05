# Instance AI Thread Launcher Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let any part of the app — and external links from the n8n website — start a new Instance AI thread with a prefilled or auto-sent first message, recording where the thread started, and make "start from this template" work end to end.

**Architecture:** A single frontend `useInstanceAiLauncher()` composable is the chokepoint both surfaces use (it forces external launches to prefill-only). Thread origin is persisted in the existing `InstanceAiThread.metadata` JSON column via the existing `POST /instance-ai/threads` endpoint — no migration. A dedicated `/instance-ai/new` route handles external links (survives login, clears its query). A new `get_template` agent tool + backend `WorkflowTemplatesService` lets the agent load a template by id.

**Tech Stack:** TypeScript, Vue 3 + Pinia + Vue Router (editor-ui), Express + TypeORM + `@n8n/di` (cli), Zod (`@n8n/api-types`), `@n8n/agents` Tool builder (instance-ai), Jest (backend), Vitest (frontend).

**Spec:** `docs/superpowers/specs/2026-06-05-instance-ai-thread-launcher-design.md`

**Conventions reminder:** no `any`/`as` (except tests), Zod is the source of truth, tools are thin wrappers (logic in services), all UI text via i18n. Run `pnpm typecheck` + `pnpm lint` in the package before each commit. Commit messages are neutral/functional.

---

## File Structure

**Backend — `packages/@n8n/api-types/`**
- Modify: `src/schemas/instance-ai.schema.ts` — add source/origin constants, normalizer, extend `InstanceAiEnsureThreadRequest`.

**Backend — `packages/cli/`**
- Modify: `src/modules/instance-ai/instance-ai.controller.ts` — forward launch metadata in `ensureThread`.
- Modify: `src/modules/instance-ai/instance-ai-memory.service.ts` — accept launch metadata, set on create.
- Create: `src/modules/instance-ai/workflow-templates.service.ts` — fetch a template by id.
- Create: `src/modules/instance-ai/__tests__/workflow-templates.service.test.ts`
- Modify: `src/modules/instance-ai/instance-ai.adapter.service.ts` — inject the service, expose on context.

**Backend — `packages/@n8n/instance-ai/`**
- Modify: `src/types.ts` — `InstanceAiWorkflowTemplateService` interface + `InstanceAiContext.workflowTemplateService`.
- Create: `src/tools/templates.tool.ts`
- Create: `src/tools/__tests__/templates.tool.test.ts`
- Modify: `src/tools/tool-ids.ts` — add `TEMPLATES` id.
- Modify: `src/tools/index.ts` — register the tool in both factories.

**Frontend — `packages/frontend/editor-ui/`**
- Modify: `src/features/ai/instanceAi/instanceAi.api.ts` — extend `ensureThread`.
- Modify: `src/features/ai/instanceAi/instanceAi.store.ts` — extend `syncThread`, add pending-prefill map.
- Create: `src/features/ai/instanceAi/useInstanceAiLauncher.ts`
- Create: `src/features/ai/instanceAi/__tests__/useInstanceAiLauncher.test.ts`
- Modify: `src/features/ai/instanceAi/components/InstanceAiInput.vue` — expose `setText`.
- Modify: `src/features/ai/instanceAi/InstanceAiThreadView.vue` — consume pending prefill on mount.
- Modify: `src/features/ai/instanceAi/constants.ts` — add `INSTANCE_AI_NEW_VIEW`.
- Modify: `src/features/ai/instanceAi/module.descriptor.ts` — add `/instance-ai/new` route.
- Modify: `src/features/workflows/templates/views/TemplatesWorkflowView.vue` — add "Start with AI" button.
- Modify: `packages/frontend/@n8n/i18n/src/locales/en.json` — new strings.

**E2E — `packages/testing/playwright/`**
- Create: `tests/e2e/instance-ai/thread-launcher.spec.ts`

---

## Task 1: Shared source/origin schema (`@n8n/api-types`)

**Files:**
- Modify: `packages/@n8n/api-types/src/schemas/instance-ai.schema.ts` (DTO near `:679`, exports also flow through `src/index.ts`)
- Test: `packages/@n8n/api-types/src/schemas/__tests__/instance-ai.schema.test.ts` (create if absent)

- [ ] **Step 1: Write the failing test**

Create/append `packages/@n8n/api-types/src/schemas/__tests__/instance-ai.schema.test.ts`:

```typescript
import {
	InstanceAiEnsureThreadRequest,
	normalizeInstanceAiThreadSource,
	INSTANCE_AI_THREAD_SOURCE_FALLBACK,
} from '../instance-ai.schema';

describe('instance-ai launch schema', () => {
	it('normalizes a known source', () => {
		expect(normalizeInstanceAiThreadSource('template-view')).toBe('template-view');
	});

	it('falls back for an unknown source', () => {
		expect(normalizeInstanceAiThreadSource('totally-made-up')).toBe(
			INSTANCE_AI_THREAD_SOURCE_FALLBACK,
		);
		expect(normalizeInstanceAiThreadSource(undefined)).toBe(INSTANCE_AI_THREAD_SOURCE_FALLBACK);
	});

	it('parses an ensure-thread request with launch fields', () => {
		const parsed = new InstanceAiEnsureThreadRequest({
			origin: 'external',
			source: 'external-link',
			sourceContext: { templateId: '42' },
		});
		expect(parsed.origin).toBe('external');
		expect(parsed.sourceContext).toEqual({ templateId: '42' });
	});

	it('rejects an oversized sourceContext', () => {
		const big = { blob: 'x'.repeat(3000) };
		expect(() => new InstanceAiEnsureThreadRequest({ sourceContext: big })).toThrow();
	});
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd packages/@n8n/api-types && pnpm test instance-ai.schema`
Expected: FAIL — `normalizeInstanceAiThreadSource` is not exported.

- [ ] **Step 3: Add constants, normalizer, and extend the DTO**

In `packages/@n8n/api-types/src/schemas/instance-ai.schema.ts`, add near the other launch-related exports (before `InstanceAiEnsureThreadRequest` at `:679`):

```typescript
export const INSTANCE_AI_THREAD_SOURCES = ['external-link', 'template-view'] as const;
export type InstanceAiThreadSource = (typeof INSTANCE_AI_THREAD_SOURCES)[number];

export const INSTANCE_AI_THREAD_SOURCE_FALLBACK = 'unknown';
export type InstanceAiThreadSourcePersisted =
	| InstanceAiThreadSource
	| typeof INSTANCE_AI_THREAD_SOURCE_FALLBACK;

export const INSTANCE_AI_THREAD_ORIGINS = ['internal', 'external'] as const;
export type InstanceAiThreadOrigin = (typeof INSTANCE_AI_THREAD_ORIGINS)[number];

/** Normalize an untrusted source string to a known value, falling back otherwise. */
export function normalizeInstanceAiThreadSource(
	value: string | undefined,
): InstanceAiThreadSourcePersisted {
	return (INSTANCE_AI_THREAD_SOURCES as readonly string[]).includes(value ?? '')
		? (value as InstanceAiThreadSource)
		: INSTANCE_AI_THREAD_SOURCE_FALLBACK;
}

const instanceAiSourceContextSchema = z
	.record(z.string(), z.unknown())
	.refine((value) => JSON.stringify(value).length <= 2048, {
		message: 'sourceContext exceeds the maximum allowed size',
	});
```

Then replace the existing `InstanceAiEnsureThreadRequest` (`:679-681`) with:

```typescript
export class InstanceAiEnsureThreadRequest extends Z.class({
	threadId: z.string().uuid().optional(),
	source: z.string().max(64).optional(),
	origin: z.enum(INSTANCE_AI_THREAD_ORIGINS).optional(),
	sourceContext: instanceAiSourceContextSchema.optional(),
}) {}
```

(`z` is already imported at the top of this file.)

- [ ] **Step 4: Run test to verify it passes**

Run: `cd packages/@n8n/api-types && pnpm test instance-ai.schema`
Expected: PASS (4 tests).

- [ ] **Step 5: Build api-types so downstream packages see the new exports**

Run: `cd packages/@n8n/api-types && pnpm build > build.log 2>&1 && tail -n 5 build.log`
Expected: build succeeds.

- [ ] **Step 6: Commit**

```bash
git add packages/@n8n/api-types/src/schemas/instance-ai.schema.ts packages/@n8n/api-types/src/schemas/__tests__/instance-ai.schema.test.ts
git commit -m "feat(api-types): add Instance AI thread source/origin schema"
```

---

## Task 2: Persist launch metadata on thread creation (cli)

**Files:**
- Modify: `packages/cli/src/modules/instance-ai/instance-ai-memory.service.ts:90-113`
- Modify: `packages/cli/src/modules/instance-ai/instance-ai.controller.ts:517-528`
- Test: `packages/cli/src/modules/instance-ai/__tests__/instance-ai-memory.service.test.ts` (create/append)

- [ ] **Step 1: Write the failing test**

Append to (or create) `packages/cli/src/modules/instance-ai/__tests__/instance-ai-memory.service.test.ts`:

```typescript
import { mock } from 'jest-mock-extended';
import { InstanceAiMemoryService } from '../instance-ai-memory.service';

describe('InstanceAiMemoryService.ensureThread launch metadata', () => {
	const agentMemory = mock<{ getThread: jest.Mock; saveThread: jest.Mock }>();
	const service = new InstanceAiMemoryService(agentMemory as never);

	beforeEach(() => jest.resetAllMocks());

	it('writes source/origin/sourceContext into metadata when creating', async () => {
		agentMemory.getThread.mockResolvedValue(null);
		agentMemory.saveThread.mockImplementation(async (t) => ({
			...t,
			createdAt: new Date(),
			updatedAt: new Date(),
		}));

		await service.ensureThread('user-1', 'thread-1', {
			source: 'template-view',
			origin: 'internal',
			sourceContext: { templateId: '42' },
		});

		expect(agentMemory.saveThread).toHaveBeenCalledWith(
			expect.objectContaining({
				id: 'thread-1',
				resourceId: 'user-1',
				metadata: { source: 'template-view', origin: 'internal', sourceContext: { templateId: '42' } },
			}),
		);
	});

	it('does not pass metadata when the thread already exists', async () => {
		agentMemory.getThread.mockResolvedValue({
			id: 'thread-1',
			resourceId: 'user-1',
			title: '',
			metadata: null,
			createdAt: new Date(),
			updatedAt: new Date(),
		});

		const result = await service.ensureThread('user-1', 'thread-1', {
			source: 'template-view',
			origin: 'internal',
		});

		expect(result.created).toBe(false);
		expect(agentMemory.saveThread).not.toHaveBeenCalled();
	});
});
```

> Note: match the real `InstanceAiMemoryService` constructor when wiring the mock — inspect the actual constructor params and pass mocks positionally. The assertion on `saveThread` is the contract that matters.

- [ ] **Step 2: Run test to verify it fails**

Run: `cd packages/cli && pnpm test instance-ai-memory.service`
Expected: FAIL — `ensureThread` doesn't accept a third argument / metadata not forwarded.

- [ ] **Step 3: Extend the memory service**

In `packages/cli/src/modules/instance-ai/instance-ai-memory.service.ts`, add an import:

```typescript
import type { InstanceAiThreadOrigin, InstanceAiThreadSourcePersisted } from '@n8n/api-types';
```

Add an exported type and extend `ensureThread` (`:90`):

```typescript
export interface InstanceAiThreadLaunchMetadata {
	source: InstanceAiThreadSourcePersisted;
	origin: InstanceAiThreadOrigin;
	sourceContext?: Record<string, unknown>;
}

async ensureThread(
	userId: string,
	threadId: string,
	launchMetadata?: InstanceAiThreadLaunchMetadata,
): Promise<InstanceAiEnsureThreadResponse> {
	const existing = await this.agentMemory.getThread(threadId);
	if (existing) {
		if (existing.resourceId !== userId) {
			throw new Error(`Thread ${threadId} is not owned by user ${userId}`);
		}
		return { thread: this.toThreadInfo(existing), created: false };
	}

	const created = await this.agentMemory.saveThread({
		id: threadId,
		resourceId: userId,
		title: '',
		...(launchMetadata
			? {
					metadata: {
						source: launchMetadata.source,
						origin: launchMetadata.origin,
						...(launchMetadata.sourceContext
							? { sourceContext: launchMetadata.sourceContext }
							: {}),
					},
				}
			: {}),
	});

	return { thread: this.toThreadInfo(created), created: true };
}
```

- [ ] **Step 4: Forward metadata from the controller**

In `packages/cli/src/modules/instance-ai/instance-ai.controller.ts`, add to the existing `@n8n/api-types` import: `normalizeInstanceAiThreadSource`. Replace `ensureThread` (`:517-528`):

```typescript
@Post('/threads')
@GlobalScope('instanceAi:message')
async ensureThread(
	req: AuthenticatedRequest,
	_res: Response,
	@Body payload: InstanceAiEnsureThreadRequest,
) {
	this.requireInstanceAiEnabled();
	const requestedThreadId = payload.threadId ?? randomUUID();
	await this.assertThreadAccess(req.user.id, requestedThreadId, { allowNew: true });

	const launchMetadata =
		payload.source !== undefined || payload.origin !== undefined
			? {
					source: normalizeInstanceAiThreadSource(payload.source),
					origin: payload.origin ?? ('internal' as const),
					sourceContext: payload.sourceContext,
				}
			: undefined;

	return await this.memoryService.ensureThread(req.user.id, requestedThreadId, launchMetadata);
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `cd packages/cli && pnpm test instance-ai-memory.service`
Expected: PASS.

- [ ] **Step 6: Typecheck + commit**

```bash
cd packages/cli && pnpm typecheck
git add packages/cli/src/modules/instance-ai/instance-ai-memory.service.ts packages/cli/src/modules/instance-ai/instance-ai.controller.ts packages/cli/src/modules/instance-ai/__tests__/instance-ai-memory.service.test.ts
git commit -m "feat(cli): persist Instance AI thread source on creation"
```

---

## Task 3: `WorkflowTemplatesService` — fetch a template by id (cli)

**Files:**
- Create: `packages/cli/src/modules/instance-ai/workflow-templates.service.ts`
- Test: `packages/cli/src/modules/instance-ai/__tests__/workflow-templates.service.test.ts`

- [ ] **Step 1: Write the failing test**

Create `packages/cli/src/modules/instance-ai/__tests__/workflow-templates.service.test.ts`:

```typescript
import { mock } from 'jest-mock-extended';
import type { GlobalConfig } from '@n8n/config';
import type { Logger } from '@n8n/backend-common';
import axios from 'axios';
import { WorkflowTemplatesService } from '../workflow-templates.service';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

function makeService(enabled = true, host = 'https://api.n8n.io/api/') {
	const globalConfig = mock<GlobalConfig>();
	(globalConfig as unknown as { templates: { enabled: boolean; host: string } }).templates = {
		enabled,
		host,
	};
	return new WorkflowTemplatesService(mock<Logger>(), globalConfig);
}

describe('WorkflowTemplatesService', () => {
	beforeEach(() => jest.resetAllMocks());

	it('returns the template workflow for an id', async () => {
		mockedAxios.get.mockResolvedValue({ data: { workflow: { id: 7, name: 'Demo' } } });
		const service = makeService();

		const result = await service.getTemplate('7');

		expect(result).toEqual({ available: true, template: { id: 7, name: 'Demo' } });
		expect(mockedAxios.get).toHaveBeenCalledWith(
			'https://api.n8n.io/api/templates/workflows/7',
			expect.objectContaining({ timeout: expect.any(Number) }),
		);
	});

	it('reports unavailable when templates are disabled', async () => {
		const service = makeService(false);
		const result = await service.getTemplate('7');
		expect(result).toEqual({ available: false });
		expect(mockedAxios.get).not.toHaveBeenCalled();
	});
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd packages/cli && pnpm test workflow-templates.service`
Expected: FAIL — module does not exist.

- [ ] **Step 3: Implement the service**

Create `packages/cli/src/modules/instance-ai/workflow-templates.service.ts` (mirrors `DynamicTemplatesService`):

```typescript
import { Logger } from '@n8n/backend-common';
import { GlobalConfig } from '@n8n/config';
import { Service } from '@n8n/di';
import axios from 'axios';

export const TEMPLATE_REQUEST_TIMEOUT_MS = 5000;

export type WorkflowTemplateResult =
	| { available: true; template: Record<string, unknown> }
	| { available: false };

@Service()
export class WorkflowTemplatesService {
	constructor(
		private readonly logger: Logger,
		private readonly globalConfig: GlobalConfig,
	) {}

	async getTemplate(templateId: string): Promise<WorkflowTemplateResult> {
		const { enabled, host } = this.globalConfig.templates;
		if (!enabled || !host) {
			return { available: false };
		}

		const url = `${host.replace(/\/?$/, '/')}templates/workflows/${encodeURIComponent(templateId)}`;
		try {
			const response = await axios.get<{ workflow: Record<string, unknown> }>(url, {
				headers: { 'Content-Type': 'application/json' },
				timeout: TEMPLATE_REQUEST_TIMEOUT_MS,
			});
			return { available: true, template: response.data.workflow };
		} catch (error) {
			this.logger.error('Error fetching workflow template', { error, templateId });
			throw error;
		}
	}
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd packages/cli && pnpm test workflow-templates.service`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
cd packages/cli && pnpm typecheck
git add packages/cli/src/modules/instance-ai/workflow-templates.service.ts packages/cli/src/modules/instance-ai/__tests__/workflow-templates.service.test.ts
git commit -m "feat(cli): add workflow template fetch service"
```

---

## Task 4: Expose `workflowTemplateService` on the agent context (instance-ai types)

**Files:**
- Modify: `packages/@n8n/instance-ai/src/types.ts` (the `InstanceAiContext` interface and sibling service interfaces)

- [ ] **Step 1: Add the interface and context field**

In `packages/@n8n/instance-ai/src/types.ts`, add near the other domain-service interfaces:

```typescript
export interface InstanceAiWorkflowTemplateService {
	getTemplate(
		templateId: string,
	): Promise<
		{ available: true; template: Record<string, unknown> } | { available: false }
	>;
}
```

Then add to the `InstanceAiContext` interface (alongside `workflowService`, `executionService`, etc.):

```typescript
	workflowTemplateService: InstanceAiWorkflowTemplateService;
```

- [ ] **Step 2: Typecheck (expect adapter errors next task)**

Run: `cd packages/@n8n/instance-ai && pnpm typecheck`
Expected: PASS for this package (the cli adapter, in a different package, is updated in Task 5). If instance-ai has a test double for `InstanceAiContext`, update it to include `workflowTemplateService` (search for `createMockContext`/`mockContext` in `src/**/__tests__` and add a stub `{ getTemplate: async () => ({ available: false }) }`).

- [ ] **Step 3: Build + commit**

```bash
cd packages/@n8n/instance-ai && pnpm build > build.log 2>&1 && tail -n 5 build.log
git add packages/@n8n/instance-ai/src/types.ts
git commit -m "feat(instance-ai): add workflow template service to agent context"
```

---

## Task 5: Wire the service into the adapter (cli)

**Files:**
- Modify: `packages/cli/src/modules/instance-ai/instance-ai.adapter.service.ts` (constructor `:182`, `createContext` `:243-267`)

- [ ] **Step 1: Inject the service**

Add an import at the top of `instance-ai.adapter.service.ts`:

```typescript
import { WorkflowTemplatesService } from './workflow-templates.service';
```

Add it as a constructor parameter (append to the existing positional list, before the closing paren):

```typescript
		private readonly workflowTemplatesService: WorkflowTemplatesService,
```

- [ ] **Step 2: Expose it on the context**

In `createContext` (`:243-267`), add to the returned object:

```typescript
		workflowTemplateService: this.createWorkflowTemplateAdapter(),
```

Add the adapter factory method to the class (mirrors other `createXAdapter` methods — thin pass-through):

```typescript
	private createWorkflowTemplateAdapter(): InstanceAiWorkflowTemplateService {
		const workflowTemplatesService = this.workflowTemplatesService;
		return {
			async getTemplate(templateId: string) {
				return await workflowTemplatesService.getTemplate(templateId);
			},
		};
	}
```

Import the type:

```typescript
import type { InstanceAiWorkflowTemplateService } from '@n8n/instance-ai';
```

(Confirm the correct import path for instance-ai types used elsewhere in this file — match the existing `InstanceAiContext` import.)

- [ ] **Step 3: Typecheck**

Run: `cd packages/cli && pnpm typecheck`
Expected: PASS. If DI complains about an unregistered provider, `WorkflowTemplatesService` is `@Service()`-decorated so it auto-registers; no manual wiring needed.

- [ ] **Step 4: Commit**

```bash
git add packages/cli/src/modules/instance-ai/instance-ai.adapter.service.ts
git commit -m "feat(cli): expose workflow template service on Instance AI context"
```

---

## Task 6: `get_template` agent tool (instance-ai)

**Files:**
- Create: `packages/@n8n/instance-ai/src/tools/templates.tool.ts`
- Test: `packages/@n8n/instance-ai/src/tools/__tests__/templates.tool.test.ts`
- Modify: `packages/@n8n/instance-ai/src/tools/tool-ids.ts`
- Modify: `packages/@n8n/instance-ai/src/tools/index.ts`

- [ ] **Step 1: Write the failing test**

Create `packages/@n8n/instance-ai/src/tools/__tests__/templates.tool.test.ts`:

```typescript
import type { InstanceAiContext } from '../../types';
import { createTemplatesTool } from '../templates.tool';

function makeContext(over: Partial<InstanceAiContext> = {}): InstanceAiContext {
	return {
		workflowTemplateService: {
			getTemplate: async (id: string) => ({ available: true, template: { id } }),
		},
		...over,
	} as unknown as InstanceAiContext;
}

describe('templates tool', () => {
	it('returns the template for an id', async () => {
		const tool = createTemplatesTool(makeContext());
		const result = await tool.handler({ templateId: '7' }, {} as never);
		expect(result).toEqual({ available: true, template: { id: '7' } });
	});

	it('surfaces unavailable templates', async () => {
		const tool = createTemplatesTool(
			makeContext({
				workflowTemplateService: { getTemplate: async () => ({ available: false }) },
			}),
		);
		const result = await tool.handler({ templateId: '7' }, {} as never);
		expect(result).toEqual({ available: false });
	});
});
```

> If `BuiltTool` doesn't expose `.handler` directly for invocation in tests, mirror how an existing tool test (e.g. `__tests__/executions.tool.test.ts` if present) invokes the built tool, and adjust the call sites above accordingly.

- [ ] **Step 2: Run test to verify it fails**

Run: `cd packages/@n8n/instance-ai && pnpm test templates.tool`
Expected: FAIL — module does not exist.

- [ ] **Step 3: Implement the tool (thin wrapper)**

Create `packages/@n8n/instance-ai/src/tools/templates.tool.ts`:

```typescript
import { Tool } from '@n8n/agents';
import { z } from 'zod';
import { sanitizeInputSchema } from '../agent/sanitize-mcp-schemas';
import type { InstanceAiContext } from '../types';

const inputSchema = sanitizeInputSchema(
	z.object({
		templateId: z.string().describe('The numeric id of the workflow template to load'),
	}),
);
type Input = z.infer<typeof inputSchema>;

export function createTemplatesTool(context: InstanceAiContext) {
	return new Tool('templates')
		.description(
			'Load an n8n workflow template by its id. Returns the template workflow ' +
				'(nodes and connections) to use as a starting point for building.',
		)
		.input(inputSchema)
		.handler(async (input: Input) => {
			return await context.workflowTemplateService.getTemplate(input.templateId);
		})
		.build();
}
```

(Confirm the `Tool` builder API against `executions.tool.ts` — `.description().input().handler().build()` matches the simple-tool shape described there.)

- [ ] **Step 4: Register the tool id**

In `packages/@n8n/instance-ai/src/tools/tool-ids.ts`, add to `DOMAIN_TOOL_IDS`:

```typescript
	TEMPLATES: 'templates',
```

and add to the `ALWAYS_LOADED_TOOL_NAMES` set:

```typescript
	DOMAIN_TOOL_IDS.TEMPLATES,
```

- [ ] **Step 5: Register the tool in both factories**

In `packages/@n8n/instance-ai/src/tools/index.ts`, add a loader near the other `lazyMod` loaders:

```typescript
const loadTemplatesTool = lazyMod(
	() => require('./templates.tool') as typeof import('./templates.tool'),
);
```

Add this entry to the `tools` array in **both** `createAllTools` (`:88`) and `createOrchestratorDomainTools` (`:114`):

```typescript
		[DOMAIN_TOOL_IDS.TEMPLATES, loadTemplatesTool().createTemplatesTool(context)],
```

- [ ] **Step 6: Run test to verify it passes**

Run: `cd packages/@n8n/instance-ai && pnpm test templates.tool`
Expected: PASS (2 tests).

- [ ] **Step 7: Typecheck + commit**

```bash
cd packages/@n8n/instance-ai && pnpm typecheck
git add packages/@n8n/instance-ai/src/tools/templates.tool.ts packages/@n8n/instance-ai/src/tools/__tests__/templates.tool.test.ts packages/@n8n/instance-ai/src/tools/tool-ids.ts packages/@n8n/instance-ai/src/tools/index.ts
git commit -m "feat(instance-ai): add get template tool"
```

---

## Task 7: Frontend API + store plumbing

**Files:**
- Modify: `packages/frontend/editor-ui/src/features/ai/instanceAi/instanceAi.api.ts:35-47`
- Modify: `packages/frontend/editor-ui/src/features/ai/instanceAi/instanceAi.store.ts` (`syncThread` `:167`, store body `:20`, return `:239`)
- Test: `packages/frontend/editor-ui/src/features/ai/instanceAi/__tests__/instanceAi.store.test.ts` (create/append)

- [ ] **Step 1: Write the failing test (pending prefill map)**

Append to `instanceAi.store.test.ts` (create with the standard Pinia setup if absent — `setActivePinia(createPinia())` in `beforeEach`):

```typescript
import { setActivePinia, createPinia } from 'pinia';
import { useInstanceAiStore } from '../instanceAi.store';

describe('instanceAi store pending prefill', () => {
	beforeEach(() => setActivePinia(createPinia()));

	it('stores and consumes a pending prefill exactly once', () => {
		const store = useInstanceAiStore();
		store.setPendingPrefill('thread-1', 'hello world');
		expect(store.consumePendingPrefill('thread-1')).toBe('hello world');
		expect(store.consumePendingPrefill('thread-1')).toBeUndefined();
	});
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd packages/frontend/editor-ui && pnpm test instanceAi.store`
Expected: FAIL — `setPendingPrefill` is not a function.

- [ ] **Step 3: Extend the frontend API client**

In `instanceAi.api.ts`, add the type import and extend `ensureThread`:

```typescript
import type {
	InstanceAiEnsureThreadResponse,
	InstanceAiThreadOrigin,
} from '@n8n/api-types';

export interface InstanceAiThreadLaunchInput {
	source?: string;
	origin?: InstanceAiThreadOrigin;
	sourceContext?: Record<string, unknown>;
}

export async function ensureThread(
	context: IRestApiContext,
	threadId?: string,
	launch?: InstanceAiThreadLaunchInput,
): Promise<InstanceAiEnsureThreadResponse> {
	return await makeRestApiRequest<InstanceAiEnsureThreadResponse>(
		context,
		'POST',
		'/instance-ai/threads',
		{
			...(threadId ? { threadId } : {}),
			...(launch ?? {}),
		},
	);
}
```

- [ ] **Step 4: Extend the store**

In `instanceAi.store.ts`:

Add the pending-prefill map inside the store factory (near other `const`/`ref` declarations):

```typescript
const pendingPrefills = new Map<string, string>();

function setPendingPrefill(threadId: string, text: string): void {
	pendingPrefills.set(threadId, text);
}

function consumePendingPrefill(threadId: string): string | undefined {
	const text = pendingPrefills.get(threadId);
	pendingPrefills.delete(threadId);
	return text;
}
```

Extend `syncThread` (`:167`) to forward launch input:

```typescript
async function syncThread(
	threadId: string,
	launch?: InstanceAiThreadLaunchInput,
): Promise<void> {
	if (persistedThreadIds.has(threadId)) return;

	const result = await ensureThread(rootStore.restApiContext, threadId, launch);
	persistedThreadIds.add(result.thread.id);

	const existingThread = threads.value.find((thread) => thread.id === threadId);
	if (existingThread) {
		existingThread.createdAt = result.thread.createdAt;
		existingThread.updatedAt = result.thread.updatedAt;
		existingThread.title = result.thread.title || existingThread.title;
		return;
	}

	threads.value.unshift({
		id: result.thread.id,
		title: result.thread.title || NEW_CONVERSATION_TITLE,
		createdAt: result.thread.createdAt,
		updatedAt: result.thread.updatedAt,
	});
}
```

Add the import for `InstanceAiThreadLaunchInput` from `./instanceAi.api` (extend the existing import on line 6). Add `setPendingPrefill` and `consumePendingPrefill` to the store's returned object (`:239`).

- [ ] **Step 5: Run test to verify it passes**

Run: `cd packages/frontend/editor-ui && pnpm test instanceAi.store`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add packages/frontend/editor-ui/src/features/ai/instanceAi/instanceAi.api.ts packages/frontend/editor-ui/src/features/ai/instanceAi/instanceAi.store.ts packages/frontend/editor-ui/src/features/ai/instanceAi/__tests__/instanceAi.store.test.ts
git commit -m "feat(editor): thread launch metadata through Instance AI store"
```

---

## Task 8: `useInstanceAiLauncher` composable

**Files:**
- Create: `packages/frontend/editor-ui/src/features/ai/instanceAi/useInstanceAiLauncher.ts`
- Test: `packages/frontend/editor-ui/src/features/ai/instanceAi/__tests__/useInstanceAiLauncher.test.ts`

- [ ] **Step 1: Write the failing test**

Create `__tests__/useInstanceAiLauncher.test.ts`:

```typescript
import { setActivePinia, createPinia } from 'pinia';

const syncThread = vi.fn().mockResolvedValue(undefined);
const sendMessage = vi.fn().mockResolvedValue(undefined);
const setPendingPrefill = vi.fn();
const getOrCreateRuntime = vi.fn(() => ({ sendMessage }));
const track = vi.fn();
const push = vi.fn().mockResolvedValue(undefined);

vi.mock('../instanceAi.store', () => ({
	useInstanceAiStore: () => ({ syncThread, getOrCreateRuntime, setPendingPrefill }),
}));
vi.mock('@n8n/stores/useRootStore', () => ({
	useRootStore: () => ({ pushRef: 'push-ref', instanceId: 'instance-1' }),
}));
vi.mock('@/app/composables/useTelemetry', () => ({ useTelemetry: () => ({ track }) }));
vi.mock('vue-router', () => ({ useRouter: () => ({ push }) }));

import { useInstanceAiLauncher } from '../useInstanceAiLauncher';

describe('useInstanceAiLauncher', () => {
	beforeEach(() => {
		setActivePinia(createPinia());
		vi.clearAllMocks();
	});

	it('auto-sends for internal launches', async () => {
		const { launch } = useInstanceAiLauncher();
		await launch({ message: 'hi', source: 'template-view', origin: 'internal', autoSend: true });

		expect(syncThread).toHaveBeenCalledWith(
			expect.any(String),
			expect.objectContaining({ source: 'template-view', origin: 'internal' }),
		);
		expect(sendMessage).toHaveBeenCalledWith('hi', undefined, 'push-ref');
		expect(setPendingPrefill).not.toHaveBeenCalled();
		expect(track).toHaveBeenCalledWith(
			'User launched Instance AI thread',
			expect.objectContaining({ source: 'template-view', origin: 'internal', auto_send: true }),
		);
	});

	it('never auto-sends for external launches, even when asked', async () => {
		const { launch } = useInstanceAiLauncher();
		await launch({ message: 'hi', source: 'external-link', origin: 'external', autoSend: true });

		expect(sendMessage).not.toHaveBeenCalled();
		expect(setPendingPrefill).toHaveBeenCalledWith(expect.any(String), 'hi');
		expect(track).toHaveBeenCalledWith(
			'User launched Instance AI thread',
			expect.objectContaining({ origin: 'external', auto_send: false }),
		);
	});
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd packages/frontend/editor-ui && pnpm test useInstanceAiLauncher`
Expected: FAIL — module does not exist.

- [ ] **Step 3: Implement the composable**

Create `useInstanceAiLauncher.ts`:

```typescript
import { v4 as uuidv4 } from 'uuid';
import { useRouter } from 'vue-router';
import { useRootStore } from '@n8n/stores/useRootStore';
import type { InstanceAiThreadOrigin, InstanceAiThreadSource } from '@n8n/api-types';
import { useTelemetry } from '@/app/composables/useTelemetry';
import { useInstanceAiStore } from './instanceAi.store';
import { INSTANCE_AI_THREAD_VIEW } from './constants';

export interface InstanceAiLaunchOptions {
	message: string;
	source: InstanceAiThreadSource;
	origin: InstanceAiThreadOrigin;
	sourceContext?: Record<string, unknown>;
	autoSend?: boolean;
}

export function useInstanceAiLauncher() {
	const store = useInstanceAiStore();
	const rootStore = useRootStore();
	const router = useRouter();
	const telemetry = useTelemetry();

	async function launch(options: InstanceAiLaunchOptions): Promise<string> {
		const threadId = uuidv4();
		// External input is untrusted — it can never auto-send. This is the chokepoint.
		const autoSend = options.origin === 'external' ? false : (options.autoSend ?? false);

		await store.syncThread(threadId, {
			source: options.source,
			origin: options.origin,
			sourceContext: options.sourceContext,
		});

		telemetry.track('User launched Instance AI thread', {
			thread_id: threadId,
			instance_id: rootStore.instanceId,
			source: options.source,
			origin: options.origin,
			auto_send: autoSend,
		});

		if (autoSend) {
			const runtime = store.getOrCreateRuntime(threadId);
			void runtime.sendMessage(options.message, undefined, rootStore.pushRef);
		} else {
			store.setPendingPrefill(threadId, options.message);
		}

		await router.push({ name: INSTANCE_AI_THREAD_VIEW, params: { threadId } });
		return threadId;
	}

	return { launch };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd packages/frontend/editor-ui && pnpm test useInstanceAiLauncher`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add packages/frontend/editor-ui/src/features/ai/instanceAi/useInstanceAiLauncher.ts packages/frontend/editor-ui/src/features/ai/instanceAi/__tests__/useInstanceAiLauncher.test.ts
git commit -m "feat(editor): add Instance AI launcher composable"
```

---

## Task 9: Consume prefill in the thread view input

**Files:**
- Modify: `packages/frontend/editor-ui/src/features/ai/instanceAi/components/InstanceAiInput.vue` (`focus()` + `defineExpose`)
- Modify: `packages/frontend/editor-ui/src/features/ai/instanceAi/InstanceAiThreadView.vue` (`onMounted`, `chatInputRef` `:416`)

- [ ] **Step 1: Expose `setText` on the input component**

In `InstanceAiInput.vue`, near the existing `focus()` function, add:

```typescript
function setText(text: string) {
	inputText.value = text;
	focus();
}
```

Find the existing `defineExpose({ ... })` (it already exposes `focus`) and add `setText`:

```typescript
defineExpose({ focus, setText });
```

(If there is no `defineExpose` yet, add `defineExpose({ focus, setText });`. Confirm `focus` is already exposed since the thread view calls it.)

- [ ] **Step 2: Consume the pending prefill on mount**

In `InstanceAiThreadView.vue`, the component already imports `onMounted`, `nextTick`, and has `chatInputRef` (`:416`) and `store`. Add (or extend the existing `onMounted`):

```typescript
onMounted(async () => {
	const prefill = store.consumePendingPrefill(props.threadId);
	if (prefill) {
		await nextTick();
		chatInputRef.value?.setText(prefill);
	}
});
```

- [ ] **Step 3: Typecheck**

Run: `cd packages/frontend/editor-ui && pnpm typecheck`
Expected: PASS. (`chatInputRef`'s type is `InstanceType<typeof InstanceAiInput>`, so `setText` is visible once exposed.)

- [ ] **Step 4: Commit**

```bash
git add packages/frontend/editor-ui/src/features/ai/instanceAi/components/InstanceAiInput.vue packages/frontend/editor-ui/src/features/ai/instanceAi/InstanceAiThreadView.vue
git commit -m "feat(editor): prefill Instance AI input from launcher"
```

---

## Task 10: External `/instance-ai/new` route

**Files:**
- Modify: `packages/frontend/editor-ui/src/features/ai/instanceAi/constants.ts:1-3`
- Modify: `packages/frontend/editor-ui/src/features/ai/instanceAi/module.descriptor.ts:24-63`

- [ ] **Step 1: Add the view-name constant**

In `constants.ts`, add:

```typescript
export const INSTANCE_AI_NEW_VIEW = 'InstanceAiNew';
```

- [ ] **Step 2: Add the route with a `beforeEnter` handler**

In `module.descriptor.ts`, import what's needed at the top:

```typescript
import { v4 as uuidv4 } from 'uuid';
import { useRootStore } from '@n8n/stores/useRootStore';
import { telemetry } from '@/app/plugins/telemetry';
import { VIEWS } from '@/app/constants';
import { useInstanceAiStore } from './instanceAi.store';
import { useInstanceAiSettingsStore } from './instanceAiSettings.store';
import { INSTANCE_AI_NEW_VIEW } from './constants'; // add to existing constants import
```

Add this route as the **first child** of the `/instance-ai` parent (before the `:threadId` child so `new` isn't captured as a threadId), or as a top-level authenticated route. As a child:

```typescript
{
	name: INSTANCE_AI_NEW_VIEW,
	path: 'new',
	// This route never renders — it provisions a thread from query params and
	// redirects into the thread view, leaving a clean URL behind.
	component: InstanceAiEmptyView,
	beforeEnter: async (to) => {
		const settings = useInstanceAiSettingsStore();
		if (settings.isInstanceAiDisabled) {
			return { name: VIEWS.HOMEPAGE };
		}

		const prompt = typeof to.query.prompt === 'string' ? to.query.prompt : '';
		const sourceParam = typeof to.query.source === 'string' ? to.query.source : undefined;
		let sourceContext: Record<string, unknown> | undefined;
		if (typeof to.query.sourceContext === 'string') {
			try {
				sourceContext = JSON.parse(to.query.sourceContext) as Record<string, unknown>;
			} catch {
				sourceContext = undefined;
			}
		}

		const store = useInstanceAiStore();
		const rootStore = useRootStore();
		const threadId = uuidv4();

		try {
			await store.syncThread(threadId, {
				source: sourceParam ?? 'external-link',
				origin: 'external',
				sourceContext,
			});
		} catch {
			return { name: INSTANCE_AI_VIEW };
		}

		// External input is untrusted: always prefill, never auto-send.
		if (prompt) store.setPendingPrefill(threadId, prompt);

		telemetry.track('User launched Instance AI thread', {
			thread_id: threadId,
			instance_id: rootStore.instanceId,
			source: sourceParam ?? 'external-link',
			origin: 'external',
			auto_send: false,
		});

		// Redirect with no query → URL is cleared, back-button won't re-fire this.
		return { name: INSTANCE_AI_THREAD_VIEW, params: { threadId } };
	},
}
```

Notes:
- The parent `/instance-ai` route already has `meta.middleware: ['authenticated', 'custom']`, so unauthenticated hits round-trip through login with `?prompt=…&source=…` preserved (the `authenticated` middleware captures `pathname + search`). The child inherits this.
- `VIEWS.HOMEPAGE` is the home route name in `@/app/constants` — confirm the exact member (it's the default landing route); if the editor's home constant differs, use that.
- `INSTANCE_AI_VIEW` and `INSTANCE_AI_THREAD_VIEW` are already imported in this descriptor.

- [ ] **Step 3: Typecheck**

Run: `cd packages/frontend/editor-ui && pnpm typecheck`
Expected: PASS.

- [ ] **Step 4: Manual smoke (optional but recommended)**

Run the app (`pnpm dev` per AGENTS.md), visit `/instance-ai/new?prompt=Build%20me%20a%20Slack%20notifier&source=external-link`. Expected: lands on `/instance-ai/<uuid>` with the input prefilled and **not** sent; URL has no query.

- [ ] **Step 5: Commit**

```bash
git add packages/frontend/editor-ui/src/features/ai/instanceAi/constants.ts packages/frontend/editor-ui/src/features/ai/instanceAi/module.descriptor.ts
git commit -m "feat(editor): add external entry route for Instance AI"
```

---

## Task 11: "Start with AI" button on the template view

**Files:**
- Modify: `packages/frontend/editor-ui/src/features/workflows/templates/views/TemplatesWorkflowView.vue` (button slot `:159-168`, script `:24-52`)
- Modify: `packages/frontend/@n8n/i18n/src/locales/en.json`

- [ ] **Step 1: Add i18n strings**

In `packages/frontend/@n8n/i18n/src/locales/en.json`, add (near `template.buttons.tryTemplate` at `:3669`):

```json
"template.buttons.startWithAi": "Start with AI",
"template.startWithAi.message": "Help me build a workflow starting from the '{name}' template (template id: {id}).",
```

- [ ] **Step 2: Wire the button + handler**

In `TemplatesWorkflowView.vue` script, add imports + setup:

```typescript
import { useInstanceAiLauncher } from '@/features/ai/instanceAi/useInstanceAiLauncher';
import { useInstanceAiSettingsStore } from '@/features/ai/instanceAi/instanceAiSettings.store';

const launcher = useInstanceAiLauncher();
const instanceAiSettings = useInstanceAiSettingsStore();

async function startWithAi() {
	if (!template.value) return;
	await launcher.launch({
		message: i18n.baseText('template.startWithAi.message', {
			interpolate: { name: template.value.name, id: templateId.value },
		}),
		source: 'template-view',
		origin: 'internal',
		autoSend: true,
		sourceContext: { templateId: templateId.value, templateName: template.value.name },
	});
}
```

In the template, add the button inside the `#belowContent` slot next to the existing "Try Template" button (`:161-166`):

```vue
<N8nButton
	v-if="!instanceAiSettings.isInstanceAiDisabled"
	data-test-id="start-with-ai-button"
	:label="i18n.baseText('template.buttons.startWithAi')"
	type="secondary"
	size="large"
	@click.stop="startWithAi"
/>
```

(`N8nButton`, `i18n`, `template`, `templateId` are already in scope in this component.)

- [ ] **Step 3: Typecheck + lint**

Run: `cd packages/frontend/editor-ui && pnpm typecheck && pnpm lint`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add packages/frontend/editor-ui/src/features/workflows/templates/views/TemplatesWorkflowView.vue packages/frontend/@n8n/i18n/src/locales/en.json
git commit -m "feat(editor): add start with AI action to template view"
```

---

## Task 12: E2E coverage

**Files:**
- Create: `packages/testing/playwright/tests/e2e/instance-ai/thread-launcher.spec.ts`

- [ ] **Step 1: Write the E2E test**

Create `thread-launcher.spec.ts`. Follow the existing instance-ai E2E patterns (see `packages/testing/playwright/tests/e2e/instance-ai/` and `AGENTS.md`). Cover:

```typescript
import { test, expect } from '../../fixtures/base';

// External entry: prefill-only, URL cleared, message NOT auto-sent.
test('external link prefills Instance AI without sending', async ({ n8n, page }) => {
	await n8n.start.fromHome();
	await page.goto(
		'/instance-ai/new?prompt=Build%20me%20a%20Slack%20notifier&source=external-link',
	);

	// Landed on a thread view with a clean URL (no query).
	await expect(page).toHaveURL(/\/instance-ai\/[0-9a-f-]+$/);
	// Input is prefilled, agent has NOT started a run.
	await expect(page.getByTestId('instance-ai-input')).toHaveValue(/Build me a Slack notifier/);
	// No assistant message yet (nothing was sent).
});

// Template view: button auto-sends and the agent loads the template via the tool.
test('start with AI from a template launches and builds', async ({ n8n, page }) => {
	// Navigate to a known template detail view, click "Start with AI",
	// assert navigation to /instance-ai/:threadId and that a run starts
	// (an assistant message / status bar appears). Recording mode required
	// for the agent run — see instance-ai CLAUDE.md.
});
```

> Use real page-object selectors. Confirm the input's `data-testid` (search `InstanceAiInput.vue` / `ChatInputBase` for the testid; adjust `getByTestId('instance-ai-input')` to the real value). The template-view test that triggers a real agent run needs recorded expectations per `packages/@n8n/instance-ai/CLAUDE.md`; if recording is out of scope for this pass, keep only the external-prefill test (which needs no LLM) and mark the build test as `test.skip` with a comment.

- [ ] **Step 2: Run janitor on the new spec**

Run: `cd packages/testing/playwright && pnpm janitor --file=tests/e2e/instance-ai/thread-launcher.spec.ts --verbose`
Expected: no new violations.

- [ ] **Step 3: Run the local-build test (external prefill only — no LLM)**

Run: `cd packages/testing/playwright && pnpm test:local tests/e2e/instance-ai/thread-launcher.spec.ts --grep "prefills" --reporter=list 2>&1 | tail -30`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add packages/testing/playwright/tests/e2e/instance-ai/thread-launcher.spec.ts
git commit -m "test(e2e): cover Instance AI external launch and template start"
```

---

## Task 13: Full-repo verification

- [ ] **Step 1: Typecheck affected packages**

```bash
cd packages/@n8n/api-types && pnpm typecheck
cd ../../cli && pnpm typecheck
cd ../@n8n/instance-ai && pnpm typecheck
cd ../../frontend/editor-ui && pnpm typecheck
```
Expected: all PASS.

- [ ] **Step 2: Lint changed packages**

```bash
cd packages/cli && pnpm lint
cd ../@n8n/instance-ai && pnpm lint
cd ../../frontend/editor-ui && pnpm lint
```
Expected: all PASS (fix any issues, re-run).

- [ ] **Step 3: Run the affected unit suites once more**

```bash
cd packages/@n8n/api-types && pnpm test instance-ai.schema
cd ../../cli && pnpm test instance-ai-memory.service workflow-templates.service
cd ../@n8n/instance-ai && pnpm test templates.tool
cd ../../frontend/editor-ui && pnpm test instanceAi.store useInstanceAiLauncher
```
Expected: all PASS.

- [ ] **Step 4: Final review against the spec**

Re-read `docs/superpowers/specs/2026-06-05-instance-ai-thread-launcher-design.md` and confirm each section maps to a shipped task (see Self-Review coverage below). Open a draft PR per `n8n:create-pr` conventions, referencing the Linear ticket.

---

## Self-Review

**Spec coverage:**
- Backend source persistence (§1) → Tasks 1, 2.
- Launcher chokepoint, external-never-auto-send (§2) → Task 8.
- External `/instance-ai/new` route, survives login, clears URL, fallback (§3) → Task 10.
- Telemetry `'User launched Instance AI thread'` (§4) → Tasks 8 (internal) + 10 (external).
- Template tool + adapter + service (§5) → Tasks 3, 4, 5, 6.
- Template-view trigger (§5) → Task 11.
- Gating (§6) → Task 10 (route), Task 11 (button), Task 3 (`enabled` in service).
- Prefill surfacing into the full-page thread view → Tasks 7 (store), 9 (input/view).
- Testing (§Testing) → unit tests in each task + Task 12 E2E.

**Open verification points for the implementer** (flagged inline, not placeholders): the exact `Tool` builder API and tool-test invocation (mirror `executions.tool.ts`), `VIEWS.HOMEPAGE` member name, and the input `data-testid` for the E2E selector. Each has a stated fallback.

**Type consistency:** `InstanceAiThreadSource` / `InstanceAiThreadOrigin` / `normalizeInstanceAiThreadSource` (Task 1) are reused verbatim in Tasks 2, 7, 8. `InstanceAiThreadLaunchInput` (Task 7 api) is the single FE launch shape used by the store + composable + route. `workflowTemplateService.getTemplate` signature matches across Tasks 4, 5, 6. `setPendingPrefill`/`consumePendingPrefill` match across Tasks 7, 8, 9, 10.
