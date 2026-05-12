# n8n Hub UI Polish — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close the five UX papercuts that make single-node executions feel like second-class citizens in the executions list — and remove the copy-pasted helpers that accumulated along the way.

**Architecture:** All work is additive on top of the in-flight Hub branch. Four new pure helper functions live in `executions.utils.ts`; three Vue components, two header components, and one frontend composable consume them. One backend repository method gains a single `andWhere` clause. No DB schema changes. No new endpoints.

**Tech Stack:** Vue 3 (Composition API, `<script setup>`), TypeScript, TypeORM (`SelectQueryBuilder`), vitest (frontend unit tests), Jest (backend unit tests).

**Source spec:** `docs/superpowers/specs/2026-05-12-n8n-hub-ui-polish-design.md`

---

## File map

**Files created:**
- None — all changes extend existing files.

**Files modified:**

| Path | Why |
| --- | --- |
| `packages/frontend/editor-ui/src/features/execution/executions/executions.utils.ts` | Adds four pure helpers + `CALLER_SOURCE_LABEL` map. |
| `packages/frontend/editor-ui/src/features/execution/executions/executions.utils.test.ts` | Unit-tests the four new helpers. |
| `packages/frontend/editor-ui/src/features/execution/executions/components/global/GlobalExecutionsListItem.vue` | Drops local `SOURCE_LABEL` / `singleNodeHeadline` / `singleNodeCallerLabel`, adds source icon. |
| `packages/frontend/editor-ui/src/features/execution/executions/components/workflow/WorkflowExecutionsCard.vue` | Drops local `SOURCE_LABEL` / `singleNodeCallerLabel`. |
| `packages/frontend/editor-ui/src/features/execution/executions/components/workflow/WorkflowExecutionsPreview.vue` | Drops local helpers + the inline "back to list" link (replaced by header breadcrumb). |
| `packages/frontend/editor-ui/src/app/components/MainHeader/WorkflowDetails.vue` | Swap inline regex for `isHubPlaceholderName`; render the new breadcrumb for hub placeholders. |
| `packages/frontend/editor-ui/src/app/components/MainHeader/MainHeader.vue` | Swap inline regex for `isHubPlaceholderName`. |
| `packages/frontend/editor-ui/src/app/composables/useWorkflowInitialization.ts` | Wrap the three `setDocumentTitle` call sites so hub placeholder names show the friendly label. |
| `packages/cli/src/workflows/workflow.service.ts` | Drop the post-query JS filter that breaks pagination. |
| `packages/@n8n/db/src/repositories/workflow.repository.ts` | Push the placeholder filter into both `getManyQuery` and `getManyQueryWithSharingSubquery`. |
| `packages/cli/test/integration/workflow.service.api.test.ts` *(or the closest existing integration test for `WorkflowService.getMany`)* | Pagination regression test for the placeholder filter. |

---

## Pre-flight (no code yet)

- [ ] **Confirm baseline tests pass.** Run only the suites we're touching to keep the loop fast.

```bash
pnpm --filter @n8n/editor-ui test -- executions.utils.test.ts
pnpm --filter n8n test -- workflow.service
```

Expected: both green (pre-existing tests untouched).

---

## Task 1 — Add the four shared helpers (TDD)

**Files:**
- Modify: `packages/frontend/editor-ui/src/features/execution/executions/executions.utils.ts`
- Test: `packages/frontend/editor-ui/src/features/execution/executions/executions.utils.test.ts`

We add (a) a brand-label map, (b) `getCallerLabel`, (c) `getSingleNodeHeadline`, (d) `isHubPlaceholderName`, (e) `getFriendlyHubWorkflowName`. All pure. The Vue files already import this module.

- [ ] **Step 1.1: Write failing tests.**

Append to `executions.utils.test.ts` (above the final `}` if the file is wrapped, otherwise at end of file):

