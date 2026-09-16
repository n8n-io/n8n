<script setup lang="ts">
import {
	N8nButton,
	N8nCheckbox,
	N8nDialog,
	N8nDialogFooter,
	N8nDialogHeader,
	N8nDialogTitle,
	N8nInput,
	N8nInputLabel,
	N8nOption,
	N8nRadioGroup,
	N8nRadioGroupItem,
	N8nSelect,
	N8nText,
} from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { computed, ref, watch } from 'vue';

import { useWorkflowsListStore } from '@/app/stores/workflowsList.store';

import { useSelfHealingStore } from '../selfHealing.store';
import type {
	SelfHealingAutonomy,
	SelfHealingConfig,
	SelfHealingConfigInput,
} from '../selfHealing.types';

const props = defineProps<{
	open: boolean;
	projectId: string;
	/** The configuration to edit; `null` creates a new one. */
	config: SelfHealingConfig | null;
}>();

const emit = defineEmits<{
	'update:open': [value: boolean];
	saved: [config: SelfHealingConfig];
}>();

const i18n = useI18n();
const store = useSelfHealingStore();
const workflowsListStore = useWorkflowsListStore();

const AUTONOMY_OPTIONS: SelfHealingAutonomy[] = ['review', 'deploy'];

function emptyForm(): SelfHealingConfigInput {
	return {
		name: '',
		autonomy: 'review',
		excludedWorkflowIds: [],
		customInstructions: '',
		notifications: { emailOnReview: true, emailOnDeploy: true, slackChannel: null },
		status: 'active',
	};
}

function formFrom(config: SelfHealingConfig): SelfHealingConfigInput {
	return {
		name: config.name,
		autonomy: config.autonomy,
		excludedWorkflowIds: [...config.excludedWorkflowIds],
		customInstructions: config.customInstructions,
		notifications: { ...config.notifications },
		status: config.status,
	};
}

const form = ref<SelfHealingConfigInput>(emptyForm());
const slackEnabled = ref(false);
const loadingWorkflows = ref(false);

const isEditing = computed(() => props.config !== null);
const canSave = computed(() => form.value.name.trim().length > 0);

const projectWorkflows = computed(() =>
	workflowsListStore.allWorkflows.filter(
		(workflow) => workflow.homeProject?.id === props.projectId && !workflow.isArchived,
	),
);

const enrolledCount = computed(() =>
	Math.max(projectWorkflows.value.length - form.value.excludedWorkflowIds.length, 0),
);

async function loadProjectWorkflows() {
	loadingWorkflows.value = true;
	try {
		await workflowsListStore.fetchAllWorkflows(props.projectId);
	} catch {
		// The opt-out list is a convenience; the form works without it.
	} finally {
		loadingWorkflows.value = false;
	}
}

watch(
	() => props.open,
	(open) => {
		if (!open) return;
		form.value = props.config ? formFrom(props.config) : emptyForm();
		slackEnabled.value = form.value.notifications.slackChannel !== null;
		void loadProjectWorkflows();
	},
	{ immediate: true },
);

function onSlackToggle(enabled: boolean) {
	slackEnabled.value = enabled;
	form.value.notifications.slackChannel = enabled
		? (form.value.notifications.slackChannel ?? '')
		: null;
}

function close() {
	emit('update:open', false);
}

function save() {
	if (!canSave.value) return;

	const input: SelfHealingConfigInput = {
		...form.value,
		name: form.value.name.trim(),
		customInstructions: form.value.customInstructions.trim(),
		notifications: {
			...form.value.notifications,
			slackChannel: slackEnabled.value
				? (form.value.notifications.slackChannel?.trim() ?? '') || null
				: null,
		},
	};

	const saved = props.config
		? store.updateConfig(props.projectId, props.config.id, input)
		: store.createConfig(props.projectId, input);

	if (saved) emit('saved', saved);
	close();
}
</script>

