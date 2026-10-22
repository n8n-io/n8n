<script setup lang="ts">
import type { PromotionDataTableChange } from '@n8n/api-types';
import { N8nIcon, N8nText } from '@n8n/design-system';
import { useI18n, type BaseTextKey } from '@n8n/i18n';
import { I18nT } from 'vue-i18n';

import type { DataTableDescription } from '../../promotionPreview.content';

const props = defineProps<{ description: DataTableDescription }>();

const i18n = useI18n();

type ChangeText = { keypath: BaseTextKey; names: Record<string, string> };

// The data table UI shows the stored type 'date' as 'datetime'.
const typeLabel = (type: string) => (type === 'date' ? 'datetime' : type);

const removesData = (change: PromotionDataTableChange) =>
	props.description.warnsAboutDataLoss && change.destructive;

// The names fill slots, so they can stand out from the sentence.
function changeText(change: PromotionDataTableChange): ChangeText {
	switch (change.kind) {
		case 'add-column':
			return {
				keypath: 'promotions.preview.dataTable.addColumn',
				names: { column: change.column, type: typeLabel(change.type) },
			};
		case 'remove-column':
			return {
				keypath: removesData(change)
					? 'promotions.preview.dataTable.removeColumnWithValues'
					: 'promotions.preview.dataTable.removeColumn',
				names: { column: change.column },
			};
		case 'change-column-type':
			return {
				keypath: 'promotions.preview.dataTable.changeColumnType',
				names: { column: change.column, from: typeLabel(change.from), to: typeLabel(change.to) },
			};
		case 'rename-column':
			return {
				keypath: 'promotions.preview.dataTable.renameColumn',
				names: { from: change.from, to: change.to },
			};
		case 'reorder-columns':
			return { keypath: 'promotions.preview.dataTable.reorderColumns', names: {} };
		case 'rename-table':
			return {
				keypath: 'promotions.preview.dataTable.renameTable',
				names: { from: change.from, to: change.to },
			};
	}
}
</script>

<template>
	<div :class="$style.details" data-test-id="promotion-preview-data-table">
		<ul v-if="description.changes.length > 0" :class="$style.list">
			<li
				v-for="(change, index) in description.changes"
				:key="index"
				:class="$style.change"
				data-test-id="promotion-preview-data-table-change"
			>
				<N8nIcon
					:icon="removesData(change) ? 'triangle-alert' : 'dot'"
					size="small"
					:class="removesData(change) ? $style.destructive : $style.marker"
				/>
				<N8nText step="xs" :class="$style.wrap">
					<I18nT :keypath="changeText(change).keypath" scope="global">
						<template v-for="(name, slot) in changeText(change).names" :key="slot" #[slot]>
							<span :class="$style.name">{{ name }}</span>
						</template>
					</I18nT>
				</N8nText>
			</li>
		</ul>

		<template v-if="description.addedColumns.length > 0">
			<N8nText step="2xs" color="text-light">
				{{ i18n.baseText('promotions.preview.dataTable.columns') }}
			</N8nText>
			<ul :class="$style.list">
				<li v-for="column in description.addedColumns" :key="column.name" :class="$style.change">
					<N8nText step="xs" :class="$style.wrap">{{ column.name }}</N8nText>
					<N8nText step="2xs" color="text-light">{{ typeLabel(column.type) }}</N8nText>
				</li>
			</ul>
			<!-- Only a new table raises the question. A changed table keeps its rows. -->
			<N8nText step="2xs" color="text-light">
				{{ i18n.baseText('promotions.preview.dataTable.rowsNotCopied') }}
			</N8nText>
		</template>
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

.name {
	font-weight: var(--font-weight--bold);
}

/* Column names can be long words without spaces. */
.wrap {
	min-width: 0;
	overflow-wrap: anywhere;
}

.marker {
	color: var(--icon-color);
}

.destructive {
	color: var(--icon-color--warning);
}
</style>
