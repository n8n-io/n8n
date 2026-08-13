<script setup lang="ts">
import { N8nCallout, N8nIconButton } from '@n8n/design-system';
import { cloneDeep } from 'lodash';
import { computed, onMounted, onUnmounted, reactive, ref, watch } from 'vue';

import UiRenderer from '../renderer/UiRenderer.vue';
import { normaliseAction } from '../core/actions';
import { requestBody, writeState } from '../core/binding';
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
import type {
	UiActionRequest,
	UiActionStep,
	UiNode,
	UiScope,
	UiState,
	UiToast,
	UiWebhookStep,
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
	writeState(state, path, value);
}

function navigate(to: string) {
	const path = normalisePath(to);
	if (path === hashPath.value) return;

	// Through the fragment rather than straight into `hashPath`, so the entry
	// lands in browser history and back works.
	window.location.hash = `#${path}`;
}

/**
 * A step's URL was captured absolute, against whatever host the author was
 * on when they picked the target. Every target this app can call lives on
 * the instance that serves the app itself, so stripping back to the path
 * lets it call out relative to wherever it is actually running rather than
 * wherever it was authored — the same page definition then works unchanged
 * across local dev, staging, and production hosts.
 */
function relativeRequestUrl(url: string): string {
	try {
		const parsed = new URL(url, window.location.origin);
		return parsed.pathname + parsed.search;
	} catch {
		return url;
	}
}

/**
 * Call a workflow. What it answers comes back as `$response` for the steps
 * after it; `undefined` means the chain stops here.
 */
async function callWebhook(
	step: UiWebhookStep,
	scopeAt: UiScope,
): Promise<{ body: unknown } | undefined> {
	const key = actionKey(step.url);
	const method = step.method ?? 'POST';
	loading.begin(key);

	try {
		const response = await fetch(relativeRequestUrl(step.url), {
			method,
			headers: {
				'content-type': 'application/json',
				// The token the UI Builder node minted when it served this page. The
				// action's Webhook validates it with the same JWT credential, so an
				// action is only callable from a page this instance served.
				...(props.token ? { authorization: `Bearer ${props.token}` } : {}),
			},
			// A GET carrying a body is refused by the browser before it is sent.
			...(method === 'GET' ? {} : { body: JSON.stringify(requestBody(step, scopeAt)) }),
		});

		// A step whose reply nothing reads is free to answer with no body at all.
		const result = readResponse(await response.json().catch(() => undefined));

		// The HTTP status has the final say, so a workflow cannot report success by
		// staying silent while n8n answers 500.
		const ok = result.ok && response.ok;

		if (result.toast) notify(result.toast);
		else if (!ok) {
			notify({
				type: 'error',
				message: result.error?.message ?? `Action failed (${response.status})`,
			});
		}

		if (!ok) console.warn('[ui-builder] action rejected', step.url, response.status, result.error);

		// A refusal's body is an explanation, not data: handing it on as `$response`
		// would let the next step write the reason where the rows go.
		return ok ? { body: result.body } : undefined;
	} catch (error) {
		// The transport itself failed, so there is nothing the workflow can say
		// about it.
		console.error('[ui-builder] action failed', step.url, error);
		notify({ type: 'error', message: 'Action failed' });
		return undefined;
	} finally {
		loading.end(key);
	}
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
function scopeNow(captured: UiScope, replies: ChainReplies): UiScope {
	return {
		...captured,
		$state: state,
		$loading: loading.flags.value,
		$route: route.value,
		$pages: pages.value,
		$response: replies.last,
		$responses: replies.byKey,
	};
}

/** What the chain has been answered so far: the latest, and each one by its key. */
interface ChainReplies {
	last: unknown;
	byKey: Record<string, unknown>;
}

/**
 * Runs a chain, one step at a time, in order.
 *
 * Each step's expressions resolve as it runs rather than when the chain starts,
 * so a step after a webhook sees both the state it changed and, as `$response`,
 * what it answered. A webhook reporting failure ends the chain, which is what
 * stops a failed save from navigating away from the form that failed.
 */
async function runSteps(steps: UiActionStep[], captured: UiScope) {
	// `$response` is the latest reply and `$responses.<key>` each one by name, so
	// a chain that calls twice can put either answer wherever it belongs.
	const replies: ChainReplies = { last: undefined, byKey: {} };

	for (const step of steps) {
		const scope = scopeNow(captured, replies);

		if (step.kind === 'webhook') {
			const result = await callWebhook(step, scope);
			if (!result) return;

			replies.last = result.body;
			if (step.key) replies.byKey[step.key] = result.body;
			continue;
		}

		if (step.kind === 'set') {
			// Copied: a literal written straight from the document would be the very
			// object an input then types into, so the second run of a `set { }` would
			// restore what the first run's edits left behind.
			write(step.path, cloneDeep(resolveValue(step.value, scope)));
			continue;
		}

		if (step.kind === 'notify') {
			const message = text(step.message, scope);
			if (message) notify({ type: step.type ?? 'success', message });
			continue;
		}

		if (step.kind === 'navigate') {
			const to = text(step.to, scope);
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
