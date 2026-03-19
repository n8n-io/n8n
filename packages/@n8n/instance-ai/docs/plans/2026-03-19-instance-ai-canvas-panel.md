# Instance AI Canvas Panel — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the old AI Workflow Builder on the canvas with Instance AI when the `instance-ai` module is enabled, with per-workflow thread scoping, a thread picker dropdown, canvas context injection, and real-time workflow updates.

**Architecture:** The canvas side panel (`AppChatPanel.vue`) conditionally renders either the old `AssistantsHub` or a new `InstanceAiCanvasPanel` based on module enablement. Instance AI threads are scoped to workflows via `metadata.workflowId`. A header dropdown lets users switch between recent threads (workflow-scoped + global). Canvas context (selected nodes, workflow info) is sent with each message. A new `workflow-updated` SSE event pushes canvas changes in real-time.

**Tech Stack:** Vue 3, Pinia, TypeScript, Zod, Jest (backend), Vitest (frontend), Playwright (E2E)

**Key docs to read first:**
- `packages/@n8n/instance-ai/docs/architecture.md`
- `packages/@n8n/instance-ai/docs/streaming-protocol.md`
- `packages/frontend/editor-ui/src/features/ai/instanceAi/InstanceAiView.vue` (full-page view to mirror)
- `packages/frontend/editor-ui/src/features/ai/assistant/components/AssistantsHub.vue` (component being replaced)

---

## Task 1: Extend ChatPanelMode type

**Files:**
- Modify: `packages/frontend/editor-ui/src/features/ai/assistant/chatPanelState.store.ts`

**Step 1: Add `'instance-ai'` to the ChatPanelMode union**

```typescript
export type ChatPanelMode = 'assistant' | 'builder' | 'instance-ai';
```

**Step 2: Run typecheck**

```bash
pushd packages/frontend/editor-ui && pnpm typecheck 2>&1 | tail -20
```

Expected: Any existing code using `ChatPanelMode` still compiles (union is wider, not narrower).

**Step 3: Commit**

```bash
git add packages/frontend/editor-ui/src/features/ai/assistant/chatPanelState.store.ts
git commit -m "feat(editor): add 'instance-ai' to ChatPanelMode union"
```

---

## Task 2: Add Instance AI enabled views constant

**Files:**
- Modify: `packages/frontend/editor-ui/src/features/ai/assistant/constants.ts`

**Step 1: Add INSTANCE_AI_ENABLED_VIEWS**

```typescript
import { EDITABLE_CANVAS_VIEWS, VIEWS } from '@/app/constants';

// ... existing exports ...

/**
 * Views where the Instance AI canvas panel can be shown
 */
export const INSTANCE_AI_ENABLED_VIEWS = [...EDITABLE_CANVAS_VIEWS] as const;
```

**Step 2: Run typecheck**

```bash
pushd packages/frontend/editor-ui && pnpm typecheck 2>&1 | tail -20
```

Expected: PASS

**Step 3: Commit**

```bash
git add packages/frontend/editor-ui/src/features/ai/assistant/constants.ts
git commit -m "feat(editor): add INSTANCE_AI_ENABLED_VIEWS constant"
```

---

## Task 3: Write failing tests for chatPanel.store mode resolution

**Files:**
- Create or modify: `packages/frontend/editor-ui/src/features/ai/assistant/__tests__/chatPanel.store.test.ts`

**Step 1: Write the failing tests**

Check if test file exists first. If not, create it with these tests. If it exists, extend it.

