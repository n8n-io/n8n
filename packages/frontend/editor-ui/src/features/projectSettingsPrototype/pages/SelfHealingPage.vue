<script setup lang="ts">
import { computed, reactive, ref, useId } from 'vue';
import { RouterLink } from 'vue-router';
import {
	N8nButton,
	N8nCallout,
	N8nDialog,
	N8nDialogBody,
	N8nDialogFooter,
	N8nEmptyState,
	N8nHeading,
	N8nIcon,
	N8nIconButton,
	N8nInputLabel,
	N8nOption,
	N8nRadioGroup,
	N8nRadioGroupItem,
	N8nSelect,
	N8nSettingsSection,
	N8nSwitch,
	N8nText,
	N8nTooltip,
} from '@n8n/design-system';
import { useToast } from '@n8n/composables/useToast';
import { useUsersStore } from '@n8n/stores/users.store';
import { workflowsFor } from '@/features/projectSettingsPrototype/data/resources';
import { formatRelative } from '@/features/projectSettingsPrototype/data/time';
import type { SelfHealingConfig } from '@/features/projectSettingsPrototype/data/types';
import {
	CURRENT_USER_ID,
	fullName,
	userById,
} from '@/features/projectSettingsPrototype/data/users';
import { useCan } from '@/features/projectSettingsPrototype/state/session';
import {
	membersOf,
	projectState,
	removeSelfHealingConfig,
	saveSelfHealingConfig,
	seedKey,
	setSelfHealingConfigEnabled,
	store,
} from '@/features/projectSettingsPrototype/state/store';

const props = defineProps<{ projectId: string }>();

const EMPTY_ICON = { type: 'icon', value: 'wand-sparkles' } as const;
const INSTANCE_OFF = 'Workflow suggestions are off for this instance';

const can = useCan();
const toast = useToast();
const usersStore = useUsersStore();

const canEdit = computed(() => can('project:settings:edit'));
/** Self-healing only runs while the instance has the Assistant's workflow suggestions on. */
const instanceOn = computed(() => store.instance.selfHealingEnabled);

const workflows = computed(() => workflowsFor(seedKey(props.projectId)));
const workflowNamesById = computed(
	() => new Map(workflows.value.map((workflow) => [workflow.id, workflow.name])),
);

/** The fixtures' current user stands for whoever is signed in. */
function personName(userId: string): string {
	const fixture = userById(userId);
	const signedIn = userId === CURRENT_USER_ID ? usersStore.currentUser : null;
	if (!signedIn) return fullName(fixture);
	const name = fullName({
		firstName: signedIn.firstName ?? '',
		lastName: signedIn.lastName ?? '',
	}).trim();
	return name || signedIn.email || fullName(fixture);
}

const rows = computed(() =>
	projectState(props.projectId).selfHealing.map((config) => {
		const workflowNames =
			config.scope === 'selected'
				? config.workflowIds.map((id) => workflowNamesById.value.get(id) ?? id)
				: [];
		return {
			config,
			scope:
				config.scope === 'all'
					? 'All workflows'
					: `${workflowNames.length} workflow${workflowNames.length === 1 ? '' : 's'}`,
			workflowNames,
			reviewers: config.reviewerIds.map(personName).join(', '),
			lastActivity:
				config.lastActivityAt === undefined ? undefined : formatRelative(config.lastActivityAt),
		};
	}),
);

function onToggle(config: SelfHealingConfig, enabled: boolean | undefined) {
	setSelfHealingConfigEnabled(props.projectId, config.id, Boolean(enabled));
}

function onRemove(config: SelfHealingConfig) {
	removeSelfHealingConfig(props.projectId, config.id);
	toast.showMessage({ title: 'Configuration removed', type: 'success' });
}

/* ── Add and edit ─────────────────────────────────────────────────────── */

type Scope = SelfHealingConfig['scope'];

interface Form {
	/** Missing for a new configuration. */
	id: string | undefined;
	scope: Scope;
	workflowIds: string[];
	reviewerIds: string[];
	enabled: boolean;
}

