<script lang="ts" setup>
import { ref } from 'vue';
import { useToast } from '@/app/composables/useToast';
import { useMessage } from '@/app/composables/useMessage';
import { useI18n } from '@n8n/i18n';
import { storeToRefs } from 'pinia';

import {
	N8nButton,
	N8nCard,
	N8nBadge,
	N8nText,
	N8nIconButton,
	N8nActionBox,
} from '@n8n/design-system';
import { useNodeGovernanceStore } from '../nodeGovernance.store';
import type { NodeCategory } from '../nodeGovernance.api';
import CategoryFormModal from './CategoryFormModal.vue';

const { showError, showMessage } = useToast();
const { confirm } = useMessage();
const i18n = useI18n();
const nodeGovernanceStore = useNodeGovernanceStore();

const { categories } = storeToRefs(nodeGovernanceStore);

const showModal = ref(false);
const editingCategory = ref<NodeCategory | null>(null);

function onCreateCategory() {
	editingCategory.value = null;
	showModal.value = true;
}

function onEditCategory(category: NodeCategory) {
	editingCategory.value = category;
	showModal.value = true;
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

function onModalClose() {
	showModal.value = false;
	editingCategory.value = null;
}

function getNodeCount(category: NodeCategory): number {
	return category.nodeAssignments?.length ?? 0;
}
</script>

<template>
	<div :class="$style.container">
		<div :class="$style.header">
			<N8nButton size="medium" @click="onCreateCategory">
				{{ i18n.baseText('nodeGovernance.categories.create') }}
			</N8nButton>
		</div>

		<N8nActionBox
			v-if="categories.length === 0"
			:heading="i18n.baseText('nodeGovernance.categories.empty.title')"
			:description="i18n.baseText('nodeGovernance.categories.empty.description')"
			:button-text="i18n.baseText('nodeGovernance.categories.create')"
			@click:button="onCreateCategory"
		/>

		<div v-else :class="$style.list">
			<N8nCard
				v-for="category in categories"
				:key="category.id"
				:class="$style.card"
			>
				<div :class="$style.cardContent">
					<div :class="$style.cardHeader">
						<div :class="$style.titleRow">
							<div
								v-if="category.color"
								:class="$style.colorDot"
								:style="{ backgroundColor: category.color }"
							/>
							<N8nText tag="span" size="large" :bold="true">
								{{ category.displayName }}
							</N8nText>
							<N8nBadge theme="tertiary">
								{{ getNodeCount(category) }} {{ i18n.baseText('nodeGovernance.categories.nodes') }}
							</N8nBadge>
						</div>
						<div :class="$style.actions">
							<N8nIconButton
								icon="pen"
								type="tertiary"
								size="small"
								:title="i18n.baseText('generic.edit')"
								@click="onEditCategory(category)"
							/>
							<N8nIconButton
								icon="trash"
								type="tertiary"
								size="small"
								:title="i18n.baseText('generic.delete')"
								@click="onDeleteCategory(category)"
							/>
						</div>
					</div>

					<N8nText
						v-if="category.description"
						tag="p"
						size="small"
						color="text-light"
					>
						{{ category.description }}
					</N8nText>

					<N8nText tag="p" size="small" color="text-light">
						{{ i18n.baseText('nodeGovernance.categories.slug') }}: {{ category.slug }}
					</N8nText>
				</div>
			</N8nCard>
		</div>

		<CategoryFormModal
			:show="showModal"
			:category="editingCategory"
			@close="onModalClose"
		/>
	</div>
</template>

<style lang="scss" module>
.container {
	display: flex;
	flex-direction: column;
	gap: var(--spacing-m);
}

.header {
	display: flex;
	justify-content: flex-end;
}

.list {
	display: flex;
	flex-direction: column;
	gap: var(--spacing-s);
}

.card {
	padding: var(--spacing-s);
}

.cardContent {
	display: flex;
	flex-direction: column;
	gap: var(--spacing-xs);
}

.cardHeader {
	display: flex;
	justify-content: space-between;
	align-items: center;
}

.titleRow {
	display: flex;
	align-items: center;
	gap: var(--spacing-xs);
}

.colorDot {
	width: 12px;
	height: 12px;
	border-radius: 50%;
}

.actions {
	display: flex;
	gap: var(--spacing-2xs);
}
</style>
