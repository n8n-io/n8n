<script lang="ts" setup>
import { ref, computed, watch, nextTick } from 'vue';
import { useToast } from '@/app/composables/useToast';
import { useMessage } from '@/app/composables/useMessage';
import { useI18n } from '@n8n/i18n';
import { useUIStore } from '@/app/stores/ui.store';
import { storeToRefs } from 'pinia';

import {
	N8nActionBox,
	N8nButton,
	N8nCard,
	N8nIcon,
	N8nInput,
	N8nPagination2,
	N8nRecycleScroller,
	N8nText,
} from '@n8n/design-system';
import { useNodeGovernanceStore } from '../nodeGovernance.store';
import type { NodeCategory, NodeGovernanceExport } from '../nodeGovernance.api';
import { CATEGORY_FORM_MODAL_KEY, CATEGORY_NODES_MODAL_KEY } from '../nodeGovernance.constants';

const { showError, showMessage } = useToast();
const { confirm } = useMessage();
const i18n = useI18n();
const uiStore = useUIStore();
const nodeGovernanceStore = useNodeGovernanceStore();

const { categories } = storeToRefs(nodeGovernanceStore);

const searchQuery = ref('');
const isExporting = ref(false);
const isImporting = ref(false);
const fileInputRef = ref<HTMLInputElement | null>(null);

// Pagination state (1-indexed for N8nPagination)
const currentPage = ref(1);
const itemsPerPage = ref(10);

const filteredCategories = computed(() => {
	if (!categories.value || categories.value.length === 0) {
		return [];
	}
	if (!searchQuery.value.trim()) {
		return categories.value;
	}
	const query = searchQuery.value.toLowerCase();
	return categories.value.filter(
		(c) =>
			c.displayName.toLowerCase().includes(query) ||
			c.slug.toLowerCase().includes(query) ||
			c.description?.toLowerCase().includes(query),
	);
});

// Ref for list container to enable scroll-to-top
const listContainerRef = ref<HTMLElement | null>(null);

// Estimated card height for virtual scrolling (will auto-adjust)
const estimatedCardHeight = 180;

// Reset page to 1 when search query changes
watch(searchQuery, () => {
	currentPage.value = 1;
});

// Auto-scroll to top when page changes
watch(currentPage, () => {
	void nextTick(() => {
		if (listContainerRef.value) {
			const container = listContainerRef.value.querySelector(
				'.recycle-scroller-wrapper',
			) as HTMLElement;
			if (container) {
				container.scrollTo({ top: 0, behavior: 'smooth' });
			}
		}
	});
});

// Compute paginated items
const paginatedCategories = computed(() => {
	if (!filteredCategories.value || filteredCategories.value.length === 0) {
		return [];
	}
	const start = (currentPage.value - 1) * itemsPerPage.value;
	const end = start + itemsPerPage.value;
	return filteredCategories.value.slice(start, end);
});

function handlePageChange(page: number) {
	currentPage.value = page;
}

function handlePageSizeChange(size: number) {
	itemsPerPage.value = size;
	currentPage.value = 1;
}

function onCreateCategory() {
	uiStore.openModalWithData({
		name: CATEGORY_FORM_MODAL_KEY,
		data: {},
	});
}

function onEditCategory(category: NodeCategory) {
	uiStore.openModalWithData({
		name: CATEGORY_FORM_MODAL_KEY,
		data: { category },
	});
}

async function onDeleteCategory(category: NodeCategory) {
	const confirmed = await confirm(
		i18n.baseText('nodeGovernance.categories.delete.description'),
		i18n.baseText('nodeGovernance.categories.delete.title'),
		{
			confirmButtonText: i18n.baseText('generic.delete'),
			cancelButtonText: i18n.baseText('generic.cancel'),
		},
	);

	if (confirmed === 'confirm') {
		try {
			await nodeGovernanceStore.deleteCategory(category.id);
			showMessage({
				title: i18n.baseText('nodeGovernance.categories.delete.success'),
				type: 'success',
			});
		} catch (e) {
			showError(e, i18n.baseText('nodeGovernance.categories.delete.error'));
		}
	}
}

function getNodeCount(category: NodeCategory): number {
	return category.nodeAssignments?.length ?? 0;
}

function onManageNodes(category: NodeCategory) {
	uiStore.openModalWithData({
		name: CATEGORY_NODES_MODAL_KEY,
		data: { category },
	});
}

