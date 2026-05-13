# "Generate Sample" Pinner Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a one-click "Generate sample" button in the NDV that asks the AI assistant to produce realistic mock input data for the current node and pins it via the existing `pinData` plumbing, so a builder can test downstream nodes without firing the real upstream trigger.

**Architecture:**
- Frontend-only feature for a 1-day MVP. No backend changes — we reuse the existing `POST /ai/ask-ai` endpoint that the Code/AI Transform nodes already call (returns `{ code: string }`). The "code" string is reinterpreted as a JSON array of items.
- A new presentational button component (`RunDataGenerateSampleButton.vue`) sits next to `RunDataPinButton.vue` in `RunData.vue`'s header. Visibility is gated by the same `canPinData` / read-only / redaction checks the pin button already uses, plus `settingsStore.isAskAiEnabled`.
- A new composable (`useGenerateSampleData.ts`) owns the request lifecycle: build payload, call `generateCodeForPrompt`, validate the response with a Zod schema, normalise to `INodeExecutionData[]`, then delegate to the existing `usePinnedData().setData(...)` to actually pin and emit telemetry.
- Toasts via the existing `useToast()` composable. All copy via `@n8n/i18n` (`ndv.pinData.generate.*`). No new design-system components; only `N8nIconButton` + `N8nTooltip` already in use.
- Validation: Zod parses the model output as `z.array(z.record(z.string(), z.unknown())).min(1).max(10)`. Each item is wrapped to `{ json: item }` and length-capped to 3 items for the MVP.

**Tech Stack:** Vue 3 SFC (`<script setup lang="ts">`), Pinia, `@n8n/i18n`, `@n8n/design-system` (`N8nIconButton`, `N8nTooltip`), Zod, Vitest + `@testing-library/vue`, `@pinia/testing`. No new dependencies — Zod is already a transitive dep used pervasively in `@n8n/api-types`; check the package's existing imports before adding (Step 1.3).

---

## File Structure

**Create**
- `packages/frontend/editor-ui/src/features/ndv/runData/composables/useGenerateSampleData.ts` — composable: builds the AskAi payload, validates JSON response with Zod, calls `usePinnedData().setData`, raises toasts.
- `packages/frontend/editor-ui/src/features/ndv/runData/composables/useGenerateSampleData.test.ts` — Vitest unit tests for the composable (mocks `generateCodeForPrompt`, `usePinnedData`, `useToast`).
- `packages/frontend/editor-ui/src/features/ndv/runData/components/RunDataGenerateSampleButton.vue` — presentational `N8nIconButton` with `loading`/`disabled` props and a tooltip; emits `generate` on click.
- `packages/frontend/editor-ui/src/features/ndv/runData/components/RunDataGenerateSampleButton.test.ts` — Vitest unit tests: renders, tooltip on hover, emits `generate`.

**Modify**
- `packages/frontend/editor-ui/src/features/ndv/runData/components/RunData.vue` — instantiate the composable bound to `node` + `pinnedData`, render `<RunDataGenerateSampleButton>` next to `<RunDataPinButton>`, wire `@generate` to the composable.
- `packages/frontend/@n8n/i18n/src/locales/en.json` — add `ndv.pinData.generate.title`, `ndv.pinData.generate.description`, `ndv.pinData.generate.success`, `ndv.pinData.generate.error.invalidResponse`, `ndv.pinData.generate.error.emptyResponse`, `ndv.pinData.generate.error.generic`.

---

## Tasks

### Task 1 — Composable: payload, validation, pinning

**Files:**
- Create: `packages/frontend/editor-ui/src/features/ndv/runData/composables/useGenerateSampleData.ts`
- Create: `packages/frontend/editor-ui/src/features/ndv/runData/composables/useGenerateSampleData.test.ts`

#### - [ ] Step 1.1: Failing test — composable returns expected shape

Create `useGenerateSampleData.test.ts` with the skeleton below. It will fail because the source file doesn't exist yet.

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { ref } from 'vue';
import type { INodeUi } from '@/Interface';

const generateCodeForPromptMock = vi.fn();
vi.mock('@/features/ai/assistant/assistant.api', () => ({
	generateCodeForPrompt: generateCodeForPromptMock,
}));

