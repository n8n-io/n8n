<script setup lang="ts">
import { N8nCallout, N8nIconButton } from '@n8n/design-system';
import { isPlainObject } from 'lodash';
import { computed, onMounted, onUnmounted, reactive, ref, watch } from 'vue';

import UiRenderer from '../renderer/UiRenderer.vue';
import { normaliseAction } from '../core/actions';
import { readResponse } from '../core/envelope';
import { resolveValue } from '../core/expressions';
import { actionKey, createLoadingTracker } from '../core/loading';
import {
	APP_STATE_KEY,
	findPagedNode,
	normalisePath,
	pageInfos,
	resolveRoute,
	routeFromHash,
} from '../core/pages';
import { deepMerge, writePath } from '../core/state';
import type {
	UiActionRequest,
	UiActionStep,
	UiNode,
	UiScope,
	UiState,
	UiToast,
} from '../core/types';

/**
 * The running app. Owns the single piece of state everything reads from, the
 * route, and the running of actions.
 */
defineOptions({ name: 'UiApp' });

const TOAST_MS = 5000;

// One chain can raise a message per step, so a couple at once is normal; past
// three the stack starts covering the app the messages are about.
const MAX_TOASTS = 3;

const props = defineProps<{ definition: UiNode; token?: string; title?: string }>();

const state = reactive<UiState>({});
const toasts = ref<Array<UiToast & { id: number }>>([]);
const loading = createLoadingTracker();

let nextToastId = 0;

const TOAST_THEMES = { success: 'success', error: 'danger', info: 'info' } as const;

/**
 * Routing is hash-based. The app is served from one webhook path, so a
 * history-API route would put the browser at a path no webhook answers and a
 * refresh would 404. The fragment costs uglier URLs and nothing else: back and
 * forward work because the browser is doing the navigating.
 */
const hashPath = ref(routeFromHash(window.location.hash));

function onHashChange() {
	hashPath.value = routeFromHash(window.location.hash);
}

onMounted(() => window.addEventListener('hashchange', onHashChange));
onUnmounted(() => window.removeEventListener('hashchange', onHashChange));

const frame = computed(() => findPagedNode(props.definition));
const pages = computed(() => (frame.value ? pageInfos(frame.value) : []));

/** Nothing when the document is a plain single page, which is how one keeps working. */
const route = computed(() =>
	frame.value
		? resolveRoute(pages.value, hashPath.value, String(frame.value.props.defaultPage ?? ''))
		: undefined,
);

const currentPage = computed(() => pages.value.find((page) => page.id === route.value?.pageId));

// One object, rebuilt when any part changes, because an expression reads them
// all through the same scope.
const scope = computed<UiScope>(() => ({
	$state: state,
	$loading: loading.flags.value,
	$route: route.value,
	$pages: pages.value,
}));

function notify(toast: UiToast) {
	const id = nextToastId++;

	// Over the cap the oldest goes, not the newest: the message a user is waiting
	// on is the one that just arrived.
	toasts.value = [...toasts.value, { ...toast, id }].slice(-MAX_TOASTS);

	setTimeout(() => dismiss(id), TOAST_MS);
}

/** The close button and the timeout both come here; whichever is second is a no-op. */
function dismiss(id: number) {
	toasts.value = toasts.value.filter((toast) => toast.id !== id);
}

function write(path: string, value: unknown) {
	// `$app` is the client's account of its own context. An input half-writing
	// into it would be worse than not writing at all.
	if (path.split('.')[0] === APP_STATE_KEY) {
		console.warn('[ui-builder] refusing to write into', APP_STATE_KEY, path);
		return;
	}

	writePath(state, path, value);
}

function navigate(to: string) {
	const path = normalisePath(to);
	if (path === hashPath.value) return;

	// Through the fragment rather than straight into `hashPath`, so the entry
	// lands in browser history and back works.
	window.location.hash = `#${path}`;
}

/** POST the whole state, merge what comes back. `false` stops the rest of the chain. */
async function callWebhook(url: string, method: string): Promise<boolean> {
	const key = actionKey(url);
	loading.begin(key);

	try {
		const response = await fetch(url, {
			method,
			headers: {
				'content-type': 'application/json',
				// The token the UI Builder node minted when it served this page. The
				// action's Webhook validates it with the same JWT credential, so an
				// action is only callable from a page this instance served.
				...(props.token ? { authorization: `Bearer ${props.token}` } : {}),
			},
			// A GET carrying a body is refused by the browser before it is sent.
			...(method === 'GET' ? {} : { body: JSON.stringify(state) }),
		});

		const result = readResponse(await response.json());

		// The HTTP status has the final say. A body without `ok` reads as a bare
		// state partial, so a 500 returning one would otherwise merge an error
		// page into state and report success.
		const ok = result.ok && response.ok;

		// A workflow that reports a failure still gets its state partial merged:
		// rejecting an action and correcting the client's view are not exclusive.
		deepMerge(state, withoutAppKey(result.state));

		if (result.toast) notify(result.toast);
		else if (!ok) notify({ type: 'error', message: `Action failed (${response.status})` });

		if (!ok) console.warn('[ui-builder] action rejected', url, response.status, result.error);

		return ok;
	} catch (error) {
		// The transport itself failed, so there is no state to merge and nothing
		// the workflow can say about it.
		console.error('[ui-builder] action failed', url, error);
		notify({ type: 'error', message: 'Action failed' });
		return false;
	} finally {
		loading.end(key);
	}
}