```ts
import { describe, it, expect } from 'vitest';
import { i18n } from '@n8n/i18n';
import type { ExecutionCaller } from '@n8n/api-types';
import {
	CALLER_SOURCE_LABEL,
	getCallerDisplay,
	getCallerLabel,
	getSingleNodeHeadline,
	isHubPlaceholderName,
	getFriendlyHubWorkflowName,
} from './executions.utils';

describe('n8n Hub UI helpers', () => {
	describe('CALLER_SOURCE_LABEL', () => {
		it('maps the three known kinds to brand-cased labels', () => {
			expect(CALLER_SOURCE_LABEL.mcp).toBe('MCP');
			expect(CALLER_SOURCE_LABEL.cli).toBe('CLI');
			expect(CALLER_SOURCE_LABEL.sdk).toBe('SDK');
		});
	});

	describe('getCallerDisplay', () => {
		it('returns empty string when caller is undefined', () => {
			expect(getCallerDisplay(undefined)).toBe('');
		});

		it('returns "SOURCE (Name)" when caller name differs from the source label', () => {
			expect(getCallerDisplay({ kind: 'mcp', name: 'Claude Desktop' })).toBe('MCP (Claude Desktop)');
		});

		it('returns just "SOURCE" when name matches the source label', () => {
			expect(getCallerDisplay({ kind: 'cli', name: 'CLI' })).toBe('CLI');
		});

		it('falls back to UPPERCASED kind for unknown future kinds', () => {
			expect(getCallerDisplay({ kind: 'browser', name: 'Web' } as unknown as ExecutionCaller)).toBe(
				'BROWSER (Web)',
			);
		});
	});

	describe('getCallerLabel', () => {
		it('returns empty string when caller is undefined', () => {
			expect(getCallerLabel(undefined, i18n)).toBe('');
		});

		it('prepends "via " to the caller display', () => {
			const caller: ExecutionCaller = { kind: 'mcp', name: 'Claude Desktop' };
			expect(getCallerLabel(caller, i18n)).toBe('via MCP (Claude Desktop)');
		});
	});

	describe('getSingleNodeHeadline', () => {
		it('prefers actionDisplayName when present', () => {
			const out = getSingleNodeHeadline(
				{
					actionDisplayName: 'Slack - Send a message',
					actionId: 'n8n-nodes-base.slack.message.send',
					nodeType: 'n8n-nodes-base.slack',
					caller: { kind: 'mcp', name: 'Claude' },
				},
				'fallback',
			);
			expect(out).toBe('Slack - Send a message');
		});

		it('falls back through actionId, nodeType, caller.name, then fallback', () => {
			expect(
				getSingleNodeHeadline(
					{ actionId: 'n8n-nodes-base.slack.message.send' },
					'fallback',
				),
			).toBe('n8n-nodes-base.slack.message.send');
			expect(getSingleNodeHeadline({ nodeType: 'n8n-nodes-base.slack' }, 'fallback')).toBe(
				'n8n-nodes-base.slack',
			);
			expect(
				getSingleNodeHeadline({ caller: { kind: 'sdk', name: 'sdk-script' } }, 'fallback'),
			).toBe('sdk-script');
			expect(getSingleNodeHeadline({}, 'fallback')).toBe('fallback');
		});
	});

	describe('isHubPlaceholderName', () => {
		it.each([
			['__n8n-hub-action::n8n-nodes-base.slack', true],
			['__n8n-hub-legacy-name', true],
			['My Workflow', false],
			['', false],
			[undefined, false],
		])('%s → %s', (name, expected) => {
			expect(isHubPlaceholderName(name)).toBe(expected);
		});
	});

	describe('getFriendlyHubWorkflowName', () => {
		it('renders 3+ dot-segment action ids as "<service> — <rest>"', () => {
			expect(
				getFriendlyHubWorkflowName('__n8n-hub-action::n8n-nodes-base.slack.message.post'),
			).toBe('slack — message post');
		});

		it('returns the stripped name when there are fewer than 3 segments', () => {
			expect(getFriendlyHubWorkflowName('__n8n-hub-action::httpRequest')).toBe('httpRequest');
		});

		it('returns the raw name unchanged when the prefix is absent', () => {
			expect(getFriendlyHubWorkflowName('Some Workflow')).toBe('Some Workflow');
		});
	});
});
```

- [ ] **Step 1.2: Run tests and verify they fail with the right errors.**

```bash
pnpm --filter @n8n/editor-ui test -- executions.utils.test.ts
```

Expected: `getCallerLabel`, `getSingleNodeHeadline`, `isHubPlaceholderName`, `getFriendlyHubWorkflowName`, and `CALLER_SOURCE_LABEL` are reported as `not exported from './executions.utils'`. Pre-existing tests in the file still pass.

- [ ] **Step 1.3: Add the helpers to `executions.utils.ts`.**

Append at the end of `executions.utils.ts` (after `executionRetryMessage`):

```ts
import type { ExecutionCaller, ExecutionCallerKind } from '@n8n/api-types';
import type { SingleNodeExecutionSummaryExtras } from './executions.types';

/**
 * Brand-cased labels for the caller `kind` discriminator. Centralized so the
 * three list/detail components agree on capitalization and forward-compat.
 */
export const CALLER_SOURCE_LABEL: Record<ExecutionCallerKind | string, string> = {
	mcp: 'MCP',
	cli: 'CLI',
	sdk: 'SDK',
};

/**
 * Build just the "SOURCE (Name)" or "SOURCE" segment — no "via " prefix. Used
 * by the detail-view header, which already says "via {caller}" in its template.
 * Returns `''` when no caller is attached.
 */
export function getCallerDisplay(caller: ExecutionCaller | undefined): string {
	if (!caller) return '';
	const source = CALLER_SOURCE_LABEL[caller.kind] ?? caller.kind.toUpperCase();
	return caller.name && caller.name !== source ? `${source} (${caller.name})` : source;
}

/**
 * Compose the "via MCP (Claude Desktop)" sub-line shown on list rows. Returns
 * `''` when no caller is attached.
 */
export function getCallerLabel(
	caller: ExecutionCaller | undefined,
	locale: typeof i18n,
): string {
	const display = getCallerDisplay(caller);
	if (!display) return '';
	return locale.baseText('executionsList.singleNode.via', { interpolate: { caller: display } });
}

/**
 * Resolve the most-specific human-friendly label we can build for a single-node
 * execution, falling back through the available fields in preference order:
 *   actionDisplayName → actionId → nodeType → caller.name → fallback.
 */
export function getSingleNodeHeadline(
	extras: SingleNodeExecutionSummaryExtras,
	fallback: string,
): string {
	return (
		extras.actionDisplayName ??
		extras.actionId ??
		extras.nodeType ??
		extras.caller?.name ??
		fallback
	);
}

/**
 * Hub placeholder workflows back single-node executions and aren't user-
 * authored. Centralize the prefix check so it's not duplicated across the
 * MainHeader, WorkflowDetails, and workflow service.
 */
export function isHubPlaceholderName(name: string | undefined): boolean {
	return !!name && (name.startsWith('__n8n-hub-action::') || name.startsWith('__n8n-hub-'));
}

/**
 * Render a hub placeholder workflow name as a friendly action label.
 * Examples:
 *   "__n8n-hub-action::n8n-nodes-base.slack.message.post" → "slack — message post"
 *   "__n8n-hub-action::httpRequest"                       → "httpRequest"
 *   "User-authored workflow"                              → "User-authored workflow"
 */
export function getFriendlyHubWorkflowName(name: string): string {
	if (!isHubPlaceholderName(name)) return name;
	const stripped = name.replace(/^__n8n-hub-action::/, '').replace(/^__n8n-hub-/, '');
	const parts = stripped.split('.');
	if (parts.length >= 3) {
		// Drop the package segment (e.g. "n8n-nodes-base"), keep service + operation.
		return `${parts[1]} — ${parts.slice(2).join(' ')}`;
	}
	return stripped;
}
```