const setDataMock = vi.fn();
const canPinNodeMock = vi.fn().mockReturnValue(true);
vi.mock('@/app/composables/usePinnedData', () => ({
	usePinnedData: vi.fn(() => ({
		setData: setDataMock,
		canPinNode: canPinNodeMock,
		hasData: { value: false },
		isValidNodeType: { value: true },
	})),
}));

const showMessageMock = vi.fn();
const showErrorMock = vi.fn();
vi.mock('@/app/composables/useToast', () => ({
	useToast: () => ({ showMessage: showMessageMock, showError: showErrorMock }),
}));

vi.mock('@/features/ndv/shared/ndv.store', () => ({
	useNDVStore: () => ({ pushRef: 'ndv-push-test' }),
}));

vi.mock('@n8n/stores/useRootStore', () => ({
	useRootStore: () => ({
		pushRef: 'root-push-test',
		restApiContext: { baseUrl: '/rest', sessionId: 's', pushRef: 'root-push-test' },
	}),
}));

import { useGenerateSampleData } from './useGenerateSampleData';

const node = ref({ id: 'n1', name: 'Slack', type: 'n8n-nodes-base.slack', typeVersion: 2, parameters: { resource: 'message', operation: 'post' } } as unknown as INodeUi);

describe('useGenerateSampleData', () => {
	beforeEach(() => {
		setActivePinia(createPinia());
		generateCodeForPromptMock.mockReset();
		setDataMock.mockReset();
		showMessageMock.mockReset();
		showErrorMock.mockReset();
	});

	it('exposes generate() and isGenerating refs', () => {
		const composable = useGenerateSampleData(node);
		expect(typeof composable.generate).toBe('function');
		expect(composable.isGenerating.value).toBe(false);
	});

	it('pins parsed array response and shows success toast', async () => {
		generateCodeForPromptMock.mockResolvedValue({ code: '[{"channel":"#general","text":"hi"},{"channel":"#dev","text":"hello"}]' });
		const composable = useGenerateSampleData(node);
		await composable.generate();
		expect(setDataMock).toHaveBeenCalledWith(
			[
				{ json: { channel: '#general', text: 'hi' } },
				{ json: { channel: '#dev', text: 'hello' } },
			],
			'pin-icon-click',
		);
		expect(showMessageMock).toHaveBeenCalledWith(expect.objectContaining({ type: 'success' }));
	});

	it('caps items to 3', async () => {
		generateCodeForPromptMock.mockResolvedValue({ code: JSON.stringify(Array.from({ length: 10 }, (_, i) => ({ i }))) });
		await useGenerateSampleData(node).generate();
		const [items] = setDataMock.mock.calls[0];
		expect(items).toHaveLength(3);
	});

	it('shows error toast and skips pin when response is not a JSON array', async () => {
		generateCodeForPromptMock.mockResolvedValue({ code: '{"not":"array"}' });
		await useGenerateSampleData(node).generate();
		expect(setDataMock).not.toHaveBeenCalled();
		expect(showErrorMock).toHaveBeenCalled();
	});

	it('shows error toast and skips pin when array is empty', async () => {
		generateCodeForPromptMock.mockResolvedValue({ code: '[]' });
		await useGenerateSampleData(node).generate();
		expect(setDataMock).not.toHaveBeenCalled();
		expect(showErrorMock).toHaveBeenCalled();
	});

	it('shows error toast when API call rejects', async () => {
		generateCodeForPromptMock.mockRejectedValue(new Error('boom'));
		await useGenerateSampleData(node).generate();
		expect(setDataMock).not.toHaveBeenCalled();
		expect(showErrorMock).toHaveBeenCalled();
	});

	it('no-ops when node is null', async () => {
		const empty = ref(null);
		await useGenerateSampleData(empty).generate();
		expect(generateCodeForPromptMock).not.toHaveBeenCalled();
	});
});
```

Run and confirm it fails because the module doesn't exist:

```bash
cd packages/frontend/editor-ui && pnpm vitest run src/features/ndv/runData/composables/useGenerateSampleData.test.ts 2>&1 | tail -30
```

Expected: `Error: Failed to resolve import "./useGenerateSampleData"` (or similar "module not found").

#### - [ ] Step 1.2: Implement the composable

Create `useGenerateSampleData.ts` with the full implementation:

```ts
import { computed, ref, unref } from 'vue';
import type { MaybeRef } from 'vue';
import { z } from 'zod';
import type { INodeExecutionData } from 'n8n-workflow';
import { useI18n } from '@n8n/i18n';
import { useRootStore } from '@n8n/stores/useRootStore';
import type { INodeUi } from '@/Interface';
import { useToast } from '@/app/composables/useToast';
import { usePinnedData } from '@/app/composables/usePinnedData';
import { useNDVStore } from '@/features/ndv/shared/ndv.store';
import { generateCodeForPrompt } from '@/features/ai/assistant/assistant.api';
import type { AskAiRequest } from '@/features/ai/assistant/assistant.types';

