<script lang="ts" setup>
import { ref, computed, watch } from 'vue';
import { useToast } from '@/app/composables/useToast';
import { useI18n } from '@n8n/i18n';
import { useUIStore } from '@/app/stores/ui.store';
import { useNodeTypesStore } from '@/app/stores/nodeTypes.store';
import { storeToRefs } from 'pinia';

import { N8nButton, N8nInput, N8nText, N8nIcon, N8nCheckbox } from '@n8n/design-system';
import Modal from '@/app/components/Modal.vue';
import NodeIcon from '@/app/components/NodeIcon.vue';
import { useNodeGovernanceStore } from '../nodeGovernance.store';
import { CATEGORY_NODES_MODAL_KEY } from '../nodeGovernance.constants';

const { showError, showMessage } = useToast();
const i18n = useI18n();
const uiStore = useUIStore();
const nodeTypesStore = useNodeTypesStore();
const nodeGovernanceStore = useNodeGovernanceStore();

// Get categories from store (reactive - updates after fetchCategories)
const { categories } = storeToRefs(nodeGovernanceStore);

const loading = ref(false);
const searchQuery = ref('');
const selectedNodes = ref<Set<string>>(new Set());

// Get category ID from modal data
const modalData = computed(() => uiStore.modalsById[CATEGORY_NODES_MODAL_KEY]?.data ?? {});
const categoryId = computed(() => modalData.value.category?.id);

// Get the CURRENT category from the store (reactive to store updates)
const category = computed(() => {
	if (!categoryId.value) return null;
	return categories.value.find((c) => c.id === categoryId.value) ?? null;
});

const modalTitle = computed(() =>
	category.value
		? i18n.baseText('nodeGovernance.categories.manageNodes.title', {
				interpolate: { name: category.value.displayName },
			})
		: i18n.baseText('nodeGovernance.categories.manageNodes.titleDefault'),
);

// Get assigned node types from category
const assignedNodeTypes = computed(() => {
	return category.value?.nodeAssignments?.map((a: { nodeType: string }) => a.nodeType) ?? [];
});

// Get all available node types with their display info
const allNodeTypes = computed(() => {
	return nodeTypesStore.allLatestNodeTypes.map((node) => ({
		name: node.name,
		displayName: node.displayName,
		description: node.description,
		nodeType: node,
	}));
});

// Filter available nodes for search (exclude already assigned)
const availableNodes = computed(() => {
	const query = searchQuery.value.toLowerCase().trim();
	return allNodeTypes.value
		.filter((node) => !assignedNodeTypes.value.includes(node.name))
		.filter(
			(node) =>
				!query ||
				node.displayName.toLowerCase().includes(query) ||
				node.name.toLowerCase().includes(query),
		)
		.slice(0, 50); // Limit for performance
});

// Get full node info for assigned nodes
const assignedNodesWithInfo = computed(() => {
	return assignedNodeTypes.value.map((nodeType: string) => {
		const nodeInfo = allNodeTypes.value.find((n) => n.name === nodeType);
		return {
			nodeType,
			displayName: nodeInfo?.displayName ?? nodeType.split('.').pop() ?? nodeType,
			nodeTypeDesc: nodeInfo?.nodeType ?? null,
		};
	});
});

const selectedCount = computed(() => selectedNodes.value.size);

// Map of nodeType -> category displayName for nodes assigned to OTHER categories
const nodeToOtherCategory = computed(() => {
	const map: Record<string, string> = {};
	for (const cat of categories.value) {
		if (cat.id === categoryId.value) continue; // skip current category
		for (const assignment of cat.nodeAssignments ?? []) {
			map[assignment.nodeType] = cat.displayName;
		}
	}
	return map;
});

// Reset state when modal opens
watch(
	() => uiStore.modalsById[CATEGORY_NODES_MODAL_KEY]?.open,
	async (isOpen) => {
		if (isOpen) {
			searchQuery.value = '';
			selectedNodes.value = new Set();
			// Ensure node types are loaded
			await nodeTypesStore.loadNodeTypesIfNotLoaded();
		}
	},
);

function toggleNodeSelection(nodeType: string) {
	const newSet = new Set(selectedNodes.value);
	if (newSet.has(nodeType)) {
		newSet.delete(nodeType);
	} else {
		newSet.add(nodeType);
	}
	selectedNodes.value = newSet;
}

function isNodeSelected(nodeType: string): boolean {
	return selectedNodes.value.has(nodeType);
}

async function addNode(nodeType: string, displayName: string) {
	if (!category.value) return;

	loading.value = true;
	try {
		await nodeGovernanceStore.assignNodeToCategory(category.value.id, nodeType);
		// Refresh categories to get updated assignments
		await nodeGovernanceStore.fetchCategories();
		showMessage({
			title: i18n.baseText('nodeGovernance.categories.manageNodes.addSuccess', {
				interpolate: { node: displayName },
			}),
			type: 'success',
		});
		// Remove from selection if it was selected
		const newSet = new Set(selectedNodes.value);
		newSet.delete(nodeType);
		selectedNodes.value = newSet;
	} catch (e) {
		showError(e, i18n.baseText('nodeGovernance.categories.manageNodes.addError'));
	} finally {
		loading.value = false;
	}
}