const formId = useId();
const dialogOpen = ref(false);
const submitted = ref(false);
const form = reactive<Form>({
	id: undefined,
	scope: 'all',
	workflowIds: [],
	reviewerIds: [],
	enabled: true,
});

/** The project's members, then any reviewer who has left the project since. */
const reviewerOptions = computed(() => {
	const ids = new Set(membersOf(props.projectId).map((member) => member.userId));
	for (const id of form.reviewerIds) ids.add(id);
	return [...ids].map((id) => ({ id, name: personName(id) }));
});

const workflowsError = computed(() =>
	form.scope === 'selected' && form.workflowIds.length === 0
		? 'Select at least one workflow'
		: undefined,
);
const reviewersError = computed(() =>
	form.reviewerIds.length === 0 ? 'Select at least one reviewer' : undefined,
);

function openDialog(config?: SelfHealingConfig) {
	form.id = config?.id;
	form.scope = config?.scope ?? 'all';
	form.workflowIds = [...(config?.workflowIds ?? [])];
	form.reviewerIds = [...(config?.reviewerIds ?? [])];
	form.enabled = config?.enabled ?? true;
	submitted.value = false;
	dialogOpen.value = true;
}

function onScopeChange(scope: string | undefined) {
	form.scope = scope === 'selected' ? 'selected' : 'all';
}

function onSave() {
	submitted.value = true;
	if (workflowsError.value || reviewersError.value) return;
	const isNew = form.id === undefined;
	saveSelfHealingConfig(props.projectId, {
		id: form.id,
		scope: form.scope,
		workflowIds: form.scope === 'selected' ? form.workflowIds : [],
		reviewerIds: form.reviewerIds,
		enabled: form.enabled,
	});
	dialogOpen.value = false;
	toast.showMessage({
		title: isNew ? 'Configuration added' : 'Configuration saved',
		type: 'success',
	});
}
</script>

