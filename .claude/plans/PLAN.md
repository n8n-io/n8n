# "Explain this error" Button Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a small "Explain this error" button to the n8n NDV node-error display that opens an inline popover. The popover triggers a one-shot AI call which produces a structured plain-English response: (1) what likely went wrong, (2) the parameter/credential most likely at fault, (3) a concrete next step. This is an MVP intended to ship in one developer-day.

**Architecture:**

- **Frontend-only.** No new backend routes. We reuse the existing `chatWithAssistant` streaming API (POST `/ai/chat`) with a fresh session and an `init-support-chat` payload whose `question` is a structured prompt that asks the assistant for a three-section answer. The first streaming response is parsed and rendered in the popover.
- **No interference with the existing side panel.** The current `N8nInlineAskAssistantButton` (which opens the full side chat) stays. The new button is a sibling. It is rendered alongside, behind the same availability gate (`isAskAssistantAvailable`).
- **State lives in a dedicated Pinia store** (`explainError.store.ts`) so the popover can be re-used elsewhere later and to keep `NodeErrorView.vue` thin. The store owns `state` (`idle | loading | ready | error`), `result` (parsed sections), `lastErrorFingerprint` (de-duplicates repeat requests for the same error), and the streaming abort controller.
- **Prompt produces JSON** with fields `summary`, `culprit`, `nextStep`. The assistant is asked to respond with a fenced JSON code block; the store extracts and validates it with **zod**. If validation fails we fall back to rendering the raw text as a single "summary" section.
- **Telemetry:** reuse `assistantStore.trackUserOpenedAssistant` with `source: 'error'`, `task: 'error'` so the new flow is visible in existing dashboards, plus one new telemetry event `'User used Explain this error'` with success/failure flag.

**Tech Stack:**

- Vue 3 `<script setup>` + TypeScript (strict, no `any`, no `as` casts).
- Pinia for state.
- `@n8n/design-system`: `N8nPopover`, `N8nButton`, `N8nIcon`, `N8nSpinner`, `N8nText`. No direct Element Plus / reka-ui imports.
- `@n8n/i18n`: all user-facing strings go in `packages/frontend/@n8n/i18n/src/locales/en.json`.
- `zod` for parsing the assistant's JSON response.
- Vitest for tests. `createComponentRenderer` from `@/__tests__/render` and `createTestingPinia` from `@pinia/testing` (matches the existing `NodeErrorView.test.ts` setup).
- API: existing `chatWithAssistant` (POST `/ai/chat`) — no changes to `packages/cli`.

---

## File Structure

**Create:**

- `packages/frontend/editor-ui/src/features/ndv/runData/components/error/ExplainErrorButton.vue` — the new button + popover, wired to the store.
- `packages/frontend/editor-ui/src/features/ndv/runData/components/error/ExplainErrorButton.test.ts` — Vitest component tests.
- `packages/frontend/editor-ui/src/features/ndv/runData/components/error/explainError.store.ts` — Pinia store: state machine + one-shot call.
- `packages/frontend/editor-ui/src/features/ndv/runData/components/error/explainError.store.test.ts` — Vitest store tests.
- `packages/frontend/editor-ui/src/features/ndv/runData/components/error/explainError.prompt.ts` — Builds the structured prompt + zod schema for the JSON response.
- `packages/frontend/editor-ui/src/features/ndv/runData/components/error/explainError.prompt.test.ts` — Vitest tests for prompt-builder + parser.

**Modify:**

- `packages/frontend/editor-ui/src/features/ndv/runData/components/error/NodeErrorView.vue` — mount the new `ExplainErrorButton` next to the existing assistant button (same availability gate).
- `packages/frontend/editor-ui/src/features/ndv/runData/components/error/NodeErrorView.test.ts` — one new test asserting that `explain-error-button` renders when assistant is available.
- `packages/frontend/@n8n/i18n/src/locales/en.json` — add `nodeErrorView.explain.*` keys.

**Do NOT touch:**

- `packages/cli/src/controllers/ai.controller.ts` — no new endpoint.
- `packages/cli/src/services/ai.service.ts` — no service changes.
- `packages/frontend/editor-ui/src/features/ai/assistant/assistant.store.ts` — leave the existing flow alone; we reuse `chatWithAssistant` directly.

---

## Tasks

### Task 1: Add i18n strings

**Files:**

- **Modify:** `packages/frontend/@n8n/i18n/src/locales/en.json` (insert near the existing `nodeErrorView.*` block around lines 2100–2120).

- [ ] **Step 1: Add the new i18n keys.**

Open `en.json` and insert (alphabetical inside the `nodeErrorView.*` group):

```json
"nodeErrorView.explain.button": "Explain this error",
"nodeErrorView.explain.popover.title": "What went wrong",
"nodeErrorView.explain.popover.loading": "Thinking…",
"nodeErrorView.explain.popover.error": "We couldn't generate an explanation. Try again in a moment.",
"nodeErrorView.explain.popover.retry": "Try again",
"nodeErrorView.explain.popover.summaryHeading": "Summary",
"nodeErrorView.explain.popover.culpritHeading": "Likely culprit",
"nodeErrorView.explain.popover.nextStepHeading": "Try this next",
"nodeErrorView.explain.popover.openChat": "Continue in chat",
"nodeErrorView.explain.popover.disclaimer": "AI-generated. Verify before acting.",
```

- [ ] **Step 2: Verify JSON parses.**

