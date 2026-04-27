# v0 Integration PoC — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A working end-to-end PoC that lets a user generate and iteratively refine a custom frontend for an n8n workflow's webhook triggers via Vercel's v0 Platform API, backed by a short report on integration surface, lock-in, CORS, auth, pricing, and iteration UX.

**Architecture:** A new `frontend-builder` backend module exposes two REST endpoints (`GET`/`POST /rest/workflows/:workflowId/frontend[...]`). The backend wraps `v0-sdk` behind an `IV0Client` interface so tests inject a fake. State is minimal: only `{ chatId }` stored in `workflow.staticData.global.v0Chat`; v0 is authoritative for messages and `demoUrl`. A canvas-level "Frontend" button opens a side drawer that is a chat UI plus an iframe preview. The FE sends request/response examples from the editor's loaded run data; it does not touch the executions DB.

**Tech Stack:** TypeScript, n8n's `@BackendModule` + `@n8n/di` + `@RestController` decorators, Vue 3 + Pinia composables in `editor-ui`, Vitest/Jest unit + integration tests, Playwright for one smoke test, `v0-sdk` npm package.

**Slicing:** Eight vertical slices. Each ends with a commit; each produces working software demoable end-to-end (fake v0 responses in earlier slices, real v0 from Slice 2 onward). Refactors inside a slice are fine; the slices themselves don't share deferred work.

**Design reference:** `docs/superpowers/specs/2026-04-22-v0-integration-poc-design.md`

---

## Preflight (one-time setup before Slice 1)

- [ ] **Step 1: Confirm working tree + branch**

Run:
```bash
git status
git rev-parse --abbrev-ref HEAD
```
Expected: clean tree on branch `fe-builder`. If dirty, stash or commit first.

- [ ] **Step 2: Install a fresh dependency snapshot**

Run:
```bash
pnpm install
```

- [ ] **Step 3: Confirm baseline build passes**

Run:
```bash
pnpm --filter=n8n build > build.log 2>&1
tail -n 20 build.log
```
Expected: no errors in the tail. If errors appear, fix before proceeding (do not start the spike on a broken baseline).

---

## Slice 1: Walking skeleton — fake v0, button, drawer, iframe

**Goal:** Click "Frontend" on an activated workflow with a Webhook Trigger → drawer opens → type a prompt → iframe shows a fake `demoUrl`. Fully fake backend. Proves plumbing end-to-end.

**Files:**
- Create: `packages/@n8n/api-types/src/dto/frontend-builder/index.ts`
- Create: `packages/@n8n/api-types/src/dto/frontend-builder/frontend-builder-message.dto.ts`
- Modify: `packages/@n8n/api-types/src/dto/index.ts` (export new dto)
- Create: `packages/cli/src/modules/frontend-builder/frontend-builder.module.ts`
- Create: `packages/cli/src/modules/frontend-builder/frontend-builder.controller.ts`
- Create: `packages/cli/src/modules/frontend-builder/frontend-builder.service.ts`
- Create: `packages/cli/src/modules/frontend-builder/v0-client.interface.ts`
- Create: `packages/cli/src/modules/frontend-builder/v0-client.fake.ts`
- Create: `packages/cli/src/modules/frontend-builder/v0-client.ts` (stub; filled in Slice 2)
- Create: `packages/cli/src/modules/frontend-builder/index.ts`
- Create: `packages/cli/test/integration/frontend-builder.controller.test.ts`
- Modify: `packages/@n8n/backend-common/src/modules/modules.config.ts` (add `'frontend-builder'` to `MODULE_NAMES`)
- Modify: `packages/cli/test/integration/shared/types.ts` and `test-server.ts` (`'frontend-builder'` endpointGroup loader)
- Create: `packages/frontend/editor-ui/src/features/frontend-builder/api/frontend-builder.api.ts`
- Create: `packages/frontend/editor-ui/src/features/frontend-builder/composables/useFrontendBuilder.ts`
- Create: `packages/frontend/editor-ui/src/features/frontend-builder/components/FrontendBuilderDrawer.vue`
- Create: `packages/frontend/editor-ui/src/features/frontend-builder/components/FrontendBuilderIframe.vue`
- Create: `packages/frontend/editor-ui/src/features/frontend-builder/components/FrontendBuilderPromptInput.vue`
- Create: `packages/frontend/editor-ui/src/features/frontend-builder/components/FrontendBuilderMessageList.vue`
- Create: `packages/frontend/editor-ui/src/features/workflows/canvas/components/elements/buttons/CanvasCreateFrontendButton.vue`
- Modify: `packages/frontend/editor-ui/src/app/views/NodeView.vue` (mount button + drawer)

- [ ] **Step 1: Write the request/response DTOs**

Create `packages/@n8n/api-types/src/dto/frontend-builder/frontend-builder-message.dto.ts`:
```ts
import { z } from 'zod';

import { Z } from '../../zod-class';

const httpMethodSchema = z.enum(['GET', 'POST', 'PUT', 'PATCH', 'DELETE']);

const endpointSchema = z.object({
	nodeName: z.string().min(1),
	method: httpMethodSchema,
	url: z.string().url(),
	requestExample: z.unknown().optional(),
	responseExample: z.unknown().optional(),
});

export class FrontendBuilderMessageRequestDto extends Z.class({
	prompt: z.string().min(1).max(4000),
	endpoints: z.array(endpointSchema).min(1),
}) {}

export const frontendBuilderMessageSchema = z.object({
	role: z.enum(['user', 'assistant']),
	content: z.string(),
	createdAt: z.string(),
});

export type FrontendBuilderMessage = z.infer<typeof frontendBuilderMessageSchema>;

export type FrontendBuilderMessageResponse = {
	chatId: string;
	demoUrl: string | null;
	assistantMessage: FrontendBuilderMessage;
};

export type FrontendBuilderStateResponse =
	| { chatId: null }
	| {
			chatId: string;
			demoUrl: string | null;
			messages: FrontendBuilderMessage[];
	  };
```

Create `packages/@n8n/api-types/src/dto/frontend-builder/index.ts`:
```ts
export * from './frontend-builder-message.dto';
```

Append to `packages/@n8n/api-types/src/dto/index.ts`:
```ts
export * from './frontend-builder';
```

- [ ] **Step 2: Write the `IV0Client` boundary and the fake**

Create `packages/cli/src/modules/frontend-builder/v0-client.interface.ts`:
```ts
import type { FrontendBuilderMessage } from '@n8n/api-types';

export type V0ChatResult = {
	chatId: string;
	demoUrl: string | null;
	messages: FrontendBuilderMessage[];
};

export interface IV0Client {
	create(input: { message: string }): Promise<V0ChatResult>;
	sendMessage(input: { chatId: string; message: string }): Promise<V0ChatResult>;
	getChat(chatId: string): Promise<V0ChatResult>;
}
```

Create `packages/cli/src/modules/frontend-builder/v0-client.ts` (stub — Slice 2 fills in real v0-sdk calls):
```ts
import { Service } from '@n8n/di';

import type { IV0Client, V0ChatResult } from './v0-client.interface';

@Service()
export class V0Client implements IV0Client {
	async create(_input: { message: string }): Promise<V0ChatResult> {
		throw new Error('V0Client not configured (expected an override via Container.set)');
	}
	async sendMessage(_input: { chatId: string; message: string }): Promise<V0ChatResult> {
		throw new Error('V0Client not configured (expected an override via Container.set)');
	}
	async getChat(_chatId: string): Promise<V0ChatResult> {
		throw new Error('V0Client not configured (expected an override via Container.set)');
	}
}
```

The service depends on `V0Client` directly. Tests and the module swap in the fake via `Container.set(V0Client, Container.get(FakeV0Client))` — no separate DI token needed.

Create `packages/cli/src/modules/frontend-builder/v0-client.fake.ts`:
```ts
import { Service } from '@n8n/di';

import type { IV0Client, V0ChatResult } from './v0-client.interface';

@Service()
export class FakeV0Client implements IV0Client {
	private chats = new Map<string, V0ChatResult>();
	private counter = 0;

	async create({ message }: { message: string }): Promise<V0ChatResult> {
		this.counter += 1;
		const chatId = `fake-chat-${this.counter}`;
		const result: V0ChatResult = {
			chatId,
			demoUrl: `https://example.invalid/fake-demo/${chatId}`,
			messages: [
				{ role: 'user', content: message, createdAt: new Date().toISOString() },
				{
					role: 'assistant',
					content: `(fake) Generated a frontend for prompt: ${message.slice(0, 80)}`,
					createdAt: new Date().toISOString(),
				},
			],
		};
		this.chats.set(chatId, result);
		return result;
	}

	async sendMessage({
		chatId,
		message,
	}: {
		chatId: string;
		message: string;
	}): Promise<V0ChatResult> {
		const prev = this.chats.get(chatId);
		if (!prev) {
			throw new Error(`FakeV0Client: unknown chatId ${chatId}`);
		}
		const updated: V0ChatResult = {
			chatId,
			demoUrl: `${prev.demoUrl}?v=${prev.messages.length + 2}`,
			messages: [
				...prev.messages,
				{ role: 'user', content: message, createdAt: new Date().toISOString() },
				{
					role: 'assistant',
					content: `(fake follow-up) ${message.slice(0, 80)}`,
					createdAt: new Date().toISOString(),
				},
			],
		};
		this.chats.set(chatId, updated);
		return updated;
	}

	async getChat(chatId: string): Promise<V0ChatResult> {
		const chat = this.chats.get(chatId);
		if (!chat) throw new Error(`FakeV0Client: unknown chatId ${chatId}`);
		return chat;
	}
}
```

- [ ] **Step 3: Write the service — uses v0 client via DI token, walks the happy path**

Create `packages/cli/src/modules/frontend-builder/frontend-builder.service.ts`:
```ts
import type { FrontendBuilderMessageRequestDto } from '@n8n/api-types';
import { WorkflowRepository } from '@n8n/db';
import { Service } from '@n8n/di';