<template>
	<div :class="$style.page" data-test-id="project-self-healing-page">
		<N8nCallout v-if="!instanceOn" theme="warning" data-test-id="self-healing-instance-off">
			Workflow suggestions are off for this instance, so self-healing doesn't run.
			<template v-if="!can('instance:settings:view')">
				Ask an instance admin to turn them on.
			</template>
			<template v-if="can('instance:settings:view')" #trailingContent>
				<RouterLink
					to="/settings/assistant"
					:class="$style.calloutLink"
					data-test-id="self-healing-assistant-settings-link"
				>
					Open Assistant settings
				</RouterLink>
			</template>
		</N8nCallout>

		<N8nEmptyState
			v-if="rows.length === 0"
			:class="{ [$style.dimmed]: !instanceOn }"
			:icon="EMPTY_ICON"
			heading="Set up self-healing"
			description="Choose which workflows the Assistant investigates when an execution fails, and who reviews the fix it suggests."
			:button-text="canEdit ? 'Add configuration' : undefined"
			:button-disabled="!instanceOn"
			button-icon="plus"
			data-test-id="self-healing-empty"
			@click:button="openDialog()"
		>
			<template #disabledButtonTooltip>{{ INSTANCE_OFF }}</template>
		</N8nEmptyState>

		<N8nSettingsSection v-else data-test-id="self-healing-configurations">
			<template #title>
				<div :class="$style.sectionHeader">
					<N8nHeading tag="h2" step="md" color="text-dark">Configurations</N8nHeading>
					<N8nTooltip v-if="canEdit" :content="INSTANCE_OFF" :disabled="instanceOn" placement="top">
						<N8nButton
							variant="outline"
							size="small"
							:disabled="!instanceOn"
							data-test-id="self-healing-add-configuration"
							@click="openDialog()"
						>
							<template #icon>
								<N8nIcon icon="plus" size="small" />
							</template>
							Add configuration
						</N8nButton>
					</N8nTooltip>
				</div>
			</template>
			<template #description>
				<N8nText size="small" color="text-base">
					Each configuration covers a set of workflows. Its reviewers check the fix the Assistant
					suggests.
				</N8nText>
			</template>

			<div :class="[$style.container, { [$style.dimmed]: !instanceOn }]">
				<div :class="$style.scroll">
					<table :class="$style.table" data-test-id="self-healing-table">
						<thead>
							<tr>
								<th scope="col">Scope</th>
								<th scope="col">Reviewers</th>
								<th scope="col">Last activity</th>
								<th scope="col">Enabled</th>
								<th v-if="canEdit" scope="col" aria-label="Actions"></th>
							</tr>
						</thead>
						<tbody>
							<tr v-for="row in rows" :key="row.config.id" data-test-id="self-healing-row">
								<td :class="$style.scope">
									<N8nTooltip v-if="row.workflowNames.length > 0" placement="top">
										<template #content>
											<ul :class="$style.workflowNames">
												<li v-for="name in row.workflowNames" :key="name">{{ name }}</li>
											</ul>
										</template>
										<span :class="$style.hasDetails" data-test-id="self-healing-scope">
											{{ row.scope }}
										</span>
									</N8nTooltip>
									<span v-else data-test-id="self-healing-scope">{{ row.scope }}</span>
								</td>
								<td>{{ row.reviewers }}</td>
								<td :class="[$style.activity, { [$style.none]: !row.lastActivity }]">
									{{ row.lastActivity ?? 'No activity yet' }}
								</td>
								<td>
									<N8nSwitch
										:model-value="row.config.enabled"
										:disabled="!canEdit || !instanceOn"
										:aria-label="`Self-healing for ${row.scope.toLowerCase()}`"
										data-test-id="self-healing-enabled-switch"
										@update:model-value="onToggle(row.config, $event)"
									/>
								</td>
								<td v-if="canEdit" :class="$style.actionsCell">
									<div :class="$style.actions">
										<N8nTooltip content="Edit configuration" placement="top">
											<N8nIconButton
												icon="pen"
												variant="ghost"
												size="small"
												:disabled="!instanceOn"
												aria-label="Edit configuration"
												data-test-id="self-healing-edit"
												@click="openDialog(row.config)"
											/>
										</N8nTooltip>
										<N8nTooltip content="Remove configuration" placement="top">
											<N8nIconButton
												icon="trash-2"
												variant="ghost"
												size="small"
												:disabled="!instanceOn"
												aria-label="Remove configuration"
												data-test-id="self-healing-remove"
												@click="onRemove(row.config)"
											/>
										</N8nTooltip>
									</div>
								</td>
							</tr>
						</tbody>
					</table>
				</div>
			</div>
		</N8nSettingsSection>

		<N8nDialog
			:open="dialogOpen"
			size="medium"
			:header="form.id === undefined ? 'Add configuration' : 'Edit configuration'"
			data-test-id="self-healing-dialog"
			@update:open="dialogOpen = $event"
		>
			<N8nDialogBody>
				<form :id="formId" :class="$style.form" novalidate @submit.prevent="onSave">
					<N8nInputLabel label="Scope">
						<N8nRadioGroup
							:model-value="form.scope"
							aria-label="Scope"
							data-test-id="self-healing-scope-options"
							@update:model-value="onScopeChange"
						>
							<N8nRadioGroupItem
								value="all"
								label="All workflows"
								description="Every workflow in this project"
								data-test-id="self-healing-scope-all"
							/>
							<N8nRadioGroupItem
								value="selected"
								label="Selected workflows"
								description="Only the workflows you choose"
								data-test-id="self-healing-scope-selected"
							>
								<template v-if="form.scope === 'selected'" #content>
									<div :class="[$style.field, $style.followUp]">
										<N8nSelect
											v-model="form.workflowIds"
											multiple
											filterable
											placeholder="Select workflows"
											data-test-id="self-healing-workflows-select"
										>
											<N8nOption
												v-for="workflow in workflows"
												:key="workflow.id"
												:value="workflow.id"
												:label="workflow.name"
											/>
										</N8nSelect>
										<N8nText
											v-if="submitted && workflowsError"
											size="small"
											color="danger"
											role="alert"
											data-test-id="self-healing-workflows-error"
										>
											{{ workflowsError }}
										</N8nText>
									</div>
								</template>
							</N8nRadioGroupItem>
						</N8nRadioGroup>
					</N8nInputLabel>

					<div :class="$style.field">
						<N8nInputLabel label="Reviewers">
							<N8nSelect
								v-model="form.reviewerIds"
								multiple
								filterable
								placeholder="Select reviewers"
								data-test-id="self-healing-reviewers-select"
							>
								<N8nOption
									v-for="reviewer in reviewerOptions"
									:key="reviewer.id"
									:value="reviewer.id"
									:label="reviewer.name"
								/>
							</N8nSelect>
						</N8nInputLabel>
						<N8nText
							v-if="submitted && reviewersError"
							size="small"
							color="danger"
							role="alert"
							data-test-id="self-healing-reviewers-error"
						>
							{{ reviewersError }}
						</N8nText>
						<N8nText v-else size="small" color="text-light">
							The people who review the fix the Assistant suggests
						</N8nText>
					</div>
				</form>
			</N8nDialogBody>
			<N8nDialogFooter>
				<N8nButton
					variant="outline"
					data-test-id="self-healing-dialog-cancel"
					@click="dialogOpen = false"
				>
					Cancel
				</N8nButton>
				<N8nButton type="submit" :form="formId" data-test-id="self-healing-dialog-save">
					{{ form.id === undefined ? 'Add configuration' : 'Save' }}
				</N8nButton>
			</N8nDialogFooter>
		</N8nDialog>
	</div>