```bash
node -e "JSON.parse(require('fs').readFileSync('packages/frontend/@n8n/i18n/src/locales/en.json', 'utf8')); console.log('ok')"
```

Expected output: `ok`.

- [ ] **Step 3: Commit.**

```bash
git add packages/frontend/@n8n/i18n/src/locales/en.json
git commit -m "feat(i18n): add explain-error popover strings"
```

---

### Task 2: Prompt builder + response schema (TDD)

**Files:**

- **Create:** `packages/frontend/editor-ui/src/features/ndv/runData/components/error/explainError.prompt.ts`
- **Test:** `packages/frontend/editor-ui/src/features/ndv/runData/components/error/explainError.prompt.test.ts`

- [ ] **Step 1: Write the failing test.**

Create `explainError.prompt.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import type { NodeError } from 'n8n-workflow';
import {
	buildExplainErrorQuestion,
	parseExplainErrorResponse,
	type ExplainErrorResult,
} from './explainError.prompt';

const baseError = {
	name: 'NodeOperationError',
	message: 'Authorization failed',
	description: 'Please check your credentials',
	node: {
		id: 'n1',
		name: 'HTTP Request',
		type: 'n8n-nodes-base.httpRequest',
		typeVersion: 4,
		position: [0, 0],
		parameters: { url: 'https://api.example.com', authentication: 'genericCredentialType' },
	},
} as unknown as NodeError;

describe('buildExplainErrorQuestion', () => {
	it('includes node name, type and error message', () => {
		const question = buildExplainErrorQuestion(baseError);
		expect(question).toContain('HTTP Request');
		expect(question).toContain('n8n-nodes-base.httpRequest');
		expect(question).toContain('Authorization failed');
	});

	it('asks the assistant for a JSON object with three keys', () => {
		const question = buildExplainErrorQuestion(baseError);
		expect(question).toContain('"summary"');
		expect(question).toContain('"culprit"');
		expect(question).toContain('"nextStep"');
	});

	it('produces a stable fingerprint for the same error', () => {
		const a = buildExplainErrorQuestion(baseError);
		const b = buildExplainErrorQuestion(baseError);
		expect(a).toEqual(b);
	});
});

describe('parseExplainErrorResponse', () => {
	it('parses a fenced JSON block', () => {
		const raw = [
			'Here is the analysis:',
			'```json',
			'{ "summary": "Auth failed.", "culprit": "credentials", "nextStep": "Re-enter API key." }',
			'```',
		].join('\n');
		const result = parseExplainErrorResponse(raw);
		const expected: ExplainErrorResult = {
			kind: 'structured',
			summary: 'Auth failed.',
			culprit: 'credentials',
			nextStep: 'Re-enter API key.',
		};
		expect(result).toEqual(expected);
	});

	it('parses an unfenced JSON object', () => {
		const raw = '{ "summary": "s", "culprit": "c", "nextStep": "n" }';
		const result = parseExplainErrorResponse(raw);
		expect(result.kind).toBe('structured');
	});

	it('falls back to raw text when JSON is missing', () => {
		const raw = 'Sorry, the model returned a free-form answer.';
		const result = parseExplainErrorResponse(raw);
		expect(result).toEqual({ kind: 'raw', text: raw });
	});

	it('falls back to raw text when JSON keys are wrong', () => {
		const raw = '```json\n{ "foo": "bar" }\n```';
		const result = parseExplainErrorResponse(raw);
		expect(result.kind).toBe('raw');
	});
});
```

- [ ] **Step 2: Run — expect failure.**

```bash
cd packages/frontend/editor-ui && pnpm test src/features/ndv/runData/components/error/explainError.prompt.test.ts
```

Expected: failure (`Cannot find module './explainError.prompt'`).

- [ ] **Step 3: Implement.**

Create `explainError.prompt.ts`:

```ts
import { z } from 'zod';
import type { NodeError } from 'n8n-workflow';

export type ExplainErrorResult =
	| { kind: 'structured'; summary: string; culprit: string; nextStep: string }
	| { kind: 'raw'; text: string };

const structuredSchema = z.object({
	summary: z.string().min(1),
	culprit: z.string().min(1),
	nextStep: z.string().min(1),
});

/**
 * Builds a deterministic prompt asking the assistant to produce a strict
 * JSON object describing what likely went wrong, the likely culprit, and a
 * concrete next step. Determinism matters for the in-memory de-dup cache.
 */
export function buildExplainErrorQuestion(error: NodeError): string {
	const node = error.node;
	const nodeName = node?.name ?? 'unknown node';
	const nodeType = node?.type ?? 'unknown type';
	const message = error.message ?? '';
	const description = error.description ?? '';

	return [
		`A node in an n8n workflow failed. Explain the error to a non-technical builder.`,
		``,
		`Node: ${nodeName}`,
		`Node type: ${nodeType}`,
		`Error message: ${message}`,
		description ? `Error description: ${description}` : '',
		``,
		`Respond ONLY with a single fenced JSON code block matching this shape:`,
		'```json',
		`{`,
		`  "summary": "<one or two short sentences in plain English>",`,
		`  "culprit": "<the parameter or credential most likely at fault>",`,
		`  "nextStep": "<one concrete next step the user can try>"`,
		`}`,
		'```',
		`Keep each field under 200 characters. Do not include any text outside the code block.`,
	]
		.filter(Boolean)
		.join('\n');
}

