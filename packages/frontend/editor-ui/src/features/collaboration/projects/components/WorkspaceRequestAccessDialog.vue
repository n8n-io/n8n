<script lang="ts" setup>
/**
 * PROTOTYPE (workspaces): asks the admins of a private workspace for access.
 * Nothing is sent yet. The parent only records the request as pending.
 */
import type { WorkspaceListItem } from '@n8n/api-types';
import {
	N8nButton,
	N8nDialog,
	N8nDialogFooter,
	N8nIcon,
	N8nInput,
	N8nInputLabel,
	N8nOption,
	N8nSelect,
	N8nText,
} from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { computed, ref, watch } from 'vue';

const REASON_MAX_LENGTH = 500;

const props = defineProps<{ workspace: WorkspaceListItem | null }>();
const emit = defineEmits<{
	close: [];
	submit: [payload: { workspaceId: string; role: string; reason: string }];
}>();

const i18n = useI18n();

const role = ref('project:viewer');
const reason = ref('');
const sending = ref(false);

const roleOptions = computed(() => [
	{
		value: 'project:viewer',
		label: i18n.baseText('workspaces.request.role.viewer'),
		description: i18n.baseText('workspaces.request.role.viewer.description'),
	},
	{
		value: 'project:editor',
		label: i18n.baseText('workspaces.request.role.editor'),
		description: i18n.baseText('workspaces.request.role.editor.description'),
	},
]);

const selectedRole = computed(() =>
	roleOptions.value.find((option) => option.value === role.value),
);

const reviewers = computed(() => {
	const names = props.workspace?.adminNames ?? [];
	return names.length > 0
		? names.join(', ')
		: i18n.baseText('workspaces.request.reviewers.fallback');
});

const isValid = computed(() => reason.value.trim().length > 0);

watch(
	() => props.workspace?.id,
	() => {
		role.value = 'project:viewer';
		reason.value = '';
		sending.value = false;
	},
);

async function onSubmit() {
	if (!props.workspace || !isValid.value) return;
	sending.value = true;
	// Pretend to send, so the button shows a loading state like a real request.
	await new Promise((resolve) => setTimeout(resolve, 500));
	emit('submit', {
		workspaceId: props.workspace.id,
		role: role.value,
		reason: reason.value.trim(),
	});
	sending.value = false;
}
</script>

<template>
	<N8nDialog
		:open="workspace !== null"
		:header="
			i18n.baseText('workspaces.request.title', { interpolate: { name: workspace?.name ?? '' } })
		"
		:description="i18n.baseText('workspaces.request.description')"
		size="medium"
		data-test-id="workspace-request-access-dialog"
		@update:open="!$event && emit('close')"
	>
		<div :class="$style.form">
			<N8nInputLabel :label="i18n.baseText('workspaces.request.role.label')" color="text-dark">
				<N8nSelect
					v-model="role"
					size="large"
					:teleported="false"
					data-test-id="workspace-request-role-select"
				>
					<N8nOption
						v-for="option in roleOptions"
						:key="option.value"
						:value="option.value"
						:label="option.label"
					/>
				</N8nSelect>
				<N8nText size="small" color="text-light" :class="$style.hint">
					{{ selectedRole?.description }}
				</N8nText>
			</N8nInputLabel>

			<N8nInputLabel
				:label="i18n.baseText('workspaces.request.reason.label')"
				color="text-dark"
				required
			>
				<N8nInput
					v-model="reason"
					type="textarea"
					:rows="4"
					:maxlength="REASON_MAX_LENGTH"
					:placeholder="i18n.baseText('workspaces.request.reason.placeholder')"
					data-test-id="workspace-request-reason-input"
				/>
			</N8nInputLabel>
			<N8nText size="small" color="text-light" :class="$style.counter">
				{{ reason.length }} / {{ REASON_MAX_LENGTH }}
			</N8nText>

			<div :class="$style.reviewers">
				<N8nIcon icon="users" size="small" />
				<N8nText size="small" color="text-light">
					{{ i18n.baseText('workspaces.request.reviewers', { interpolate: { names: reviewers } }) }}
				</N8nText>
			</div>
		</div>
		<N8nDialogFooter>
			<N8nButton
				variant="subtle"
				:label="i18n.baseText('generic.cancel')"
				data-test-id="workspace-request-cancel-button"
				@click="emit('close')"
			/>
			<N8nButton
				icon="send"
				:loading="sending"
				:disabled="!isValid"
				:label="i18n.baseText('workspaces.request.submit')"
				data-test-id="workspace-request-submit-button"
				@click="onSubmit"
			/>
		</N8nDialogFooter>
	</N8nDialog>
</template>

<style lang="scss" module>
.form {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--sm);
	padding-bottom: var(--spacing--sm);
}

.hint {
	display: block;
	padding-top: var(--spacing--4xs);
}

.counter {
	align-self: flex-end;
	margin-top: calc(-1 * var(--spacing--xs));
}

.reviewers {
	display: flex;
	align-items: center;
	gap: var(--spacing--3xs);
	padding: var(--spacing--xs) var(--spacing--sm);
	border-radius: var(--radius);
	background-color: var(--color--background--light-2);
	color: var(--color--text--tint-1);
}
</style>