<template>
	<N8nDialog :open="open" size="medium" @update:open="close">
		<N8nDialogHeader>
			<N8nDialogTitle>
				{{
					i18n.baseText(
						isEditing ? 'selfHealing.dialog.title.edit' : 'selfHealing.dialog.title.create',
					)
				}}
			</N8nDialogTitle>
		</N8nDialogHeader>

		<form :class="$style.form" data-test-id="self-healing-config-dialog" @submit.prevent="save">
			<N8nInputLabel
				input-name="self-healing-name"
				:label="i18n.baseText('selfHealing.dialog.name.label')"
				required
			>
				<N8nInput
					id="self-healing-name"
					v-model="form.name"
					:maxlength="80"
					:placeholder="i18n.baseText('selfHealing.dialog.name.placeholder')"
					data-test-id="self-healing-name-input"
				/>
			</N8nInputLabel>

			<N8nInputLabel :label="i18n.baseText('selfHealing.dialog.autonomy.label')">
				<N8nRadioGroup
					v-model="form.autonomy"
					orientation="vertical"
					:class="$style.radios"
					data-test-id="self-healing-autonomy-radio"
				>
					<N8nRadioGroupItem
						v-for="option in AUTONOMY_OPTIONS"
						:key="option"
						:value="option"
						:label="i18n.baseText(`selfHealing.autonomy.${option}.label`)"
						:description="i18n.baseText(`selfHealing.autonomy.${option}.description`)"
						:data-test-id="`self-healing-autonomy-${option}`"
					/>
				</N8nRadioGroup>
			</N8nInputLabel>

			<N8nInputLabel
				input-name="self-healing-opt-out"
				:label="i18n.baseText('selfHealing.dialog.scope.label')"
			>
				<N8nText size="small" color="text-light" :class="$style.hint">
					{{ i18n.baseText('selfHealing.dialog.scope.description') }}
				</N8nText>
				<N8nSelect
					id="self-healing-opt-out"
					v-model="form.excludedWorkflowIds"
					multiple
					filterable
					collapse-tags
					:collapse-tags-tooltip="true"
					:teleported="false"
					:loading="loadingWorkflows"
					:placeholder="i18n.baseText('selfHealing.dialog.scope.optOut.placeholder')"
					data-test-id="self-healing-opt-out-select"
				>
					<N8nOption
						v-for="workflow in projectWorkflows"
						:key="workflow.id"
						:label="workflow.name"
						:value="workflow.id"
					/>
				</N8nSelect>
				<N8nText
					v-if="projectWorkflows.length > 0"
					size="xsmall"
					color="text-light"
					:class="$style.hint"
					data-test-id="self-healing-scope-summary"
				>
					{{
						i18n.baseText('selfHealing.dialog.scope.optOut.summary', {
							interpolate: {
								enrolled: String(enrolledCount),
								excluded: String(form.excludedWorkflowIds.length),
							},
						})
					}}
				</N8nText>
			</N8nInputLabel>

			<N8nInputLabel
				input-name="self-healing-instructions"
				:label="i18n.baseText('selfHealing.dialog.instructions.label')"
			>
				<N8nInput
					id="self-healing-instructions"
					v-model="form.customInstructions"
					type="textarea"
					:rows="4"
					:maxlength="1000"
					:placeholder="i18n.baseText('selfHealing.dialog.instructions.placeholder')"
					data-test-id="self-healing-instructions-input"
				/>
				<N8nText size="xsmall" color="text-light" :class="$style.hint">
					{{ i18n.baseText('selfHealing.dialog.instructions.hint') }}
				</N8nText>
			</N8nInputLabel>

			<N8nInputLabel :label="i18n.baseText('selfHealing.dialog.notifications.label')">
				<div :class="$style.checkboxes">
					<N8nCheckbox
						v-model="form.notifications.emailOnReview"
						:label="i18n.baseText('selfHealing.dialog.notifications.emailOnReview')"
						data-test-id="self-healing-notify-review"
					/>
					<N8nCheckbox
						v-model="form.notifications.emailOnDeploy"
						:label="i18n.baseText('selfHealing.dialog.notifications.emailOnDeploy')"
						data-test-id="self-healing-notify-deploy"
					/>
					<N8nCheckbox
						:model-value="slackEnabled"
						:label="i18n.baseText('selfHealing.dialog.notifications.slack')"
						data-test-id="self-healing-notify-slack"
						@update:model-value="onSlackToggle"
					/>
					<N8nInput
						v-if="slackEnabled"
						:model-value="form.notifications.slackChannel ?? ''"
						size="small"
						:class="$style.slackInput"
						:placeholder="
							i18n.baseText('selfHealing.dialog.notifications.slackChannel.placeholder')
						"
						data-test-id="self-healing-slack-channel-input"
						@update:model-value="form.notifications.slackChannel = $event"
					/>
				</div>
			</N8nInputLabel>

			<N8nDialogFooter>
				<N8nButton
					type="button"
					variant="outline"
					data-test-id="self-healing-dialog-cancel"
					@click="close"
				>
					{{ i18n.baseText('generic.cancel') }}
				</N8nButton>
				<N8nButton type="submit" :disabled="!canSave" data-test-id="self-healing-dialog-save">
					{{ i18n.baseText(isEditing ? 'generic.save' : 'generic.create') }}
				</N8nButton>
			</N8nDialogFooter>
		</form>
	</N8nDialog>
</template>

<style lang="scss" module>
.form {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--md);
}

.radios {
	margin-top: var(--spacing--3xs);
}

.hint {
	display: block;
	margin-top: var(--spacing--3xs);
	margin-bottom: var(--spacing--3xs);
}

.checkboxes {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
	margin-top: var(--spacing--3xs);
}

.slackInput {
	max-width: 280px;
	margin-left: var(--spacing--lg);
}
</style>
