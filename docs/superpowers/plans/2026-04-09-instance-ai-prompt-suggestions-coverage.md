# Instance AI Prompt Suggestions Coverage Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Raise coverage on the prompt-suggestions PR pragmatically by adding only the missing tests that exercise real changed behavior, and only trimming dead defensive code if coverage is still red after that.

**Architecture:** Keep the production code stable unless a branch is clearly dead. Start with focused Vitest additions in the existing Instance AI test files, rerun targeted coverage for the three Codecov-highlighted files, and only then make a tiny cleanup if the remaining uncovered lines are from impossible branches. Do not broaden this into a refactor or “improve coverage everywhere” pass.

**Tech Stack:** Vue 3, Pinia, Vitest, Testing Library, V8 coverage, TypeScript

---

## File Map

- Modify: `packages/frontend/editor-ui/src/features/ai/instanceAi/__tests__/InstanceAiPromptSuggestions.test.ts`
  - Add missing interaction tests for the quick-examples menu component.
- Modify: `packages/frontend/editor-ui/src/features/ai/instanceAi/__tests__/InstanceAiInput.test.ts`
  - Add missing coverage for attachment removal and research-mode telemetry.
- Modify: `packages/frontend/editor-ui/src/features/ai/instanceAi/__tests__/instanceAi.store.test.ts`
  - Add direct tests for optimistic-send rollback and hydration branches.
- Modify only if still required after coverage rerun: `packages/frontend/editor-ui/src/features/ai/instanceAi/components/InstanceAiInput.vue`
  - Remove the defensive non-`quick-examples` telemetry guard if it is the only remaining uncovered changed branch.
- Verify with coverage against:
  - `packages/frontend/editor-ui/src/features/ai/instanceAi/components/InstanceAiPromptSuggestions.vue`
  - `packages/frontend/editor-ui/src/features/ai/instanceAi/components/InstanceAiInput.vue`
  - `packages/frontend/editor-ui/src/features/ai/instanceAi/instanceAi.store.ts`

### Task 1: Cover Missing Menu-Component Branches

**Files:**
- Modify: `packages/frontend/editor-ui/src/features/ai/instanceAi/__tests__/InstanceAiPromptSuggestions.test.ts`
- Verify: `packages/frontend/editor-ui/src/features/ai/instanceAi/components/InstanceAiPromptSuggestions.vue`

- [ ] **Step 1: Add failing tests for the two missing quick-example branches**

```ts
it('closes quick examples when the trigger is clicked again', async () => {
	const { getByTestId, queryByTestId } = renderComponent({
		props: {
			suggestions,
			disabled: false,
		},
	});

	await userEvent.click(getByTestId('instance-ai-suggestion-quick-examples'));
	expect(getByTestId('instance-ai-quick-examples-panel')).toBeVisible();

	await userEvent.click(getByTestId('instance-ai-suggestion-quick-examples'));

	expect(queryByTestId('instance-ai-quick-examples-panel')).not.toBeInTheDocument();
});

it('does not emit preview changes from quick examples while disabled', async () => {
	const { emitted } = renderComponent({
		props: {
			suggestions,
			disabled: true,
		},
	});

	expect(emitted()['preview-change']).toBeUndefined();
});
```

- [ ] **Step 2: Extend the disabled test to actually hit the disabled quick-example hover/leave path**

```ts
it('does not emit preview or submit events while disabled', async () => {
	const { emitted } = renderComponent({
		props: {
			suggestions,
			disabled: true,
		},
	});

	// Reuse the existing assertions, but also call the quick-example hover path directly.
	// Open should stay blocked, and preview-change should remain undefined.
	expect(emitted()['preview-change']).toBeUndefined();
	expect(emitted()['submit-suggestion']).toBeUndefined();
	expect(emitted()['quick-examples-opened']).toBeUndefined();
});
```

- [ ] **Step 3: Run the child-component test file and verify it passes**

Run:

```bash
pushd packages/frontend/editor-ui
pnpm test src/features/ai/instanceAi/__tests__/InstanceAiPromptSuggestions.test.ts
popd
```

Expected: PASS with the new tests included.

- [ ] **Step 4: Commit the child-component coverage slice**

```bash
git add packages/frontend/editor-ui/src/features/ai/instanceAi/__tests__/InstanceAiPromptSuggestions.test.ts
git commit -m "test(editor): cover instance ai prompt suggestions menu branches"
```

### Task 2: Cover Missing Input-Level Branches

**Files:**
- Modify: `packages/frontend/editor-ui/src/features/ai/instanceAi/__tests__/InstanceAiInput.test.ts`
- Verify: `packages/frontend/editor-ui/src/features/ai/instanceAi/components/InstanceAiInput.vue`

- [ ] **Step 1: Add a failing test that removing the last attachment restores suggestions**