If the top of the file does not already `import { i18n } from '@n8n/i18n'`, leave the existing import as-is — it does, per the file head (`import { i18n } from '@n8n/i18n';`). Use that same imported binding; do not re-import.

- [ ] **Step 1.4: Re-run tests and verify they pass.**

```bash
pnpm --filter @n8n/editor-ui test -- executions.utils.test.ts
```

Expected: all new `describe('n8n Hub UI helpers')` cases pass. Pre-existing tests still pass.

- [ ] **Step 1.5: Commit.**

```bash
git add packages/frontend/editor-ui/src/features/execution/executions/executions.utils.ts \
        packages/frontend/editor-ui/src/features/execution/executions/executions.utils.test.ts
git commit -m "refactor(editor-ui): extract shared n8n Hub UI helpers"
```

---

## Task 2 — Sweep `GlobalExecutionsListItem.vue` to use shared helpers, add source icon

**Files:**
- Modify: `packages/frontend/editor-ui/src/features/execution/executions/components/global/GlobalExecutionsListItem.vue`
- Test: `packages/frontend/editor-ui/src/features/execution/executions/components/global/GlobalExecutionsListItem.test.ts`

- [ ] **Step 2.1: Write the failing test for the source icon.**

Open `GlobalExecutionsListItem.test.ts`. Add a new `describe('single-node source icon', ...)` block at the end of the top-level `describe(...)`:

```ts
import type { IconName } from '@n8n/design-system/components/N8nIcon/icons';

describe('single-node source icon', () => {
	it.each<[string, IconName]>([
		['mcp', 'bot'],
		['cli', 'terminal'],
		['sdk', 'code'],
	])('renders the %s icon for caller.kind = %s', async (kind, icon) => {
		const { container } = renderComponent({
			props: {
				execution: {
					...mockExecution,
					mode: 'single-node',
					caller: { kind, name: 'demo' },
				},
				workflowPermissions: defaultWorkflowPermissions,
				concurrencyCap: 0,
			},
		});
		// Look up the icon by data attribute or class — match whatever pattern
		// the existing trigger-mode tooltip uses (see the manual/chat assertions
		// above in this file). The point is to assert the rendered icon name.
		const iconEl = container.querySelector(`[data-icon-name="${icon}"]`);
		expect(iconEl).not.toBeNull();
	});

	it('falls back to the plug-zap icon for an unknown future caller.kind', () => {
		const { container } = renderComponent({
			props: {
				execution: {
					...mockExecution,
					mode: 'single-node',
					caller: { kind: 'browser', name: 'web-ui' },
				},
				workflowPermissions: defaultWorkflowPermissions,
				concurrencyCap: 0,
			},
		});
		expect(container.querySelector('[data-icon-name="plug-zap"]')).not.toBeNull();
	});
});
```

**Note for the engineer:** if the existing tests in this file use a different rendering helper than `renderComponent`, use that one — copy the pattern from the closest existing test (search for `manual` or `chat` mode handling in this file). The assertion mechanism (`data-icon-name`, `findByTestId`, etc.) should match. If `N8nIcon` renders without a queryable hook, change the assertion to compare the rendered icon's `name` prop via Vue Test Utils' `.findComponent(N8nIcon)` API — pattern shown in `GlobalExecutionsListItemQueuedTooltip.test.ts`.

- [ ] **Step 2.2: Run tests and verify they fail.**

```bash
pnpm --filter @n8n/editor-ui test -- GlobalExecutionsListItem.test.ts
```

Expected: the four new cases fail (no icon rendered for `single-node`).

- [ ] **Step 2.3: Update `GlobalExecutionsListItem.vue` to use shared helpers + render the icon.**

In the `<script setup>` block:

a. Replace the lines from `// Single-node executions ...` through the end of `singleNodeCallerLabel` (currently `vue:60-110`) with the consolidated imports + computed values:

```ts
import {
	getCallerLabel,
	getSingleNodeHeadline,
} from '../../executions.utils';

const isSingleNodeExecution = computed(() => props.execution.mode === 'single-node');

const singleNodeHeadline = computed(() =>
	isSingleNodeExecution.value
		? getSingleNodeHeadline(
				props.execution,
				locale.baseText('executionsList.singleNode.headlineFallback'),
			)
		: '',
);

const singleNodeCallerLabel = computed(() =>
	isSingleNodeExecution.value ? getCallerLabel(props.execution.caller, locale) : '',
);

const SOURCE_ICON: Record<string, IconName> = {
	mcp: 'bot',
	cli: 'terminal',
	sdk: 'code',
};

const sourceIconName = computed<IconName>(() => {
	const kind = props.execution.caller?.kind;
	if (!kind) return 'plug-zap';
	return SOURCE_ICON[kind] ?? 'plug-zap';
});
```

The existing `import { type IconName } ...` line stays — `SOURCE_ICON` reuses it. Delete the local `SOURCE_LABEL` constant.

b. In the `<template>`, locate the existing trigger-mode column (currently `vue:334-341`):