async function addSelectedNodes() {
	if (!category.value || selectedNodes.value.size === 0) return;

	loading.value = true;
	const nodesToAdd = Array.from(selectedNodes.value);
	let successCount = 0;

	try {
		for (const nodeType of nodesToAdd) {
			await nodeGovernanceStore.assignNodeToCategory(category.value.id, nodeType);
			successCount++;
		}
		// Refresh categories to get updated assignments
		await nodeGovernanceStore.fetchCategories();
		showMessage({
			title: i18n.baseText('nodeGovernance.categories.manageNodes.addMultipleSuccess', {
				interpolate: { count: successCount },
				adjustToNumber: successCount,
			}),
			type: 'success',
		});
		selectedNodes.value = new Set();
		searchQuery.value = '';
	} catch (e) {
		// Refresh anyway to show partial progress
		await nodeGovernanceStore.fetchCategories();
		showError(e, i18n.baseText('nodeGovernance.categories.manageNodes.addError'));
	} finally {
		loading.value = false;
	}
}

async function removeNode(nodeType: string, displayName: string) {
	if (!category.value) return;

	loading.value = true;
	try {
		await nodeGovernanceStore.removeNodeFromCategory(category.value.id, nodeType);
		// Refresh categories to get updated assignments
		await nodeGovernanceStore.fetchCategories();
		showMessage({
			title: i18n.baseText('nodeGovernance.categories.manageNodes.removeSuccess', {
				interpolate: { node: displayName },
			}),
			type: 'success',
		});
	} catch (e) {
		showError(e, i18n.baseText('nodeGovernance.categories.manageNodes.removeError'));
	} finally {
		loading.value = false;
	}
}

function closeModal() {
	uiStore.closeModal(CATEGORY_NODES_MODAL_KEY);
}
</script>

<template>
	<Modal
		:name="CATEGORY_NODES_MODAL_KEY"
		:title="modalTitle"
		:show-close="true"
		:center="true"
		width="600px"
	>
		<template #content>
			<div v-if="category" :class="$style.content">
				<!-- Category Info Header -->
				<div :class="$style.categoryHeader">
					<span
						:class="$style.colorDot"
						:style="{ backgroundColor: category.color || '#667085' }"
					></span>
					<N8nText size="small" color="text-light">
						{{ category.description || i18n.baseText('nodeGovernance.categories.noDescription') }}
					</N8nText>
				</div>

				<!-- Search and Add Section -->
				<div :class="$style.searchSection">
					<div :class="$style.searchHeader">
						<N8nText tag="h4" :bold="true" size="small" color="text-dark">
							{{ i18n.baseText('nodeGovernance.categories.manageNodes.addNodes') }}
						</N8nText>
						<N8nButton
							v-if="selectedCount > 0"
							type="primary"
							size="small"
							:loading="loading"
							@click="addSelectedNodes"
						>
							{{
								i18n.baseText('nodeGovernance.categories.manageNodes.addSelected', {
									interpolate: { count: selectedCount },
									adjustToNumber: selectedCount,
								})
							}}
						</N8nButton>
					</div>
					<N8nInput
						v-model="searchQuery"
						:placeholder="i18n.baseText('nodeGovernance.categories.manageNodes.searchPlaceholder')"
						clearable
						:class="$style.searchInput"
					>
						<template #prefix>
							<N8nIcon icon="search" />
						</template>
					</N8nInput>

					<!-- Available nodes dropdown (shows when searching) -->
					<div v-if="searchQuery.trim()" :class="$style.availableNodesList">
						<div v-if="availableNodes.length === 0" :class="$style.noResults">
							<N8nText size="small" color="text-light">
								{{ i18n.baseText('nodeGovernance.categories.manageNodes.noNodesFound') }}
							</N8nText>
						</div>
						<div
							v-for="node in availableNodes"
							:key="node.name"
							:class="[$style.availableNodeItem, { [$style.selected]: isNodeSelected(node.name) }]"
						>
							<N8nCheckbox
								:model-value="isNodeSelected(node.name)"
								:class="$style.nodeCheckbox"
								@update:model-value="toggleNodeSelection(node.name)"
							/>
							<div :class="$style.nodeClickArea" @click="addNode(node.name, node.displayName)">
								<NodeIcon :node-type="node.nodeType" :size="20" :class="$style.nodeIcon" />
								<div :class="$style.nodeInfo">
									<N8nText size="small" :bold="true">{{ node.displayName }}</N8nText>
									<N8nText size="small" color="text-light" :class="$style.nodeTypeName">
										{{ node.name }}
									</N8nText>
									<div v-if="nodeToOtherCategory[node.name]" :class="$style.alreadyAssignedBadge">
										<N8nIcon icon="exclamation-triangle" :class="$style.warningIcon" />
										<N8nText size="small" :class="$style.warningText">
											{{
												i18n.baseText('nodeGovernance.categories.manageNodes.alreadyAssigned', {
													interpolate: { category: nodeToOtherCategory[node.name] },
												})
											}}
										</N8nText>
									</div>
								</div>
								<N8nIcon icon="plus" :class="$style.addIcon" />
							</div>
						</div>
					</div>
				</div>

				<!-- Assigned Nodes Section -->
				<div :class="$style.assignedSection">
					<N8nText tag="h4" :bold="true" size="small" color="text-dark">
						{{
							i18n.baseText('nodeGovernance.categories.manageNodes.assignedNodes', {
								interpolate: { count: assignedNodesWithInfo.length },
								adjustToNumber: assignedNodesWithInfo.length,
							})
						}}
					</N8nText>

					<div v-if="assignedNodesWithInfo.length === 0" :class="$style.emptyState">
						<N8nText size="small" color="text-light">
							{{ i18n.baseText('nodeGovernance.categories.manageNodes.noNodesAssigned') }}
						</N8nText>
					</div>

					<div v-else :class="$style.assignedNodesList">
						<div
							v-for="node in assignedNodesWithInfo"
							:key="node.nodeType"
							:class="$style.assignedNodeItem"
						>
							<NodeIcon :node-type="node.nodeTypeDesc" :size="24" :class="$style.nodeIcon" />
							<div :class="$style.nodeInfo">
								<N8nText size="small" :bold="true">{{ node.displayName }}</N8nText>
								<N8nText size="small" color="text-light" :class="$style.nodeTypeName">
									{{ node.nodeType }}
								</N8nText>
							</div>
							<N8nButton
								type="tertiary"
								size="mini"
								icon="times"
								:class="$style.removeBtn"
								:disabled="loading"
								@click="removeNode(node.nodeType, node.displayName)"
							/>
						</div>
					</div>
				</div>
			</div>
		</template>

		<template #footer>
			<div :class="$style.footer">
				<N8nButton type="secondary" @click="closeModal">
					{{ i18n.baseText('generic.close') }}
				</N8nButton>
			</div>
		</template>
	</Modal>