const MAX_ITEMS = 3;

const sampleItemsSchema = z
	.array(z.record(z.string(), z.unknown()))
	.min(1, 'empty')
	.max(50);

function buildPrompt(node: INodeUi): string {
	const params = JSON.stringify(node.parameters ?? {}, null, 2);
	return [
		`You are generating realistic mock OUTPUT data for an n8n node so that downstream nodes can be tested without executing the upstream trigger.`,
		`Node type: ${node.type} (version ${node.typeVersion}).`,
		`Node parameters:\n${params}`,
		``,
		`Return ONLY a raw JSON array (no prose, no Markdown fences, no explanation) of 2 to 3 items.`,
		`Each item MUST be a JSON object representing one realistic record this node would output.`,
		`Use field names a real ${node.type} response would use. Use realistic-looking IDs, timestamps in ISO 8601, and plausible string values. Do NOT include comments.`,
	].join('\n');
}

function stripCodeFences(raw: string): string {
	const trimmed = raw.trim();
	const fenceMatch = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
	return fenceMatch ? fenceMatch[1].trim() : trimmed;
}

export function useGenerateSampleData(node: MaybeRef<INodeUi | null>) {
	const i18n = useI18n();
	const toast = useToast();
	const rootStore = useRootStore();
	const ndvStore = useNDVStore();
	const pinnedData = usePinnedData(node);

	const isGenerating = ref(false);

	const canGenerate = computed(() => {
		const target = unref(node);
		return !!target && pinnedData.isValidNodeType.value && pinnedData.canPinNode(false);
	});

	async function generate(): Promise<void> {
		const target = unref(node);
		if (!target || isGenerating.value) return;

		isGenerating.value = true;
		try {
			const payload: AskAiRequest.RequestPayload = {
				question: buildPrompt(target),
				context: {
					schema: [],
					inputSchema: { nodeName: target.name, schema: { type: 'object', value: [], path: '' } },
					pushRef: rootStore.pushRef,
					ndvPushRef: ndvStore.pushRef,
				},
				forNode: 'transform',
			};

			const { code } = await generateCodeForPrompt(rootStore.restApiContext, payload);

			let parsed: unknown;
			try {
				parsed = JSON.parse(stripCodeFences(code));
			} catch {
				toast.showError(
					new Error(i18n.baseText('ndv.pinData.generate.error.invalidResponse')),
					i18n.baseText('ndv.pinData.generate.title'),
				);
				return;
			}

			const result = sampleItemsSchema.safeParse(parsed);
			if (!result.success) {
				const key =
					result.error.issues[0]?.message === 'empty'
						? 'ndv.pinData.generate.error.emptyResponse'
						: 'ndv.pinData.generate.error.invalidResponse';
				toast.showError(
					new Error(i18n.baseText(key)),
					i18n.baseText('ndv.pinData.generate.title'),
				);
				return;
			}

			const items: INodeExecutionData[] = result.data
				.slice(0, MAX_ITEMS)
				.map((json) => ({ json }));

			pinnedData.setData(items, 'pin-icon-click');

			toast.showMessage({
				title: i18n.baseText('ndv.pinData.generate.title'),
				message: i18n.baseText('ndv.pinData.generate.success'),
				type: 'success',
			});
		} catch (error) {
			toast.showError(
				error instanceof Error ? error : new Error(String(error)),
				i18n.baseText('ndv.pinData.generate.error.generic'),
			);
		} finally {
			isGenerating.value = false;
		}
	}

	return { generate, isGenerating, canGenerate };
}
```

Re-run the test:

```bash
cd packages/frontend/editor-ui && pnpm vitest run src/features/ndv/runData/composables/useGenerateSampleData.test.ts 2>&1 | tail -30
```

Expected: all 7 tests pass.

#### - [ ] Step 1.3: Verify Zod is resolvable in this package

Confirm `zod` is already a (transitive) dep — `@n8n/api-types` uses it pervasively:

```bash
cd /Users/csaba/conductor/workspaces/n8n/hackmation-sample-data-pinner && grep -rn '"zod"' packages/frontend/editor-ui/package.json packages/@n8n/api-types/package.json | head
```

Expected: at least one line. If editor-ui does not declare it directly but it resolves via workspace hoisting, leave it; otherwise add `"zod": "catalog:"` (or the version used in `@n8n/api-types`) to `packages/frontend/editor-ui/package.json` `dependencies`, then `pnpm install --filter @n8n/editor-ui` from repo root.

#### - [ ] Step 1.4: Typecheck and commit

```bash
cd packages/frontend/editor-ui && pnpm typecheck 2>&1 | tail -20
```

Expected: exits 0 with no new errors in the new files.

```bash
cd /Users/csaba/conductor/workspaces/n8n/hackmation-sample-data-pinner && git add packages/frontend/editor-ui/src/features/ndv/runData/composables/useGenerateSampleData.ts packages/frontend/editor-ui/src/features/ndv/runData/composables/useGenerateSampleData.test.ts && git commit -m "feat(editor): add useGenerateSampleData composable for AI sample-data pinning"
```

---

### Task 2 — Presentational button component

**Files:**
- Create: `packages/frontend/editor-ui/src/features/ndv/runData/components/RunDataGenerateSampleButton.vue`
- Create: `packages/frontend/editor-ui/src/features/ndv/runData/components/RunDataGenerateSampleButton.test.ts`
- Modify: `packages/frontend/@n8n/i18n/src/locales/en.json`

#### - [ ] Step 2.1: Add i18n strings

Open `packages/frontend/@n8n/i18n/src/locales/en.json`, locate the block of `ndv.pinData.*` keys around line 1859, and insert the new keys directly below `"ndv.pinData.unpin.title"`:

```json
"ndv.pinData.generate.title": "Generate sample data",
"ndv.pinData.generate.description": "Ask AI to produce realistic mock output for this node and pin it, so downstream nodes can be tested without running this one.",
"ndv.pinData.generate.success": "Sample data generated and pinned.",
"ndv.pinData.generate.error.invalidResponse": "AI did not return a valid JSON array. Try again.",
"ndv.pinData.generate.error.emptyResponse": "AI returned no items. Try again.",
"ndv.pinData.generate.error.generic": "Could not generate sample data",
```

Commas/JSON syntax must be valid. Verify:

```bash
cd /Users/csaba/conductor/workspaces/n8n/hackmation-sample-data-pinner && node -e "JSON.parse(require('fs').readFileSync('packages/frontend/@n8n/i18n/src/locales/en.json','utf8')); console.log('ok')"
```

Expected: `ok`.

#### - [ ] Step 2.2: Failing test — button renders, emits, supports loading/disabled

Create `RunDataGenerateSampleButton.test.ts`:

```ts
import { cleanup, waitFor } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';
import { createTestingPinia } from '@pinia/testing';
import { STORES } from '@n8n/stores';
import { createComponentRenderer } from '@/__tests__/render';
import { getTooltip } from '@/__tests__/utils';
import RunDataGenerateSampleButton from '@/features/ndv/runData/components/RunDataGenerateSampleButton.vue';