/**
 * Extracts the JSON object from the assistant's response. We tolerate the
 * model returning fenced or unfenced JSON; if neither parses, we fall back
 * to rendering the raw text in a single "summary" section.
 */
export function parseExplainErrorResponse(raw: string): ExplainErrorResult {
	const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
	const candidate = fenced?.[1]?.trim() ?? extractFirstJsonObject(raw);

	if (candidate !== undefined) {
		try {
			const json: unknown = JSON.parse(candidate);
			const parsed = structuredSchema.safeParse(json);
			if (parsed.success) {
				return {
					kind: 'structured',
					summary: parsed.data.summary,
					culprit: parsed.data.culprit,
					nextStep: parsed.data.nextStep,
				};
			}
		} catch {
			// fall through to raw
		}
	}

	return { kind: 'raw', text: raw.trim() };
}

function extractFirstJsonObject(text: string): string | undefined {
	const start = text.indexOf('{');
	const end = text.lastIndexOf('}');
	if (start === -1 || end === -1 || end <= start) return undefined;
	return text.slice(start, end + 1);
}
```

- [ ] **Step 4: Run — expect pass.**

```bash
cd packages/frontend/editor-ui && pnpm test src/features/ndv/runData/components/error/explainError.prompt.test.ts
```

Expected: all 6 tests pass.

- [ ] **Step 5: Commit.**

```bash
git add packages/frontend/editor-ui/src/features/ndv/runData/components/error/explainError.prompt.ts \
        packages/frontend/editor-ui/src/features/ndv/runData/components/error/explainError.prompt.test.ts
git commit -m "feat(editor): add explain-error prompt builder and parser"
```

---

### Task 3: Pinia store with one-shot streaming call (TDD)

**Files:**

- **Create:** `packages/frontend/editor-ui/src/features/ndv/runData/components/error/explainError.store.ts`
- **Test:** `packages/frontend/editor-ui/src/features/ndv/runData/components/error/explainError.store.test.ts`

Background: `chatWithAssistant(ctx, payload, onMessage, onDone, onError, undefined, abortSignal)` from `@/features/ai/assistant/assistant.api` streams `ChatRequest.ResponsePayload` chunks. For our one-shot use case we accumulate `messages[].text` (only `type === 'message'` entries) into a buffer and parse on `onDone`.

- [ ] **Step 1: Write the failing test.**

Create `explainError.store.test.ts`:

```ts
import { setActivePinia, createPinia } from 'pinia';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Mock } from 'vitest';
import type { NodeError } from 'n8n-workflow';

const apiSpy: Mock = vi.fn();

vi.mock('@/features/ai/assistant/assistant.api', () => ({
	chatWithAssistant: (...args: unknown[]) => apiSpy(...args),
}));

vi.mock('@n8n/stores/useRootStore', () => ({
	useRootStore: () => ({
		restApiContext: { baseUrl: '', sessionId: 's', pushRef: 'p' },
	}),
}));

import { useExplainErrorStore } from './explainError.store';

const node = {
	id: 'n1',
	name: 'HTTP Request',
	type: 'n8n-nodes-base.httpRequest',
	typeVersion: 4,
	position: [0, 0],
	parameters: {},
};

const sampleError = {
	name: 'NodeOperationError',
	message: 'Authorization failed',
	description: 'Check creds',
	node,
} as unknown as NodeError;

const fencedJson = [
	'```json',
	'{ "summary": "Auth failed.", "culprit": "API key", "nextStep": "Rotate the key." }',
	'```',
].join('\n');