import { V0Client } from './v0-client';
import type { V0ChatResult } from './v0-client.interface';

type WorkflowStaticData = {
	global?: { v0Chat?: { chatId: string } };
};

@Service()
export class FrontendBuilderService {
	constructor(
		private readonly workflowRepository: WorkflowRepository,
		private readonly v0Client: V0Client,
	) {}

	async sendMessage(
		workflowId: string,
		body: FrontendBuilderMessageRequestDto,
	): Promise<V0ChatResult> {
		const workflow = await this.workflowRepository.findOne({
			where: { id: workflowId },
			select: ['id', 'active', 'staticData'],
		});
		if (!workflow) throw new Error(`workflow not found: ${workflowId}`);

		const staticData = (workflow.staticData ?? {}) as WorkflowStaticData;
		const existingChatId = staticData.global?.v0Chat?.chatId;

		// Slice 1: prompt is just the raw user prompt. Slice 4 upgrades this.
		const message = body.prompt;

		const result = existingChatId
			? await this.v0Client.sendMessage({ chatId: existingChatId, message })
			: await this.v0Client.create({ message });

		if (!existingChatId) {
			const nextStaticData: WorkflowStaticData = {
				...staticData,
				global: { ...(staticData.global ?? {}), v0Chat: { chatId: result.chatId } },
			};
			await this.workflowRepository.update(
				{ id: workflowId },
				{ staticData: nextStaticData as unknown as Record<string, unknown> },
			);
		}

		return result;
	}
}
```

- [ ] **Step 4: Write the controller**

Create `packages/cli/src/modules/frontend-builder/frontend-builder.controller.ts`:
```ts
import type { FrontendBuilderMessageResponse } from '@n8n/api-types';
import { FrontendBuilderMessageRequestDto } from '@n8n/api-types';
import type { AuthenticatedRequest } from '@n8n/db';
import { Body, Param, Post, ProjectScope, RestController } from '@n8n/decorators';

import { FrontendBuilderService } from './frontend-builder.service';

@RestController('/workflows/:workflowId/frontend')
export class FrontendBuilderController {
	constructor(private readonly service: FrontendBuilderService) {}

	@Post('/messages')
	@ProjectScope('workflow:update')
	async sendMessage(
		_req: AuthenticatedRequest,
		_res: unknown,
		@Param('workflowId') workflowId: string,
		@Body body: FrontendBuilderMessageRequestDto,
	): Promise<FrontendBuilderMessageResponse> {
		const result = await this.service.sendMessage(workflowId, body);
		const assistantMessage = result.messages[result.messages.length - 1];
		return {
			chatId: result.chatId,
			demoUrl: result.demoUrl,
			assistantMessage,
		};
	}
}
```

- [ ] **Step 5: Write the module**

Create `packages/cli/src/modules/frontend-builder/frontend-builder.module.ts`:
```ts
import type { ModuleInterface } from '@n8n/decorators';
import { BackendModule } from '@n8n/decorators';
import { Container } from '@n8n/di';

import { FakeV0Client } from './v0-client.fake';
import { V0Client } from './v0-client';

@BackendModule({ name: 'frontend-builder', instanceTypes: ['main'] })
export class FrontendBuilderModule implements ModuleInterface {
	async init() {
		// Slice 1: always override V0Client with the fake.
		// Slice 2 makes this conditional on whether V0_API_KEY is set.
		Container.set(V0Client, Container.get(FakeV0Client));

		await import('./frontend-builder.controller');
	}

	async settings() {
		return { enabled: true };
	}
}
```

Create `packages/cli/src/modules/frontend-builder/index.ts`:
```ts
export { FrontendBuilderModule } from './frontend-builder.module';
```

- [ ] **Step 6: Register the module with the CLI runtime**

Find where existing modules are loaded (e.g. `grep -rn "workflow-builder" packages/cli/src --include="*.ts" | grep -i module | head`). Add the new module name to the list in the same way (e.g. in a `DEFAULT_MODULES` array or the `moduleRegistry` config). This is repo-scoped — confirm the exact line by inspection.

Run (to verify):
```bash
pnpm --filter=n8n-cli build > build.log 2>&1
tail -n 20 build.log
```
Expected: no errors.

- [ ] **Step 7: Write the failing integration test**

Create `packages/cli/src/modules/frontend-builder/__tests__/frontend-builder.integration.test.ts`:
```ts
import {
	createTeamProject,
	createWorkflow,
	testDb,
	testModules,
	mockInstance,
} from '@n8n/backend-test-utils';
import { WorkflowRepository } from '@n8n/db';
import { Container } from '@n8n/di';
import { agent as supertestAgent } from 'supertest';

import { setupApp } from '@test-integration/utils';
import * as utils from '@test-integration/helpers';

describe('FrontendBuilderController', () => {
	let app: Awaited<ReturnType<typeof setupApp>>;
	let authAgent: ReturnType<typeof utils.createAgent>;

	beforeAll(async () => {
		await testModules.loadModules(['frontend-builder']);
		await testDb.init();
		app = await setupApp();
	});

	beforeEach(async () => {
		await testDb.truncate(['WorkflowEntity', 'Project']);
	});

	afterAll(async () => {
		await testDb.terminate();
	});

	it('creates a chat on first message and returns demoUrl', async () => {
		const project = await createTeamProject('P');
		const owner = await utils.createOwnerWithApiKey();
		const workflow = await createWorkflow({ name: 'WF', active: true }, project);

		const agent = utils.createAuthAgent(app)(owner);
		const response = await agent.post(`/workflows/${workflow.id}/frontend/messages`).send({
			prompt: 'a hello form',
			endpoints: [
				{ nodeName: 'Webhook', method: 'POST', url: 'https://example.invalid/webhook/x' },
			],
		});

		expect(response.status).toBe(200);
		expect(response.body.data.chatId).toMatch(/^fake-chat-/);
		expect(response.body.data.demoUrl).toContain('fake-demo');

		const saved = await Container.get(WorkflowRepository).findOneBy({ id: workflow.id });
		expect((saved!.staticData as any).global.v0Chat.chatId).toBe(response.body.data.chatId);
	});

	it('continues an existing chat when chatId is persisted', async () => {
		const project = await createTeamProject('P');
		const owner = await utils.createOwnerWithApiKey();
		const workflow = await createWorkflow({ name: 'WF', active: true }, project);

		const agent = utils.createAuthAgent(app)(owner);
		const first = await agent.post(`/workflows/${workflow.id}/frontend/messages`).send({
			prompt: 'first message',
			endpoints: [
				{ nodeName: 'Webhook', method: 'POST', url: 'https://example.invalid/webhook/x' },
			],
		});
		expect(first.status).toBe(200);
		const firstChatId = first.body.data.chatId;

		const second = await agent.post(`/workflows/${workflow.id}/frontend/messages`).send({
			prompt: 'follow up',
			endpoints: [
				{ nodeName: 'Webhook', method: 'POST', url: 'https://example.invalid/webhook/x' },
			],
		});
		expect(second.status).toBe(200);
		expect(second.body.data.chatId).toBe(firstChatId);
		expect(second.body.data.assistantMessage.content).toContain('(fake follow-up)');
	});
});
```

Note: the exact test helpers (`setupApp`, `createAuthAgent`, `createOwnerWithApiKey`) must match the patterns already used in `packages/cli/test/integration/` and the existing module integration tests. Adapt imports to what's present (some modules use `@n8n/backend-test-utils` directly with a different bootstrap). The shape of assertions above is correct — just the bootstrap may need adjustment. Run `grep -rn "createAuthAgent\|setupApp" packages/cli/src/modules --include "*.test.ts" | head` to find the established pattern.

- [ ] **Step 8: Run the test to verify it fails**

Run:
```bash
pushd packages/cli
pnpm test:integration src/modules/frontend-builder/__tests__/frontend-builder.integration.test.ts
popd
```
Expected: FAIL — controller route not yet wired, or request returns 404.

- [ ] **Step 9: Build once, rerun until the first test passes**

Run:
```bash
pnpm --filter=n8n-cli build > build.log 2>&1 && tail -20 build.log
pushd packages/cli
pnpm test:integration src/modules/frontend-builder/__tests__/frontend-builder.integration.test.ts -t 'creates a chat on first message'
popd
```
Expected: the first test PASSES. Fix any wiring issues surfaced.

- [ ] **Step 10: (skipped — gating is via module load state)**

The button gates on `settingsStore.isModuleActive('frontend-builder')`. The
module is loaded when its name is in `MODULE_NAMES` and either appears in
`defaultModules` or in `N8N_ENABLED_MODULES`. For the spike we do not add
to `defaultModules`, so users must run with
`N8N_ENABLED_MODULES=frontend-builder` to opt in.

No `FrontendSettings.frontendBuilderEnabled` flag — the existing
`activeModules`/`isModuleActive` mechanism is sufficient.

- [ ] **Step 11: Write the frontend API client**

Create `packages/frontend/editor-ui/src/features/frontend-builder/api/frontend-builder.api.ts`:
```ts
import type {
	FrontendBuilderMessageRequestDto,
	FrontendBuilderMessageResponse,
} from '@n8n/api-types';
import { makeRestApiRequest } from '@n8n/rest-api-client';
import type { IRestApiContext } from '@n8n/rest-api-client';