async function onExport() {
	isExporting.value = true;
	try {
		const exportData = await nodeGovernanceStore.exportCategories();

		// Create and download JSON file
		const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
		const url = URL.createObjectURL(blob);
		const link = document.createElement('a');
		link.href = url;
		link.download = `node-governance-categories-${new Date().toISOString().split('T')[0]}.json`;
		document.body.appendChild(link);
		link.click();
		document.body.removeChild(link);
		URL.revokeObjectURL(url);

		showMessage({
			title: i18n.baseText('nodeGovernance.categories.export.success'),
			type: 'success',
		});
	} catch (e) {
		showError(e, i18n.baseText('nodeGovernance.categories.export.error'));
	} finally {
		isExporting.value = false;
	}
}

function onImportClick() {
	fileInputRef.value?.click();
}

async function onFileSelected(event: Event) {
	const input = event.target as HTMLInputElement;
	const file = input.files?.[0];

	if (!file) {
		return;
	}

	isImporting.value = true;
	try {
		const text = await file.text();
		const importData = JSON.parse(text) as NodeGovernanceExport;

		// Validate the import data structure
		if (!importData.version || !Array.isArray(importData.categories)) {
			throw new Error(i18n.baseText('nodeGovernance.categories.import.invalidFormat'));
		}

		const result = await nodeGovernanceStore.importCategories(importData);

		showMessage({
			title: i18n.baseText('nodeGovernance.categories.import.success'),
			message: i18n.baseText('nodeGovernance.categories.import.result', {
				interpolate: {
					created: result.created,
					updated: result.updated,
					unchanged: result.unchanged,
				},
			}),
			type: 'success',
		});
	} catch (e) {
		if (e instanceof SyntaxError) {
			showError(
				new Error(i18n.baseText('nodeGovernance.categories.import.invalidJson')),
				i18n.baseText('nodeGovernance.categories.import.error'),
			);
		} else {
			showError(e, i18n.baseText('nodeGovernance.categories.import.error'));
		}
	} finally {
		isImporting.value = false;
		// Reset file input so the same file can be selected again
		if (input) {
			input.value = '';
		}
	}
}
</script>

