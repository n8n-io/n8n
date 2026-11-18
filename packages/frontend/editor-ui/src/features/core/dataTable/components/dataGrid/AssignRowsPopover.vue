<script setup lang="ts">
import { N8nButton, N8nInputLabel, N8nOption, N8nPopover, N8nSelect } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { computed, ref } from 'vue';

import {
	type RowRuleMatch,
	useRowRulePeople,
} from '@/features/core/dataTable/composables/useRowRulePeople';

const props = defineProps<{
	/** Columns that a row rule reads, by what the rule matches them on. */
	ruleColumns: Record<string, RowRuleMatch>;
}>();

const emit = defineEmits<{ assign: [column: string, value: string] }>();

const i18n = useI18n();
const { options } = useRowRulePeople();

const open = ref(false);
const column = ref('');
const value = ref('');

const columns = computed(() => Object.keys(props.ruleColumns));
const valueOptions = computed(() => (column.value ? options(props.ruleColumns[column.value]) : []));

function onOpen(next: boolean) {
	open.value = next;
	if (!next) return;
	column.value = columns.value[0] ?? '';
	value.value = '';
}

function chooseColumn(next: string) {
	column.value = next;
	value.value = '';
}

function assign() {
	if (!column.value || !value.value) return;
	open.value = false;
	emit('assign', column.value, value.value);
}
</script>

<template>
	<N8nPopover :open="open" width="300px" align="center" @update:open="onOpen">
		<template #trigger>
			<N8nButton
				variant="outline"
				:label="i18n.baseText('dataTable.rowAccess.assign')"
				data-test-id="data-table-assign-rows"
			/>
		</template>
		<template #content>
			<div :class="$style.content" data-test-id="data-table-assign-rows-form">
				<N8nInputLabel
					v-if="columns.length > 1"
					:label="i18n.baseText('dataTable.rowAccess.column')"
					size="small"
				>
					<N8nSelect
						:model-value="column"
						size="small"
						data-test-id="data-table-assign-rows-column"
						@update:model-value="chooseColumn"
					>
						<N8nOption v-for="name in columns" :key="name" :value="name" :label="name" />
					</N8nSelect>
				</N8nInputLabel>
				<N8nSelect
					v-model="value"
					size="small"
					filterable
					:placeholder="
						i18n.baseText(
							ruleColumns[column] === 'project'
								? 'dataTable.rowAccess.pickTeam'
								: 'dataTable.rowAccess.pickPerson',
						)
					"
					data-test-id="data-table-assign-rows-value"
				>
					<N8nOption
						v-for="option in valueOptions"
						:key="option.value"
						:value="option.value"
						:label="option.label"
					/>
				</N8nSelect>
				<N8nButton
					size="small"
					:disabled="!value"
					:label="i18n.baseText('dataTable.rowAccess.assign.confirm')"
					data-test-id="data-table-assign-rows-confirm"
					@click="assign"
				/>
			</div>
		</template>
	</N8nPopover>
</template>

<style lang="scss" module>
.content {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
	padding: var(--spacing--xs);
}
</style>