export async function sendFrontendBuilderMessage(
	context: IRestApiContext,
	workflowId: string,
	body: FrontendBuilderMessageRequestDto,
): Promise<FrontendBuilderMessageResponse> {
	return await makeRestApiRequest(
		context,
		'POST',
		`/workflows/${workflowId}/frontend/messages`,
		body as unknown as Record<string, unknown>,
	);
}
```

Confirm the correct helper import path by running:
```bash
grep -rn "makeRestApiRequest" packages/frontend/editor-ui/src/features --include "*.ts" | head -3
```
Adapt if the helper is at `@/rest-api`, `@n8n/rest-api-client`, or `workflowsApi`-style.

- [ ] **Step 12: Write the composable**

Create `packages/frontend/editor-ui/src/features/frontend-builder/composables/useFrontendBuilder.ts`:
```ts
import { ref, computed } from 'vue';
import type { FrontendBuilderMessage } from '@n8n/api-types';
import { useRootStore } from '@n8n/stores';
import { useWorkflowsStore } from '@/features/workflows/stores/workflowsStore';
import { sendFrontendBuilderMessage } from '../api/frontend-builder.api';

export function useFrontendBuilder() {
	const rootStore = useRootStore();
	const workflowsStore = useWorkflowsStore();
	const messages = ref<FrontendBuilderMessage[]>([]);
	const demoUrl = ref<string | null>(null);
	const sending = ref(false);
	const error = ref<string | null>(null);

	const webhookTriggerNodes = computed(() =>
		workflowsStore.allNodes.filter((n) => n.type === 'n8n-nodes-base.webhook'),
	);
	const hasWebhookTrigger = computed(() => webhookTriggerNodes.value.length > 0);

	async function send(prompt: string) {
		sending.value = true;
		error.value = null;
		try {
			const endpoints = webhookTriggerNodes.value.map((node) => ({
				nodeName: node.name,
				method: ((node.parameters?.httpMethod as string) ?? 'POST') as
					| 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE',
				url: `${rootStore.webhookUrl}/${(node.parameters?.path as string) ?? ''}`,
				// Slice 5 fills requestExample / responseExample.
			}));
			const response = await sendFrontendBuilderMessage(
				rootStore.restApiContext,
				workflowsStore.workflowId,
				{ prompt, endpoints },
			);
			messages.value.push(
				{ role: 'user', content: prompt, createdAt: new Date().toISOString() },
				response.assistantMessage,
			);
			demoUrl.value = response.demoUrl;
		} catch (err) {
			error.value = err instanceof Error ? err.message : String(err);
		} finally {
			sending.value = false;
		}
	}

	return { messages, demoUrl, sending, error, hasWebhookTrigger, send };
}
```

Confirm import paths (e.g. `useRootStore`, `useWorkflowsStore`) against existing features by running:
```bash
grep -rn "useWorkflowsStore\|useRootStore" packages/frontend/editor-ui/src/features/ai --include "*.ts" | head -3
```

- [ ] **Step 13: Write the four presentation components**

Create `packages/frontend/editor-ui/src/features/frontend-builder/components/FrontendBuilderIframe.vue`:
```vue
<script setup lang="ts">
defineProps<{ demoUrl: string | null }>();
</script>

<template>
	<div class="iframe-wrap">
		<iframe
			v-if="demoUrl"
			:src="demoUrl"
			sandbox="allow-scripts allow-forms allow-same-origin"
			title="Generated frontend preview"
		/>
		<div v-else class="iframe-placeholder">
			Send a prompt to generate a frontend.
		</div>
	</div>
</template>

<style scoped>
.iframe-wrap { display: flex; flex: 1; min-height: 0; }
.iframe-wrap iframe { flex: 1; border: 0; width: 100%; }
.iframe-placeholder {
	display: flex;
	align-items: center;
	justify-content: center;
	padding: var(--spacing--md);
	color: var(--color--text--tint-1);
}
</style>
```

Create `packages/frontend/editor-ui/src/features/frontend-builder/components/FrontendBuilderMessageList.vue`:
```vue
<script setup lang="ts">
import type { FrontendBuilderMessage } from '@n8n/api-types';
defineProps<{ messages: FrontendBuilderMessage[] }>();
</script>

<template>
	<ul class="messages">
		<li v-for="(m, i) in messages" :key="i" :class="['msg', m.role]">
			<strong>{{ m.role }}:</strong>
			<pre>{{ m.content }}</pre>
		</li>
	</ul>
</template>

<style scoped>
.messages { list-style: none; margin: 0; padding: var(--spacing--sm); overflow-y: auto; }
.msg { margin-bottom: var(--spacing--xs); }
.msg pre { white-space: pre-wrap; font-family: inherit; margin: 0; }
.msg.user { color: var(--color--text); }
.msg.assistant { color: var(--color--text--tint-1); }
</style>
```

Create `packages/frontend/editor-ui/src/features/frontend-builder/components/FrontendBuilderPromptInput.vue`:
```vue
<script setup lang="ts">
import { ref } from 'vue';
const emit = defineEmits<{ send: [prompt: string] }>();
defineProps<{ disabled?: boolean }>();
const value = ref('');
function onSend() {
	if (!value.value.trim()) return;
	emit('send', value.value);
	value.value = '';
}
</script>

<template>
	<form class="wrap" @submit.prevent="onSend">
		<textarea
			v-model="value"
			:disabled="disabled"
			placeholder="Describe the frontend you want..."
			rows="2"
			data-testid="frontend-builder-prompt"
		/>
		<button type="submit" :disabled="disabled" data-testid="frontend-builder-send">Send</button>
	</form>
</template>

<style scoped>
.wrap { display: flex; gap: var(--spacing--xs); padding: var(--spacing--sm); }
textarea { flex: 1; resize: vertical; font: inherit; }
</style>
```

Create `packages/frontend/editor-ui/src/features/frontend-builder/components/FrontendBuilderDrawer.vue`:
```vue
<script setup lang="ts">
import { useFrontendBuilder } from '../composables/useFrontendBuilder';
import FrontendBuilderIframe from './FrontendBuilderIframe.vue';
import FrontendBuilderMessageList from './FrontendBuilderMessageList.vue';
import FrontendBuilderPromptInput from './FrontendBuilderPromptInput.vue';
defineProps<{ open: boolean }>();
defineEmits<{ close: [] }>();
const { messages, demoUrl, sending, error, send } = useFrontendBuilder();
</script>

<template>
	<aside v-if="open" class="drawer" data-testid="frontend-builder-drawer">
		<header class="drawer-header">
			<h2>Frontend</h2>
			<button @click="$emit('close')">×</button>
		</header>
		<section class="drawer-body">
			<FrontendBuilderMessageList :messages="messages" />
			<p v-if="error" class="error">{{ error }}</p>
			<FrontendBuilderIframe :demo-url="demoUrl" />
			<FrontendBuilderPromptInput :disabled="sending" @send="send" />
		</section>
	</aside>
</template>

<style scoped>
.drawer {
	position: absolute;
	top: 0; right: 0; bottom: 0;
	width: 560px;
	background: var(--color--background);
	border-left: var(--border);
	display: flex;
	flex-direction: column;
	z-index: 100;
}
.drawer-header {
	display: flex;
	justify-content: space-between;
	align-items: center;
	padding: var(--spacing--sm);
	border-bottom: var(--border);
}
.drawer-body { flex: 1; display: flex; flex-direction: column; min-height: 0; }
.error { color: var(--color--danger); padding: 0 var(--spacing--sm); }
</style>
```

- [ ] **Step 14: Write the canvas button and mount it in NodeView**

Create `packages/frontend/editor-ui/src/features/workflows/canvas/components/elements/buttons/CanvasCreateFrontendButton.vue`:
```vue
<script setup lang="ts">
import { N8nButton } from '@n8n/design-system';
defineProps<{ disabled?: boolean }>();
defineEmits<{ click: [] }>();
</script>