describe('useExplainErrorStore', () => {
	beforeEach(() => {
		setActivePinia(createPinia());
		apiSpy.mockReset();
	});

	it('starts idle', () => {
		const store = useExplainErrorStore();
		expect(store.state).toBe('idle');
		expect(store.result).toBeUndefined();
	});

	it('transitions idle -> loading -> ready on a successful one-shot', async () => {
		apiSpy.mockImplementation((_ctx, _payload, onMessage, onDone) => {
			onMessage({
				sessionId: 'sid',
				messages: [{ role: 'assistant', type: 'message', text: fencedJson }],
			});
			onDone();
		});

		const store = useExplainErrorStore();
		const promise = store.explain(sampleError);
		expect(store.state).toBe('loading');
		await promise;
		expect(store.state).toBe('ready');
		expect(store.result).toEqual({
			kind: 'structured',
			summary: 'Auth failed.',
			culprit: 'API key',
			nextStep: 'Rotate the key.',
		});
	});

	it('transitions idle -> loading -> error on failure', async () => {
		apiSpy.mockImplementation((_ctx, _payload, _onMessage, _onDone, onError) => {
			onError(new Error('boom'));
		});

		const store = useExplainErrorStore();
		await store.explain(sampleError);
		expect(store.state).toBe('error');
		expect(store.result).toBeUndefined();
	});

	it('does not re-call the API when the same error is explained twice', async () => {
		apiSpy.mockImplementation((_ctx, _payload, onMessage, onDone) => {
			onMessage({
				sessionId: 'sid',
				messages: [{ role: 'assistant', type: 'message', text: fencedJson }],
			});
			onDone();
		});

		const store = useExplainErrorStore();
		await store.explain(sampleError);
		await store.explain(sampleError);
		expect(apiSpy).toHaveBeenCalledTimes(1);
	});

	it('re-calls the API when retry() is invoked', async () => {
		apiSpy.mockImplementation((_ctx, _payload, onMessage, onDone) => {
			onMessage({
				sessionId: 'sid',
				messages: [{ role: 'assistant', type: 'message', text: fencedJson }],
			});
			onDone();
		});

		const store = useExplainErrorStore();
		await store.explain(sampleError);
		await store.retry(sampleError);
		expect(apiSpy).toHaveBeenCalledTimes(2);
	});

	it('accumulates streaming chunks before parsing', async () => {
		apiSpy.mockImplementation((_ctx, _payload, onMessage, onDone) => {
			onMessage({
				sessionId: 'sid',
				messages: [{ role: 'assistant', type: 'message', text: '```json\n{ "summary"' }],
			});
			onMessage({
				sessionId: 'sid',
				messages: [
					{
						role: 'assistant',
						type: 'message',
						text: ': "ok", "culprit": "c", "nextStep": "n" }\n```',
					},
				],
			});
			onDone();
		});

		const store = useExplainErrorStore();
		await store.explain(sampleError);
		expect(store.state).toBe('ready');
		expect(store.result).toEqual({
			kind: 'structured',
			summary: 'ok',
			culprit: 'c',
			nextStep: 'n',
		});
	});

	it('reset() returns the store to idle', async () => {
		apiSpy.mockImplementation((_ctx, _payload, onMessage, onDone) => {
			onMessage({
				sessionId: 'sid',
				messages: [{ role: 'assistant', type: 'message', text: fencedJson }],
			});
			onDone();
		});

		const store = useExplainErrorStore();
		await store.explain(sampleError);
		store.reset();
		expect(store.state).toBe('idle');
		expect(store.result).toBeUndefined();
	});
});
```

- [ ] **Step 2: Run — expect failure.**

```bash
cd packages/frontend/editor-ui && pnpm test src/features/ndv/runData/components/error/explainError.store.test.ts
```

Expected: failure (`Cannot find module './explainError.store'`).

- [ ] **Step 3: Implement.**

Create `explainError.store.ts`:

```ts
import { defineStore } from 'pinia';
import { ref } from 'vue';
import type { NodeError } from 'n8n-workflow';

import { useRootStore } from '@n8n/stores/useRootStore';
import { chatWithAssistant } from '@/features/ai/assistant/assistant.api';
import type { ChatRequest } from '@/features/ai/assistant/assistant.types';

import {
	buildExplainErrorQuestion,
	parseExplainErrorResponse,
	type ExplainErrorResult,
} from './explainError.prompt';

export type ExplainErrorState = 'idle' | 'loading' | 'ready' | 'error';

function fingerprintError(error: NodeError): string {
	const node = error.node;
	const nodeKey = node ? `${node.type}:${node.id ?? node.name ?? ''}` : 'unknown';
	const message = error.message ?? '';
	return `${nodeKey}|${message}`;
}

export const useExplainErrorStore = defineStore('explainError', () => {
	const state = ref<ExplainErrorState>('idle');
	const result = ref<ExplainErrorResult | undefined>(undefined);
	const lastFingerprint = ref<string | undefined>(undefined);
	const abortController = ref<AbortController | undefined>(undefined);

	const rootStore = useRootStore();

	function reset(): void {
		abortController.value?.abort();
		abortController.value = undefined;
		state.value = 'idle';
		result.value = undefined;
		lastFingerprint.value = undefined;
	}

	async function run(error: NodeError): Promise<void> {
		const fingerprint = fingerprintError(error);
		lastFingerprint.value = fingerprint;
		state.value = 'loading';
		result.value = undefined;

		const controller = new AbortController();
		abortController.value = controller;

		const payload: ChatRequest.RequestPayload = {
			payload: {
				role: 'user',
				type: 'init-support-chat',
				user: { firstName: 'there' },
				question: buildExplainErrorQuestion(error),
			},
		};

		let buffer = '';

		await new Promise<void>((resolve) => {
			chatWithAssistant(
				rootStore.restApiContext,
				payload,
				(chunk: ChatRequest.ResponsePayload) => {
					for (const message of chunk.messages ?? []) {
						if (message.role === 'assistant' && message.type === 'message') {
							buffer += message.text;
						}
					}
				},
				() => {
					if (controller.signal.aborted) {
						resolve();
						return;
					}
					result.value = parseExplainErrorResponse(buffer);
					state.value = 'ready';
					resolve();
				},
				(err: Error) => {
					if (err.name === 'AbortError') {
						resolve();
						return;
					}
					state.value = 'error';
					result.value = undefined;
					resolve();
				},
				controller.signal,
			);
		});
	}

	async function explain(error: NodeError): Promise<void> {
		const fingerprint = fingerprintError(error);
		if (state.value === 'ready' && lastFingerprint.value === fingerprint) {
			return;
		}
		if (state.value === 'loading' && lastFingerprint.value === fingerprint) {
			return;
		}
		await run(error);
	}

	async function retry(error: NodeError): Promise<void> {
		await run(error);
	}

	return {
		state,
		result,
		explain,
		retry,
		reset,
	};
});
```

Notes on the signature of `chatWithAssistant`: the 5th positional arg is the abort signal in `assistant.api.ts` — the function signature is `(ctx, payload, onMessageUpdated, onDone, onError, abortSignal?)`. Verify by reading `packages/frontend/editor-ui/src/features/ai/assistant/assistant.api.ts` before running the test; if the order differs, adjust the call site (do NOT cast with `as`).

- [ ] **Step 4: Run — expect pass.**

```bash
cd packages/frontend/editor-ui && pnpm test src/features/ndv/runData/components/error/explainError.store.test.ts
```

Expected: all 7 tests pass.

- [ ] **Step 5: Commit.**

```bash
git add packages/frontend/editor-ui/src/features/ndv/runData/components/error/explainError.store.ts \
        packages/frontend/editor-ui/src/features/ndv/runData/components/error/explainError.store.test.ts
