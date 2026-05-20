<script setup lang="ts">
import { ref } from 'vue';
import { N8nButton, N8nIcon, N8nText } from '@n8n/design-system';

import ActionBindingDrawer from '@/features/core/dashboards/components/edit/ActionBindingDrawer.vue';
import { useMessage } from '@/app/composables/useMessage';
import type { DashboardAction } from '@/features/core/dashboards/dashboards.types';

const message = useMessage();

const props = defineProps<{
	actions: DashboardAction[];
	projectId: string;
}>();

const emit = defineEmits<{
	(e: 'update:actions', next: DashboardAction[]): void;
}>();

const drawerOpen = ref(false);
const editingIndex = ref<number | null>(null);

function openAdd() {
	editingIndex.value = null;
	drawerOpen.value = true;
}

function openEdit(index: number) {
	editingIndex.value = index;
	drawerOpen.value = true;
}

async function remove(index: number) {
	const action = props.actions[index];
	const result = await message.confirm(
		`The "${action?.label ?? 'action'}" binding will be removed from this widget.`,
		'Remove action?',
		{
			confirmButtonText: 'Remove',
			cancelButtonText: 'Cancel',
			type: 'warning',
		},
	);
	if (result !== 'confirm') return;
	const next = [...props.actions];
	next.splice(index, 1);
	emit('update:actions', next);
}

function onSave(action: DashboardAction) {
	const next = [...props.actions];
	if (editingIndex.value === null) {
		next.push(action);
	} else {
		next[editingIndex.value] = action;
	}
	emit('update:actions', next);
	drawerOpen.value = false;
}
</script>

<template>
	<section class="action-list">
		<header class="action-list__header">
			<N8nText size="small" color="text-light">Row actions</N8nText>
			<N8nButton
				type="tertiary"
				size="mini"
				icon="circle-plus"
				label="Add action"
				@click="openAdd"
			/>
		</header>

		<ul v-if="actions.length" class="action-list__items">
			<li v-for="(action, i) in actions" :key="action.slug" class="action-list__item">
				<div class="action-list__item-main">
					<span class="action-list__label">{{ action.label }}</span>
					<span class="action-list__meta">
						<code>{{ action.slug }}</code>
						<span v-if="action.target.webhookNodeName">
							→ {{ action.target.webhookNodeName }}
						</span>
					</span>
				</div>
				<div class="action-list__item-actions">
					<button class="action-list__icon-btn" title="Edit" @click="openEdit(i)">
						<N8nIcon icon="square-pen" size="xsmall" />
					</button>
					<button
						class="action-list__icon-btn action-list__icon-btn--danger"
						title="Remove"
						@click="remove(i)"
					>
						<N8nIcon icon="trash-2" size="xsmall" />
					</button>
				</div>
			</li>
		</ul>

		<N8nText v-else size="xsmall" color="text-light" class="action-list__empty">
			No actions yet. Click "Add action" to bind a workflow webhook.
		</N8nText>

		<ActionBindingDrawer
			:open="drawerOpen"
			:project-id="projectId"
			:initial="editingIndex !== null ? actions[editingIndex] : null"
			@close="drawerOpen = false"
			@save="onSave"
		/>
	</section>
</template>

<style scoped lang="scss">
.action-list {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
}

.action-list__header {
	display: flex;
	justify-content: space-between;
	align-items: center;
}

.action-list__items {
	list-style: none;
	margin: 0;
	padding: 0;
	display: flex;
	flex-direction: column;
	gap: var(--spacing--4xs);
}

.action-list__item {
	display: flex;
	justify-content: space-between;
	align-items: center;
	padding: var(--spacing--2xs) var(--spacing--xs);
	background: var(--color--background--light-2);
	border: 1px solid var(--color--foreground--tint-1);
	border-radius: var(--radius--3xs);
}

.action-list__item-main {
	display: flex;
	flex-direction: column;
	gap: 2px;
	min-width: 0;
}

.action-list__label {
	font-size: var(--font-size--xs);
	color: var(--color--text--shade-1);
	font-weight: var(--font-weight--medium);
}

.action-list__meta {
	font-size: var(--font-size--3xs);
	color: var(--color--text--tint-1);
	display: inline-flex;
	gap: var(--spacing--4xs);
}

.action-list__meta code {
	font-family: var(--font-family--monospace);
}

.action-list__item-actions {
	display: flex;
	gap: var(--spacing--5xs);
}

.action-list__icon-btn {
	background: none;
	border: none;
	cursor: pointer;
	padding: var(--spacing--4xs);
	border-radius: var(--radius--3xs);
	color: var(--color--text--tint-1);
	display: inline-flex;
	align-items: center;
	justify-content: center;
}

.action-list__icon-btn:hover {
	background: var(--color--background--shade-1);
	color: var(--color--text--shade-1);
}

.action-list__icon-btn--danger:hover {
	background: var(--color--red-50);
	color: var(--color--text--danger);
}

.action-list__empty {
	padding: var(--spacing--xs);
	background: var(--color--background--light-2);
	border-radius: var(--radius--3xs);
	text-align: center;
}
</style>