<template>
	<N8nButton
		:disabled="disabled"
		type="secondary"
		data-testid="canvas-create-frontend-button"
		@click="$emit('click')"
	>
		Frontend
	</N8nButton>
</template>
```

In `packages/frontend/editor-ui/src/app/views/NodeView.vue`:
- Add the imports near the other canvas-button imports (search for `CanvasRunWorkflowButton`):
  ```ts
  import CanvasCreateFrontendButton from '@/features/workflows/canvas/components/elements/buttons/CanvasCreateFrontendButton.vue';
  import FrontendBuilderDrawer from '@/features/frontend-builder/components/FrontendBuilderDrawer.vue';
  import { useSettingsStore } from '@n8n/stores';
  ```
- Near the other `ref(false)` state, add:
  ```ts
  const frontendBuilderOpen = ref(false);
  const settingsStore = useSettingsStore();
  const hasWebhookTrigger = computed(() =>
  	workflowsStore.allNodes.some((n) => n.type === 'n8n-nodes-base.webhook'),
  );
  const frontendBuilderButtonVisible = computed(
  	() => settingsStore.isModuleActive('frontend-builder') && hasWebhookTrigger.value,
  );
  ```
- Inside `<div :class="$style.executionButtons">`, as a sibling of `CanvasRunWorkflowButton`, add:
  ```html
  <CanvasCreateFrontendButton
  	v-if="frontendBuilderButtonVisible"
  	:disabled="!workflowsStore.workflow.active"
  	@click="frontendBuilderOpen = true"
  />
  ```
- At the end of the template (inside the root), add:
  ```html
  <FrontendBuilderDrawer :open="frontendBuilderOpen" @close="frontendBuilderOpen = false" />
  ```

- [ ] **Step 15: Typecheck + build**

Run:
```bash
pushd packages/frontend/editor-ui
pnpm typecheck 2>&1 | tail -30
popd
pnpm --filter=n8n build > build.log 2>&1
tail -20 build.log
```
Expected: no errors. Fix any type/import issues.

- [ ] **Step 16: Manual smoke test**

Run:
```bash
N8N_ENABLED_MODULES=frontend-builder pnpm start
```
Open `http://localhost:5678`. Create a workflow, add a Webhook Trigger, activate it. Expect the "Frontend" button to appear next to Execute Workflow at the bottom of the canvas. Click it; drawer opens. Type "a hello form" and send. Expect the iframe src to be set to the fake URL (content will be "unable to reach example.invalid" — that's fine for Slice 1; it proves plumbing).

- [ ] **Step 17: Commit**

```bash
git add packages/@n8n/api-types/src/dto/frontend-builder \
	packages/@n8n/api-types/src/dto/index.ts \
	packages/@n8n/api-types/src/frontend-settings.ts \
	packages/cli/src/modules/frontend-builder \
	packages/cli/src/services/frontend.service.ts \
	packages/frontend/editor-ui/src/features/frontend-builder \
	packages/frontend/editor-ui/src/features/workflows/canvas/components/elements/buttons/CanvasCreateFrontendButton.vue \
	packages/frontend/editor-ui/src/app/views/NodeView.vue
git commit -m "$(cat <<'EOF'
feat(frontend-builder): walking skeleton for v0 PoC

Adds a new backend module wired to a FakeV0Client, a REST endpoint that
creates/continues a chat and persists the chatId on the workflow, plus a
canvas-level Frontend button and a drawer that previews the returned
demoUrl in an iframe. End-to-end happy path green with integration tests.

Refs docs/superpowers/specs/2026-04-22-v0-integration-poc-design.md
EOF
)"
```

---

## Slice 2: Real v0-sdk wiring behind config

> **Open assumption to validate:** the controller in Slice 1 returns a single
> `assistantMessage` (the last message from `result.messages`). The fake always
> produces exactly one. The real v0 API may return zero or multiple assistant
> messages per call (e.g. a partial/thinking message + a final message, or
> async generation that requires polling). When we see real responses in this
> slice, decide whether to keep `assistantMessage` or change the contract to
> `newMessages: FrontendBuilderMessage[]` / a full message list. Update the
> FE composable to match.

**Goal:** Replace the fake client in production with `v0-sdk`. Integration tests still use the fake. `N8N_FRONTEND_BUILDER_ENABLED=true` + `V0_API_KEY=sk-...` → real v0 calls.

**Files:**
- Modify: `packages/cli/package.json` (add `v0-sdk` dep)
- Create: `packages/cli/src/modules/frontend-builder/frontend-builder.config.ts`
- Modify: `packages/cli/src/modules/frontend-builder/v0-client.ts` (fill in the stub from Slice 1 with real SDK calls)
- Modify: `packages/cli/src/modules/frontend-builder/frontend-builder.module.ts` (conditionally override with fake only when apiKey is missing)
- Modify: `packages/cli/src/modules/frontend-builder/__tests__/frontend-builder.integration.test.ts` (ensure fake stays in place for tests)

- [ ] **Step 1: Add the v0-sdk dependency**

Run:
```bash
pnpm --filter=n8n add v0-sdk
```
Verify the lockfile updated; the version must not be blocked by `minimumReleaseAge` — if it is, add `v0-sdk` to `pnpm-workspace.yaml:minimumReleaseAgeExclude`.

- [ ] **Step 2: Write the config class**

Create `packages/cli/src/modules/frontend-builder/frontend-builder.config.ts`:
```ts
import { Config, Env } from '@n8n/config';

@Config
export class FrontendBuilderConfig {
	/**
	 * v0 Platform API key. When unset (the default), the module wires
	 * `FakeV0Client` so dev can click through the UI without credentials.
	 * The module being loaded at all is gated by `N8N_ENABLED_MODULES`,
	 * not by this config.
	 */
	@Env('V0_API_KEY')
	apiKey: string = '';
}
```

- [ ] **Step 3: Replace the stub V0Client with the real implementation**

Replace `packages/cli/src/modules/frontend-builder/v0-client.ts`:
```ts
import { frontendBuilderMessageSchema, type FrontendBuilderMessage } from '@n8n/api-types';
import { Service } from '@n8n/di';
import { v0 as v0Factory } from 'v0-sdk';

import { FrontendBuilderConfig } from './frontend-builder.config';
import type { IV0Client, V0ChatResult } from './v0-client.interface';

type V0Instance = ReturnType<typeof v0Factory>;

@Service()
export class V0Client implements IV0Client {
	private readonly v0: V0Instance;

	constructor(config: FrontendBuilderConfig) {
		if (!config.apiKey) {
			throw new Error('V0_API_KEY is required to use V0Client');
		}
		this.v0 = v0Factory({ apiKey: config.apiKey });
	}

	async create({ message }: { message: string }): Promise<V0ChatResult> {
		const chat = await this.v0.chats.create({ message });
		return this.toResult(chat);
	}

	async sendMessage({
		chatId,
		message,
	}: {
		chatId: string;
		message: string;
	}): Promise<V0ChatResult> {
		const chat = await this.v0.chats.sendMessage({ chatId, message });
		return this.toResult(chat);
	}

	async getChat(chatId: string): Promise<V0ChatResult> {
		// Prefer a single round-trip if the SDK exposes a chat getter; otherwise list messages.
		const anyV0 = this.v0 as unknown as {
			chats: {
				getById?: (id: string) => Promise<unknown>;
				get?: (id: string) => Promise<unknown>;
				messages?: { list: (id: string) => Promise<unknown[]> };
			};
		};
		const getter = anyV0.chats.getById ?? anyV0.chats.get;
		if (getter) return this.toResult(await getter(chatId));
		if (anyV0.chats.messages) {
			const messages = await anyV0.chats.messages.list(chatId);
			return { chatId, demoUrl: null, messages: messages.map(toMessage) };
		}
		throw new Error('v0 SDK does not expose a chat-retrieval method');
	}

	private toResult(chat: unknown): V0ChatResult {
		const c = chat as {
			id: string;
			latestVersion?: { demoUrl?: string };
			demo?: string;
			demoUrl?: string;
			messages?: unknown[];
		};
		return {
			chatId: c.id,
			demoUrl: c.latestVersion?.demoUrl ?? c.demoUrl ?? c.demo ?? null,
			messages: (c.messages ?? []).map(toMessage),
		};
	}
}

/**
 * Normalise a raw message from v0-sdk into our shape, then validate against
 * `frontendBuilderMessageSchema`. Throws if v0's shape has drifted — we want
 * to see that loudly rather than silently forward garbage.
 */
function toMessage(raw: unknown): FrontendBuilderMessage {
	const m = raw as {
		role?: string;
		content?: string;
		text?: string;
		createdAt?: string;
	};
	return frontendBuilderMessageSchema.parse({
		role: m.role === 'user' ? 'user' : 'assistant',
		content: m.content ?? m.text ?? '',
		createdAt: m.createdAt ?? new Date().toISOString(),
	});
}
```
Note: the SDK surface is not fully documented; the `getChat` branch adapts to whatever is present at runtime. We will harden this in Slice 4 once we have it in our hands.

