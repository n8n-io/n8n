<script lang="ts" setup>
import type {
	DataTableRowRule,
	DataTableRowRuleCondition,
	DataTableRowRuleImpact,
} from '@n8n/api-types';
import { useToast } from '@n8n/composables/useToast';
import {
	N8nButton,
	N8nCallout,
	N8nCheckbox,
	N8nIconButton,
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

const emit = defineEmits<{ close: []; saved: [] }>();

/** A condition in the dialog. `create` means n8n adds the column on save. */
type EditableCondition = DataTableRowRuleCondition & { create: boolean };

const CREATE_COLUMN = '__create__';
const MAX_CONDITIONS = 3;
const SUGGESTED_NAMES: Record<DataTableRowRuleCondition['match'], string> = {
	id: 'owner',
	email: 'owner_email',
	project: 'team',
};

const i18n = useI18n();
const toast = useToast();
const uiStore = useUIStore();
const dataTableStore = useDataTableStore();

const scope = ref<'all' | 'own'>('all');
const conditions = ref<EditableCondition[]>([]);
const projectMembersSeeAll = ref(false);
const runsWithoutUser = ref<DataTableRowRule['runsWithoutUser']>('deny');
const impact = ref<DataTableRowRuleImpact | null>(null);
const saving = ref(false);

const textColumns = computed(() =>
	props.dataTable.columns.filter((candidate) => candidate.type === 'string'),
);
const affectedWorkflows = computed(() => impact.value?.workflowsWithoutUser ?? []);
const createsColumn = computed(() => conditions.value.some(({ create }) => create));
const canAddCondition = computed(() => conditions.value.length < MAX_CONDITIONS);
const canSave = computed(
	() =>
		scope.value === 'all' ||
		(conditions.value.length > 0 &&
			new Set(conditions.value.map(({ column }) => column)).size === conditions.value.length),
);

/** A free column name for the match, such as `owner` or `owner_2`. */
function suggestName(match: DataTableRowRuleCondition['match'], except?: EditableCondition) {
	const taken = new Set([
		...props.dataTable.columns.map(({ name }) => name),
		...conditions.value.filter((condition) => condition !== except).map(({ column }) => column),
	]);
	const base = SUGGESTED_NAMES[match];
	let name = base;
	for (let i = 2; taken.has(name); i++) name = `${base}_${i}`;
	return name;
}

function newCondition(match: DataTableRowRuleCondition['match']): EditableCondition {
	const existing = textColumns.value.find(
		({ name }) =>
			name === SUGGESTED_NAMES[match] && !conditions.value.some(({ column }) => column === name),
	);
	return existing
		? { column: existing.name, match, create: false }
		: { column: suggestName(match), match, create: true };
}

function columnChoice(condition: EditableCondition) {
	return condition.create ? CREATE_COLUMN : condition.column;
}

function chooseColumn(condition: EditableCondition, value: string) {
	condition.create = value === CREATE_COLUMN;
	condition.column = condition.create ? suggestName(condition.match, condition) : value;
}

function chooseMatch(condition: EditableCondition, match: DataTableRowRuleCondition['match']) {
	condition.match = match;
	if (condition.create) condition.column = suggestName(match, condition);
}

function addCondition() {
	conditions.value.push(newCondition(conditions.value.length === 0 ? 'id' : 'project'));
}

function removeCondition(index: number) {
	conditions.value.splice(index, 1);
}

/** A new rule keeps workflows without a user working until the builder chooses otherwise. */
async function load() {
	const rule = props.dataTable.rowRule;
	scope.value = rule ? 'own' : 'all';
	conditions.value = rule
		? rule.conditions.map((condition) => ({ ...condition, create: false }))
		: [];
	if (conditions.value.length === 0) addCondition();
	projectMembersSeeAll.value = rule?.projectMembersSeeAll ?? false;
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
		const { id, projectId } = props.dataTable;
		if (scope.value === 'own') {
			for (const condition of conditions.value.filter(({ create }) => create)) {
				await dataTableStore.addDataTableColumn(id, projectId, {
					name: condition.column,
					type: 'string',
				});
				condition.create = false;
			}
		}
		await dataTableStore.setRowRule(
			id,
			projectId,
			scope.value === 'all'
				? null
				: ({
						conditions: conditions.value.map(({ column, match }) => ({ column, match })),
						projectMembersSeeAll: projectMembersSeeAll.value,
						runsWithoutUser: runsWithoutUser.value,
					} satisfies DataTableRowRule),
		);
		emit('saved');
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
					/>
				</N8nRadioGroup>

				<template v-if="scope === 'own'">
					<N8nText size="small" color="text-light">
						{{ i18n.baseText('dataTable.rowAccess.conditions.hint') }}
					</N8nText>
					<div
						v-for="(condition, index) in conditions"
						:key="index"
						:class="$style.fields"
						:data-test-id="`row-access-condition-${index}`"
					>
						<N8nInputLabel :label="i18n.baseText('dataTable.rowAccess.column')" size="small">
							<N8nSelect
								:model-value="columnChoice(condition)"
								size="small"
								data-test-id="row-access-column"
								@update:model-value="chooseColumn(condition, $event)"
							>
								<N8nOption
									v-for="option in textColumns"
									:key="option.id"
									:value="option.name"
									:label="option.name"
								/>
								<N8nOption
									:value="CREATE_COLUMN"
									:label="
										i18n.baseText('dataTable.rowAccess.createColumn', {
											interpolate: {
												name: condition.create ? condition.column : suggestName(condition.match),
											},
										})
									"
								/>
							</N8nSelect>
						</N8nInputLabel>
						<N8nInputLabel :label="i18n.baseText('dataTable.rowAccess.match')" size="small">
							<N8nSelect
								:model-value="condition.match"
								size="small"
								data-test-id="row-access-match"
								@update:model-value="chooseMatch(condition, $event)"
							>
								<N8nOption value="id" :label="i18n.baseText('dataTable.rowAccess.match.id')" />
								<N8nOption
									value="email"
									:label="i18n.baseText('dataTable.rowAccess.match.email')"
								/>
								<N8nOption
									value="project"
									:label="i18n.baseText('dataTable.rowAccess.match.project')"
								/>
							</N8nSelect>
						</N8nInputLabel>
						<N8nIconButton
							icon="trash-2"
							variant="ghost"
							size="small"
							:class="$style.remove"
							:disabled="conditions.length === 1"
							:aria-label="i18n.baseText('dataTable.rowAccess.conditions.remove')"
							data-test-id="row-access-remove-condition"
							@click="removeCondition(index)"
						/>
					</div>
					<div>
						<N8nButton
							v-if="canAddCondition"
							variant="ghost"
							size="small"
							icon="plus"
							:label="i18n.baseText('dataTable.rowAccess.conditions.add')"
							data-test-id="row-access-add-condition"
							@click="addCondition"
						/>
					</div>

					<N8nText
						v-if="createsColumn"
						size="small"
						color="text-light"
						data-test-id="row-access-creates-column"
					>
						{{ i18n.baseText('dataTable.rowAccess.createColumn.hint') }}
					</N8nText>

					<N8nCheckbox
						v-model="projectMembersSeeAll"
						:label="i18n.baseText('dataTable.rowAccess.projectMembersSeeAll')"
						data-test-id="row-access-project-members"
					/>

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
	grid-template-columns: 1fr 1fr auto;
	align-items: end;
	gap: var(--spacing--sm);
}

.remove {
	margin-bottom: var(--spacing--5xs);
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
