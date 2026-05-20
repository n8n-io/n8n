<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { N8nInput, N8nButton, N8nText, N8nSelect, N8nOption } from '@n8n/design-system';

import ActionListSection from '@/features/core/dashboards/components/edit/ActionListSection.vue';
import { useMessage } from '@/app/composables/useMessage';
import type {
	DashboardAction,
	DashboardWidget,
	TableWidget,
} from '@/features/core/dashboards/dashboards.types';

const message = useMessage();

const props = defineProps<{
	widget: DashboardWidget | null;
	projectId: string;
}>();

const emit = defineEmits<{
	(e: 'close'): void;
	(e: 'save', widget: DashboardWidget): void;
	(e: 'delete', widgetId: string): void;
}>();

const local = ref<DashboardWidget | null>(props.widget ? { ...props.widget } : null);

watch(
	() => props.widget,
	(w) => {
		local.value = w ? { ...w } : null;
	},
);

const isOpen = computed(() => local.value !== null);

const tableWidget = computed<TableWidget | null>(() =>
	local.value?.type === 'table' ? (local.value as TableWidget) : null,
);

function save() {
	if (!local.value) return;
	emit('save', local.value);
}

async function remove() {
	if (!local.value) return;
	const result = await message.confirm(
		`The "${local.value.title}" widget will be removed from this view.`,
		'Delete widget?',
		{
			confirmButtonText: 'Delete',
			cancelButtonText: 'Cancel',
			type: 'warning',
		},
	);
	if (result !== 'confirm') return;
	emit('delete', local.value.id);
}

function onActionsUpdate(actions: DashboardAction[]) {
	if (!local.value || local.value.type !== 'table') return;
	local.value = { ...local.value, rowActions: actions };
}
</script>

<template>
	<aside v-if="isOpen && local" class="widget-drawer">
		<header class="widget-drawer__header">
			<N8nText tag="h3" size="medium" bold>Widget settings</N8nText>
			<N8nButton type="tertiary" size="small" label="Close" @click="emit('close')" />
		</header>

		<section class="widget-drawer__section">
			<label>
				<N8nText size="small" color="text-light">Title</N8nText>
				<N8nInput v-model="local.title" />
			</label>
			<label>
				<N8nText size="small" color="text-light">Column span (1–12)</N8nText>
				<N8nInput v-model.number="local.colSpan" type="number" :min="1" :max="12" />
			</label>
			<label>
				<N8nText size="small" color="text-light">Row span (1–12)</N8nText>
				<N8nInput v-model.number="local.rowSpan" type="number" :min="1" :max="12" />
			</label>
			<label v-if="local.type === 'chart'">
				<N8nText size="small" color="text-light">Chart type</N8nText>
				<N8nSelect v-model="local.chartType">
					<N8nOption value="bar" label="Bar" />
					<N8nOption value="line" label="Line" />
					<N8nOption value="area" label="Area" />
					<N8nOption value="pie" label="Pie" />
				</N8nSelect>
			</label>
		</section>

		<section v-if="tableWidget" class="widget-drawer__section widget-drawer__section--actions">
			<header class="widget-drawer__section-header">
				<N8nText size="small" bold>Row actions</N8nText>
				<N8nText size="xsmall" color="text-light">
					Buttons that appear at the end of each row in this table. Each fires a workflow with the
					row's data when clicked.
				</N8nText>
			</header>
			<ActionListSection
				:actions="tableWidget.rowActions ?? []"
				:project-id="projectId"
				@update:actions="onActionsUpdate"
			/>
		</section>

		<footer class="widget-drawer__footer">
			<N8nButton type="tertiary" label="Delete" @click="remove" />
			<N8nButton type="primary" label="Save" @click="save" />
		</footer>
	</aside>
</template>

<style scoped lang="scss">
.widget-drawer {
	position: fixed;
	top: 0;
	right: 0;
	width: 420px;
	height: 100%;
	background: var(--color--background--light-3);
	border-left: 1px solid var(--color--foreground);
	padding: var(--spacing--md);
	display: flex;
	flex-direction: column;
	gap: var(--spacing--md);
	z-index: 100;
	overflow-y: auto;
}
.widget-drawer__header {
	display: flex;
	justify-content: space-between;
	align-items: center;
}
.widget-drawer__section {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
}
.widget-drawer__section label {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--4xs);
}
.widget-drawer__section--actions {
	padding-top: var(--spacing--sm);
	border-top: 1px solid var(--color--foreground--tint-1);
}
.widget-drawer__section-header {
	display: flex;
	flex-direction: column;
	gap: 2px;
	margin-bottom: var(--spacing--2xs);
}
.widget-drawer__footer {
	display: flex;
	justify-content: space-between;
	margin-top: auto;
}
</style>