- [ ] **Step 4: Switch the module to pick the right client**

Replace `packages/cli/src/modules/frontend-builder/frontend-builder.module.ts`:
```ts
import type { ModuleInterface } from '@n8n/decorators';
import { BackendModule } from '@n8n/decorators';
import { Container } from '@n8n/di';

import { FrontendBuilderConfig } from './frontend-builder.config';
import { FakeV0Client } from './v0-client.fake';
import { V0Client } from './v0-client';

@BackendModule({ name: 'frontend-builder', instanceTypes: ['main'] })
export class FrontendBuilderModule implements ModuleInterface {
	async init() {
		const config = Container.get(FrontendBuilderConfig);

		// With a real key, Container.get(V0Client) resolves to the real class.
		// Without a key, keep the fake active so dev can click through the UI.
		if (!config.apiKey) {
			Container.set(V0Client, Container.get(FakeV0Client));
		}

		await import('./frontend-builder.controller');
	}

	async settings() {
		return { enabled: true };
	}
}
```

- [ ] **Step 5: Tests stay on the fake**

The integration test's `setupTestServer({ modules: ['frontend-builder'] })` already loads
the module. With `V0_API_KEY` unset in CI, the module's `init()` overrides
`V0Client` with `FakeV0Client` automatically. No test-specific `Container.set`
needed.

- [ ] **Step 6: (skipped — no FrontendSettings entry)**

We rely on `activeModules` / `isModuleActive` instead of a dedicated flag in
`FrontendSettings`. Nothing to update in `frontend.service.ts`.

- [ ] **Step 7: Run integration tests — still green**

Run:
```bash
pushd packages/cli
pnpm test:integration src/modules/frontend-builder/__tests__/frontend-builder.integration.test.ts
popd
```
Expected: PASS. Fix if wiring broke.

- [ ] **Step 8: Manual real-v0 smoke (optional but recommended)**

If you have a `V0_API_KEY`, run locally:
```bash
N8N_ENABLED_MODULES=frontend-builder V0_API_KEY=sk-... pnpm start
```
Open a workflow with an activated webhook, open the drawer, send "a form with one input". Expect a real v0 `demoUrl` to render in the iframe. Note: each call costs v0 credits.

- [ ] **Step 9: Commit**

```bash
git add packages/cli/package.json pnpm-lock.yaml \
	packages/cli/src/modules/frontend-builder \
	packages/cli/src/services/frontend.service.ts \
	pnpm-workspace.yaml
git commit -m "feat(frontend-builder): wire real v0-sdk behind N8N_FRONTEND_BUILDER_ENABLED + V0_API_KEY"
```

---

## Slice 3: GET endpoint + drawer rehydration

**Goal:** Reopening the drawer restores messages and iframe. v0 is the source of truth.

**Files:**
- Modify: `packages/cli/src/modules/frontend-builder/frontend-builder.service.ts` (add `getState`)
- Modify: `packages/cli/src/modules/frontend-builder/frontend-builder.controller.ts` (add GET)
- Modify: `packages/@n8n/api-types/src/dto/frontend-builder/frontend-builder-message.dto.ts` (already has `FrontendBuilderStateResponse` from Slice 1 — verify)
- Modify: `packages/cli/src/modules/frontend-builder/__tests__/frontend-builder.integration.test.ts`
- Modify: `packages/frontend/editor-ui/src/features/frontend-builder/api/frontend-builder.api.ts`
- Modify: `packages/frontend/editor-ui/src/features/frontend-builder/composables/useFrontendBuilder.ts`
- Modify: `packages/frontend/editor-ui/src/features/frontend-builder/components/FrontendBuilderDrawer.vue` (call on open)

- [ ] **Step 1: Write failing integration test for rehydrate**

Append to the integration test:
```ts
it('rehydrates drawer state from v0 on GET when chatId is persisted', async () => {
	const project = await createTeamProject('P');
	const owner = await utils.createOwnerWithApiKey();
	const workflow = await createWorkflow({ name: 'WF', active: true }, project);

	const agent = utils.createAuthAgent(app)(owner);
	const posted = await agent.post(`/workflows/${workflow.id}/frontend/messages`).send({
		prompt: 'a form',
		endpoints: [
			{ nodeName: 'Webhook', method: 'POST', url: 'https://example.invalid/webhook/x' },
		],
	});
	expect(posted.status).toBe(200);

	const got = await agent.get(`/workflows/${workflow.id}/frontend`);
	expect(got.status).toBe(200);
	expect(got.body.data.chatId).toBe(posted.body.data.chatId);
	expect(got.body.data.messages.length).toBeGreaterThan(0);
});

it('returns { chatId: null } when no chat yet', async () => {
	const project = await createTeamProject('P');
	const owner = await utils.createOwnerWithApiKey();
	const workflow = await createWorkflow({ name: 'WF', active: true }, project);

	const agent = utils.createAuthAgent(app)(owner);
	const got = await agent.get(`/workflows/${workflow.id}/frontend`);
	expect(got.status).toBe(200);
	expect(got.body.data.chatId).toBeNull();
});
```

Run: tests fail (no GET endpoint).

- [ ] **Step 2: Implement `getState` in the service**

Add to `FrontendBuilderService`:
```ts
import type { FrontendBuilderStateResponse } from '@n8n/api-types';

async getState(workflowId: string): Promise<FrontendBuilderStateResponse> {
	const workflow = await this.workflowRepository.findOne({
		where: { id: workflowId },
		select: ['id', 'staticData'],
	});
	const chatId = (workflow?.staticData as WorkflowStaticData | undefined)?.global?.v0Chat?.chatId;
	if (!chatId) return { chatId: null };

	const result = await this.v0Client.getChat(chatId);
	return { chatId, demoUrl: result.demoUrl, messages: result.messages };
}
```

- [ ] **Step 3: Add the GET controller**

In `frontend-builder.controller.ts`, add:
```ts
import type { FrontendBuilderStateResponse } from '@n8n/api-types';
import { Get } from '@n8n/decorators';

@Get('/')
@ProjectScope('workflow:read')
async getState(
	_req: AuthenticatedRequest,
	_res: unknown,
	@Param('workflowId') workflowId: string,
): Promise<FrontendBuilderStateResponse> {
	return await this.service.getState(workflowId);
}
```

- [ ] **Step 4: Run integration tests — green**

Run:
```bash
pushd packages/cli && pnpm test:integration src/modules/frontend-builder && popd
```
Expected: all PASS.

- [ ] **Step 5: Frontend API — add `getState`**

Append to `frontend-builder.api.ts`:
```ts
import type { FrontendBuilderStateResponse } from '@n8n/api-types';

export async function getFrontendBuilderState(
	context: IRestApiContext,
	workflowId: string,
): Promise<FrontendBuilderStateResponse> {
	return await makeRestApiRequest(context, 'GET', `/workflows/${workflowId}/frontend`);
}
```

- [ ] **Step 6: Composable — hydrate on open**

Add to `useFrontendBuilder.ts`:
```ts
import { getFrontendBuilderState } from '../api/frontend-builder.api';

async function hydrate() {
	error.value = null;
	try {
		const state = await getFrontendBuilderState(rootStore.restApiContext, workflowsStore.workflowId);
		if (state.chatId === null) {
			messages.value = [];
			demoUrl.value = null;
			return;
		}
		messages.value = state.messages;
		demoUrl.value = state.demoUrl;
	} catch (err) {
		error.value = err instanceof Error ? err.message : String(err);
	}
}
```
And return `hydrate` from the composable.

- [ ] **Step 7: Drawer — call hydrate on open**

In `FrontendBuilderDrawer.vue`, use `watch(() => props.open, ...)`:
```ts
import { watch } from 'vue';
const { messages, demoUrl, sending, error, send, hydrate } = useFrontendBuilder();
watch(
	() => props.open,
	(open) => {
		if (open) void hydrate();
	},
	{ immediate: true },
);
```

- [ ] **Step 8: Typecheck + manual check**

Run:
```bash
pushd packages/frontend/editor-ui && pnpm typecheck 2>&1 | tail -20 && popd
```
Expected: clean. Manual check: open drawer, send, close, reopen → state persists.

- [ ] **Step 9: Commit**

```bash
git add -u
git commit -m "feat(frontend-builder): add GET /workflows/:id/frontend and drawer rehydration"
```

---

## Slice 4: Endpoint context + pure core (prompt builder, sanitizer)

**Goal:** Messages carry real request/response examples pulled from the editor's loaded run data, sanitized for size. v0 now has enough to actually map responses to the user's rendering request.

