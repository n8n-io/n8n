<script setup lang="ts">
import { toResourcePath, type Page } from '@n8n/api-types';
import { useClipboard } from '@n8n/composables/useClipboard';
import { useToast } from '@n8n/composables/useToast';
import {
	N8nAlertDialog,
	N8nButton,
	N8nEmptyState,
	N8nIconButton,
	N8nLoading,
	N8nText,
	N8nTimeAgo,
	N8nTooltip,
} from '@n8n/design-system';
import { componentRegistry } from '@n8n/frontend-module-sdk';
import { useI18n, type BaseTextKey } from '@n8n/i18n';
import { computed, ref, useTemplateRef, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import PageBacklinks from '../components/PageBacklinks.vue';
import PageEditor from '../components/PageEditor.vue';
import PageList from '../components/PageList.vue';
import PageWritingTips from '../components/PageWritingTips.vue';
import { useInstanceLocation } from '../composables/useInstanceLocation';
import { usePageBacklinks } from '../composables/usePageBacklinks';
import type { PageSaveStatus } from '../composables/usePageDocument';
import { PROJECT_PAGES_VIEW } from '../page.constants';
import { getPagePermissions } from '../page.permissions';
import { usePageStore } from '../page.store';
import { toAbsoluteUrl } from '../resources/resourceUrl';

const SAVE_STATUS_LABELS: Partial<Record<PageSaveStatus, BaseTextKey>> = {
	unsaved: 'page.editor.saveStatus.saving',
	saving: 'page.editor.saveStatus.saving',
	saved: 'page.editor.saveStatus.saved',
	error: 'page.editor.saveStatus.error',
};

const i18n = useI18n();
const toast = useToast();
const clipboard = useClipboard();
const route = useRoute();
const router = useRouter();
const pageStore = usePageStore();
const getInstanceLocation = useInstanceLocation();

const ProjectHeader = computed(() => componentRegistry.get('project-header'));
const pageEditor = useTemplateRef<InstanceType<typeof PageEditor>>('pageEditor');

function toRouteParam(value: unknown): string | undefined {
	return typeof value === 'string' && value !== '' ? value : undefined;
}

const projectId = computed(() => toRouteParam(route.params.projectId));
const selectedPageId = computed(() => toRouteParam(route.params.pageId));

const pages = computed(() => (projectId.value ? pageStore.pagesOf(projectId.value) : []));
const { backlinks, refresh: refreshBacklinks } = usePageBacklinks(selectedPageId);
const isListLoading = ref(true);
const permissions = computed(() =>
	projectId.value ? getPagePermissions(projectId.value) : undefined,
);

const saveStatus = ref<PageSaveStatus>('idle');
const saveStatusLabel = computed(() => {
	const key = SAVE_STATUS_LABELS[saveStatus.value];
	return key ? i18n.baseText(key) : '';
});

const isCreating = ref(false);
/** The page whose title gets the focus when its editor has loaded it. */
const pageIdToFocus = ref<string>();
const isDeleteDialogOpen = ref(false);
const isDeleting = ref(false);

async function openPage(pageId: string | undefined, navigate = router.push): Promise<void> {
	await navigate({
		name: PROJECT_PAGES_VIEW,
		params: { projectId: projectId.value, pageId: pageId ?? '' },
	});
}

/** Opens the newest page when the address selects none. */
async function openNewestPageByDefault(): Promise<void> {
	const newest = pages.value.at(0);
	if (selectedPageId.value === undefined && newest !== undefined) {
		await openPage(newest.id, router.replace);
	}
}

async function loadPages(id: string | undefined): Promise<void> {
	if (id !== undefined) {
		isListLoading.value = !pageStore.isListLoaded(id);
		try {
			await pageStore.fetchPages(id);
			await openNewestPageByDefault();
		} catch (error) {
			toast.showError(error, i18n.baseText('page.list.loadError'));
		} finally {
			isListLoading.value = false;
		}
	}
}

async function createPage(): Promise<void> {
	if (projectId.value !== undefined && !isCreating.value) {
		isCreating.value = true;
		try {
			const page = await pageStore.createPage(projectId.value, {
				title: i18n.baseText('page.untitled'),
			});
			pageIdToFocus.value = page.id;
			await openPage(page.id);
		} catch (error) {
			toast.showError(error, i18n.baseText('page.create.error'));
		} finally {
			isCreating.value = false;
		}
	}
}

function focusTitleOfNewPage(page: Page): void {
	if (page.id === pageIdToFocus.value) {
		pageIdToFocus.value = undefined;
		void pageEditor.value?.focusTitle();
	}
}

async function copyPageLink(): Promise<void> {
	if (selectedPageId.value !== undefined) {
		const path = toResourcePath({ resourceType: 'page', resourceId: selectedPageId.value });
		await clipboard.copy(toAbsoluteUrl(path, getInstanceLocation()));
		toast.showMessage({ type: 'success', title: i18n.baseText('page.copyLink.copied') });
	}
}

async function deleteSelectedPage(): Promise<void> {
	if (projectId.value !== undefined && selectedPageId.value !== undefined) {
		isDeleting.value = true;
		try {
			await pageStore.deletePage(projectId.value, selectedPageId.value);
			isDeleteDialogOpen.value = false;
			await openPage(pages.value.at(0)?.id, router.replace);
		} catch (error) {
			toast.showError(error, i18n.baseText('page.delete.error'));
		} finally {
			isDeleting.value = false;
		}
	}
}

watch(projectId, loadPages, { immediate: true });
watch(selectedPageId, () => {
	saveStatus.value = 'idle';
	void openNewestPageByDefault();
});
</script>

<template>
	<div :class="$style.view" data-test-id="pages-view">
		<component :is="ProjectHeader" v-if="ProjectHeader" main-button="page" />
		<N8nLoading v-if="isListLoading" :rows="4" />
		<N8nEmptyState
			v-else-if="pages.length === 0 && !selectedPageId"
			:class="$style.empty"
			:icon="{ type: 'icon', value: 'file-text' }"
			:heading="i18n.baseText('page.empty.heading')"
			:description="i18n.baseText('page.empty.description')"
			:button-text="permissions?.canCreate ? i18n.baseText('page.create') : undefined"
			button-icon="plus"
			data-test-id="pages-empty-state"
			@click:button="createPage"
		>
			<template #additionalContent>
				<PageWritingTips />
			</template>
		</N8nEmptyState>
		<div v-else :class="$style.columns">
			<aside :class="$style.sidebar">
				<N8nButton
					v-if="permissions?.canCreate"
					variant="outline"
					icon="plus"
					:label="i18n.baseText('page.create')"
					:loading="isCreating"
					:class="$style.createButton"
					data-test-id="page-create-button"
					@click="createPage"
				/>
				<div :class="$style.sidebarList">
					<PageList :pages="pages" :selected-page-id="selectedPageId" @select="openPage" />
				</div>
			</aside>
			<section :class="$style.main">
				<template v-if="selectedPageId">
					<header :class="$style.toolbar">
						<N8nText
							size="small"
							color="text-light"
							aria-live="polite"
							data-test-id="page-save-status"
						>
							{{ saveStatusLabel }}
						</N8nText>
						<N8nButton
							variant="ghost"
							size="small"
							icon="link"
							:label="i18n.baseText('page.copyLink')"
							data-test-id="page-copy-link-button"
							@click="copyPageLink"
						/>
						<N8nTooltip v-if="permissions?.canDelete" :content="i18n.baseText('page.delete')">
							<N8nIconButton
								variant="ghost"
								size="small"
								icon="trash-2"
								:aria-label="i18n.baseText('page.delete')"
								data-test-id="page-delete-button"
								@click="isDeleteDialogOpen = true"
							/>
						</N8nTooltip>
					</header>
					<div :class="$style.editorScroll">
						<div :class="$style.editorColumn">
							<PageEditor
								ref="pageEditor"
								:page-id="selectedPageId"
								:project-id="projectId"
								@loaded="focusTitleOfNewPage"
								@saved="refreshBacklinks"
								@save-status="saveStatus = $event"
							>
								<template #meta="{ page }">
									<div :class="$style.meta">
										<N8nText size="small" color="text-light" data-test-id="page-edited-time">
											{{ i18n.baseText('page.editor.edited') }}
											<N8nTimeAgo :date="page.updatedAt" live />
										</N8nText>
										<PageBacklinks :backlinks="backlinks" />
									</div>
								</template>
							</PageEditor>
						</div>
					</div>
				</template>
			</section>
		</div>
		<N8nAlertDialog
			v-model:open="isDeleteDialogOpen"
			:title="i18n.baseText('page.delete.confirm.title')"
			:description="i18n.baseText('page.delete.confirm.description')"
			:action-label="i18n.baseText('generic.delete')"
			:cancel-label="i18n.baseText('generic.cancel')"
			action-variant="destructive"
			:loading="isDeleting"
			@action="deleteSelectedPage"
		/>
	</div>
</template>

<style lang="scss" module>
.view {
	display: flex;
	flex-direction: column;
	width: 100%;
	height: 100%;
	min-height: 0;
	padding: var(--spacing--lg) var(--spacing--2xl) 0;
	box-sizing: border-box;
}

.empty {
	margin-top: var(--spacing--2xl);
}

.columns {
	display: flex;
	flex: 1;
	min-height: 0;
	border-top: var(--border);
}

.sidebar {
	display: flex;
	flex-direction: column;
	flex-shrink: 0;
	gap: var(--spacing--xs);
	width: calc(var(--spacing--5xl) + var(--spacing--2xl));
	padding: var(--spacing--sm) var(--spacing--sm) var(--spacing--sm) 0;
	border-right: var(--border);
}

.createButton {
	width: 100%;
}

.sidebarList {
	flex: 1;
	min-height: 0;
	overflow-y: auto;
	scrollbar-width: thin;
}

.main {
	display: flex;
	flex: 1;
	flex-direction: column;
	min-width: 0;
	min-height: 0;
}

.toolbar {
	display: flex;
	align-items: center;
	justify-content: flex-end;
	gap: var(--spacing--2xs);
	min-height: var(--height--lg);
	padding: var(--spacing--2xs) 0 var(--spacing--2xs) var(--spacing--sm);
}

.editorScroll {
	flex: 1;
	min-height: 0;
	overflow-y: auto;
	scrollbar-width: thin;
}

.meta {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--sm);
	padding: 0 var(--spacing--xs);
}

.editorColumn {
	max-width: calc(var(--spacing--5xl) * 3);
	margin: 0 auto;
	padding: var(--spacing--lg) var(--spacing--lg) var(--spacing--3xl);
}
</style>