```vue
<td>
	<N8nTooltip v-if="execution.mode === 'manual'" content="Manual Execution" placement="top">
		<N8nIcon icon="flask-conical" />
	</N8nTooltip>
	<N8nTooltip v-else-if="execution.mode === 'chat'" content="Chat Execution" placement="top">
		<N8nIcon icon="messages-square" />
	</N8nTooltip>
</td>
```

Add a third branch immediately before `</td>`:

```vue
<N8nTooltip
	v-else-if="isSingleNodeExecution"
	:content="singleNodeCallerLabel || locale.baseText('executionsList.singleNode.headlineFallback')"
	placement="top"
>
	<N8nIcon :icon="sourceIconName" />
</N8nTooltip>
```

- [ ] **Step 2.4: Run tests and verify they pass.**

```bash
pnpm --filter @n8n/editor-ui test -- GlobalExecutionsListItem.test.ts
```

Expected: all new cases pass. Pre-existing assertions (manual/chat icons, headline rendering) still pass.

- [ ] **Step 2.5: Typecheck the package.**

```bash
pnpm --filter @n8n/editor-ui typecheck
```

Expected: clean.

- [ ] **Step 2.6: Commit.**

```bash
git add packages/frontend/editor-ui/src/features/execution/executions/components/global/GlobalExecutionsListItem.vue \
        packages/frontend/editor-ui/src/features/execution/executions/components/global/GlobalExecutionsListItem.test.ts
git commit -m "feat(editor-ui): surface execution source on single-node rows"
```

---

## Task 3 — Sweep `WorkflowExecutionsCard.vue` to use shared helpers

**Files:**
- Modify: `packages/frontend/editor-ui/src/features/execution/executions/components/workflow/WorkflowExecutionsCard.vue`

No test changes required (the existing test file does not assert on the caller sub-line; if you find such an assertion, leave it untouched — the rendered text is identical).

- [ ] **Step 3.1: Replace the local helpers in `WorkflowExecutionsCard.vue`.**

In the `<script setup>` block, find lines 64–83 (the `SOURCE_LABEL` map and `singleNodeCallerLabel` computed):

```ts
// Single-node executions (n8n Hub) carry caller info on the summary. ...
const SOURCE_LABEL: Record<string, string> = { ... };

const singleNodeCallerLabel = computed(() => {
	const extras = props.execution as ExecutionSummary & SingleNodeExecutionSummaryExtras;
	if (extras.mode !== 'single-node' || !extras.caller) return '';
	const source = SOURCE_LABEL[extras.caller.kind] ?? extras.caller.kind.toUpperCase();
	const display =
		extras.caller.name && extras.caller.name !== source
			? `${source} (${extras.caller.name})`
			: source;
	return locale.baseText('executionsList.singleNode.via', { interpolate: { caller: display } });
});
```

Replace with:

```ts
import { getCallerLabel } from '../../executions.utils';

const singleNodeCallerLabel = computed(() => {
	const extras = props.execution as ExecutionSummary & SingleNodeExecutionSummaryExtras;
	if (extras.mode !== 'single-node') return '';
	return getCallerLabel(extras.caller, locale);
});
```

The import for `SingleNodeExecutionSummaryExtras` already exists at the top — keep it.

- [ ] **Step 3.2: Run the existing test, typecheck, and lint.**

```bash
pnpm --filter @n8n/editor-ui test -- WorkflowExecutionsCard
pnpm --filter @n8n/editor-ui typecheck
```

Expected: clean.

- [ ] **Step 3.3: Commit.**

```bash
git add packages/frontend/editor-ui/src/features/execution/executions/components/workflow/WorkflowExecutionsCard.vue
git commit -m "refactor(editor-ui): WorkflowExecutionsCard uses shared caller label"
```

---

## Task 4 — Sweep `WorkflowExecutionsPreview.vue` to use shared helpers, remove inline "back" link

**Files:**
- Modify: `packages/frontend/editor-ui/src/features/execution/executions/components/workflow/WorkflowExecutionsPreview.vue`

The "back to list" link in the detail header gets retired here because Task 5 replaces it with a top-level breadcrumb. We keep the rest of the single-node header text (`Node call: <action> · via MCP (...)`).

- [ ] **Step 4.1: Replace the local helpers + drop the back-link computed.**

In `<script setup>`, find the block introduced as "Map the caller `kind` ..." (currently lines 84–125 including `SOURCE_LABEL`, `formatCallerDisplay`, `singleNodeHeader`, `backToListRoute`):

```ts
const SOURCE_LABEL: Record<string, string> = { ... };
function formatCallerDisplay(caller: ...): string { ... }
const singleNodeHeader = computed(() => { ... });
const backToListRoute = computed(() => { ... });
```

Replace with:

```ts
import { getSingleNodeHeadline, getCallerDisplay } from '../../executions.utils';

const isSingleNodeExecution = computed(() => props.execution?.mode === 'single-node');

const singleNodeHeader = computed(() => {
	if (!isSingleNodeExecution.value || !props.execution) return '';
	const action = getSingleNodeHeadline(props.execution, '');
	const callerSegment = getCallerDisplay(props.execution.caller);
	if (action && callerSegment) {
		return locale.baseText('executionDetails.singleNode.header', {
			interpolate: { nodeType: action, caller: callerSegment },
		});
	}
	if (action) {
		return locale.baseText('executionDetails.singleNode.headerNoCaller', {
			interpolate: { nodeType: action },
		});
	}
	return locale.baseText('executionDetails.singleNode.fallbackHeader');
});
```

Delete the `backToListRoute` computed entirely.

- [ ] **Step 4.2: Remove the inline back-to-list link from the template.**

In `<template>`, locate the block (currently around lines 310–325):