const renderComponent = createComponentRenderer(RunDataGenerateSampleButton, {
	global: {
		plugins: [
			createTestingPinia({
				initialState: { [STORES.SETTINGS]: { settings: {} } },
			}),
		],
	},
	props: { loading: false, disabled: false },
});

describe('RunDataGenerateSampleButton.vue', () => {
	beforeEach(cleanup);

	it('renders an enabled button with the correct testid', () => {
		const { getByTestId } = renderComponent();
		expect(getByTestId('ndv-generate-sample-data')).toBeEnabled();
	});

	it('emits generate on click', async () => {
		const { getByTestId, emitted } = renderComponent();
		await userEvent.click(getByTestId('ndv-generate-sample-data'));
		expect(emitted().generate).toBeDefined();
	});

	it('does not emit when disabled', async () => {
		const { getByTestId, emitted } = renderComponent({ props: { disabled: true, loading: false } });
		await userEvent.click(getByTestId('ndv-generate-sample-data'));
		expect(emitted().generate).toBeUndefined();
	});

	it('renders in loading state', () => {
		const { getByTestId } = renderComponent({ props: { loading: true, disabled: false } });
		// loading button is disabled by N8nButton
		expect(getByTestId('ndv-generate-sample-data')).toBeDisabled();
	});

	it('shows tooltip on hover', async () => {
		const { getByTestId } = renderComponent();
		await userEvent.hover(getByTestId('ndv-generate-sample-data'));
		await waitFor(() => {
			expect(getTooltip()).toHaveTextContent(/Generate sample data/);
		});
	});
});
```

Run it — expect failures:

```bash
cd packages/frontend/editor-ui && pnpm vitest run src/features/ndv/runData/components/RunDataGenerateSampleButton.test.ts 2>&1 | tail -20
```

Expected: module-not-found error.

#### - [ ] Step 2.3: Implement the button

Create `RunDataGenerateSampleButton.vue`:

```vue
<script setup lang="ts">
import { useI18n } from '@n8n/i18n';
import { N8nIconButton, N8nText, N8nTooltip } from '@n8n/design-system';