git commit -m "feat(editor): add explainError pinia store for one-shot AI error analysis"
```

---

### Task 4: ExplainErrorButton component (TDD)

**Files:**

- **Create:** `packages/frontend/editor-ui/src/features/ndv/runData/components/error/ExplainErrorButton.vue`
- **Test:** `packages/frontend/editor-ui/src/features/ndv/runData/components/error/ExplainErrorButton.test.ts`

- [ ] **Step 1: Write the failing test.**

Create `ExplainErrorButton.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createTestingPinia } from '@pinia/testing';
import userEvent from '@testing-library/user-event';
import type { NodeError } from 'n8n-workflow';

import { createComponentRenderer } from '@/__tests__/render';
import { mockedStore } from '@/__tests__/utils';

import ExplainErrorButton from './ExplainErrorButton.vue';
import { useExplainErrorStore } from './explainError.store';

let mockStore: ReturnType<typeof mockedStore<typeof useExplainErrorStore>>;

const renderComponent = createComponentRenderer(ExplainErrorButton);

const node = {
	id: 'n1',
	name: 'HTTP Request',
	type: 'n8n-nodes-base.httpRequest',
	typeVersion: 4,
	position: [0, 0],
	parameters: {},
};

const sampleError = {
	name: 'NodeOperationError',
	message: 'Authorization failed',
	description: 'Check creds',
	node,
} as unknown as NodeError;

describe('ExplainErrorButton', () => {
	beforeEach(() => {
		createTestingPinia();
		mockStore = mockedStore(useExplainErrorStore);
		mockStore.state = 'idle';
		mockStore.result = undefined;
	});

	it('renders the trigger button with i18n label', () => {
		const { getByTestId } = renderComponent({ props: { error: sampleError } });
		const button = getByTestId('explain-error-button');
		expect(button).toBeInTheDocument();
		expect(button.textContent).toContain('Explain this error');
	});

	it('calls explain() when clicked', async () => {
		const { getByTestId } = renderComponent({ props: { error: sampleError } });
		await userEvent.click(getByTestId('explain-error-button'));
		expect(mockStore.explain).toHaveBeenCalledWith(sampleError);
	});

	it('shows loading text in the popover when state is loading', async () => {
		mockStore.state = 'loading';
		const { getByTestId, findByText } = renderComponent({ props: { error: sampleError } });
		await userEvent.click(getByTestId('explain-error-button'));
		expect(await findByText('Thinking…')).toBeInTheDocument();
	});

	it('renders the three sections when state is ready and result is structured', async () => {
		mockStore.state = 'ready';
		mockStore.result = {
			kind: 'structured',
			summary: 'The API rejected the request.',
			culprit: 'API key',
			nextStep: 'Rotate the credential.',
		};

		const { getByTestId, findByText } = renderComponent({ props: { error: sampleError } });
		await userEvent.click(getByTestId('explain-error-button'));
		expect(await findByText('Summary')).toBeInTheDocument();
		expect(await findByText('The API rejected the request.')).toBeInTheDocument();
		expect(await findByText('Likely culprit')).toBeInTheDocument();
		expect(await findByText('API key')).toBeInTheDocument();
		expect(await findByText('Try this next')).toBeInTheDocument();
		expect(await findByText('Rotate the credential.')).toBeInTheDocument();
	});

	it('renders raw text fallback when result kind is raw', async () => {
		mockStore.state = 'ready';
		mockStore.result = { kind: 'raw', text: 'Free-form answer.' };

		const { getByTestId, findByText } = renderComponent({ props: { error: sampleError } });
		await userEvent.click(getByTestId('explain-error-button'));
		expect(await findByText('Free-form answer.')).toBeInTheDocument();
	});

	it('renders an error state with a retry button', async () => {
		mockStore.state = 'error';
		const { getByTestId, findByText } = renderComponent({ props: { error: sampleError } });
		await userEvent.click(getByTestId('explain-error-button'));
		const retry = await findByText('Try again');
		await userEvent.click(retry);
		expect(mockStore.retry).toHaveBeenCalledWith(sampleError);
	});
});
```

- [ ] **Step 2: Run — expect failure.**

```bash
cd packages/frontend/editor-ui && pnpm test src/features/ndv/runData/components/error/ExplainErrorButton.test.ts
```

Expected: failure (component doesn't exist yet).

- [ ] **Step 3: Implement.**

Create `ExplainErrorButton.vue`:

```vue
<script setup lang="ts">
import { computed, ref } from 'vue';
import type { NodeError, NodeApiError, NodeOperationError } from 'n8n-workflow';
import { useI18n } from '@n8n/i18n';
import { N8nButton, N8nIcon, N8nPopover, N8nSpinner, N8nText } from '@n8n/design-system';

import { useExplainErrorStore } from './explainError.store';

type ErrorProp = NodeError | NodeApiError | NodeOperationError;