```typescript
import { describe, test, expect, vi, beforeEach } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';

// Mock dependencies required by chatPanel.store
vi.mock('@/app/stores/ui.store', () => ({
	useUIStore: vi.fn().mockReturnValue({ appGridDimensions: { width: 1200, height: 800 } }),
}));

vi.mock('vue-router', () => ({
	useRoute: vi.fn().mockReturnValue({ name: 'NodeViewNew' }),
}));

vi.mock('@/app/stores/settings.store', () => ({
	useSettingsStore: vi.fn().mockReturnValue({
		isAiAssistantEnabled: true,
		isAiAssistantOrBuilderEnabled: true,
		isModuleActive: vi.fn().mockReturnValue(false),
	}),
}));

vi.mock('@/app/stores/workflows.store', () => ({
	useWorkflowsStore: vi.fn().mockReturnValue({ workflowId: 'wf-1' }),
}));

vi.mock('@/app/stores/posthog.store', () => ({
	usePostHog: vi.fn().mockReturnValue({
		isFeatureEnabled: vi.fn().mockReturnValue(false),
		isVariantEnabled: vi.fn().mockReturnValue(false),
	}),
}));

vi.mock('@n8n/i18n', () => ({
	useI18n: vi.fn().mockReturnValue({ baseText: vi.fn((key: string) => key) }),
}));

vi.mock('@/features/ai/assistant/builder.store', () => ({
	useBuilderStore: vi.fn().mockReturnValue({
		isAIBuilderEnabled: true,
		chatMessages: [],
		streaming: false,
		fetchBuilderCredits: vi.fn(),
		loadSessions: vi.fn(),
		resetBuilderChat: vi.fn(),
	}),
}));

vi.mock('@/features/ai/assistant/assistant.store', () => ({
	useAssistantStore: vi.fn().mockReturnValue({
		chatMessages: [],
		isSessionEnded: false,
		$onAction: vi.fn().mockReturnValue(vi.fn()),
		resetAssistantChat: vi.fn(),
	}),
}));

import { useChatPanelStore } from '../chatPanel.store';
import { useSettingsStore } from '@/app/stores/settings.store';

describe('chatPanel.store - instance-ai mode resolution', () => {
	beforeEach(() => {
		setActivePinia(createPinia());
		vi.clearAllMocks();
	});

	test('resolves builder mode to instance-ai when module is active', () => {
		const settingsStore = useSettingsStore();
		vi.mocked(settingsStore.isModuleActive).mockReturnValue(true);

		const store = useChatPanelStore();
		store.switchMode('builder');

		expect(store.activeMode).toBe('instance-ai');
	});

	test('keeps builder mode when instance-ai module is inactive', () => {
		const settingsStore = useSettingsStore();
		vi.mocked(settingsStore.isModuleActive).mockReturnValue(false);

		const store = useChatPanelStore();
		store.switchMode('builder');

		expect(store.activeMode).toBe('builder');
	});

	test('canShowAiButtonOnCanvas is true when instance-ai module is active on canvas view', () => {
		const settingsStore = useSettingsStore();
		vi.mocked(settingsStore.isModuleActive).mockReturnValue(true);

		const store = useChatPanelStore();
		expect(store.canShowAiButtonOnCanvas).toBe(true);
	});
});
```

**Step 2: Run test to verify it fails**

```bash
pushd packages/frontend/editor-ui && pnpm test src/features/ai/assistant/__tests__/chatPanel.store.test.ts 2>&1 | tail -30
```

Expected: FAIL — `store.activeMode` is `'builder'` not `'instance-ai'` (feature not implemented yet).

**Step 3: Commit failing test**

```bash
git add packages/frontend/editor-ui/src/features/ai/assistant/__tests__/chatPanel.store.test.ts
git commit -m "test(editor): add failing tests for instance-ai mode resolution"
```

---

## Task 4: Implement chatPanel.store mode resolution

**Files:**
- Modify: `packages/frontend/editor-ui/src/features/ai/assistant/chatPanel.store.ts`

**Step 1: Update resolveMode and view gating**

In `chatPanel.store.ts`, update `resolveMode()`:

```typescript
// Add import at top
import { INSTANCE_AI_ENABLED_VIEWS } from './constants';

// Update resolveMode:
function resolveMode(mode: ChatPanelMode): ChatPanelMode {
	if (mode === 'assistant' && isMergeAskBuildEnabled.value) {
		return 'builder';
	}
	// When instance-ai module is active, redirect builder to instance-ai
	if ((mode === 'builder' || mode === 'assistant') && settingsStore.isModuleActive('instance-ai')) {
		return 'instance-ai';
	}
	return mode;
}
```

Update `canShowAiButtonOnCanvas`:

```typescript
const canShowAiButtonOnCanvas = computed(
	() =>
		(settingsStore.isAiAssistantOrBuilderEnabled || settingsStore.isModuleActive('instance-ai')) &&
		EDITABLE_CANVAS_VIEWS.includes(route.name as VIEWS),
);
```

Add view-gating for `'instance-ai'` mode in `open()` and `switchMode()` — add `INSTANCE_AI_ENABLED_VIEWS` alongside existing `BUILDER_ENABLED_VIEWS` and `ASSISTANT_ENABLED_VIEWS` checks:

```typescript
// In open() and switchMode(), add:
const enabledViews =
	chatPanelStateStore.activeMode === 'assistant'
		? ASSISTANT_ENABLED_VIEWS
		: chatPanelStateStore.activeMode === 'instance-ai'
			? INSTANCE_AI_ENABLED_VIEWS
			: BUILDER_ENABLED_VIEWS;
```

Add computed:

```typescript
const isInstanceAiModeActive = computed(() => chatPanelStateStore.activeMode === 'instance-ai');
```

Expose `isInstanceAiModeActive` in the return object.

**Step 2: Run test to verify it passes**

```bash
pushd packages/frontend/editor-ui && pnpm test src/features/ai/assistant/__tests__/chatPanel.store.test.ts 2>&1 | tail -30
```

Expected: PASS

**Step 3: Run typecheck**

```bash
pushd packages/frontend/editor-ui && pnpm typecheck 2>&1 | tail -20
```

Expected: PASS

**Step 4: Commit**

```bash
git add packages/frontend/editor-ui/src/features/ai/assistant/chatPanel.store.ts
git commit -m "feat(editor): resolve builder mode to instance-ai when module is active"
```

---

## Task 5: Add workflowId to API types

**Files:**
- Modify: `packages/@n8n/api-types/src/schemas/instance-ai.schema.ts`

**Step 1: Add workflowId to thread and request types**

In `InstanceAiThreadInfo`, add:

```typescript
export interface InstanceAiThreadInfo {
	id: string;
	title?: string;
	resourceId: string;
	workflowId?: string; // NEW — workflow this thread is scoped to
	createdAt: string;
	updatedAt: string;
	metadata?: Record<string, unknown>;
}
```

In `InstanceAiThreadSummary`, add:

```typescript
export interface InstanceAiThreadSummary {
	id: string;
	title: string;
	workflowId?: string; // NEW
	lastMessagePreview?: string; // NEW — truncated last message for thread picker
	createdAt: string;
}
```

In `InstanceAiSendMessageRequest`, add:

```typescript
export interface InstanceAiSendMessageRequest {
	message: string;
	researchMode?: boolean;
	attachments?: InstanceAiAttachment[];
	canvasContext?: InstanceAiCanvasContext; // NEW — Phase 5
}
```

Add canvas context type (for Phase 5, but define now to avoid revisiting):

```typescript
// ---------------------------------------------------------------------------
// Canvas context (sent with messages from the canvas panel)
// ---------------------------------------------------------------------------

export const instanceAiCanvasContextSchema = z.object({
	workflowId: z.string(),
	workflowName: z.string(),
	selectedNodes: z
		.array(
			z.object({
				name: z.string(),
				type: z.string(),
				parameters: z.record(z.unknown()).optional(),
			}),
		)
		.optional(),
	nodeCount: z.number().optional(),
});

export type InstanceAiCanvasContext = z.infer<typeof instanceAiCanvasContextSchema>;
```

**Step 2: Run typecheck**

```bash
pushd packages/@n8n/api-types && pnpm typecheck 2>&1 | tail -20
```

Expected: PASS (all additions are optional fields)

**Step 3: Commit**

```bash
git add packages/@n8n/api-types/src/schemas/instance-ai.schema.ts
git commit -m "feat(api-types): add workflowId to thread types and canvas context schema"
```

---

## Task 6: Write failing tests for backend thread scoping

**Files:**
- Modify: `packages/cli/src/modules/instance-ai/__tests__/instance-ai-memory.service.test.ts`

**Step 1: Write the failing tests**

Add to the existing test file:

```typescript
describe('InstanceAiMemoryService.ensureThread with workflowId', () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	it('stores workflowId in thread metadata when provided', async () => {
		mockGetThreadById.mockResolvedValueOnce(null);
		mockSaveThread.mockResolvedValueOnce({
			id: 'thread-wf',
			title: '',
			resourceId: 'user-1',
			metadata: { workflowId: 'wf-123' },
			createdAt: new Date('2026-01-01T00:00:00.000Z'),
			updatedAt: new Date('2026-01-01T00:00:00.000Z'),
		});

		const result = await service.ensureThread('user-1', 'thread-wf', { workflowId: 'wf-123' });

		expect(mockSaveThread).toHaveBeenCalledWith({
			thread: expect.objectContaining({
				metadata: expect.objectContaining({ workflowId: 'wf-123' }),
			}),
		});
		expect(result.thread.workflowId).toBe('wf-123');
	});

	it('returns workflowId from existing thread metadata', async () => {
		mockGetThreadById.mockResolvedValueOnce({
			id: 'thread-existing',
			title: 'Existing',
			resourceId: 'user-1',
			metadata: { workflowId: 'wf-456' },
			createdAt: new Date('2026-01-01T00:00:00.000Z'),
			updatedAt: new Date('2026-01-01T00:00:00.000Z'),
		});

		const result = await service.ensureThread('user-1', 'thread-existing');

		expect(result.thread.workflowId).toBe('wf-456');
	});
});

describe('InstanceAiMemoryService.findThreadByWorkflowId', () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	it('returns thread matching workflowId for the user', async () => {
		mockListThreads.mockResolvedValueOnce({
			threads: [
				{
					id: 't-1',
					title: 'Thread 1',
					resourceId: 'user-1',
					metadata: { workflowId: 'wf-target' },
					createdAt: new Date(),
					updatedAt: new Date(),
				},
				{
					id: 't-2',
					title: 'Thread 2',
					resourceId: 'user-1',
					metadata: { workflowId: 'wf-other' },
					createdAt: new Date(),
					updatedAt: new Date(),
				},
			],
			total: 2,
			page: 1,
			hasMore: false,
		});

		const result = await service.findThreadByWorkflowId('user-1', 'wf-target');

		expect(result).not.toBeNull();
		expect(result!.id).toBe('t-1');
	});

	it('returns null when no thread matches workflowId', async () => {
		mockListThreads.mockResolvedValueOnce({
			threads: [],
			total: 0,
			page: 1,
			hasMore: false,
		});

		const result = await service.findThreadByWorkflowId('user-1', 'wf-missing');

		expect(result).toBeNull();
	});
});
```

**Step 2: Run test to verify it fails**

```bash
pushd packages/cli && pnpm test src/modules/instance-ai/__tests__/instance-ai-memory.service.test.ts 2>&1 | tail -30
```

Expected: FAIL — `ensureThread` doesn't accept options, `findThreadByWorkflowId` doesn't exist, `workflowId` not on response.

**Step 3: Commit**

```bash
git add packages/cli/src/modules/instance-ai/__tests__/instance-ai-memory.service.test.ts
git commit -m "test(instance-ai): add failing tests for thread scoping by workflowId"
```

---

## Task 7: Implement backend thread scoping

**Files:**
- Modify: `packages/cli/src/modules/instance-ai/instance-ai-memory.service.ts`
- Modify: `packages/cli/src/modules/instance-ai/instance-ai.controller.ts`

**Step 1: Update ensureThread to accept workflowId**

In `instance-ai-memory.service.ts`, change `ensureThread` signature:

```typescript
async ensureThread(
	userId: string,
	threadId: string,
	options?: { workflowId?: string },
): Promise<InstanceAiEnsureThreadResponse> {
	const memory = this.createMemoryInstance();
	const existing = await memory.getThreadById({ threadId });
	if (existing) {
		if (existing.resourceId !== userId) {
			throw new Error(`Thread ${threadId} is not owned by user ${userId}`);
		}

		return {
			thread: this.toThreadInfo(existing),
			created: false,
		};
	}

	const now = new Date();
	const metadata = options?.workflowId ? { workflowId: options.workflowId } : undefined;
	const created = await memory.saveThread({
		thread: {
			id: threadId,
			resourceId: userId,
			title: '',
			metadata,
			createdAt: now,
			updatedAt: now,
		},
	});

	return {
		thread: this.toThreadInfo(created),
		created: true,
	};
}
```

**Step 2: Add findThreadByWorkflowId**

```typescript
async findThreadByWorkflowId(
	userId: string,
	workflowId: string,
): Promise<InstanceAiThreadInfo | null> {
	const memory = this.createMemoryInstance();
	const result = await memory.listThreads({ resourceId: userId, limit: 100 });
	const match = result.threads.find(
		(t) =>
			t.metadata &&
			typeof t.metadata === 'object' &&
			'workflowId' in t.metadata &&
			t.metadata.workflowId === workflowId,
	);
	return match ? this.toThreadInfo(match) : null;
}
```