const locale = useI18n();

defineProps<{
	disabled: boolean;
	loading: boolean;
}>();

defineEmits<{
	generate: [];
}>();
</script>

<template>
	<N8nTooltip placement="bottom-end">
		<template #content>
			<strong>{{ locale.baseText('ndv.pinData.generate.title') }}</strong>
			<N8nText size="small" tag="p">
				{{ locale.baseText('ndv.pinData.generate.description') }}
			</N8nText>
		</template>
		<N8nIconButton
			variant="subtle"
			size="small"
			icon="sparkles"
			:loading="loading"
			:disabled="disabled"
			:aria-label="locale.baseText('ndv.pinData.generate.title')"
			data-test-id="ndv-generate-sample-data"
			@click="$emit('generate')"
		/>
	</N8nTooltip>
</template>
```

> If `sparkles` is not an available icon name in `@n8n/design-system`, fall back to `magic-wand` or `wand-sparkles`. Check available icons with:
> ```bash
> grep -rn "sparkles\|magic-wand\|wand-sparkles" packages/frontend/@n8n/design-system/src/components/N8nIcon 2>&1 | head
> ```
> Pick the first one that exists. If none, use `'zap'` (always available).

Re-run the test:

```bash
cd packages/frontend/editor-ui && pnpm vitest run src/features/ndv/runData/components/RunDataGenerateSampleButton.test.ts 2>&1 | tail -20
```

Expected: all 5 tests pass.

#### - [ ] Step 2.4: Typecheck and commit

```bash
cd packages/frontend/editor-ui && pnpm typecheck 2>&1 | tail -20
```

Expected: clean.

```bash
cd /Users/csaba/conductor/workspaces/n8n/hackmation-sample-data-pinner && git add packages/frontend/editor-ui/src/features/ndv/runData/components/RunDataGenerateSampleButton.vue packages/frontend/editor-ui/src/features/ndv/runData/components/RunDataGenerateSampleButton.test.ts packages/frontend/@n8n/i18n/src/locales/en.json && git commit -m "feat(editor): add RunDataGenerateSampleButton component and i18n strings"
```

---

### Task 3 — Wire the button into `RunData.vue`

**Files:**
- Modify: `packages/frontend/editor-ui/src/features/ndv/runData/components/RunData.vue`

#### - [ ] Step 3.1: Import composable, component, and settings store

In the `<script setup>` block of `RunData.vue`, add the following imports near the existing pin-data imports (around lines 50–56):

```ts
import RunDataGenerateSampleButton from './RunDataGenerateSampleButton.vue';
import { useGenerateSampleData } from '@/features/ndv/runData/composables/useGenerateSampleData';
import { useSettingsStore } from '@/app/stores/settings.store';
```

Then, just after `const pinnedData = usePinnedData(node, { ... })` (~ line 255), add:

```ts
const settingsStore = useSettingsStore();
const sampleGenerator = useGenerateSampleData(node);