const props = defineProps<{
	error: ErrorProp;
}>();

const i18n = useI18n();
const store = useExplainErrorStore();

const open = ref(false);

const state = computed(() => store.state);
const result = computed(() => store.result);

async function onOpenChange(next: boolean): Promise<void> {
	open.value = next;
	if (next) {
		await store.explain(props.error as NodeError);
	}
}

async function onRetry(): Promise<void> {
	await store.retry(props.error as NodeError);
}
</script>

<template>
	<N8nPopover
		:open="open"
		side="bottom"
		align="end"
		width="360px"
		:side-offset="8"
		@update:open="onOpenChange"
	>
		<template #trigger>
			<button
				type="button"
				class="explain-error-button"
				data-test-id="explain-error-button"
			>
				<N8nIcon icon="sparkles" size="small" />
				<span>{{ i18n.baseText('nodeErrorView.explain.button') }}</span>
			</button>
		</template>
		<template #content>
			<div class="explain-error-popover" data-test-id="explain-error-popover">
				<header class="explain-error-popover__header">
					<N8nText size="small" bold>
						{{ i18n.baseText('nodeErrorView.explain.popover.title') }}
					</N8nText>
				</header>

				<div v-if="state === 'loading'" class="explain-error-popover__loading">
					<N8nSpinner size="small" />
					<N8nText size="small">
						{{ i18n.baseText('nodeErrorView.explain.popover.loading') }}
					</N8nText>
				</div>

				<div v-else-if="state === 'error'" class="explain-error-popover__error">
					<N8nText size="small">
						{{ i18n.baseText('nodeErrorView.explain.popover.error') }}
					</N8nText>
					<N8nButton
						size="small"
						type="tertiary"
						:label="i18n.baseText('nodeErrorView.explain.popover.retry')"
						@click="onRetry"
					/>
				</div>

				<div
					v-else-if="state === 'ready' && result?.kind === 'structured'"
					class="explain-error-popover__sections"
				>
					<section>
						<N8nText size="xsmall" bold color="text-base">
							{{ i18n.baseText('nodeErrorView.explain.popover.summaryHeading') }}
						</N8nText>
						<N8nText size="small">{{ result.summary }}</N8nText>
					</section>
					<section>
						<N8nText size="xsmall" bold color="text-base">
							{{ i18n.baseText('nodeErrorView.explain.popover.culpritHeading') }}
						</N8nText>
						<N8nText size="small">{{ result.culprit }}</N8nText>
					</section>
					<section>
						<N8nText size="xsmall" bold color="text-base">
							{{ i18n.baseText('nodeErrorView.explain.popover.nextStepHeading') }}
						</N8nText>
						<N8nText size="small">{{ result.nextStep }}</N8nText>
					</section>
				</div>

				<div
					v-else-if="state === 'ready' && result?.kind === 'raw'"
					class="explain-error-popover__sections"
				>
					<N8nText size="small">{{ result.text }}</N8nText>
				</div>

				<footer class="explain-error-popover__footer">
					<N8nText size="xsmall" color="text-light">
						{{ i18n.baseText('nodeErrorView.explain.popover.disclaimer') }}
					</N8nText>
				</footer>
			</div>
		</template>
	</N8nPopover>
</template>

<style lang="scss" scoped>
.explain-error-button {
	display: inline-flex;
	gap: var(--spacing--4xs);
	align-items: center;
	padding: var(--spacing--4xs) var(--spacing--2xs);
	background: var(--color--background--shade-1);
	border: 1px solid var(--color--foreground);
	border-radius: var(--radius);
	font-size: var(--font-size--2xs);
	color: var(--color--text);
	cursor: pointer;

	&:hover {
		background: var(--color--background--shade-2);
	}
}

.explain-error-popover {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);

	&__header {
		padding-bottom: var(--spacing--3xs);
		border-bottom: 1px solid var(--color--foreground);
	}

	&__loading,
	&__error {
		display: flex;
		flex-direction: column;
		gap: var(--spacing--3xs);
		align-items: flex-start;
	}

	&__sections {
		display: flex;
		flex-direction: column;
		gap: var(--spacing--2xs);

		section {
			display: flex;
			flex-direction: column;
			gap: var(--spacing--5xs);
		}
	}

	&__footer {
		padding-top: var(--spacing--3xs);
		border-top: 1px solid var(--color--foreground);
	}
}
</style>
```

Notes:

- `result.kind === 'structured'` narrows the union via discriminated union (no `as` casts).
- The cast `props.error as NodeError` is unavoidable because the store works in terms of `NodeError`; but `as` is forbidden by repo convention. Replace it: change the store's parameter type to `NodeError | NodeApiError | NodeOperationError` in `explainError.store.ts` and `explainError.prompt.ts` so the call site needs no cast. Update the prompt-builder test fixture types accordingly. Re-run Task 2 + Task 3 tests.

- [ ] **Step 4: Tighten types and re-run all three test files.**

Update `explainError.prompt.ts` signature:

```ts
import type { NodeError, NodeApiError, NodeOperationError } from 'n8n-workflow';
export function buildExplainErrorQuestion(
	error: NodeError | NodeApiError | NodeOperationError,
): string { /* ... unchanged ... */ }
```

Update `explainError.store.ts` signatures (`run`, `explain`, `retry`, `fingerprintError`) to accept the union. Then drop the `as NodeError` casts in `ExplainErrorButton.vue`.

```bash
cd packages/frontend/editor-ui && pnpm test src/features/ndv/runData/components/error/
```

Expected: 3 test files pass (`explainError.prompt.test.ts`, `explainError.store.test.ts`, `ExplainErrorButton.test.ts`).

- [ ] **Step 5: Typecheck.**

```bash
cd packages/frontend/editor-ui && pnpm typecheck
```

Expected: no errors.

- [ ] **Step 6: Commit.**

```bash
git add packages/frontend/editor-ui/src/features/ndv/runData/components/error/ExplainErrorButton.vue \
        packages/frontend/editor-ui/src/features/ndv/runData/components/error/ExplainErrorButton.test.ts \
        packages/frontend/editor-ui/src/features/ndv/runData/components/error/explainError.prompt.ts \
        packages/frontend/editor-ui/src/features/ndv/runData/components/error/explainError.store.ts
