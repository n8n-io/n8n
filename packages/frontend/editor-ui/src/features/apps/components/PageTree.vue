<script setup lang="ts">
import {
	N8nButton,
	N8nIcon,
	N8nIconButton,
	N8nInput,
	N8nText,
	N8nTooltip,
} from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { useToast } from '@n8n/composables/useToast';
import { computed, ref } from 'vue';

import { useAppsStore } from '@/features/apps/apps.store';
import type { Page } from '@/features/apps/apps.types';
import { useAppDeletion } from '@/features/apps/useAppDeletion';
import {
	flattenPageTree,
	formatRoutePath,
	getChildCounts,
	type PageTreeRow,
} from '@/features/apps/pageTree.utils';

const props = defineProps<{
	projectId: string;
	appId: string;
}>();

const emit = defineEmits<{
	open: [pageId: string];
}>();

const DRAFT_ID = '__draft__';

const i18n = useI18n();
const toast = useToast();
const appsStore = useAppsStore();
const { confirmAndDeletePage } = useAppDeletion();

/** `pageId === null` is a page being created; otherwise a page being renamed. */
const draft = ref<{ pageId: string | null; parentPageId: string | null; value: string } | null>(
	null,
);
const childCounts = computed(() => getChildCounts(appsStore.pages));

const rows = computed<PageTreeRow[]>(() => {
	const tree = flattenPageTree(appsStore.pages);
	if (!draft.value || draft.value.pageId !== null) return tree;

	const draftPage: Page = {
		id: DRAFT_ID,
		appId: props.appId,
		parentPageId: draft.value.parentPageId,
		route: '',
		content: null,
		layout: null,
		createdAt: '',
		updatedAt: '',
	};
	const parentIndex = tree.findIndex((row) => row.page.id === draft.value?.parentPageId);
	if (parentIndex === -1) return [...tree, { page: draftPage, depth: 0 }];

	const parentDepth = tree[parentIndex].depth;
	let insertAt = parentIndex + 1;
	while (insertAt < tree.length && tree[insertAt].depth > parentDepth) insertAt++;
	return [
		...tree.slice(0, insertAt),
		{ page: draftPage, depth: parentDepth + 1 },
		...tree.slice(insertAt),
	];
});

const isEditing = (page: Page) =>
	draft.value !== null && page.id === (draft.value.pageId ?? DRAFT_ID);

const routeLabel = (route: string) => formatRoutePath(route, i18n.baseText('apps.page.index'));

const startDraft = async (next: NonNullable<typeof draft.value>) => {
	if (draft.value) await commit(true);
	draft.value = next;
};

const startCreate = async (parentPageId: string | null) =>
	await startDraft({ pageId: null, parentPageId, value: '' });

const startRename = async (page: Page) =>
	await startDraft({ pageId: page.id, parentPageId: page.parentPageId, value: page.route });

/** Enter commits whatever was typed (an empty route is the index page); blur only commits a change. */
const commit = async (viaEnter: boolean) => {
	const current = draft.value;
	if (!current) return;
	draft.value = null;

	const route = current.value.trim();
	const original = appsStore.pages.find((page) => page.id === current.pageId);
	const unchanged = current.pageId === null ? route === '' : route === original?.route;
	if (unchanged && !viaEnter) return;
	if (current.pageId !== null && route === original?.route) return;

	try {
		if (current.pageId === null) {
			await appsStore.createPage(
				props.projectId,
				props.appId,
				route,
				current.parentPageId ?? undefined,
			);
		} else {
			await appsStore.updatePage(props.projectId, props.appId, current.pageId, { route });
		}
	} catch (error) {
		toast.showError(
			error,
			i18n.baseText(current.pageId === null ? 'apps.page.add.error' : 'apps.page.save.error'),
		);
		draft.value = current;
	}
};

const cancel = () => {
	draft.value = null;
};

const onDelete = async (pageId: string) => {
	await confirmAndDeletePage(props.projectId, props.appId, pageId);
};
</script>

<template>
	<div :class="$style.container" data-test-id="page-tree">
		<div :class="$style.header">
			<N8nText tag="h3" size="medium" bold>{{ i18n.baseText('apps.pages') }}</N8nText>
			<N8nButton size="small" data-test-id="app-page-add-root" @click="startCreate(null)">
				{{ i18n.baseText('apps.page.new') }}
			</N8nButton>
		</div>

		<N8nText v-if="rows.length === 0" color="text-light">
			{{ i18n.baseText('apps.pages.empty') }}
		</N8nText>

		<div
			v-for="{ page, depth } in rows"
			:key="page.id"
			:class="$style.row"
			:style="{ marginLeft: `calc(${depth} * var(--spacing--lg))` }"
			:data-depth="depth"
			data-test-id="page-tree-row"
		>
			<N8nIcon :icon="depth > 0 ? 'corner-down-right' : 'file'" color="text-light" />
			<N8nInput
				v-if="isEditing(page)"
				v-model="draft!.value"
				autofocus
				size="medium"
				:placeholder="i18n.baseText('apps.page.add.input.route.placeholder')"
				data-test-id="page-tree-route-input"
				@keydown.enter.prevent="commit(true)"
				@keydown.esc.prevent="cancel"
				@blur="commit(false)"
			/>
			<template v-else>
				<button
					type="button"
					:class="$style.label"
					data-test-id="page-tree-open"
					@click="emit('open', page.id)"
				>
					<N8nText bold>{{ routeLabel(page.route) }}</N8nText>
					<N8nText v-if="childCounts.get(page.id)" color="text-light" size="small">
						{{
							i18n.baseText('apps.page.subPageCount', {
								adjustToNumber: childCounts.get(page.id),
							})
						}}
					</N8nText>
				</button>
				<div :class="$style.actions">
					<N8nTooltip :content="i18n.baseText('apps.page.rename')">
						<N8nIconButton
							icon="pen"
							size="small"
							variant="subtle"
							:aria-label="i18n.baseText('apps.page.rename')"
							data-test-id="page-tree-rename"
							@click="startRename(page)"
						/>
					</N8nTooltip>
					<N8nTooltip v-if="page.route" :content="i18n.baseText('apps.page.addChild')">
						<N8nIconButton
							icon="plus"
							size="small"
							variant="subtle"
							:aria-label="i18n.baseText('apps.page.addChild')"
							data-test-id="page-tree-add-child"
							@click="startCreate(page.id)"
						/>
					</N8nTooltip>
					<N8nTooltip :content="i18n.baseText('generic.delete')">
						<N8nIconButton
							icon="trash-2"
							size="small"
							variant="subtle"
							:aria-label="i18n.baseText('generic.delete')"
							data-test-id="page-tree-delete"
							@click="onDelete(page.id)"
						/>
					</N8nTooltip>
				</div>
			</template>
		</div>
	</div>
</template>

<style lang="scss" module>
.container {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
}

.header {
	display: flex;
	align-items: center;
	justify-content: space-between;
	margin-bottom: var(--spacing--2xs);
}

.row {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	padding: var(--spacing--2xs) var(--spacing--xs);
	border: var(--border);
	border-radius: var(--radius--lg);
	background: var(--background--surface);
}

.label {
	display: flex;
	flex: 1;
	flex-direction: column;
	align-items: flex-start;
	gap: var(--spacing--5xs);
	padding: 0;
	border: 0;
	background: none;
	cursor: pointer;
	text-align: left;
}

.actions {
	display: flex;
	gap: var(--spacing--4xs);
}
</style>