</template>

<style lang="scss" module>
.content {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--sm);
}

.categoryHeader {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	padding: var(--spacing--xs);
	background: var(--color--background--light-3);
	border-radius: var(--radius--lg);
}

.colorDot {
	width: 12px;
	height: 12px;
	border-radius: 50%;
	flex-shrink: 0;
}

.searchSection {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
}

.searchHeader {
	display: flex;
	justify-content: space-between;
	align-items: center;
}

.searchInput {
	width: 100%;
}

.availableNodesList {
	max-height: 200px;
	overflow-y: auto;
	border: 1px solid var(--color--foreground);
	border-radius: var(--radius--lg);
	background: var(--color--background--light-2);
}

.noResults {
	padding: var(--spacing--sm);
	text-align: center;
}

.availableNodeItem {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	padding: var(--spacing--xs) var(--spacing--sm);
	transition: background-color 0.15s;

	&:not(:last-child) {
		border-bottom: 1px solid var(--color--foreground--tint-1);
	}

	&.selected {
		background: var(--color--primary--tint-3);
	}
}

.nodeCheckbox {
	flex-shrink: 0;
}

.nodeClickArea {
	display: flex;
	align-items: center;
	gap: var(--spacing--xs);
	flex: 1;
	cursor: pointer;
	min-width: 0;

	&:hover {
		.addIcon {
			color: var(--color--primary--shade-1);
		}
	}
}

.nodeIcon {
	flex-shrink: 0;
}

.nodeInfo {
	flex: 1;
	min-width: 0;
	display: flex;
	flex-direction: column;
	gap: 2px;
}

.nodeTypeName {
	font-size: var(--font-size--3xs);
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.alreadyAssignedBadge {
	display: flex;
	align-items: center;
	gap: var(--spacing--4xs);
	margin-top: 2px;
}

.warningIcon {
	color: var(--color--warning);
	font-size: var(--font-size--3xs);
	flex-shrink: 0;
}

.warningText {
	font-size: var(--font-size--3xs);
	color: var(--color--warning);
}

.addIcon {
	color: var(--color--primary);
	flex-shrink: 0;
}

.assignedSection {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
}

.emptyState {
	padding: var(--spacing--lg);
	text-align: center;
	background: var(--color--background--light-3);
	border: 1px dashed var(--color--foreground);
	border-radius: var(--radius--lg);
}

.assignedNodesList {
	max-height: 300px;
	overflow-y: auto;
	border: 1px solid var(--color--foreground);
	border-radius: var(--radius--lg);
}

.assignedNodeItem {
	display: flex;
	align-items: center;
	gap: var(--spacing--xs);
	padding: var(--spacing--xs) var(--spacing--sm);

	&:not(:last-child) {
		border-bottom: 1px solid var(--color--foreground--tint-1);
	}

	&:hover {
		background: var(--color--background--light-3);
	}
}

.removeBtn {
	flex-shrink: 0;
	--button--font--color: var(--color--danger);

	&:hover {
		--button--background--color: var(--color--danger--tint-3);
	}
}

.footer {
	display: flex;
	justify-content: flex-end;
}
</style>