**Step 3: Update toThreadInfo to extract workflowId**

```typescript
private toThreadInfo(thread: {
	id: string;
	title?: string;
	resourceId: string;
	metadata?: Record<string, unknown>;
	createdAt: Date;
	updatedAt: Date;
}): InstanceAiThreadInfo {
	const workflowId =
		thread.metadata &&
		typeof thread.metadata === 'object' &&
		'workflowId' in thread.metadata &&
		typeof thread.metadata.workflowId === 'string'
			? thread.metadata.workflowId
			: undefined;

	return {
		id: thread.id,
		title: thread.title,
		resourceId: thread.resourceId,
		workflowId,
		createdAt: thread.createdAt.toISOString(),
		updatedAt: thread.updatedAt.toISOString(),
		metadata: thread.metadata,
	};
}
```

**Step 4: Update controller to accept workflowId**

In `instance-ai.controller.ts`, update the `ensureThread` endpoint:

```typescript
@Post('/threads')
async ensureThread(req: AuthenticatedRequest) {
	const { threadId, workflowId } = req.body as { threadId?: string; workflowId?: string };
	const requestedThreadId =
		typeof threadId === 'string' && threadId.trim().length > 0 ? threadId : randomUUID();

	await this.assertThreadAccess(req.user.id, requestedThreadId, { allowNew: true });
	const safeWorkflowId = typeof workflowId === 'string' ? workflowId : undefined;
	return await this.memoryService.ensureThread(req.user.id, requestedThreadId, {
		workflowId: safeWorkflowId,
	});
}
```

**Step 5: Run test to verify it passes**

```bash
pushd packages/cli && pnpm test src/modules/instance-ai/__tests__/instance-ai-memory.service.test.ts 2>&1 | tail -30
```

Expected: PASS

**Step 6: Run typecheck**

```bash
pushd packages/cli && pnpm typecheck 2>&1 | tail -20
```

Expected: PASS

**Step 7: Commit**

```bash
git add packages/cli/src/modules/instance-ai/instance-ai-memory.service.ts packages/cli/src/modules/instance-ai/instance-ai.controller.ts
git commit -m "feat(instance-ai): add workflowId thread scoping to memory service and controller"
```

---

## Task 8: Create InstanceAiCanvasPanel.vue shell

**Files:**
- Create: `packages/frontend/editor-ui/src/features/ai/instanceAi/components/InstanceAiCanvasPanel.vue`

**Step 1: Create the component**

This is a UI component — start with a minimal shell that renders the Instance AI chat. Mirror the structure of `InstanceAiView.vue` but without the sidebar. Reference `InstanceAiView.vue` (465 lines) for the full pattern.

