<script setup lang="ts">
import type { PromotionDataTableChange, PromotionDirection } from '@n8n/api-types';
import { N8nCallout, N8nIcon, N8nText } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';

import type { DataTableDescription } from '../../promotionPreview.content';

defineProps<{ description: DataTableDescription; direction: PromotionDirection }>();

const i18n = useI18n();

function changeText(change: PromotionDataTableChange): string {
	switch (change.kind) {
		case 'add-column':
			return i18n.baseText('promotions.preview.dataTable.addColumn', {
				interpolate: { column: change.column, type: change.type },
			});
		case 'remove-column':
			return i18n.baseText('promotions.preview.dataTable.removeColumn', {
				interpolate: { column: change.column },
			});
		case 'change-column-type':
			return i18n.baseText('promotions.preview.dataTable.changeColumnType', {
				interpolate: { column: change.column, from: change.from, to: change.to },
			});
		case 'rename-column':
			return i18n.baseText('promotions.preview.dataTable.renameColumn', {
				interpolate: { from: change.from, to: change.to },
			});
		case 'reorder-columns':
			return i18n.baseText('promotions.preview.dataTable.reorderColumns');
		case 'rename-table':
			return i18n.baseText('promotions.preview.dataTable.renameTable', {
				interpolate: { from: change.from, to: change.to },
			});
	}
}
</script>

<template>
	<div :class="$style.details" data-test-id="promotion-preview-data-table">
		<!-- Promote cannot know the table on the instance that applies it, so only Apply warns. -->
		<N8nCallout
			v-if="direction === 'apply' && description.hasDataLoss"
			theme="warning"
			data-test-id="promotion-preview-data-loss"
		>
			{{ i18n.baseText('promotions.preview.dataTable.dataLoss') }}
		</N8nCallout>

		<ul v-if="description.changes.length > 0" :class="$style.list">
			<li
				v-for="(change, index) in description.changes"
				:key="index"
				:class="$style.change"
				data-test-id="promotion-preview-data-table-change"
			>
				<N8nIcon
					:icon="change.destructive ? 'triangle-alert' : 'dot'"
					size="small"
					:class="change.destructive ? $style.destructive : $style.marker"
				/>
				<N8nText step="xs">{{ changeText(change) }}</N8nText>
			</li>
		</ul>

		<template v-if="description.addedColumns.length > 0">
			<N8nText step="2xs" color="text-light">
				{{ i18n.baseText('promotions.preview.dataTable.columns') }}
			</N8nText>
			<ul :class="$style.list">
				<li v-for="column in description.addedColumns" :key="column.name" :class="$style.change">
					<N8nText step="xs">{{ column.name }}</N8nText>
					<N8nText step="2xs" color="text-light">{{ column.type }}</N8nText>
				</li>
			</ul>
		</template>

		<N8nText step="2xs" color="text-light">
			{{ i18n.baseText('promotions.preview.dataTable.rowsNotCopied') }}
		</N8nText>
	</div>
</template>

<style module lang="scss">
.details {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
}

.list {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--4xs);
	margin: 0;
	padding: 0;
	list-style: none;
}

.change {
	display: flex;
	align-items: center;
	gap: var(--spacing--3xs);
}

.marker {
	color: var(--icon-color);
}

.destructive {
	color: var(--icon-color--warning);
}
</style>
