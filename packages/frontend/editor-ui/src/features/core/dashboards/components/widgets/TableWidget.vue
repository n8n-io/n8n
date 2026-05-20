<script setup lang="ts">
import { computed } from 'vue';
import { N8nActionDropdown, N8nButton } from '@n8n/design-system';

import { useMessage } from '@/app/composables/useMessage';
import type { DashboardAction, TableWidget } from '@/features/core/dashboards/dashboards.types';

const props = defineProps<{
	widget: TableWidget;
	rows: Array<Record<string, unknown>> | undefined;
	loading: boolean;
	error?: string;
	canEdit?: boolean;
}>();

const emit = defineEmits<{
	(e: 'action', payload: { action: DashboardAction; row: Record<string, unknown> }): void;
	(e: 'add'): void;
	(e: 'edit', row: Record<string, unknown>): void;
	(e: 'delete', row: Record<string, unknown>): void;
	(e: 'configure'): void;
}>();

const rowActionCount = computed(() => props.widget.rowActions?.length ?? 0);

// Bound row actions become menu items prefixed with `action:` so we can route
// them back to runAction() on select.
const rowActionItems = computed(() =>
	(props.widget.rowActions ?? []).map((a) => ({
		id: `action:${a.slug}`,
		label: a.label,
		icon: 'bolt-filled' as const,
	})),
);

type RowMenuItem = {
	id: string;
	label: string;
	icon?: 'bolt-filled' | 'square-pen' | 'trash-2';
	divided?: boolean;
};

// Composite menu shown on each row: user-defined actions first, then the
// built-in row CRUD (edit / delete) when the viewer has edit rights.
const rowMenuItems = computed<RowMenuItem[]>(() => {
	const items: RowMenuItem[] = [...rowActionItems.value];
	if (props.canEdit) {
		items.push({
			id: 'builtin:edit',
			label: 'Edit row',
			icon: 'square-pen',
			divided: rowActionItems.value.length > 0,
		});
		items.push({
			id: 'builtin:delete',
			label: 'Delete row',
			icon: 'trash-2',
		});
	}
	return items;
});

function onRowMenuSelect(id: string, row: Record<string, unknown>) {
	if (id === 'builtin:edit') {
		emit('edit', row);
		return;
	}
	if (id === 'builtin:delete') {
		void confirmDelete(row);
		return;
	}
	if (id.startsWith('action:')) {
		const slug = id.slice('action:'.length);
		const action = (props.widget.rowActions ?? []).find((a) => a.slug === slug);
		if (action) void runAction(action, row);
	}
}

const message = useMessage();

const columns = computed(() => props.widget.columns);
const hasActions = computed(() => (props.widget.rowActions?.length ?? 0) > 0 || props.canEdit);

async function runAction(action: DashboardAction, row: Record<string, unknown>) {
	if (action.confirm) {
		const result = await message.confirm(action.confirm, action.label, {
			confirmButtonText: 'Run action',
			cancelButtonText: 'Cancel',
			type: 'warning',
		});
		if (result !== 'confirm') return;
	}
	emit('action', { action, row });
}

async function confirmDelete(row: Record<string, unknown>) {
	const result = await message.confirm('This cannot be undone.', 'Delete row?', {
		confirmButtonText: 'Delete',
		cancelButtonText: 'Cancel',
		type: 'warning',
	});
	if (result !== 'confirm') return;
	emit('delete', row);
}

function formatCell(value: unknown): string {
	if (value === null || value === undefined) return '—';
	if (typeof value === 'number') return new Intl.NumberFormat().format(value);
	if (typeof value === 'boolean') return value ? 'true' : 'false';
	if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}/.test(value)) {
		try {
			return new Date(value).toLocaleDateString();
		} catch {
			return value;
		}
	}
	return String(value);
}
</script>