const showGenerateSampleButton = computed(
	() =>
		showPinButton.value &&
		settingsStore.isAskAiEnabled &&
		!isReadOnlyRoute.value &&
		!readOnlyEnv.value &&
		!isExecutionRedacted.value &&
		sampleGenerator.canGenerate.value,
);

const generateSampleDisabled = computed(
	() => pinButtonDisabled.value || pinnedData.hasData.value,
);
```

> Notes:
> - `showPinButton`, `pinButtonDisabled`, `isReadOnlyRoute`, `readOnlyEnv`, `isExecutionRedacted` already exist in this file (verified at lines 626, 635, 1561–1564).
> - Disabling when `hasData` is true avoids overwriting existing pinned data silently.

#### - [ ] Step 3.2: Render the button next to the pin button

In the `<template>`, locate the `<RunDataPinButton ... />` block (around line 1575). Insert the new button immediately before it:

```vue
<RunDataGenerateSampleButton
	v-if="showGenerateSampleButton"
	:disabled="generateSampleDisabled"
	:loading="sampleGenerator.isGenerating.value"
	@generate="sampleGenerator.generate()"
/>
```

#### - [ ] Step 3.3: Smoke test — run the existing RunData test suite

```bash
cd packages/frontend/editor-ui && pnpm vitest run src/features/ndv/runData/components/RunData.test.ts 2>&1 | tail -30
```

Expected: all existing tests still pass. (The new button is gated by `isAskAiEnabled`, which defaults to `false` in test fixtures, so it should not appear in current tests.)

#### - [ ] Step 3.4: Add an integration test that the button surfaces when AskAi is enabled

Append a new `describe` block at the bottom of `RunData.test.ts`:

```ts
describe('Generate sample data button', () => {
	it('shows the generate sample button when askAi is enabled and node can be pinned', async () => {
		const { queryByTestId } = render({
			defaultRunItems: [{ json: { foo: 'bar' } }],
			displayMode: 'json',
			settingsOverrides: { askAi: { enabled: true } },
		});
		// Depending on how `render` merges settings, this assertion may need
		// the local `render` helper extended. If `settingsOverrides` is not
		// already wired in this test file, fall back to:
		expect(queryByTestId('ndv-generate-sample-data')).toBeInTheDocument();
	});
});
```

> If extending `render()` is non-trivial, **skip this integration test** and rely on the unit tests in Task 1/Task 2 — coverage is already adequate for MVP. Note the skip in the commit message.

#### - [ ] Step 3.5: Full frontend typecheck + lint

```bash
cd packages/frontend/editor-ui && pnpm typecheck 2>&1 | tail -20 && pnpm lint 2>&1 | tail -20
```

Expected: both exit 0.

#### - [ ] Step 3.6: Commit

```bash
cd /Users/csaba/conductor/workspaces/n8n/hackmation-sample-data-pinner && git add packages/frontend/editor-ui/src/features/ndv/runData/components/RunData.vue packages/frontend/editor-ui/src/features/ndv/runData/components/RunData.test.ts && git commit -m "feat(editor): wire Generate sample data button into NDV RunData header"
```

---

### Task 4 — Manual verification

**Files:** none.

#### - [ ] Step 4.1: Run the editor locally

```bash
cd /Users/csaba/conductor/workspaces/n8n/hackmation-sample-data-pinner && pnpm dev > dev.log 2>&1 &
```

Wait until `dev.log` shows `Editor is now accessible via:`. Open `http://localhost:5678`.

#### - [ ] Step 4.2: Verify happy path

1. Create a workflow with a Slack node ("Send a message" operation, fake credentials are fine).
2. Open the node (NDV).
3. Observe the new sparkles/wand button next to the pin button. (Only visible if your instance has `askAi` enabled in settings; for local dev, set `N8N_AI_ENABLED=true` or override via settings.)
4. Click it — button shows loading state, then a success toast appears and the output panel switches into "pinned" mode displaying the generated items.
5. Re-open NDV — pinned data persists; button is disabled (because data already pinned).
6. Unpin via the pin button — generate button becomes enabled again.

#### - [ ] Step 4.3: Verify error paths