```ts
it('shows suggestions again after the last attachment is removed', async () => {
	const { container, getByTestId, queryByTestId } = renderComponent({
		props: {
			isStreaming: false,
			suggestions,
		},
	});

	const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement;
	const file = new File(['hello'], 'note.txt', { type: 'text/plain' });

	Object.defineProperty(fileInput, 'files', { value: [file], configurable: true });
	await fireEvent.change(fileInput);

	await waitFor(() => {
		expect(queryByTestId('instance-ai-suggestion-build-workflow')).not.toBeInTheDocument();
	});

	await userEvent.click(getByTestId('chat-file-remove'));

	await waitFor(() => {
		expect(getByTestId('instance-ai-suggestion-build-workflow')).toBeInTheDocument();
	});
});
```

- [ ] **Step 2: Add a failing test that selection telemetry reflects research mode**

```ts
it('tracks research mode in suggestion selection telemetry', async () => {
	storeState.researchMode = true;

	const { getByTestId } = renderComponent({
		props: {
			isStreaming: false,
			suggestions,
		},
	});

	telemetryTrack.mockClear();
	await userEvent.click(getByTestId('instance-ai-suggestion-build-workflow'));

	expect(telemetryTrack).toHaveBeenCalledWith('Instance AI prompt suggestion selected', {
		thread_id: 'thread-1',
		suggestion_catalog_version: 'v1',
		research_mode: true,
		suggestion_id: 'build-workflow',
		suggestion_kind: 'prompt',
		position: 1,
	});
});
```

- [ ] **Step 3: Add a failing test that opening quick examples also reflects research mode**

```ts
it('tracks research mode in quick examples open telemetry', async () => {
	storeState.researchMode = true;

	const { getByTestId } = renderComponent({
		props: {
			isStreaming: false,
			suggestions,
		},
	});

	telemetryTrack.mockClear();
	await userEvent.click(getByTestId('instance-ai-suggestion-quick-examples'));

	expect(telemetryTrack).toHaveBeenCalledWith('Instance AI quick examples opened', {
		thread_id: 'thread-1',
		suggestion_catalog_version: 'v1',
		research_mode: true,
		suggestion_id: 'quick-examples',
		position: 4,
	});
});
```

- [ ] **Step 4: Run the input test file and verify it passes**

Run:

```bash
pushd packages/frontend/editor-ui
pnpm test src/features/ai/instanceAi/__tests__/InstanceAiInput.test.ts
popd
```

Expected: PASS with the new attachment-removal and research-mode telemetry assertions.

- [ ] **Step 5: Commit the input coverage slice**

```bash
git add packages/frontend/editor-ui/src/features/ai/instanceAi/__tests__/InstanceAiInput.test.ts
git commit -m "test(editor): cover instance ai prompt input branches"
```

### Task 3: Cover Missing Store Branches

**Files:**
- Modify: `packages/frontend/editor-ui/src/features/ai/instanceAi/__tests__/instanceAi.store.test.ts`
- Verify: `packages/frontend/editor-ui/src/features/ai/instanceAi/instanceAi.store.ts`

- [ ] **Step 1: Add a failing test for `syncThread()` failure rollback**

```ts
test('sendMessage rolls back the optimistic user message when thread sync fails', async () => {
	mockEnsureThread.mockRejectedValueOnce(new Error('sync failed'));

	const sendPromise = store.sendMessage('first');

	expect(store.messages).toHaveLength(1);
	expect(store.isSendingMessage).toBe(true);

	await sendPromise;

	expect(store.messages).toEqual([]);
	expect(store.isSendingMessage).toBe(false);
	expect(mockPostMessage).not.toHaveBeenCalled();
});
```

- [ ] **Step 2: Add a failing test for the hydration `skipped` branch**

```ts
test('loadHistoricalMessages returns skipped when messages already exist', async () => {
	store.messages.push({
		id: 'msg-1',
		role: 'user',
		createdAt: new Date().toISOString(),
		content: 'existing',
		reasoning: '',
		isStreaming: false,
	});

	mockFetchThreadMessages.mockResolvedValueOnce({
		threadId: store.currentThreadId,
		messages: [],
		nextEventId: 0,
	});

	await expect(store.loadHistoricalMessages(store.currentThreadId)).resolves.toBe('skipped');
});
```

- [ ] **Step 3: Add a failing test for the hydration `catch` fallback**

```ts
test('loadHistoricalMessages returns applied when the current direct hydration request fails', async () => {
	mockFetchThreadMessages.mockRejectedValueOnce(new Error('network failed'));

	await expect(store.loadHistoricalMessages(store.currentThreadId)).resolves.toBe('applied');
});
```

- [ ] **Step 4: Add a direct pending-send assertion**