```vue
<div v-if="isSingleNodeExecution" :class="$style.singleNodeHeader">
	<N8nText
		size="large"
		color="text-dark"
		:bold="true"
		data-test-id="execution-preview-single-node-header"
	>
		{{ singleNodeHeader }}
	</N8nText>
	<RouterLink
		:to="backToListRoute"
		:class="$style.backToListLink"
		data-test-id="execution-preview-back-to-list"
	>
		{{ locale.baseText('executionDetails.backToList') }}
	</RouterLink>
</div>
```

Replace with (drop the `RouterLink`):

```vue
<div v-if="isSingleNodeExecution" :class="$style.singleNodeHeader">
	<N8nText
		size="large"
		color="text-dark"
		:bold="true"
		data-test-id="execution-preview-single-node-header"
	>
		{{ singleNodeHeader }}
	</N8nText>
</div>
```

In `<style module lang="scss">` at the bottom, delete the `.backToListLink { ... }` rule.

- [ ] **Step 4.3: Typecheck + run any existing preview tests.**

```bash
pnpm --filter @n8n/editor-ui typecheck
pnpm --filter @n8n/editor-ui test -- WorkflowExecutionsPreview
```

Expected: clean. If a test asserts on `data-test-id="execution-preview-back-to-list"`, that test must be updated — replace its assertion to verify the breadcrumb (which is added in Task 5 in `WorkflowDetails.vue`, not this file). If the test is asserting on the removed selector and Task 5 hasn't landed yet, mark the assertion `it.skip(...)` with a TODO referencing Task 5 and re-enable it in Task 5.

- [ ] **Step 4.4: Commit.**

```bash
git add packages/frontend/editor-ui/src/features/execution/executions/components/workflow/WorkflowExecutionsPreview.vue
git commit -m "refactor(editor-ui): WorkflowExecutionsPreview uses shared helpers"
```

---

## Task 5 — Swap header breadcrumb for hub placeholders

**Files:**
- Modify: `packages/frontend/editor-ui/src/app/components/MainHeader/WorkflowDetails.vue`
- Modify: `packages/frontend/editor-ui/src/app/components/MainHeader/MainHeader.vue`

Today `WorkflowDetails.vue` always renders `FolderBreadcrumbs` (project / folder hierarchy). For hub placeholders, render `N8nBreadcrumbs` with a single `Executions` segment that links to the global executions view.

- [ ] **Step 5.1: Update `WorkflowDetails.vue` — replace inline regex with `isHubPlaceholderName` and `getFriendlyHubWorkflowName`.**

In `<script setup>`, find the existing block (lines 114–144):

```ts
const isHubPlaceholderWorkflow = computed(
	() => props.name.startsWith('__n8n-hub-action::') || props.name.startsWith('__n8n-hub-'),
);
// ...
const displayedWorkflowName = computed(() => {
	if (!isHubPlaceholderWorkflow.value) return props.name;
	const stripped = props.name
		.replace(/^__n8n-hub-action::/, '')
		.replace(/^__n8n-hub-/, '');
	const parts = stripped.split('.');
	if (parts.length >= 3) {
		return `${parts[1]} — ${parts.slice(2).join(' ')}`;
	}
	return stripped;
});
```

Replace with:

```ts
import {
	isHubPlaceholderName,
	getFriendlyHubWorkflowName,
} from '@/features/execution/executions/executions.utils';

const isHubPlaceholderWorkflow = computed(() => isHubPlaceholderName(props.name));

const displayedWorkflowName = computed(() =>
	isHubPlaceholderWorkflow.value ? getFriendlyHubWorkflowName(props.name) : props.name,
);
```

- [ ] **Step 5.2: Add the breadcrumb items + click handler in `WorkflowDetails.vue`.**

Still in `<script setup>`, add (anywhere near `displayedWorkflowName`):

```ts
import { N8nBreadcrumbs } from '@n8n/design-system';

const hubBreadcrumbItems = computed<PathItem[]>(() => [
	{
		id: 'executions',
		label: locale.baseText('generic.executions'),
		href: router.resolve({ name: VIEWS.EXECUTIONS }).href,
	},
]);

function onHubBreadcrumbItemSelected(item: PathItem) {
	if (item.id === 'executions') {
		void router.push({ name: VIEWS.EXECUTIONS });
	}
}
```

The `N8nBreadcrumbs` component is already exported from `@n8n/design-system` (`packages/frontend/@n8n/design-system/src/components/N8nBreadcrumbs/index.ts`); verify the named export is `N8nBreadcrumbs`. If the design-system top-level index does not re-export it, add the deep import:

```ts
import N8nBreadcrumbs from '@n8n/design-system/components/N8nBreadcrumbs/Breadcrumbs.vue';
```

- [ ] **Step 5.3: Render `N8nBreadcrumbs` in `<template>` for hub placeholders.**

Find the existing block (around lines 444–480 in the modified file):

```vue
<BreakpointsObserver
	:value-x-s="15"
	:value-s-m="25"
	:value-m-d="50"
	class="name-container"
	data-test-id="canvas-breadcrumbs"
>
	<template #default="{ bp }">
		<FolderBreadcrumbs ...>
			<template #append>
				<span ...>/</span>
				<N8nInlineTextEdit ... :model-value="displayedWorkflowName" .../>
			</template>
		</FolderBreadcrumbs>
	</template>
</BreakpointsObserver>
```

Wrap the `FolderBreadcrumbs` in a conditional:

```vue
<BreakpointsObserver
	:value-x-s="15"
	:value-s-m="25"
	:value-m-d="50"
	class="name-container"
	data-test-id="canvas-breadcrumbs"
>
	<template #default="{ bp }">
		<N8nBreadcrumbs
			v-if="isHubPlaceholderWorkflow"
			:items="hubBreadcrumbItems"
			data-test-id="hub-action-breadcrumbs"
			@item-selected="onHubBreadcrumbItemSelected"
		>
			<template #append>
				<span :class="$style['path-separator']">/</span>
				<N8nInlineTextEdit
					ref="renameInput"
					:key="id"
					placeholder="Workflow name"
					data-test-id="workflow-name-input"
					class="name"
					:model-value="displayedWorkflowName"
					:max-length="MAX_WORKFLOW_NAME_LENGTH"
					:max-width="WORKFLOW_NAME_BP_TO_WIDTH[bp]"
					:read-only="true"
					:disabled="true"
				/>
			</template>
		</N8nBreadcrumbs>
		<FolderBreadcrumbs
			v-else
			:current-folder="currentFolderForBreadcrumbs"
			:current-folder-as-link="true"
			@item-selected="onBreadcrumbsItemSelected"
		>
			<template #append>
				<span
					v-if="projectsStore.currentProject ?? projectsStore.personalProject"
					:class="$style['path-separator']"
					>/</span
				>
				<N8nInlineTextEdit
					ref="renameInput"
					:key="id"
					placeholder="Workflow name"
					data-test-id="workflow-name-input"
					class="name"
					:model-value="displayedWorkflowName"
					:max-length="MAX_WORKFLOW_NAME_LENGTH"
					:max-width="WORKFLOW_NAME_BP_TO_WIDTH[bp]"
					:read-only="readOnlyActions"
					:disabled="readOnlyActions"
					@update:model-value="onNameSubmit"
				/>
			</template>
		</FolderBreadcrumbs>
	</template>
</BreakpointsObserver>
```

The hub branch duplicates the inline-text-edit because `N8nBreadcrumbs` and `FolderBreadcrumbs` are separate components with their own `#append` slots; do not try to share via a `<slot>` wrapper — the `bp` variable from `BreakpointsObserver` is scoped to its `#default` slot.

- [ ] **Step 5.4: Update `MainHeader.vue` to use `isHubPlaceholderName`.**

In `<script setup>` of `MainHeader.vue`, find:

```ts
const isHubPlaceholderWorkflow = computed(
	() =>
		workflowName.value.startsWith('__n8n-hub-action::') ||
		workflowName.value.startsWith('__n8n-hub-'),
);
```

Replace with:

```ts
import { isHubPlaceholderName } from '@/features/execution/executions/executions.utils';

const isHubPlaceholderWorkflow = computed(() => isHubPlaceholderName(workflowName.value));
```

- [ ] **Step 5.5: Add a vitest unit for the new breadcrumb.**

Find the existing test file for `WorkflowDetails.vue`. If `packages/frontend/editor-ui/src/app/components/MainHeader/WorkflowDetails.test.ts` exists, append; otherwise create it next to the component using the same renderer pattern other component tests in `app/components` use (search for one example: `grep -rn "renderComponent" packages/frontend/editor-ui/src/app/components | head -5`).

```ts
describe('WorkflowDetails breadcrumbs', () => {
	it('renders the executions-link breadcrumb for hub placeholder workflows', async () => {
		const { findByTestId } = renderComponent({
			props: {
				id: 'wf-1',
				tags: [],
				name: '__n8n-hub-action::n8n-nodes-base.slack.message.post',
				isArchived: false,
			},
		});
		const crumbs = await findByTestId('hub-action-breadcrumbs');
		expect(crumbs).toBeInTheDocument();
		expect(crumbs.textContent).toContain('Executions');
	});

	it('renders FolderBreadcrumbs for regular workflows', async () => {
		const { findByTestId, queryByTestId } = renderComponent({
			props: { id: 'wf-2', tags: [], name: 'My Workflow', isArchived: false },
		});
		expect(await findByTestId('canvas-breadcrumbs')).toBeInTheDocument();
		expect(queryByTestId('hub-action-breadcrumbs')).toBeNull();
	});
});
```

If the existing pattern for tests in this directory uses Vue Test Utils' `mount` instead of a `renderComponent` helper, mirror that pattern. Match what's next door.

- [ ] **Step 5.6: Run tests + typecheck.**

```bash
pnpm --filter @n8n/editor-ui test -- WorkflowDetails
pnpm --filter @n8n/editor-ui typecheck
```

Expected: both pass. If Task 4 left an `it.skip(...)` for the back-to-list assertion, delete that test entirely now — the breadcrumb is the replacement and is asserted here.

- [ ] **Step 5.7: Commit.**

```bash
git add packages/frontend/editor-ui/src/app/components/MainHeader/WorkflowDetails.vue \
        packages/frontend/editor-ui/src/app/components/MainHeader/MainHeader.vue \
        packages/frontend/editor-ui/src/app/components/MainHeader/WorkflowDetails.test.ts 2>/dev/null
git commit -m "feat(editor-ui): replace folder breadcrumb with Executions link for hub actions"
```

---

## Task 6 — Browser tab title shows the friendly action name

**Files:**
- Modify: `packages/frontend/editor-ui/src/app/composables/useWorkflowInitialization.ts`

Three call sites of `setDocumentTitle` use the raw workflow name. For hub placeholders, replace the name with the friendly version.

- [ ] **Step 6.1: Apply the helper at all three call sites.**

In `useWorkflowInitialization.ts`, near the top imports:

```ts
import {
	isHubPlaceholderName,
	getFriendlyHubWorkflowName,
} from '@/features/execution/executions/executions.utils';
```

Find line 196:

```ts
documentTitle.setDocumentTitle(currentWorkflowDocumentStore.value?.name ?? '', 'DEBUG');
```

Replace with:

```ts
{
	const debugName = currentWorkflowDocumentStore.value?.name ?? '';
	documentTitle.setDocumentTitle(
		isHubPlaceholderName(debugName) ? getFriendlyHubWorkflowName(debugName) : debugName,
		'DEBUG',
	);
}
```

Find lines 263–265:

```ts
if (builderStore.streaming) {
	documentTitle.setDocumentTitle(data.name, 'AI_BUILDING');
} else {
	documentTitle.setDocumentTitle(data.name, 'IDLE');
}
```

Replace with:

```ts
{
	const titleName = isHubPlaceholderName(data.name)
		? getFriendlyHubWorkflowName(data.name)
		: data.name;
	if (builderStore.streaming) {
		documentTitle.setDocumentTitle(titleName, 'AI_BUILDING');
	} else {
		documentTitle.setDocumentTitle(titleName, 'IDLE');
	}
}
```

- [ ] **Step 6.2: Add a vitest unit asserting the tab title is friendly.**

If `packages/frontend/editor-ui/src/app/composables/useWorkflowInitialization.test.ts` exists, append:

```ts
describe('document title for hub placeholder workflows', () => {
	it('uses the friendly name when opening a hub placeholder', async () => {
		const setDocumentTitle = vi.fn();
		// Stub useDocumentTitle to capture the call.
		vi.mocked(useDocumentTitle).mockReturnValue({
			set: vi.fn(),
			reset: vi.fn(),
			setDocumentTitle,
			getDocumentState: vi.fn(),
		});

		const { openWorkflow } = useWorkflowInitialization();
		await openWorkflow({
			id: 'wf-hub-1',
			name: '__n8n-hub-action::n8n-nodes-base.slack.message.post',
			// ... minimum required IWorkflowDb fields per existing test fixtures
		} as IWorkflowDb);

		expect(setDocumentTitle).toHaveBeenCalledWith('slack — message post', 'IDLE');
	});
});
```

If a test file does not exist, **do not create one for this task** — the existing test surface for this composable is not established, and adding one is broader than this plan's scope. Add a one-line manual verification step in Task 7 instead.

- [ ] **Step 6.3: Run tests + typecheck.**

```bash
pnpm --filter @n8n/editor-ui test -- useWorkflowInitialization 2>/dev/null || true
pnpm --filter @n8n/editor-ui typecheck
```

Expected: typecheck clean. If the test file existed, the new case passes.

- [ ] **Step 6.4: Commit.**

```bash
git add packages/frontend/editor-ui/src/app/composables/useWorkflowInitialization.ts \
        packages/frontend/editor-ui/src/app/composables/useWorkflowInitialization.test.ts 2>/dev/null
git commit -m "fix(editor-ui): browser tab shows friendly name for n8n Hub actions"
```

---

## Task 7 — Move the placeholder filter into the SQL query (backend)

**Files:**
- Modify: `packages/cli/src/workflows/workflow.service.ts:184-194` — drop the JS filter.
- Modify: `packages/@n8n/db/src/repositories/workflow.repository.ts` — add an `andWhere` in `getManyQueryWithSharingSubquery` (line ~826) and `getManyQuery` (line ~851).
- Modify (or add): the closest existing Jest integration test for `WorkflowService.getMany` — pagination test.

- [ ] **Step 7.1: Write the failing pagination test.**

Find the existing test file. Most likely candidate: `packages/cli/test/integration/workflow.service.api.test.ts` or `packages/cli/src/workflows/workflow.service.test.ts`. Use the one that already exercises `WorkflowService.getMany` end-to-end against a real (in-memory) DB. If neither does, add the test to `workflow.service.test.ts` with the repository mocked to return a synthetic dataset.

Append:

```ts
describe('WorkflowService.getMany pagination with hub placeholder workflows', () => {
	it('returns exactly `take` rows when placeholders exist among the first page', async () => {
		// Seed 5 user workflows + 3 placeholder workflows (interleaved).
		await createWorkflow({ name: 'Wf 1' }, owner);
		await createWorkflow({ name: '__n8n-hub-action::n8n-nodes-base.slack.message.post' }, owner);
		await createWorkflow({ name: 'Wf 2' }, owner);
		await createWorkflow({ name: '__n8n-hub-action::n8n-nodes-base.linear.issue.create' }, owner);
		await createWorkflow({ name: 'Wf 3' }, owner);
		await createWorkflow({ name: 'Wf 4' }, owner);
		await createWorkflow({ name: '__n8n-hub-action::n8n-nodes-base.github.repo.list' }, owner);
		await createWorkflow({ name: 'Wf 5' }, owner);

		const { workflows, count } = await workflowService.getMany(owner, { take: 5, skip: 0 });

		expect(workflows).toHaveLength(5);
		expect(workflows.every((wf) => !wf.name?.startsWith('__n8n-hub-'))).toBe(true);
		expect(count).toBe(5); // only user workflows are countable
	});
});
```

Adapt to the existing test file's helpers (`createWorkflow`, `owner`). If the test file uses a different pagination option name (`limit` / `offset` vs `take` / `skip`), use the one in `ListQuery.Options` per the existing `workflow.service.ts` codepath.

- [ ] **Step 7.2: Run the test and confirm it fails.**

```bash
pnpm --filter n8n test -- workflow.service
```

Expected: the new case fails because `workflows.length === 4` (placeholder slipped in then was filtered post-query, breaking pagination). Pre-existing cases still pass.

- [ ] **Step 7.3: Add `andWhere` clauses to `workflow.repository.ts`.**

In `getManyQueryWithSharingSubquery`, just before `this.applyPagination(qb, options);` (~line 826):