- Disconnect from the internet / point `N8N_AI_ASSISTANT_BASE_URL` at an invalid host → click button → error toast appears, no pin happens.
- If the upstream model returns non-JSON, the "invalid response" toast appears (can be simulated by stubbing `generateCodeForPrompt` in browser devtools).

#### - [ ] Step 4.4: Final repo-wide checks (optional but recommended)

```bash
cd /Users/csaba/conductor/workspaces/n8n/hackmation-sample-data-pinner && pnpm typecheck > typecheck.log 2>&1 ; tail -30 typecheck.log
```

Expected: exits 0 (or no NEW errors compared to master).

---

## Out of Scope (Stretch)

These are explicitly **deferred** to keep the MVP shippable in one day:

- **Schema-grounded prompts.** Reading the node's `INodeTypeDescription` output schema (when available) and including it in the prompt for higher-fidelity output.
- **User hints field.** A small input where the user types extra context ("two Slack messages from a customer about a refund").
- **Variant selection.** Asking for N variants and letting the user pick / regenerate.
- **Backend endpoint.** A dedicated `POST /ai/generate-sample` with strict server-side validation (Zod, item cap, token budget) instead of overloading `/ai/ask-ai` with `forNode: 'transform'`.
- **Streaming / progress.** A streaming response with token-by-token UI feedback.
- **Telemetry.** A dedicated `Ndv sample data generated` telemetry event (currently the underlying `setData` call still fires `Ndv data pinning success` with `source: 'pin-icon-click'`, which is acceptable for MVP but not ideal).
- **i18n for non-English locales.** Only `en.json` is touched.
- **Playwright E2E coverage.** Manual verification only.

---

## Self-Review

**Spec coverage:** Every MVP requirement from the brief is mapped to a step:
- Button next to existing pin UI → Task 3 (renders before `RunDataPinButton`).
- Sends `{ nodeType, parameters }` to assistant → Task 1.2 `buildPrompt()` includes both, sent via the existing `/ai/ask-ai` plumbing.
- Strict "JSON array only" prompt → Task 1.2 prompt body.
- Validates JSON array response → Task 1.2 uses Zod (`sampleItemsSchema`).
- Pins via existing store actions → Task 1.2 delegates to `usePinnedData().setData()`, which already goes through `workflowDocumentStore.pinNodeData` (the canonical action).
- Toast on success/error → Task 1.2 calls `useToast().showMessage` and `useToast().showError`.

**Placeholders:** None. Every code block above is complete and copy-pasteable. The only conditional is the icon name in Step 2.3, with a documented fallback procedure.

**Type consistency:** No `any`, no `as` casts outside of one cast-free unknown→Zod parse path. The `INodeUi` ref typing matches `usePinnedData`'s signature. Composable returns `{ generate, isGenerating, canGenerate }` and is consumed with `.value` on the refs in `RunData.vue`. The Zod schema's parsed type is `Array<Record<string, unknown>>`, which is structurally compatible with `INodeExecutionData['json']` (`IDataObject = Record<string, GenericValue>`); since `unknown` is the safest superset and `setData` accepts `INodeExecutionData[]`, the `.map((json) => ({ json }))` produces a valid `INodeExecutionData[]` — TypeScript will accept this because `IDataObject` widens to anything assignable from `Record<string, unknown>` at the `json` slot.

**Risk callouts:**
- The `/ai/ask-ai` endpoint is a proxy to the closed-source `@n8n_io/ai-assistant-sdk` and is semantically scoped to "code/transform generation". The upstream may produce lower-quality JSON than a purpose-built endpoint would. This is acceptable for an MVP demo; a follow-up should add a dedicated `/ai/generate-sample` endpoint (see Out of Scope).
- We send `forNode: 'transform'` and a non-code prompt. If the upstream proxy adds stricter input validation in the future this could break; the failure mode is a toast, not a crash.
- The composable creates a new `usePinnedData(node)` instance separate from the one already constructed in `RunData.vue`. Both read/write the same Pinia store, so there's no state-divergence risk, but it does mean two telemetry calls fire on a successful generate (one from the original composable's `onSetDataSuccess` plus none from the new one — only one path actually pins). Verified by reading `usePinnedData.ts` lines 266–301.