**Files:**
- Create: `packages/cli/src/modules/frontend-builder/core/sanitize-endpoint-examples.ts`
- Create: `packages/cli/src/modules/frontend-builder/core/build-v0-prompt.ts`
- Create: `packages/cli/src/modules/frontend-builder/core/__tests__/sanitize-endpoint-examples.test.ts`
- Create: `packages/cli/src/modules/frontend-builder/core/__tests__/build-v0-prompt.test.ts`
- Modify: `packages/cli/src/modules/frontend-builder/frontend-builder.service.ts`
- Modify: `packages/cli/src/modules/frontend-builder/__tests__/frontend-builder.integration.test.ts`
- Modify: `packages/frontend/editor-ui/src/features/frontend-builder/composables/useFrontendBuilder.ts`

- [ ] **Step 1: Write failing unit tests for the sanitizer**

Create `packages/cli/src/modules/frontend-builder/core/__tests__/sanitize-endpoint-examples.test.ts`:
```ts
import { sanitizeEndpointExamples } from '../sanitize-endpoint-examples';

describe('sanitizeEndpointExamples', () => {
	it('truncates arrays to the first 20 items', () => {
		const input = { items: Array.from({ length: 50 }, (_, i) => ({ i })) };
		const out = sanitizeEndpointExamples(input) as { items: unknown[] };
		expect(out.items).toHaveLength(20);
	});

	it('drops Buffer / binary-shaped values', () => {
		const input = {
			file: { data: 'AAAABBBB', mimeType: 'application/octet-stream', fileName: 'x.bin' },
			ok: true,
		};
		const out = sanitizeEndpointExamples(input) as Record<string, unknown>;
		expect(out.file).toBeUndefined();
		expect(out.ok).toBe(true);
	});

	it('is a no-op for scalars and null', () => {
		expect(sanitizeEndpointExamples(null)).toBeNull();
		expect(sanitizeEndpointExamples(42)).toBe(42);
		expect(sanitizeEndpointExamples('hello')).toBe('hello');
	});

	it('stops recursing at depth 6', () => {
		let deep: unknown = 'leaf';
		for (let i = 0; i < 10; i += 1) deep = { nested: deep };
		expect(() => sanitizeEndpointExamples(deep)).not.toThrow();
	});
});
```

Run:
```bash
pushd packages/cli && pnpm test src/modules/frontend-builder/core && popd
```
Expected: all FAIL (module not present).

- [ ] **Step 2: Implement the sanitizer**

Create `packages/cli/src/modules/frontend-builder/core/sanitize-endpoint-examples.ts`:
```ts
const MAX_ARRAY_ITEMS = 20;
const MAX_DEPTH = 6;

const BINARY_KEYS = new Set(['data', 'mimeType', 'fileName']);

export function sanitizeEndpointExamples(value: unknown, depth = 0): unknown {
	if (depth > MAX_DEPTH) return '…';
	if (value === null || typeof value !== 'object') return value;

	if (Array.isArray(value)) {
		return value.slice(0, MAX_ARRAY_ITEMS).map((v) => sanitizeEndpointExamples(v, depth + 1));
	}

	const obj = value as Record<string, unknown>;
	// Drop objects that look like n8n binary items.
	const keys = Object.keys(obj);
	const looksBinary =
		keys.length >= 2 && keys.every((k) => BINARY_KEYS.has(k)) && typeof obj.data === 'string';
	if (looksBinary) return undefined;

	const out: Record<string, unknown> = {};
	for (const [k, v] of Object.entries(obj)) {
		if (k === 'binary') continue;
		const sanitized = sanitizeEndpointExamples(v, depth + 1);
		if (sanitized !== undefined) out[k] = sanitized;
	}
	return out;
}
```

Run the sanitizer tests — all PASS.

- [ ] **Step 3: Write failing unit tests for the prompt builder**

Create `packages/cli/src/modules/frontend-builder/core/__tests__/build-v0-prompt.test.ts`:
```ts
import { buildV0Prompt } from '../build-v0-prompt';

describe('buildV0Prompt', () => {
	it('renders a prompt with all endpoints, request + response examples', () => {
		const prompt = buildV0Prompt({
			userPrompt: 'show a table',
			endpoints: [
				{
					nodeName: 'List',
					method: 'GET',
					url: 'https://x/webhook/list',
					responseExample: [{ id: 1 }],
				},
				{
					nodeName: 'Add',
					method: 'POST',
					url: 'https://x/webhook/add',
					requestExample: { name: 'a' },
				},
			],
		});

		expect(prompt).toContain('GET https://x/webhook/list');
		expect(prompt).toContain('POST https://x/webhook/add');
		expect(prompt).toContain('Example response: [{"id":1}]');
		expect(prompt).toContain('Example request body: {"name":"a"}');
		expect(prompt).toContain('User request: show a table');
	});

	it('omits the "Example request body" and "Example response" lines when undefined', () => {
		const prompt = buildV0Prompt({
			userPrompt: 'p',
			endpoints: [{ nodeName: 'N', method: 'POST', url: 'u' }],
		});
		expect(prompt).not.toContain('Example request body');
		expect(prompt).not.toContain('Example response');
	});
});
```

Run: FAIL.

- [ ] **Step 4: Implement the prompt builder**

Create `packages/cli/src/modules/frontend-builder/core/build-v0-prompt.ts`:
```ts
type Endpoint = {
	nodeName: string;
	method: string;
	url: string;
	requestExample?: unknown;
	responseExample?: unknown;
};

export type BuildV0PromptInput = {
	userPrompt: string;
	endpoints: Endpoint[];
};

export function buildV0Prompt({ userPrompt, endpoints }: BuildV0PromptInput): string {
	const endpointLines = endpoints.map((ep) => {
		const lines = [`- ${ep.method} ${ep.url}  (node: "${ep.nodeName}")`];
		if (ep.requestExample !== undefined) {
			lines.push(`  Example request body: ${JSON.stringify(ep.requestExample)}`);
		}
		if (ep.responseExample !== undefined) {
			lines.push(`  Example response: ${JSON.stringify(ep.responseExample)}`);
		}
		return lines.join('\n');
	});

	return [
		'You are building a single-page frontend that talks to these n8n workflow endpoints:',
		'',
		...endpointLines,
		'',
		`User request: ${userPrompt}`,
		'',
		'Constraints:',
		'- Use fetch() directly; no separate backend.',
		'- If a response example is missing, treat the shape as unknown and render received data as JSON for now.',
		'- Handle network errors gracefully.',
	].join('\n');
}
```

Run tests: PASS.

- [ ] **Step 5: Use them in the service**

In `frontend-builder.service.ts`:
```ts
import { buildV0Prompt } from './core/build-v0-prompt';
import { sanitizeEndpointExamples } from './core/sanitize-endpoint-examples';
```
Replace the Slice 1 `const message = body.prompt;` with:
```ts
const message = buildV0Prompt({
	userPrompt: body.prompt,
	endpoints: body.endpoints.map((ep) => ({
		...ep,
		requestExample:
			ep.requestExample !== undefined ? sanitizeEndpointExamples(ep.requestExample) : undefined,
		responseExample:
			ep.responseExample !== undefined ? sanitizeEndpointExamples(ep.responseExample) : undefined,
	})),
});
```

- [ ] **Step 6: Extend integration test with examples**

Add:
```ts
it('forwards sanitized endpoint examples into the composed prompt', async () => {
	const project = await createTeamProject('P');
	const owner = await utils.createOwnerWithApiKey();
	const workflow = await createWorkflow({ name: 'WF', active: true }, project);

	const agent = utils.createAuthAgent(app)(owner);
	const response = await agent.post(`/workflows/${workflow.id}/frontend/messages`).send({
		prompt: 'show a table',
		endpoints: [
			{
				nodeName: 'List',
				method: 'GET',
				url: 'https://example.invalid/webhook/list',
				responseExample: [{ id: 1 }, { id: 2 }],
			},
		],
	});
	expect(response.status).toBe(200);
	// FakeV0Client echoes the incoming message on the user side — assert it contains the prompt body
	const state = await agent.get(`/workflows/${workflow.id}/frontend`);
	const userMessage = state.body.data.messages.find((m: { role: string }) => m.role === 'user');
	expect(userMessage.content).toContain('GET https://example.invalid/webhook/list');
	expect(userMessage.content).toContain('Example response: [{"id":1},{"id":2}]');
	expect(userMessage.content).toContain('User request: show a table');
});
```

Run integration tests: PASS.

- [ ] **Step 7: Frontend composable — collect real run data**