```ts
// Exclude n8n Hub placeholder workflows (single-node execution backers) from
// every list query. They're internal infrastructure rows, not user-authored
// workflows; filtering here (instead of post-query in the service) keeps
// pagination and count consistent.
qb.andWhere('workflow.name NOT LIKE :hubActionPrefix', { hubActionPrefix: '__n8n-hub-%' });
```

In `getManyQuery`, just before `this.applySorting(qb, options.sortBy);` (the exact insertion point after `applyRelations` and before `applySorting` matches the pattern used in the sharing-subquery method):

```ts
qb.andWhere('workflow.name NOT LIKE :hubActionPrefix', { hubActionPrefix: '__n8n-hub-%' });
```

- [ ] **Step 7.4: Remove the post-query filter from `workflow.service.ts`.**

Delete lines 184–194 (the entire `// Hide internal n8n Hub placeholder ...` block):

```ts
// Hide internal n8n Hub placeholder workflow(s) from the user-facing list.
// ...
const beforeHide = workflows.length;
workflows = workflows.filter((wf) => !wf.name?.startsWith('__n8n-hub-'));
if (workflows.length !== beforeHide) {
	count -= beforeHide - workflows.length;
}
```

- [ ] **Step 7.5: Run the test again and confirm it passes.**

```bash
pnpm --filter n8n test -- workflow.service
```

Expected: all cases green.

- [ ] **Step 7.6: Run typecheck on the backend.**

```bash
pnpm --filter n8n typecheck
pnpm --filter @n8n/db typecheck
```

Expected: clean.

- [ ] **Step 7.7: Commit.**

```bash
git add packages/cli/src/workflows/workflow.service.ts \
        packages/@n8n/db/src/repositories/workflow.repository.ts \
        packages/cli/test/integration/workflow.service.api.test.ts \
        packages/cli/src/workflows/workflow.service.test.ts 2>/dev/null
git commit -m "fix(cli): exclude n8n Hub placeholder workflows at the query level"
```

(Stage whichever test file you actually modified; the trailing `2>/dev/null` swallows the unmodified path.)

---

## Task 8 — Manual verification

The five user-flagged items deserve eyeballing in a real browser before declaring done.

- [ ] **Step 8.1: Start the dev server.**

```bash
pnpm dev > /tmp/n8n-dev.log 2>&1 &
```

Wait for the editor-ui to print "ready" (tail `/tmp/n8n-dev.log`). Open http://localhost:5678.

- [ ] **Step 8.2: Trigger a single-node execution (any of MCP, CLI, or SDK).**

The fastest path is the CLI from the existing Hub work:

```bash
./packages/@n8n/cli/bin/n8n exec n8n-nodes-base.set \
	--param 'values={"string":[{"name":"hello","value":"world"}]}'
```

Expected: a new single-node execution lands in the executions list.

- [ ] **Step 8.3: Check the five items.**

| # | Expected after this PR | Pass if |
| --- | --- | --- |
| 1 | Filter executions by action *(deferred — see spec)* | N/A — leave the generic metadata filter as-is. |
| 2 | Browser tab on `/executions/<single-node-id>` reads "▶️ set" or "▶️ slack — message post" depending on the node | Tab no longer shows `__n8n-hub-action::n8n-nodes-bas...`. |
| 3 | The mode-icon column on the global list shows MCP / CLI / SDK icon for single-node rows | Hover tooltip reads "via MCP (Claude Desktop)" or similar. |
| 4 | Inside the execution detail page, the header breadcrumb reads `Executions › <action name>`; clicking "Executions" returns to the global list | The bottom-of-page "← Back to list" link is gone (moved up to the breadcrumb). |
| 5 | Same as #2 — single root cause | — |

If any item fails, file the failure inline as a step in this plan and fix before claiming done.

- [ ] **Step 8.4: Commit any small fixups found during manual verification.**

```bash
git add -p
git commit -m "fix(editor-ui): <whatever you found>"
```

If nothing needs fixing, skip this step.

---

## Self-review checklist (run before declaring complete)

- [ ] **Spec coverage:** every fix from the design doc has a numbered task above.
  - Helpers extraction → Task 1
  - `WorkflowExecutionsCard` sweep → Task 3
  - `GlobalExecutionsListItem` sweep + source icon → Task 2
  - `WorkflowExecutionsPreview` sweep + back-link removal → Task 4
  - Breadcrumb swap (`WorkflowDetails`, `MainHeader`) → Task 5
  - Document title fix → Task 6
  - SQL-level placeholder filter → Task 7
  - Manual verification of all five user-flagged items → Task 8
- [ ] **No placeholders.** No "TBD", no "fill in", no "similar to Task N". Every code block is the actual content.
- [ ] **Type consistency.** Function names: `getCallerDisplay`, `getCallerLabel`, `getSingleNodeHeadline`, `isHubPlaceholderName`, `getFriendlyHubWorkflowName`, `CALLER_SOURCE_LABEL`. Used identically in Tasks 1, 2, 3, 4, 5, 6. ✓
- [ ] **Frequent commits.** Each task ends with one commit; Task 5 spans WorkflowDetails + MainHeader + a test, all in one commit because they're co-changing.
- [ ] **TDD discipline.** Tasks 1, 2, 7 write the failing test first, run it, watch the failure mode, then implement. Tasks 3, 4, 5, 6 are refactors with no behavior change for the non-hub path — they lean on existing tests + typecheck rather than new assertions, except where new behavior is added (breadcrumb in Task 5, doc title in Task 6).
- [ ] **YAGNI.** No "Action" filter, no `kind` column, no i18n of MCP/CLI/SDK strings. All three are listed as follow-ups in the design doc but explicitly cut here.