```vue
<script lang="ts" setup>
import { computed, onMounted, onUnmounted, ref, useTemplateRef } from 'vue';
import { N8nIconButton, N8nScrollArea, N8nText } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { useInstanceAiStore } from '../instanceAi.store';
import { useInstanceAiSettingsStore } from '../instanceAiSettings.store';
import { useWorkflowsStore } from '@/app/stores/workflows.store';
import InstanceAiMessage from './InstanceAiMessage.vue';
import InstanceAiInput from './InstanceAiInput.vue';
import InstanceAiEmptyState from './InstanceAiEmptyState.vue';
import InstanceAiStatusBar from './InstanceAiStatusBar.vue';
import type { InstanceAiAttachment } from '@n8n/api-types';

const emit = defineEmits<{ close: [] }>();

const store = useInstanceAiStore();
const settingsStore = useInstanceAiSettingsStore();
const workflowsStore = useWorkflowsStore();
const i18n = useI18n();

const scrollableRef = useTemplateRef<HTMLElement>('scrollable');

// Current workflow context
const workflowId = computed(() => workflowsStore.workflowId);
const currentThreadLabel = computed(() => {
	// TODO: Phase 4 — show workflow name or "Global" from thread picker
	return workflowsStore.workflowName || i18n.baseText('instanceAi.canvas.defaultTitle');
});

onMounted(async () => {
	// Connect SSE and load thread for this workflow
	// TODO: Phase 3 — ensureWorkflowThread(workflowId.value)
	store.connectSSE();
	await store.loadHistoricalMessages(store.currentThreadId);

	void settingsStore
		.refreshModuleSettings()
		.catch(() => {})
		.then(() => {
			if (!settingsStore.isLocalGatewayDisabled) {
				settingsStore.startDaemonProbing();
				settingsStore.startGatewayPushListener();
				settingsStore.pollGatewayStatus();
			}
		});
});

onUnmounted(() => {
	store.closeSSE();
	settingsStore.stopDaemonProbing();
	settingsStore.stopGatewayPolling();
	settingsStore.stopGatewayPushListener();
});

async function handleSendMessage(message: string, attachments?: InstanceAiAttachment[]) {
	await store.sendMessage(message, attachments);
}

function handleCancel() {
	void store.cancelRun();
}
</script>

<template>
	<div :class="$style.panel">
		<div :class="$style.header">
			<N8nText size="medium" :bold="true" :class="$style.headerTitle">
				{{ currentThreadLabel }}
			</N8nText>
			<N8nIconButton
				icon="x"
				variant="ghost"
				size="small"
				data-test-id="instance-ai-canvas-close"
				@click="emit('close')"
			/>
		</div>

		<N8nScrollArea
			type="scroll"
			:enable-vertical-scroll="true"
			:enable-horizontal-scroll="false"
			as-child
			:class="$style.scrollArea"
		>
			<div ref="scrollable" :class="$style.scrollable">
				<div v-if="!store.hasMessages" :class="$style.emptyWrapper">
					<InstanceAiEmptyState />
				</div>
				<div v-else role="log" aria-live="polite" :class="$style.messageList">
					<InstanceAiMessage
						v-for="message in store.messages"
						:key="message.id"
						:message="message"
					/>
				</div>

				<div :class="$style.inputContainer">
					<InstanceAiStatusBar />
					<InstanceAiInput
						:is-streaming="store.isStreaming"
						data-test-id="instance-ai-canvas-input"
						@send="handleSendMessage"
						@cancel="handleCancel"
					/>
				</div>
			</div>
		</N8nScrollArea>
	</div>
</template>

<style lang="scss" module>
.panel {
	display: flex;
	flex-direction: column;
	height: 100%;
	background-color: var(--color--background--light-2);
}

.header {
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding: var(--spacing--xs) var(--spacing--sm);
	border-bottom: var(--border);
	flex-shrink: 0;
	min-height: 48px;
}

.headerTitle {
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.scrollArea {
	flex-grow: 1;
	flex-shrink: 1;
}

.scrollable {
	width: 100%;
	min-height: 100%;
	display: flex;
	flex-direction: column;
}

.emptyWrapper {
	flex: 1;
	display: flex;
	align-items: center;
	justify-content: center;
}

.messageList {
	flex: 1;
	display: flex;
	flex-direction: column;
	gap: var(--spacing--xl);
	padding: var(--spacing--xl) var(--spacing--sm);
	padding-bottom: 200px;
}

.inputContainer {
	position: sticky;
	bottom: 0;
	padding: var(--spacing--sm);
	background: linear-gradient(transparent 0%, var(--color--background--light-2) 30%);
}
</style>
```

**Step 2: Verify component compiles**

```bash
pushd packages/frontend/editor-ui && pnpm typecheck 2>&1 | tail -20
```

Expected: PASS (component not yet rendered, just compiled)

**Step 3: Commit**

```bash
git add packages/frontend/editor-ui/src/features/ai/instanceAi/components/InstanceAiCanvasPanel.vue
git commit -m "feat(editor): create InstanceAiCanvasPanel shell component"
```

---

## Task 9: Wire conditional rendering in AppChatPanel.vue

**Files:**
- Modify: `packages/frontend/editor-ui/src/app/components/app/AppChatPanel.vue`

**Step 1: Add conditional rendering**