In `useFrontendBuilder.ts`, replace the `endpoints` mapping with:
```ts
const endpoints = webhookTriggerNodes.value.map((node) => {
	const run = workflowsStore.getWorkflowRunData;
	const nodeRun = run?.[node.name]?.[0];
	const requestExample = nodeRun?.data?.main?.[0]?.[0]?.json;
	const responseExample = nodeRun?.data?.main?.[0]?.[0]?.json?.__n8nFrontendBuilderResponseExample
		?? null;
	return {
		nodeName: node.name,
		method: ((node.parameters?.httpMethod as string) ?? 'POST') as
			| 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE',
		url: `${rootStore.webhookUrl}/${(node.parameters?.path as string) ?? ''}`,
		requestExample,
		responseExample: responseExample ?? undefined,
	};
});
```
Note: the `responseExample` source is best-effort in this slice; real response capture requires the user to pin the Respond-to-Webhook node's output, which they can do in the editor. If `workflowsStore` exposes a "pinned output for node" accessor (search for `getPinData` / `getNodePinData` in `workflowsStore`), prefer that over the run data.

- [ ] **Step 8: Typecheck + commit**

```bash
pushd packages/frontend/editor-ui && pnpm typecheck 2>&1 | tail -20 && popd
pushd packages/cli && pnpm typecheck 2>&1 | tail -20 && popd
git add -u
git add packages/cli/src/modules/frontend-builder/core
git commit -m "feat(frontend-builder): forward endpoint examples in composed v0 prompt"
```

---

## Slice 5: Preconditions and error handling

**Goal:** Expected error cases return useful, human-readable errors and the drawer renders them.

**Files:**
- Create: `packages/cli/src/modules/frontend-builder/frontend-builder.errors.ts`
- Modify: `packages/cli/src/modules/frontend-builder/frontend-builder.service.ts`
- Modify: `packages/cli/src/modules/frontend-builder/__tests__/frontend-builder.integration.test.ts`
- Modify: `packages/frontend/editor-ui/src/features/frontend-builder/components/FrontendBuilderDrawer.vue` (already renders `error`)

- [ ] **Step 1: Write failing tests for the four error cases**

Append to the integration test:
```ts
it('returns 400 when the workflow has no webhook trigger', async () => {
	const project = await createTeamProject('P');
	const owner = await utils.createOwnerWithApiKey();
	const workflow = await createWorkflow({ name: 'WF', active: true }, project);

	const agent = utils.createAuthAgent(app)(owner);
	const response = await agent.post(`/workflows/${workflow.id}/frontend/messages`).send({
		prompt: 'x',
		endpoints: [],
	});
	expect(response.status).toBe(400);
});

it('returns 400 when the workflow is not activated', async () => {
	const project = await createTeamProject('P');
	const owner = await utils.createOwnerWithApiKey();
	const workflow = await createWorkflow({ name: 'WF', active: false }, project);

	const agent = utils.createAuthAgent(app)(owner);
	const response = await agent.post(`/workflows/${workflow.id}/frontend/messages`).send({
		prompt: 'x',
		endpoints: [
			{ nodeName: 'W', method: 'POST', url: 'https://example.invalid/webhook/x' },
		],
	});
	expect(response.status).toBe(400);
	expect(response.body.message).toMatch(/activate/i);
});

it('returns 502 when the v0 client throws', async () => {
	// Override the bound V0 client to always throw, scoped to this test.
	const { V0Client } = await import('@/modules/frontend-builder/v0-client');
	const prev = Container.get(V0Client);
	Container.set(V0Client, {
		create: async () => { throw new Error('upstream down'); },
		sendMessage: async () => { throw new Error('upstream down'); },
		getChat: async () => { throw new Error('upstream down'); },
	});
	try {
		const project = await createTeamProject('P');
		const owner = await utils.createOwnerWithApiKey();
		const workflow = await createWorkflow({ name: 'WF', active: true }, project);

		const agent = utils.createAuthAgent(app)(owner);
		const response = await agent.post(`/workflows/${workflow.id}/frontend/messages`).send({
			prompt: 'x',
			endpoints: [
				{ nodeName: 'W', method: 'POST', url: 'https://example.invalid/webhook/x' },
			],
		});
		expect(response.status).toBe(502);
	} finally {
		Container.set(V0Client, prev);
	}
});
```

Run: FAIL.

- [ ] **Step 2: Create error classes**

Create `packages/cli/src/modules/frontend-builder/frontend-builder.errors.ts`:
```ts
import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { InternalServerError } from '@/errors/response-errors/internal-server.error';

export class WorkflowNotActivatedError extends BadRequestError {
	constructor() {
		super('Activate this workflow so the generated frontend can call its webhooks.');
	}
}

export class NoWebhookTriggerError extends BadRequestError {
	constructor() {
		super('Workflow needs at least one Webhook Trigger.');
	}
}

export class V0UpstreamError extends InternalServerError {
	constructor(cause: unknown) {
		super(
			`Frontend generation failed upstream: ${cause instanceof Error ? cause.message : String(cause)}`,
		);
		// Prefer 502; n8n error classes usually carry an httpStatusCode — adapt to the project's convention.
	}
}
```
(If `InternalServerError` does not accept a cause or a 502 in the current error-response hierarchy, grep for `502` in `packages/cli/src/errors/response-errors` and use/create the right subclass.)

- [ ] **Step 3: Wire the service to throw them**

Guard `sendMessage` at the top:
```ts
if (body.endpoints.length === 0) throw new NoWebhookTriggerError();
if (!workflow.active) throw new WorkflowNotActivatedError();
```
Wrap the `v0Client.*` calls:
```ts
try {
	result = existingChatId
		? await this.v0Client.sendMessage({ chatId: existingChatId, message })
		: await this.v0Client.create({ message });
} catch (err) {
	throw new V0UpstreamError(err);
}
```

- [ ] **Step 4: Run tests — PASS**

Run:
```bash
pushd packages/cli && pnpm test:integration src/modules/frontend-builder && popd
```

- [ ] **Step 5: Commit**

```bash
git add -u
git add packages/cli/src/modules/frontend-builder/frontend-builder.errors.ts
git commit -m "feat(frontend-builder): add precondition and upstream error handling"
```

---

## Slice 6: E2E smoke test

**Goal:** One Playwright test proves the drawer end-to-end in the editor with v0 calls stubbed at the network layer.

**Files:**
- Create: `packages/testing/playwright/tests/e2e/frontend-builder/smoke.spec.ts`

- [ ] **Step 1: Write the test**

Create `packages/testing/playwright/tests/e2e/frontend-builder/smoke.spec.ts`:
```ts
import { nanoid } from 'nanoid';

import { test, expect } from '../../fixtures/base';
import type { TestRequirements } from '../../config/TestRequirements';

const requirements: TestRequirements = {
	storage: {
		N8N_EXPERIMENT_OVERRIDES: JSON.stringify({}),
	},
	capability: {
		env: {
			N8N_FRONTEND_BUILDER_ENABLED: 'true',
			TEST_ISOLATION: 'frontend-builder-smoke',
		},
	},
};

test.use({ requirements });

test('drawer generates, reloads, and rehydrates', async ({ n8n, page }) => {
	// Stub v0 calls at the n8n backend boundary — the backend itself falls back to FakeV0Client
	// when V0_API_KEY is unset, so the iframe gets a fake URL that we also stub.
	await page.route(/example\.invalid\/fake-demo\/.*/, (route) =>
		route.fulfill({ status: 200, contentType: 'text/html', body: '<h1>fake demo</h1>' }),
	);

	const workflowName = `fe-builder ${nanoid(6)}`;
	await n8n.start.fromBlankCanvas();
	await n8n.canvas.setWorkflowName(workflowName);
	await n8n.canvas.addNode('Webhook');
	await n8n.canvas.activateWorkflow();

	await page.getByTestId('canvas-create-frontend-button').click();
	await expect(page.getByTestId('frontend-builder-drawer')).toBeVisible();

	await page.getByTestId('frontend-builder-prompt').fill('hello world form');
	await page.getByTestId('frontend-builder-send').click();

	const iframe = page.frameLocator('iframe[title="Generated frontend preview"]');
	await expect(iframe.locator('h1')).toHaveText('fake demo');

	await page.reload();
	await page.getByTestId('canvas-create-frontend-button').click();
	await expect(iframe.locator('h1')).toHaveText('fake demo');
});
```
Align `n8n.canvas.setWorkflowName`, `addNode`, `activateWorkflow` with the actual API exposed by the existing page objects in `packages/testing/playwright/pages/`. If names differ, grep for them.

- [ ] **Step 2: Run the test locally**

Run:
```bash
pnpm --filter=n8n-playwright test:local tests/e2e/frontend-builder/smoke.spec.ts --reporter=list 2>&1 | tail -50
```
Expected: PASS. If it fails because of page-object naming, adapt.

- [ ] **Step 3: Run the janitor**

Run:
```bash
pnpm --filter=n8n-playwright janitor --file=tests/e2e/frontend-builder/smoke.spec.ts --verbose
```
Fix any violations it reports.

- [ ] **Step 4: Commit**

```bash
git add packages/testing/playwright/tests/e2e/frontend-builder
git commit -m "test(frontend-builder): add e2e smoke for drawer generate + rehydrate"
```

---

## Slice 7: Investigations — manual probing

**Goal:** Run the experiments that produce the report's findings. No production code changes required — this slice produces notes files inside the repo. Each investigation is a short checklist and a notes document.