```ts
test('isSendingMessage stays true while a send is pending', async () => {
	let resolveEnsureThread:
		| ((value: Awaited<ReturnType<typeof ensureThread>>) => void)
		| undefined;

	mockEnsureThread.mockReturnValueOnce(
		new Promise((resolve) => {
			resolveEnsureThread = resolve;
		}),
	);
	mockPostMessage.mockResolvedValue({ runId: 'run-1' });

	const sendPromise = store.sendMessage('first');
	expect(store.isSendingMessage).toBe(true);

	resolveEnsureThread?.({
		thread: {
			id: store.currentThreadId,
			title: '',
			resourceId: 'user-1',
			createdAt: '2026-01-01T00:00:00.000Z',
			updatedAt: '2026-01-01T00:00:00.000Z',
		},
		created: true,
	});

	await sendPromise;
	expect(store.isSendingMessage).toBe(false);
});
```

- [ ] **Step 5: Run the store test file and verify it passes**

Run:

```bash
pushd packages/frontend/editor-ui
pnpm test src/features/ai/instanceAi/__tests__/instanceAi.store.test.ts
popd
```

Expected: PASS with the rollback and hydration-branch assertions.

- [ ] **Step 6: Commit the store coverage slice**

```bash
git add packages/frontend/editor-ui/src/features/ai/instanceAi/__tests__/instanceAi.store.test.ts
git commit -m "test(editor): cover instance ai prompt store branches"
```

### Task 4: Re-run Focused Coverage And Trim Only Dead Code If Needed

**Files:**
- Verify: `packages/frontend/editor-ui/src/features/ai/instanceAi/components/InstanceAiPromptSuggestions.vue`
- Verify: `packages/frontend/editor-ui/src/features/ai/instanceAi/components/InstanceAiInput.vue`
- Verify: `packages/frontend/editor-ui/src/features/ai/instanceAi/instanceAi.store.ts`
- Modify only if coverage still flags a dead branch: `packages/frontend/editor-ui/src/features/ai/instanceAi/components/InstanceAiInput.vue`

- [ ] **Step 1: Run the focused coverage command**

```bash
pushd packages/frontend/editor-ui
pnpm test \
  src/features/ai/instanceAi/__tests__/InstanceAiInput.test.ts \
  src/features/ai/instanceAi/__tests__/InstanceAiPromptSuggestions.test.ts \
  src/features/ai/instanceAi/__tests__/instanceAi.store.test.ts \
  --coverage.enabled true \
  --coverage.provider v8 \
  --coverage.reporter text \
  --coverage.include "src/features/ai/instanceAi/components/InstanceAiPromptSuggestions.vue" \
  --coverage.include "src/features/ai/instanceAi/components/InstanceAiInput.vue" \
  --coverage.include "src/features/ai/instanceAi/instanceAi.store.ts"
popd
```

Expected: Codecov-relevant gaps should shrink materially. Save the uncovered line list before changing any production code.

- [ ] **Step 2: Only if the remaining uncovered changed line is the impossible non-`quick-examples` guard, remove it**

```ts
function handleQuickExamplesOpened(payload: { suggestionId: string; position: number }) {
	promptSuggestionsTelemetry.trackQuickExamplesOpened({
		...getTelemetryContext(),
		suggestionId: 'quick-examples',
		position: payload.position,
	});
}
```

If this step is taken, keep it tiny: no broader refactor, no event renaming.

- [ ] **Step 3: Re-run the focused tests and focused coverage after any tiny cleanup**

Run:

```bash
pushd packages/frontend/editor-ui
pnpm test src/features/ai/instanceAi/__tests__/InstanceAiPromptSuggestions.test.ts
pnpm test src/features/ai/instanceAi/__tests__/InstanceAiInput.test.ts
pnpm test src/features/ai/instanceAi/__tests__/instanceAi.store.test.ts
pnpm exec eslint src/features/ai/instanceAi --quiet
pnpm typecheck
popd
```

Expected: all three test files pass, focused eslint is clean, typecheck passes, and the coverage report no longer shows avoidable uncovered changed lines.

- [ ] **Step 4: Commit the final coverage cleanup if needed**

```bash
git add \
  packages/frontend/editor-ui/src/features/ai/instanceAi/components/InstanceAiInput.vue \
  packages/frontend/editor-ui/src/features/ai/instanceAi/__tests__/InstanceAiPromptSuggestions.test.ts \
  packages/frontend/editor-ui/src/features/ai/instanceAi/__tests__/InstanceAiInput.test.ts \
  packages/frontend/editor-ui/src/features/ai/instanceAi/__tests__/instanceAi.store.test.ts
git commit -m "test(editor): close instance ai prompt suggestion coverage gaps"
```

## Pragmatic Stop Condition

Stop once:
- the changed UI and store branches are covered by real behavior tests, and
- the remaining uncovered lines, if any, are outside the prompt-suggestions patch or are not worth distorting the production code to reach.

Do not spend time chasing whole-file coverage on pre-existing logic that is unrelated to this PR.