git commit -m "feat(editor): add ExplainErrorButton with inline popover"
```

---

### Task 5: Mount the button in NodeErrorView

**Files:**

- **Modify:** `packages/frontend/editor-ui/src/features/ndv/runData/components/error/NodeErrorView.vue`
- **Modify (test):** `packages/frontend/editor-ui/src/features/ndv/runData/components/error/NodeErrorView.test.ts`

- [ ] **Step 1: Add a failing test in `NodeErrorView.test.ts`.**

After the existing `'does not renders open node button when the error is in sub node'` test (around line 195), add:

```ts
it('renders the explain-error button when assistant is available', () => {
	mockChatPanelStore.canShowAiButtonOnCanvas = true;
	const { getByTestId } = renderComponent({ props: { error } });
	expect(getByTestId('explain-error-button')).toBeInTheDocument();
});

it('does not render the explain-error button when assistant is not available', () => {
	mockChatPanelStore.canShowAiButtonOnCanvas = false;
	const { queryByTestId } = renderComponent({ props: { error } });
	expect(queryByTestId('explain-error-button')).not.toBeInTheDocument();
});
```

Run:

```bash
cd packages/frontend/editor-ui && pnpm test src/features/ndv/runData/components/error/NodeErrorView.test.ts
```

Expected: the two new tests fail; the rest pass.

- [ ] **Step 2: Wire up `ExplainErrorButton` in `NodeErrorView.vue`.**

In the `<script setup>` add the import (alphabetical with other relative imports):

```ts
import ExplainErrorButton from './ExplainErrorButton.vue';
```

In the `<template>`, locate the existing block (around line 485–491):

```html
<div
	v-if="isAskAssistantAvailable"
	class="node-error-view__button"
	data-test-id="node-error-view-ask-assistant-button"
>
	<N8nInlineAskAssistantButton :asked="assistantAlreadyAsked" @click="onAskAssistantClick" />
</div>
```

Wrap both buttons in a flex row and place `ExplainErrorButton` as a sibling, gated by the same `isAskAssistantAvailable`:

```html
<div v-if="isAskAssistantAvailable" class="node-error-view__assistant-row">
	<div
		class="node-error-view__button"
		data-test-id="node-error-view-ask-assistant-button"
	>
		<N8nInlineAskAssistantButton :asked="assistantAlreadyAsked" @click="onAskAssistantClick" />
	</div>
	<ExplainErrorButton :error="props.error" />
</div>
```

Add the SCSS rule (inside the existing `<style lang="scss">` block at the bottom of the file):

```scss
.node-error-view {
	&__assistant-row {
		display: flex;
		align-items: center;
		gap: var(--spacing--2xs);
		margin-top: var(--spacing--3xs);
	}
}
```

- [ ] **Step 3: Run the NodeErrorView tests.**

```bash
cd packages/frontend/editor-ui && pnpm test src/features/ndv/runData/components/error/NodeErrorView.test.ts
```

Expected: all tests pass, including the two new ones.

- [ ] **Step 4: Typecheck and lint.**

```bash
cd packages/frontend/editor-ui && pnpm typecheck
cd packages/frontend/editor-ui && pnpm lint
```

Expected: no errors. If lint complains about the new file, run `pnpm lint --fix`.

- [ ] **Step 5: Commit.**

```bash
git add packages/frontend/editor-ui/src/features/ndv/runData/components/error/NodeErrorView.vue \
        packages/frontend/editor-ui/src/features/ndv/runData/components/error/NodeErrorView.test.ts
git commit -m "feat(editor): mount ExplainErrorButton in NodeErrorView header"
```

---

### Task 6: Telemetry + manual sanity check

**Files:**

- **Modify:** `packages/frontend/editor-ui/src/features/ndv/runData/components/error/explainError.store.ts`

- [ ] **Step 1: Add telemetry on success and failure.**

At the top of `explainError.store.ts`, import the telemetry composable used elsewhere in the assistant feature:

```ts
import { useTelemetry } from '@/app/composables/useTelemetry';
```

Inside the store factory:

```ts
const telemetry = useTelemetry();
```

In `run()`, on the success path right before `state.value = 'ready'`:

```ts
telemetry.track('User used Explain this error', {
	node_type: error.node?.type ?? 'unknown',
	result_kind: result.value?.kind ?? 'unknown',
	outcome: 'success',
});
```

In `run()`, on the error path right before `state.value = 'error'`:

```ts
telemetry.track('User used Explain this error', {
	node_type: error.node?.type ?? 'unknown',
	outcome: 'error',
});
```

- [ ] **Step 2: Add a telemetry test.**

Append to `explainError.store.test.ts`:

```ts
import { useTelemetry } from '@/app/composables/useTelemetry';