```vue
<script setup lang="ts">
import AssistantsHub from '@/features/ai/assistant/components/AssistantsHub.vue';
import InstanceAiCanvasPanel from '@/features/ai/instanceAi/components/InstanceAiCanvasPanel.vue';
import { useChatPanelStore } from '@/features/ai/assistant/chatPanel.store';
import { useChatHubPanelStore } from '@/features/ai/chatHub/chatHubPanel.store';
import { useSettingsStore } from '@/app/stores/settings.store';
import { useUIStore } from '@/app/stores/ui.store';
import { useProvideWorkflowId } from '@/app/composables/useProvideWorkflowId';
import { computed, nextTick, onBeforeUnmount, onMounted, watch } from 'vue';

const props = defineProps<{
	layoutRef: Element | null;
}>();

useProvideWorkflowId();

const chatPanelStore = useChatPanelStore();
const chatHubPanelStore = useChatHubPanelStore();
const settingsStore = useSettingsStore();
const uiStore = useUIStore();

const chatPanelWidth = computed(() => chatPanelStore.width);
const isInstanceAiActive = computed(() => settingsStore.isModuleActive('instance-ai'));

const updateGridWidth = async () => {
	await nextTick();
	if (props.layoutRef) {
		const { width, height } = props.layoutRef.getBoundingClientRect();
		uiStore.appGridDimensions = { width, height };
	}
};

onMounted(async () => {
	window.addEventListener('resize', updateGridWidth);
	await updateGridWidth();
});

onBeforeUnmount(() => {
	window.removeEventListener('resize', updateGridWidth);
});

watch(chatPanelWidth, async () => {
	if (chatHubPanelStore.isOpen) return;
	await updateGridWidth();
});

function handleClose() {
	chatPanelStore.close();
}
</script>

<template>
	<InstanceAiCanvasPanel v-if="isInstanceAiActive" @close="handleClose" />
	<AssistantsHub v-else />
</template>
```

**Step 2: Run typecheck**

```bash
pushd packages/frontend/editor-ui && pnpm typecheck 2>&1 | tail -20
```

Expected: PASS

**Step 3: Commit**

```bash
git add packages/frontend/editor-ui/src/app/components/app/AppChatPanel.vue
git commit -m "feat(editor): conditionally render Instance AI or old builder on canvas"
```

---

## Tasks 10-20: Remaining phases (summarized)

The remaining tasks follow the same TDD pattern. Each is a bite-sized unit:

**Task 10:** Write failing tests for frontend thread resolution (`ensureWorkflowThread`, `switchToGlobalThread`) in `instanceAi.store.test.ts`
**Task 11:** Implement `ensureWorkflowThread` and `switchToGlobalThread` in `instanceAi.store.ts` + `instanceAi.api.ts`
**Task 12:** Wire `ensureWorkflowThread` into `InstanceAiCanvasPanel.vue` on mount
**Task 13:** Handle unsaved workflows — test + implement fallback to global thread
**Task 14:** Create `InstanceAiThreadPicker.vue` component (header dropdown)
**Task 15:** Wire thread picker into `InstanceAiCanvasPanel.vue`
**Task 16:** Write failing test for `useCanvasContext` composable
**Task 17:** Implement `useCanvasContext.ts` — reads from `injectWorkflowDocumentStore()` + `useUIStore()`
**Task 18:** Wire canvas context into `sendMessage` flow (store → API → controller → service → system prompt)
**Task 19:** Write failing test for system prompt canvas context section
**Task 20:** Implement canvas context in `system-prompt.ts`
**Task 21:** Add `workflow-updated` event to schema + discriminated union
**Task 22:** Write failing tests for workflow tools emitting `workflow-updated` events
**Task 23:** Implement `workflow-updated` emission in create/update workflow tools
**Task 24:** Write failing test for reducer handling `workflow-updated`
**Task 25:** Implement reducer handler + canvas update application via `useWorkflowUpdate()`
**Task 26:** Add i18n keys to `en.json` for all canvas panel UI text
**Task 27:** Add telemetry events using `useTelemetry()` composable
**Task 28:** Create E2E page object `InstanceAiCanvasPanelPage.ts`
**Task 29:** Create E2E fixtures `instance-ai-canvas-fixtures.ts`
**Task 30:** Write E2E test specs `instance-ai-canvas.spec.ts`
**Task 31:** Register page object in `n8nPage.ts` + run janitor

---

## Verification

After all tasks complete:

1. `N8N_ENABLED_MODULES=instance-ai` → Instance AI panel on canvas
2. Module disabled → old AI WFB fallback
3. Workflow A → chat → workflow B → different thread → back to A → same conversation
4. Thread picker → switch threads → instant swap, unread dots
5. Select nodes → send message → agent references them
6. Agent builds workflow → nodes appear on canvas in real-time
7. Node error → click assistant → Instance AI opens with error context
8. `pnpm typecheck` passes in all affected packages
9. All unit tests pass
10. E2E tests pass: `pnpm --filter=n8n-playwright test:local tests/e2e/ai/instance-ai-canvas.spec.ts`