<template>
	<article class="table-widget">
		<header class="table-widget__header">
			<div class="table-widget__title">
				<span class="table-widget__name">{{ widget.title }}</span>
				<span class="table-widget__sub">{{ rows?.length ?? 0 }} rows</span>
			</div>
			<div class="table-widget__header-actions">
				<N8nButton
					v-if="canEdit"
					type="tertiary"
					size="mini"
					icon="bolt-filled"
					:label="
						rowActionCount
							? `${rowActionCount} action${rowActionCount === 1 ? '' : 's'}`
							: 'Actions'
					"
					title="Manage row actions"
					@click="emit('configure')"
				/>
				<N8nButton
					v-if="canEdit"
					type="tertiary"
					size="mini"
					icon="circle-plus"
					label="Add row"
					@click="emit('add')"
				/>
			</div>
		</header>

		<div v-if="loading" class="table-widget__skeleton">
			<div v-for="i in 4" :key="i" class="table-widget__skeleton-row" />
		</div>

		<div v-else-if="error" class="table-widget__error">{{ error }}</div>

		<div v-else class="table-widget__scroll">
			<table class="table-widget__table">
				<thead>
					<tr>
						<th v-for="col in columns" :key="col.key">{{ col.label }}</th>
						<th v-if="hasActions" class="table-widget__actions-header" />
					</tr>
				</thead>
				<tbody>
					<tr v-for="(row, idx) in rows" :key="String(row.id ?? idx)" class="table-widget__row">
						<td v-for="col in columns" :key="col.key">
							{{ formatCell(row[col.key]) }}
						</td>
						<td v-if="hasActions" class="table-widget__actions" @click.stop>
							<N8nActionDropdown
								v-if="rowActionItems.length || canEdit"
								:items="rowMenuItems"
								placement="bottom-end"
								@select="(id: string) => onRowMenuSelect(id, row)"
							>
								<template #activator>
									<N8nButton type="tertiary" size="mini" label="Actions" />
								</template>
							</N8nActionDropdown>
						</td>
					</tr>
					<tr v-if="!rows?.length">
						<td class="table-widget__empty-cell" :colspan="columns.length + (hasActions ? 1 : 0)">
							No rows yet
						</td>
					</tr>
				</tbody>
			</table>
		</div>
	</article>
</template>

<style scoped lang="scss">
.table-widget {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
	background: var(--color--background--light-3);
	border: 1px solid var(--color--foreground);
	border-radius: var(--radius--sm);
	overflow: hidden;
	height: 100%;
	min-height: 200px;
}

.table-widget__header {
	display: flex;
	justify-content: space-between;
	align-items: center;
	padding: var(--spacing--sm) var(--spacing--md);
	border-bottom: 1px solid var(--color--foreground--tint-1);
}

.table-widget__header-actions {
	display: flex;
	gap: var(--spacing--4xs);
	align-items: center;
}

.table-widget__title {
	display: flex;
	flex-direction: column;
	gap: 2px;
}

.table-widget__name {
	font-size: var(--font-size--sm);
	font-weight: var(--font-weight--bold);
	color: var(--color--text--shade-1);
}

.table-widget__sub {
	font-size: var(--font-size--2xs);
	color: var(--color--text--tint-1);
}

.table-widget__scroll {
	overflow: auto;
	flex: 1;
}

.table-widget__table {
	width: 100%;
	border-collapse: separate;
	border-spacing: 0;
	font-size: var(--font-size--xs);
}

.table-widget__table thead {
	background: var(--color--background--light-2);
}

.table-widget__table th {
	text-align: left;
	padding: var(--spacing--2xs) var(--spacing--xs);
	font-weight: var(--font-weight--medium);
	font-size: var(--font-size--3xs);
	text-transform: uppercase;
	letter-spacing: 0.04em;
	color: var(--color--text--tint-1);
	border-bottom: 1px solid var(--color--foreground);
	white-space: nowrap;
}

.table-widget__table td {
	padding: var(--spacing--2xs) var(--spacing--xs);
	border-bottom: 1px solid var(--color--foreground--tint-1);
	color: var(--color--text--shade-1);
	vertical-align: middle;
}

.table-widget__row:hover td {
	background: var(--color--background--light-2);
}

.table-widget__actions {
	display: flex;
	gap: var(--spacing--4xs);
	justify-content: flex-end;
	white-space: nowrap;
}

.table-widget__actions-header {
	width: 1px;
}

.table-widget__empty-cell {
	text-align: center;
	padding: var(--spacing--lg) !important;
	color: var(--color--text--tint-1);
}

.table-widget__skeleton {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--3xs);
	padding: var(--spacing--md);
}

.table-widget__skeleton-row {
	height: 20px;
	border-radius: var(--radius--3xs);
	background: linear-gradient(
		90deg,
		var(--color--background--shade-1) 0%,
		var(--color--background--light-2) 50%,
		var(--color--background--shade-1) 100%
	);
	background-size: 200% 100%;
	animation: table-skeleton 1.4s ease-in-out infinite;
}

@keyframes table-skeleton {
	0% {
		background-position: 200% 0;
	}
	100% {
		background-position: -200% 0;
	}
}

.table-widget__error {
	padding: var(--spacing--md);
	font-size: var(--font-size--2xs);
	color: var(--color--text--danger);
}
</style>
