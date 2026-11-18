<script lang="ts" setup>
import type { DataTableRowRule, DataTableRowRuleImpact } from '@n8n/api-types';
import { useToast } from '@n8n/composables/useToast';
import {
	N8nButton,
	N8nCallout,
	N8nInputLabel,
	N8nOption,
	N8nRadioGroup,
	N8nRadioGroupItem,
	N8nSelect,
	N8nText,
} from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { computed, ref, watch } from 'vue';

import Modal from '@/app/components/Modal.vue';
import { useUIStore } from '@/app/stores/ui.store';
import { useDataTableStore } from '@/features/core/dataTable/dataTable.store';
import type { DataTable } from '@/features/core/dataTable/dataTable.types';

const props = defineProps<{
	modalName: string;
	dataTable: DataTable;
}>();

const emit = defineEmits<{ close: [] }>();

const i18n = useI18n();
const toast = useToast();
const uiStore = useUIStore();
const dataTableStore = useDataTableStore();

const scope = ref<'all' | 'own'>('all');
const column = ref('');
const match = ref<DataTableRowRule['match']>('id');
const runsWithoutUser = ref<DataTableRowRule['runsWithoutUser']>('deny');
const impact = ref<DataTableRowRuleImpact | null>(null);
const saving = ref(false);

const textColumns = computed(() =>
	props.dataTable.columns.filter((candidate) => candidate.type === 'string'),
);
const affectedWorkflows = computed(() => impact.value?.workflowsWithoutUser ?? []);
const canSave = computed(() => scope.value === 'all' || column.value !== '');

/** A new rule keeps workflows without a user working until the builder chooses otherwise. */
async function load() {
	const rule = props.dataTable.rowRule;
	scope.value = rule ? 'own' : 'all';
	column.value = rule?.column ?? textColumns.value[0]?.name ?? '';
	match.value = rule?.match ?? 'id';
	runsWithoutUser.value = rule?.runsWithoutUser ?? 'deny';
	try {
		impact.value = await dataTableStore.fetchRowRuleImpact(
			props.dataTable.id,
			props.dataTable.projectId,
		);
	} catch {
		impact.value = null;
	}
	if (!rule && affectedWorkflows.value.length > 0) runsWithoutUser.value = 'allRows';
}

watch(
	() => uiStore.isModalActiveById[props.modalName],
	(open) => {
		if (open) void load();
	},
	{ immediate: true },
);

async function save() {
	if (!canSave.value) return;
	saving.value = true;
	try {
		await dataTableStore.setRowRule(
			props.dataTable.id,
			props.dataTable.projectId,
			scope.value === 'all'
				? null
				: { column: column.value, match: match.value, runsWithoutUser: runsWithoutUser.value },
		);
		emit('close');
	} catch (error) {
		toast.showError(error, i18n.baseText('dataTable.rowAccess.error'));
	} finally {
		saving.value = false;
	}
}
</script>

<template>
	<Modal
		:name="props.modalName"
		:title="i18n.baseText('dataTable.rowAccess.title')"
		:center="true"
		width="540px"
		:event-bus="undefined"
	>
		<template #content>
			<div :class="$style.content" data-test-id="data-table-row-access">
				<N8nRadioGroup v-model="scope" data-test-id="row-access-scope">
					<N8nRadioGroupItem
						value="all"
						:label="i18n.baseText('dataTable.rowAccess.scope.all')"
						:description="i18n.baseText('dataTable.rowAccess.scope.all.description')"
					/>
					<N8nRadioGroupItem
						value="own"
						:label="i18n.baseText('dataTable.rowAccess.scope.own')"
						:description="i18n.baseText('dataTable.rowAccess.scope.own.description')"
						:disabled="textColumns.length === 0"
					/>
				</N8nRadioGroup>

				<N8nText v-if="textColumns.length === 0" size="small" color="text-light">
					{{ i18n.baseText('dataTable.rowAccess.noTextColumn') }}
				</N8nText>

				<template v-if="scope === 'own'">
					<div :class="$style.fields">
						<N8nInputLabel :label="i18n.baseText('dataTable.rowAccess.column')" size="small">
							<N8nSelect v-model="column" size="small" data-test-id="row-access-column">
								<N8nOption
									v-for="option in textColumns"
									:key="option.id"
									:value="option.name"
									:label="option.name"
								/>
							</N8nSelect>
						</N8nInputLabel>
						<N8nInputLabel :label="i18n.baseText('dataTable.rowAccess.match')" size="small">
							<N8nSelect v-model="match" size="small" data-test-id="row-access-match">
								<N8nOption value="id" :label="i18n.baseText('dataTable.rowAccess.match.id')" />
								<N8nOption
									value="email"
									:label="i18n.baseText('dataTable.rowAccess.match.email')"
								/>
							</N8nSelect>
						</N8nInputLabel>
					</div>

					<N8nInputLabel :label="i18n.baseText('dataTable.rowAccess.withoutUser')" size="small">
						<N8nRadioGroup v-model="runsWithoutUser" data-test-id="row-access-without-user">
							<N8nRadioGroupItem
								value="allRows"
								:label="i18n.baseText('dataTable.rowAccess.withoutUser.allRows')"
							/>
							<N8nRadioGroupItem
								value="deny"
								:label="i18n.baseText('dataTable.rowAccess.withoutUser.deny')"
							/>
						</N8nRadioGroup>
					</N8nInputLabel>

					<N8nCallout
						v-if="affectedWorkflows.length > 0"
						:theme="runsWithoutUser === 'deny' ? 'warning' : 'info'"
						data-test-id="row-access-impact"
					>
						{{
							i18n.baseText(
								runsWithoutUser === 'deny'
									? 'dataTable.rowAccess.impact.deny'
									: 'dataTable.rowAccess.impact.allRows',
							)
						}}
						<ul :class="$style.workflows">
							<li v-for="workflow in affectedWorkflows" :key="workflow.id">{{ workflow.name }}</li>
						</ul>
					</N8nCallout>
				</template>
			</div>
		</template>
		<template #footer>
			<div :class="$style.footer">
				<N8nButton
					size="large"
					variant="secondary"
					:label="i18n.baseText('generic.cancel')"
					data-test-id="row-access-cancel"
					@click="emit('close')"
				/>
				<N8nButton
					size="large"
					:label="i18n.baseText('generic.save')"
					:disabled="!canSave"
					:loading="saving"
					data-test-id="row-access-save"
					@click="save"
				/>
			</div>
		</template>
	</Modal>
</template>

<style module lang="scss">
.content {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--sm);
	padding: var(--spacing--xs) 0;
}

.fields {
	display: grid;
	grid-template-columns: 1fr 1fr;
	gap: var(--spacing--sm);
}

.workflows {
	margin: var(--spacing--3xs) 0 0;
	padding-left: var(--spacing--sm);
	list-style: disc;
}

.footer {
	display: flex;
	justify-content: flex-end;
	gap: var(--spacing--xs);
}
</style>