</template>

<style lang="scss" module>
.page {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--lg);
}

.calloutLink {
	flex: none;
	margin-inline-start: var(--spacing--sm);
	white-space: nowrap;
}

.sectionHeader {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: var(--spacing--sm);
	min-height: var(--height--sm);
}

// Self-healing doesn't run while the instance has workflow suggestions off.
.dimmed {
	opacity: 0.6;
}

// The same box as an N8nSettingsRowGroup, so tables and settings rows read as one family.
.container {
	border: var(--border-width, 1px) solid var(--border-color--subtle);
	border-radius: var(--radius--xs);
	background-color: var(--background--surface);
	overflow: clip;
}

.scroll {
	overflow-x: auto;
}

.table {
	width: 100%;
	border-collapse: collapse;
	color: var(--text-color);
	font-size: var(--font-size--sm);
	line-height: var(--line-height--lg);

	th,
	td {
		padding: var(--spacing--xs) var(--spacing--sm);
		text-align: start;
		vertical-align: middle;
	}

	th {
		border-block-end: var(--border-width, 1px) solid var(--border-color--subtle);
		background-color: var(--background--subtle);
		color: var(--text-color--subtle);
		font-size: var(--font-size--2xs);
		font-weight: var(--font-weight--medium);
		white-space: nowrap;
	}

	tbody tr:not(:last-child) td {
		border-block-end: var(--border-width, 1px) solid var(--border-color--subtle);
	}
}

.scope {
	font-weight: var(--font-weight--medium);
	white-space: nowrap;
}

// Says there's more behind the text: the workflows' names, in a tooltip.
.hasDetails {
	text-decoration: underline dotted var(--text-color--subtler);
	text-underline-offset: var(--spacing--4xs);
	cursor: default;
}

.workflowNames {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--5xs);
	margin: 0;
	padding: 0;
	list-style: none;
}

.activity {
	white-space: nowrap;
}

.none {
	color: var(--text-color--subtler);
}

.actionsCell {
	// Only as wide as its buttons.
	width: 0;
}

.actions {
	display: flex;
	justify-content: flex-end;
	gap: var(--spacing--4xs);
}

.form {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--md);
}

.field {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--4xs);
}

.followUp {
	margin-block-start: var(--spacing--2xs);
}
</style>