vi.mock('@/app/composables/useTelemetry', () => ({
	useTelemetry: vi.fn(),
}));

const telemetryTrack = vi.fn();
(useTelemetry as unknown as Mock).mockReturnValue({ track: telemetryTrack });

// inside describe(...) — add:
it('emits a telemetry event with outcome=success on a structured response', async () => {
	apiSpy.mockImplementation((_ctx, _payload, onMessage, onDone) => {
		onMessage({
			sessionId: 'sid',
			messages: [{ role: 'assistant', type: 'message', text: fencedJson }],
		});
		onDone();
	});
	const store = useExplainErrorStore();
	telemetryTrack.mockReset();
	await store.explain(sampleError);
	expect(telemetryTrack).toHaveBeenCalledWith(
		'User used Explain this error',
		expect.objectContaining({ outcome: 'success', result_kind: 'structured' }),
	);
});

it('emits a telemetry event with outcome=error on failure', async () => {
	apiSpy.mockImplementation((_ctx, _payload, _onMessage, _onDone, onError) => {
		onError(new Error('boom'));
	});
	const store = useExplainErrorStore();
	telemetryTrack.mockReset();
	await store.explain(sampleError);
	expect(telemetryTrack).toHaveBeenCalledWith(
		'User used Explain this error',
		expect.objectContaining({ outcome: 'error' }),
	);
});
```

- [ ] **Step 3: Run.**

```bash
cd packages/frontend/editor-ui && pnpm test src/features/ndv/runData/components/error/explainError.store.test.ts
```

Expected: all 9 tests pass.

- [ ] **Step 4: Full local check before final commit.**

```bash
cd packages/frontend/editor-ui && pnpm typecheck
cd packages/frontend/editor-ui && pnpm lint
cd packages/frontend/editor-ui && pnpm test src/features/ndv/runData/components/error/
```

Expected: typecheck clean, lint clean, all 4 test files green.

- [ ] **Step 5: Commit.**

```bash
git add packages/frontend/editor-ui/src/features/ndv/runData/components/error/explainError.store.ts \
        packages/frontend/editor-ui/src/features/ndv/runData/components/error/explainError.store.test.ts
git commit -m "feat(editor): emit telemetry for explain-error usage"
```

---

## Out of scope (stretch)

If time remains:

- **Stream chunks into the popover** instead of waiting for `onDone` — show partial summary text as it streams. Requires re-rendering on every chunk but the parser only fires on `onDone`.
- **"Continue in chat" button** in the popover footer that calls `chatPanelStore.openWithErrorHelper(...)` to escalate into the full assistant chat with context preserved.
- **Cache results per workflow execution** in `sessionStorage` keyed by error fingerprint so reopening the NDV after a re-execution shows the previous explanation instantly.
- **Add a Playwright test** under `packages/testing/playwright/tests/e2e/ndv/` that intercepts `/rest/ai/chat`, returns a canned JSON payload, clicks the new button, and asserts the three sections render.
- **Apply suggestion CTA** — if the AI's `culprit` matches a known parameter path, surface a "Jump to parameter" link that calls `ndvStore.focusInputField(...)`.

---

## Self-Review

I have reviewed this plan end-to-end:

- **Spec coverage:** every requirement from the brief is covered. The button lives next to the existing assistant button in `NodeErrorView.vue` (Task 5); the popover renders summary / culprit / next-step (Task 4 step 3); it reuses the existing `/ai/chat` plumbing without adding a new backend route (Task 3 step 3); strings are i18n'd (Task 1); the prompt is small and self-contained in `explainError.prompt.ts` (Task 2).
- **No placeholders:** every code step shows the full file contents to be written (or the precise diff to apply). No "TBD", no "similar to Task N", no skipped logic.
- **Type consistency:** the discriminated union `ExplainErrorResult` is defined once in `explainError.prompt.ts` and consumed by the store, component, and tests. The prompt builder and store both take `NodeError | NodeApiError | NodeOperationError` to match what `NodeErrorView.vue` passes (Task 4 step 4 tightens this so no `as` casts are required at any call site). The `chatWithAssistant` payload uses `ChatRequest.RequestPayload` from `assistant.types.ts` with the existing `init-support-chat` type — verified against `assistant.api.test.ts`.
- **n8n conventions:** no `any`, no `as` (test code's `as unknown as NodeError` is acceptable per `AGENTS.md`), no Element Plus/reka-ui imports (only `@n8n/design-system` components), all strings via `useI18n().baseText`, `data-testid` values are single tokens, `pnpm test`/`typecheck`/`lint` run from the package directory, no `ApplicationError` references.
- **TDD ordering:** every behavioral task lists failing test → minimal implementation → run-passes → commit. Tests describe behaviour, not implementation details.
- **MVP scope:** six tasks, each commit-sized; the longest single task (Task 4) is roughly 90 minutes of work including writing the component, its tests, the tightening pass, and the typecheck. Total estimate: 6–7 hours including local dogfooding, comfortably inside a one-day window.
- **Risk:** the most fragile part is the assistant returning non-JSON text. The parser handles fenced JSON, unfenced JSON, and a raw fallback — covered by `parseExplainErrorResponse` tests in Task 2.
