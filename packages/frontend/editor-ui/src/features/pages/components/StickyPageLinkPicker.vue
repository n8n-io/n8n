<script setup lang="ts">
import { getPagePermissions } from '@n8n/frontend-module-page';
import {
	N8nButton,
	N8nIcon,
	N8nIconButton,
	N8nInput,
	N8nPopover,
	N8nText,
} from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { computed, ref, watch } from 'vue';

import { usePageCreation } from '../composables/usePageCreation';
import { useProjectPages } from '../composables/useProjectPages';
import { filterPagesByTitle } from '../pageSearch';

/**
 * Picks the page that a sticky note links to: a page of `projectId`, or a new one.
 * Emits `link` with the id of the picked page.
 */
const props = defineProps<{
	projectId?: string;
	/** The title of a new page. */
	workflowName: string;
}>();

const emit = defineEmits<{
	link: [pageId: string];
}>();

const isOpen = defineModel<boolean>('visible', { default: false });

const i18n = useI18n();
const search = ref('');
const { pages, isLoading, hasFailed, load } = useProjectPages(() => props.projectId);
const { isCreating, createPageNamedAfterWorkflow } = usePageCreation();

const matchingPages = computed(() => filterPagesByTitle(pages.value, search.value));

const canCreatePage = computed(
	() => props.projectId !== undefined && getPagePermissions(props.projectId).canCreate,
);

const emptyMessage = computed(() => {
	if (hasFailed.value) {
		return i18n.baseText('page.list.loadError');
	}
	return pages.value.length === 0
		? i18n.baseText('page.sticky.picker.empty')
		: i18n.baseText('page.sticky.picker.noMatch');
});

function linkPage(pageId: string): void {
	emit('link', pageId);
	isOpen.value = false;
}

async function createPageAndLinkIt(): Promise<void> {
	if (props.projectId !== undefined) {
		const page = await createPageNamedAfterWorkflow(props.projectId, props.workflowName);
		if (page !== undefined) {
			linkPage(page.id);
		}
	}
}

function loadPagesWhenOpened(open: boolean): void {
	if (open) {
		search.value = '';
		void load();
	}
}

watch(isOpen, loadPagesWhenOpened);
</script>

<template>
	<!-- `ignore-key-press-canvas` keeps a paste in the search field from being read as a workflow import. -->
	<N8nPopover
		v-model:open="isOpen"
		side="top"
		align="center"
		:enable-scrolling="false"
		:content-class="[$style.popover, 'ignore-key-press-canvas'].join(' ')"
	>
		<template #trigger>
			<N8nIconButton
				variant="ghost"
				size="small"
				icon="file-text"
				:title="i18n.baseText('page.sticky.link')"
				:aria-label="i18n.baseText('page.sticky.link')"
				data-test-id="sticky-link-page-button"
			/>
		</template>
		<template #content>
			<div :class="$style.content" data-test-id="sticky-page-picker">
				<N8nInput
					v-model="search"
					size="small"
					autofocus
					:placeholder="i18n.baseText('page.sticky.picker.search')"
					data-test-id="sticky-page-picker-search"
				>
					<template #prefix>
						<N8nIcon icon="search" size="small" />
					</template>
				</N8nInput>
				<ul v-if="matchingPages.length > 0" :class="$style.list">
					<li v-for="page in matchingPages" :key="page.id">
						<button
							type="button"
							:class="$style.item"
							data-test-id="sticky-page-picker-item"
							@click="linkPage(page.id)"
						>
							<N8nIcon icon="file-text" size="small" :class="$style.itemIcon" />
							<span :class="$style.itemTitle">{{ page.title }}</span>
						</button>
					</li>
				</ul>
				<N8nText
					v-else-if="!isLoading"
					tag="p"
					size="small"
					color="text-light"
					:class="$style.empty"
					data-test-id="sticky-page-picker-empty"
				>
					{{ emptyMessage }}
				</N8nText>
				<div v-if="canCreatePage" :class="$style.footer">
					<N8nButton
						variant="ghost"
						size="small"
						icon="plus"
						:label="i18n.baseText('page.create')"
						:loading="isCreating"
						:class="$style.createButton"
						data-test-id="sticky-page-picker-create"
						@click="createPageAndLinkIt"
					/>
				</div>
			</div>
		</template>
	</N8nPopover>
</template>

<style lang="scss" module>
.popover {
	width: var(--spacing--5xl);
}

.content {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
	padding: var(--spacing--2xs);
}

.list {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--5xs);
	max-height: calc(var(--spacing--4xl) * 1.5);
	margin: 0;
	padding: 0;
	overflow-y: auto;
	list-style: none;
	scrollbar-width: thin;
}

.item {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	width: 100%;
	padding: var(--spacing--2xs);
	border: 0;
	border-radius: var(--radius);
	background: none;
	color: var(--text-color);
	font-family: inherit;
	font-size: var(--font-size--sm);
	text-align: start;
	cursor: pointer;

	&:hover,
	&:focus-visible {
		background-color: var(--background--hover);
		outline: none;
	}
}

.itemIcon {
	flex-shrink: 0;
	color: var(--text-color--subtle);
}

.itemTitle {
	flex: 1;
	min-width: 0;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.empty {
	padding: var(--spacing--3xs) var(--spacing--2xs);
	line-height: var(--line-height--lg);
}

.footer {
	padding-top: var(--spacing--2xs);
	border-top: var(--border);
}

.createButton {
	width: 100%;
	justify-content: start;
}
</style>