<template>
	<div :class="$style.categoriesTab">
		<!-- Search Row -->
		<div :class="$style.headerRow">
			<div :class="$style.headerLeft">
				<N8nInput
					v-model="searchQuery"
					:class="$style.searchInput"
					:placeholder="i18n.baseText('nodeGovernance.categories.search')"
					clearable
					data-test-id="categories-search"
				>
					<template #prefix>
						<N8nIcon icon="search" />
					</template>
				</N8nInput>
				<N8nText size="small" color="text-light">
					{{
						i18n.baseText('nodeGovernance.categories.count', {
							interpolate: { count: filteredCategories.length },
							adjustToNumber: filteredCategories.length,
						})
					}}
				</N8nText>
			</div>
			<div :class="$style.headerActions">
				<N8nButton
					type="tertiary"
					size="small"
					icon="file-export"
					:loading="isExporting"
					data-test-id="export-categories-button"
					@click="onExport"
				>
					{{ i18n.baseText('nodeGovernance.categories.export') }}
				</N8nButton>
				<N8nButton
					type="tertiary"
					size="small"
					icon="file-import"
					:loading="isImporting"
					data-test-id="import-categories-button"
					@click="onImportClick"
				>
					{{ i18n.baseText('nodeGovernance.categories.import') }}
				</N8nButton>
				<input
					ref="fileInputRef"
					type="file"
					accept=".json"
					:class="$style.hiddenInput"
					@change="onFileSelected"
				/>
			</div>
		</div>

		<!-- Empty State -->
		<N8nActionBox
			v-if="categories.length === 0"
			:heading="i18n.baseText('nodeGovernance.categories.empty.title')"
			:description="i18n.baseText('nodeGovernance.categories.empty.description')"
			:button-text="i18n.baseText('nodeGovernance.categories.create')"
			@click:button="onCreateCategory"
		/>

		<!-- Category Cards List (vertical like workflows) -->
		<div v-else ref="listContainerRef" :class="$style.categoryListWrapper">
			<N8nRecycleScroller
				v-if="paginatedCategories.length > 0"
				:items="paginatedCategories"
				:item-size="estimatedCardHeight"
				item-key="id"
			>
				<template #default="{ item: category }">
					<N8nCard :class="$style.categoryCard">
						<template #header>
							<div :class="$style.cardHeader">
								<N8nText tag="h2" :bold="true" size="medium">{{ category.displayName }}</N8nText>
								<span
									:class="$style.colorDot"
									:style="{ backgroundColor: category.color || '#667085' }"
								></span>
							</div>
						</template>
						<div :class="$style.cardBody">
							<N8nText color="text-light" size="small" :class="$style.cardDescription">
								{{
									category.description || i18n.baseText('nodeGovernance.categories.noDescription')
								}}
							</N8nText>
						</div>
						<template #append>
							<div :class="$style.cardAppend">
								<N8nText size="small" color="text-light" :class="$style.nodeCount">
									{{
										i18n.baseText('nodeGovernance.categories.nodeCount', {
											interpolate: { count: getNodeCount(category) },
											adjustToNumber: getNodeCount(category),
										})
									}}
								</N8nText>
								<div :class="$style.cardActions">
									<N8nButton
										type="tertiary"
										size="small"
										icon="cubes"
										data-test-id="manage-nodes-button"
										@click="onManageNodes(category)"
									>
										{{ i18n.baseText('nodeGovernance.categories.manageNodes') }}
									</N8nButton>
									<N8nButton
										type="tertiary"
										size="small"
										icon="pen"
										data-test-id="edit-category-button"
										@click="onEditCategory(category)"
									>
										{{ i18n.baseText('generic.edit') }}
									</N8nButton>
									<N8nButton
										type="tertiary"
										size="small"
										icon="trash"
										:class="$style.deleteBtn"
										data-test-id="delete-category-button"
										@click="onDeleteCategory(category)"
									>
										{{ i18n.baseText('generic.delete') }}
									</N8nButton>
								</div>
							</div>
						</template>
					</N8nCard>
				</template>
			</N8nRecycleScroller>
			<div v-else :class="$style.emptyState">
				<N8nText color="text-light">{{
					i18n.baseText('nodeGovernance.categories.noResults')
				}}</N8nText>
			</div>
		</div>

		<!-- Pagination -->
		<div
			v-if="filteredCategories.length > itemsPerPage && itemsPerPage > 0"
			:class="$style.paginationContainer"
		>
			<N8nPagination2
				:current-page="Math.max(1, currentPage)"
				:page-size="itemsPerPage"
				:total="filteredCategories.length"
				:page-sizes="[10, 25, 50]"
				layout="prev, pager, next, sizes"
				@update:current-page="handlePageChange"
				@update:pageSize="handlePageSizeChange"
			/>
		</div>
	</div>
</template>

<style lang="scss" module>
.categoriesTab {
	display: flex;
	flex-direction: column;
	height: 100%;
	overflow: hidden;
}

.headerRow {
	display: flex;
	justify-content: space-between;
	align-items: center;
	padding: var(--spacing--sm) 0;
	margin-bottom: var(--spacing--sm);
	border-bottom: 1px solid var(--color--foreground);
	gap: var(--spacing--sm);
}

.headerLeft {
	display: flex;
	align-items: center;
	gap: var(--spacing--sm);
}

.headerActions {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
}

.hiddenInput {
	display: none;
}

.searchInput {
	max-width: 220px;
}

.categoryListWrapper {
	flex: 1;
	min-height: 0;
	display: flex;
	flex-direction: column;
	position: relative;
	height: 100%;
}

.categoryCard {
	width: 100%;
	margin-bottom: var(--spacing--2xs);
	transition: border-color 0.15s;

	&:hover {
		border-color: var(--color--foreground--shade-1);
	}

	// Override N8nCard default padding for tighter layout
	:global(.n8n-card-append) {
		padding-left: var(--spacing--sm);
	}
}

.cardHeader {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
}

.colorDot {
	width: 10px;
	height: 10px;
	border-radius: 50%;
	flex-shrink: 0;
	margin-left: 10px;
}

.cardBody {
	display: flex;
	flex-direction: column;
}

.cardDescription {
	display: block;
	line-height: 1.4;
}

.cardAppend {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
}

.nodeCount {
	white-space: nowrap;
	min-width: 120px;
	text-align: right;
}

.cardActions {
	display: flex;
	gap: var(--spacing--2xs);
}

.deleteBtn {
	--button--font--color: var(--color--danger);

	&:hover {
		--button--background--color: var(--color--danger--tint-3);
	}
}

.paginationContainer {
	display: flex;
	justify-content: flex-end;
	align-items: center;
	margin-top: var(--spacing--sm);
	padding-top: var(--spacing--sm);
}
</style>