**Files:**
- Create: `docs/superpowers/reports/v0-integration-poc/ejectability.md`
- Create: `docs/superpowers/reports/v0-integration-poc/cors.md`
- Create: `docs/superpowers/reports/v0-integration-poc/auth.md`
- Create: `docs/superpowers/reports/v0-integration-poc/pricing.md`
- Create: `docs/superpowers/reports/v0-integration-poc/iteration-ux.md`
- Create: `docs/superpowers/reports/v0-integration-poc/persistent-state.md`
- Create: `docs/superpowers/reports/v0-integration-poc/vercel-linking.md`
- Create: `docs/superpowers/reports/v0-integration-poc/superagent-outline.md`

Do each investigation serially. Each note starts as a stub — fill with observations.

- [ ] **Step 1: Ejectability — what the source looks like**

Run (inside a working spike session, with `V0_API_KEY` set):
```bash
node -e "
const { v0 } = require('v0-sdk');
(async () => {
  const c = await v0({ apiKey: process.env.V0_API_KEY }).chats.create({ message: 'a form with name + email' });
  const files = c.latestVersion?.files ?? [];
  for (const f of files) {
    console.log('===', f.name, '===');
    console.log(String(f.content).slice(0, 500));
  }
})();
"
```
Open `docs/superpowers/reports/v0-integration-poc/ejectability.md` and write:
- file list with sizes
- dependencies referenced (`package.json`, imports)
- whether the code compiles standalone with `vite` or `next`
- estimate of effort to host on n8n infra (rough LoC / deps we'd need)
- Commit: `docs: v0 PoC — ejectability findings`

- [ ] **Step 2: CORS — does the iframe hit the webhook cleanly?**

In the running dev instance, open a real v0-generated iframe and make it POST to a workflow's production webhook. Observe the browser devtools network tab.
Write to `cors.md`:
- request origin (exact domain)
- what header n8n currently returns
- whether the browser blocked the request
- recommended minimal patch (code diff if needed)
- Commit: `docs: v0 PoC — CORS findings`

- [ ] **Step 3: Auth — options for webhooks called by a generated FE**

Write to `auth.md`:
- observations about what can be safely placed in the iframe
- three options with pros/cons (signed URL; shared-token header; n8n session forwarding)
- recommended option for productionisation
- Commit: `docs: v0 PoC — auth findings`

- [ ] **Step 4: Pricing**

Read v0's public pricing page, plus observe `x-ratelimit-*` headers returned by the SDK. Write to `pricing.md`:
- per-generation credit cost observed
- plan tiers and what they unlock
- rate limits
- Commit: `docs: v0 PoC — pricing findings`

- [ ] **Step 5: Iteration UX — three optimisation options evaluated**

Write to `iteration-ux.md`:
- Current flow (list of steps)
- Option A: persistent test webhooks during drawer session — effort estimate, risks
- Option B: auto-pin latest execution when sending a follow-up — effort estimate, risks
- Option C: live execution view during drawer session — effort estimate, risks
- Recommendation
- Commit: `docs: v0 PoC — iteration UX options`

- [ ] **Step 6: Persistent state**

Write to `persistent-state.md`:
- whether v0 demos support localStorage / IndexedDB (they do, it's just a browser)
- productionisation options: a key/value endpoint in n8n, or piggyback on a workflow
- Commit: `docs: v0 PoC — persistent state findings`

- [ ] **Step 7: Vercel linking / custom domains**

Probe `v0.deployments.create()` and/or `v0.projects.*`. Write to `vercel-linking.md`:
- what API exists
- whether a custom domain can be pointed at a chat's demo
- whether a user's own Vercel account can own the deployment
- Commit: `docs: v0 PoC — Vercel linking findings`

- [ ] **Step 8: Superagent outline**

Write to `superagent-outline.md`:
- sketch of how `POST /workflows/:id/frontend/messages` becomes an Instance AI tool (tool name, parameters, authorization)
- UX change in the chat when a generation is triggered (inline iframe, link, both)
- risks (latency, cost per message, error surfacing)
- Commit: `docs: v0 PoC — superagent integration outline`

---

## Slice 8: Consolidated PoC report

**Goal:** One cohesive report that the organisation can read without digging into sub-notes.

**Files:**
- Create: `docs/superpowers/reports/v0-integration-poc/README.md`

- [ ] **Step 1: Write the report**

Create `docs/superpowers/reports/v0-integration-poc/README.md` with these sections, pulling in content from the Slice 7 notes:

1. **TL;DR** (3-5 bullets, including go / no-go recommendation)
2. **What we built** — short description + link to the spec + a screenshot or video
3. **Responsibility line between v0 and n8n** — short paragraph + bullets
4. **Ejectability** — 1-page summary + link to `ejectability.md`
5. **Deployment / Vercel linking** — summary + link to `vercel-linking.md`
6. **CORS** — summary + link to `cors.md`
7. **Auth on webhooks called by the FE** — summary + link to `auth.md`
8. **Pricing / rate limits** — summary + link to `pricing.md`
9. **Iteration UX** — summary + link to `iteration-ux.md`
10. **Persistent state** — summary + link to `persistent-state.md`
11. **Instance AI integration outline** — summary + link to `superagent-outline.md`
12. **Recommendation**
13. **Follow-up tickets** — bulleted list of concrete linear tickets to file

- [ ] **Step 2: Verify links and content**

Run:
```bash
grep -rn "](./" docs/superpowers/reports/v0-integration-poc/
```
Make sure every link resolves.

- [ ] **Step 3: Final build + lint + typecheck pass**

Run:
```bash
pnpm --filter=n8n build > build.log 2>&1 && tail -20 build.log
pushd packages/cli && pnpm lint && pnpm typecheck && popd
pushd packages/frontend/editor-ui && pnpm lint && pnpm typecheck && popd
```
Expected: all clean.

- [ ] **Step 4: Commit**

```bash
git add docs/superpowers/reports/v0-integration-poc/README.md
git commit -m "docs: v0 integration PoC report"
```

- [ ] **Step 5: Open a draft PR**

Run (adapt `Linear ticket URL` if the spike has one):
```bash
gh pr create --draft --title "feat(frontend-builder): v0 integration PoC (spike)" --body "$(cat <<'EOF'
## Summary

Spike implementation of a "Frontend" button on activated workflows that generates and iteratively refines a frontend via Vercel's v0 Platform API.

- New backend module `frontend-builder` wrapping `v0-sdk` behind an `IV0Client`
- Canvas-level Frontend button + side drawer with chat UI + iframe preview
- `workflow.staticData.global.v0Chat = { chatId }` persistence; v0 is authoritative for messages and `demoUrl`
- Eight investigations and a consolidated report under `docs/superpowers/reports/v0-integration-poc/`

Spec: docs/superpowers/specs/2026-04-22-v0-integration-poc-design.md
Plan: docs/superpowers/plans/2026-04-22-v0-integration-poc.md
Report: docs/superpowers/reports/v0-integration-poc/README.md

## Test plan

- [ ] Integration tests pass: `pushd packages/cli && pnpm test:integration src/modules/frontend-builder && popd`
- [ ] Unit tests pass: `pushd packages/cli && pnpm test src/modules/frontend-builder/core && popd`
- [ ] Playwright smoke: `pnpm --filter=n8n-playwright test:local tests/e2e/frontend-builder/smoke.spec.ts`
- [ ] Manual smoke with real V0_API_KEY against a live workflow

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

---

## Self-review notes

Spec coverage check (each spec section mapped to at least one slice):

- §2 North-star flow → Slices 1–4 together
- §3 Architecture → Slice 1 structure + Slice 2 boundary swap
- §4 Scope — what's built → Slices 1–6; what's report-only → Slices 7–8
- §5 Preconditions → Slice 5 validation
- §6 Data flow → Slices 1 (POST), 3 (GET + rehydrate), 4 (prompt composition)
- §7 Persistence (`staticData.v0Chat`) → Slice 1 Step 3
- §8 API surface → Slices 1 (POST) + 3 (GET)
- §9 Code layout → enforced across slices
- §10 Testing strategy → Slices 1, 4 (unit), 3/5 (integration), 6 (E2E)
- §11 Feature gating → Slice 2 Steps 2 + 4
- §12 Error handling → Slice 5
- §13 Report deliverable → Slices 7 + 8
- §14 Milestones → matches slice ordering
- §15 Open implementation details → flagged in Slice 2 Step 3 comments

Placeholder scan: no "TODO"/"TBD"/"fill in later" placeholders in runnable steps; two notes flag areas where existing n8n patterns must be confirmed via grep (test-helpers, InternalServerError subclass) — these are concrete lookups, not hand-waving.

Type consistency: `IV0Client` + `V0ChatResult` + `FrontendBuilderMessage` + `FrontendBuilderStateResponse` + `FrontendBuilderMessageResponse` used the same way across slices. `staticData.global.v0Chat = { chatId }` shape identical in service reads and writes.
