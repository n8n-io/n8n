<script setup lang="ts">
import { N8nButton, N8nText } from '@n8n/design-system';
import { computed, ref, watch } from 'vue';

import UiRenderer from './UiRenderer.vue';
import { createEmptyDocument, normaliseNode } from '../core/document';
import { findPagedNode, pageInfos, pageLabel, resolveRoute } from '../core/pages';
import type { UiNode, UiScope } from '../core/types';

/**
 * An app as it would look, without an editor around it: no palette, no
 * inspector, no selection. For showing someone what a definition amounts to
 * while something other than them is writing it — the AI builder, in a chat
 * panel beside the workflow it is building.
 *
 * Deliberately not a running app. Actions never fire and inputs never write, so
 * nothing here can call a webhook or change anything. What it shows is the
 * layout, with every bound prop unresolved, because the state those bindings
 * read is only produced by the actions this preview refuses to run.
 */
defineOptions({ name: 'UiAppPreview' });

const props = defineProps<{
	/**
	 * The node parameter: a definition tree, or the JSON text older nodes stored.
	 * Typed loosely because it arrives as whatever a node parameter can hold, and
	 * anything unreadable is handled the same way as a half-written one.
	 */
	value: unknown;
}>();

const doc = ref<UiNode>(createEmptyDocument());

watch(
	() => props.value,
	(incoming) => {
		const parsed = parse(incoming);
		if (parsed) doc.value = parsed;
	},
	{ immediate: true, deep: true },
);

/** Undefined rather than an empty document when the input makes no sense, so
 * the last good one stays on screen: a definition being written arrives here
 * half-formed, and blanking the preview on each pass would make it flicker. */
function parse(incoming: unknown): UiNode | undefined {
	if (incoming && typeof incoming === 'object') return normaliseNode(incoming as UiNode);

	if (typeof incoming === 'string' && incoming.trim()) {
		try {
			return normaliseNode(JSON.parse(incoming) as UiNode);
		} catch {
			return undefined;
		}
	}

	return undefined;
}

const frame = computed(() => findPagedNode(doc.value));
const pages = computed(() => (frame.value ? pageInfos(frame.value) : []));

/** Which page the preview is showing. Unset follows the app's own default. */
const openPath = ref<string>();

// A page that goes away — renamed, deleted, not written yet — should not leave
// the preview on a route nothing answers.
watch(pages, (available) => {
	if (openPath.value && !available.some((page) => page.path === openPath.value)) {
		openPath.value = undefined;
	}
});

/** The frame's own default page, if it has one worth following. */
const defaultPage = computed(() => {
	const declared = frame.value?.props.defaultPage;
	return typeof declared === 'string' ? declared : '';
});

const route = computed(() =>
	resolveRoute(pages.value, openPath.value ?? defaultPage.value, defaultPage.value),
);

/**
 * `$loading` is present and empty rather than missing: an expression naming a
 * key of something undefined throws, and the prop would come out undefined
 * instead of falsy.
 */
const scope = computed<UiScope>(() => ({
	$state: {},
	$loading: {},
	$pages: pages.value,
	$route: route.value,
}));

const isEmpty = computed(() =>
	Object.values(doc.value.tree).every((children) => children.length === 0),
);
</script>

<template>
	<div :class="$style.preview" data-test-id="ui-app-preview">
		<div v-if="pages.length > 1" :class="$style.pages">
			<N8nButton
				v-for="page in pages"
				:key="page.id"
				size="mini"
				:type="page.path === route?.path ? 'primary' : 'tertiary'"
				:label="pageLabel(page)"
				@click="openPath = page.path"
			/>
		</div>

		<div :class="$style.surface">
			<!-- `edit` suppresses actions and writes, and is also what keeps an `if`
			     and an empty `repeat` on screen: without it a data-less preview of a
			     real app renders almost nothing. No selection handlers are passed, so
			     none of the authoring chrome comes with it. -->
			<UiRenderer v-if="!isEmpty" :node="doc" :scope="scope" edit />
			<N8nText v-else size="small" color="text-light">Nothing in this app yet</N8nText>
		</div>
	</div>
</template>

<style lang="scss" module>
.preview {
	display: flex;
	flex-direction: column;
	height: 100%;
	min-height: 0;
}

.pages {
	display: flex;
	flex-wrap: wrap;
	gap: var(--spacing--3xs);
	flex-shrink: 0;
	padding: var(--spacing--2xs);
	border-bottom: var(--border);
}

.surface {
	flex: 1 1 auto;
	min-height: 0;
	overflow: auto;
	padding: var(--spacing--sm);
}
</style>