/** The client's own view of where it is. A workflow returning it is confused, or worse. */
function withoutAppKey(partial: unknown): unknown {
	if (!isPlainObject(partial) || !(APP_STATE_KEY in (partial as object))) return partial;

	console.warn('[ui-builder] ignoring', APP_STATE_KEY, 'in a response: it is the client’s');
	const rest = { ...(partial as Record<string, unknown>) };
	delete rest[APP_STATE_KEY];
	return rest;
}

function text(value: unknown, scopeAt: UiScope): string {
	const resolved = resolveValue(value, scopeAt);
	return resolved === undefined || resolved === null ? '' : String(resolved);
}

/**
 * The scope a step runs in: whatever the app knows now, over whatever the node
 * that fired bound for itself.
 *
 * The names the runtime owns are re-read per step rather than taken from the
 * captured scope, so a step after a navigate reads the new route and a step
 * after a webhook reads the merged state. The captured scope still supplies
 * `$item` and `$index`, which only the node that fired can know.
 */
function scopeNow(captured: UiScope): UiScope {
	return {
		...captured,
		$state: state,
		$loading: loading.flags.value,
		$route: route.value,
		$pages: pages.value,
	};
}

/**
 * Runs a chain, one step at a time, in order.
 *
 * Each step's expressions resolve as it runs rather than when the chain starts,
 * so a notification after a webhook sees the state that webhook merged. A
 * webhook reporting failure ends the chain, which is what stops a failed save
 * from navigating away from the form that failed.
 */
async function runSteps(steps: UiActionStep[], captured: UiScope) {
	for (const step of steps) {
		if (step.kind === 'webhook') {
			const ok = await callWebhook(step.url, step.method ?? 'POST');
			if (!ok) return;
			continue;
		}

		if (step.kind === 'notify') {
			const message = text(step.message, scopeNow(captured));
			if (message) notify({ type: step.type ?? 'success', message });
			continue;
		}

		if (step.kind === 'navigate') {
			const to = text(step.to, scopeNow(captured));
			if (to) navigate(to);
		}
	}
}

async function act(request: UiActionRequest) {
	await runSteps(request.steps, request.scope);
}

/**
 * Read once, before the watch below runs: that line writes back into the very
 * thing it reads, so reading it per navigation would compound.
 */
const appTitle = props.title ?? document.title;

/**
 * The page's own action, on arrival and on every return to it. Not once per
 * session: a list that does not refetch when you come back to it is a bug.
 *
 * Watched on the whole route rather than on which page matched, because one
 * page can answer many routes: `/orders/1` and `/orders/2` are the same node
 * and a different thing to load. Watching the page would leave the entry action
 * unfired and the state copy of the route stale, disagreeing with `$route`.
 *
 * It fires after the route has settled rather than during the hash change,
 * which is what watching the resolved route gives.
 */
watch(
	() => (route.value ? `${route.value.pageId} ${route.value.path}` : ''),
	() => {
		const page = currentPage.value;
		if (!page || !frame.value) return;

		state[APP_STATE_KEY] = {
			route: { path: route.value?.path ?? '/', params: route.value?.params ?? {} },
			page: { path: page.path, title: page.title },
		};

		// A page with no title of its own leaves the tab as the app's name alone,
		// rather than rendering a dangling separator.
		document.title =
			page.title && page.title !== appTitle ? `${page.title} - ${appTitle}` : appTitle;

		const node = framePageNode(page.id);
		const steps = node ? normaliseAction(node.props.onEnter) : [];
		if (steps.length) void runSteps(steps, scope.value);
	},
	{ immediate: true },
);

function framePageNode(id: string): UiNode | undefined {
	const children = frame.value ? Object.values(frame.value.tree).flat() : [];
	return children.find((child) => child.id === id);
}

defineExpose({ state });
</script>

<template>
	<UiRenderer :node="props.definition" :scope="scope" :on-write="write" :on-act="act" />

	<div class="ui-toasts">
		<N8nCallout v-for="toast in toasts" :key="toast.id" :theme="TOAST_THEMES[toast.type ?? 'info']">
			{{ toast.message }}

			<!-- The callout has no dismiss of its own, only a slot at the far end for one. -->
			<template #trailingContent>
				<N8nIconButton
					icon="x"
					variant="ghost"
					size="small"
					aria-label="Dismiss"
					@click="dismiss(toast.id)"
				/>
			</template>
		</N8nCallout>
	</div>
</template>

<style scoped>
.ui-toasts {
	position: fixed;
	right: 16px;
	bottom: 16px;
	z-index: 10;
	display: flex;
	flex-direction: column;
	gap: 8px;
	max-width: 360px;
}
</style>
