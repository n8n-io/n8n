<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { AGENT_SKILL_NAME_MAX_LENGTH } from '@n8n/api-types';
import {
	N8nButton,
	N8nDialog,
	N8nDialogDescription,
	N8nDialogFooter,
	N8nDialogHeader,
	N8nDialogTitle,
	N8nInput,
	N8nInputLabel,
	N8nText,
} from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';

const props = defineProps<{
	open: boolean;
	/** `name` names the latest version. `saveWithName` saves the edits as a new, named version. */
	mode: 'name' | 'saveWithName';
	latestVersion: number;
	/** The current name of the latest version, to edit it. */
	initialLabel?: string | null;
	loading?: boolean;
}>();

const emit = defineEmits<{
	cancel: [];
	/** Null removes the name. */
	submit: [label: string | null];
}>();

const i18n = useI18n();
const label = ref('');

watch(
	() => props.open,
	(open) => {
		if (open) label.value = props.mode === 'name' ? (props.initialLabel ?? '') : '';
	},
	{ immediate: true },
);

// A new version needs a name here, or the plain Save would do. Naming accepts an empty
// value, which removes the name.
const canSubmit = computed(() => props.mode === 'name' || label.value.trim() !== '');

function onSubmit() {
	if (!canSubmit.value || props.loading) return;
	const trimmed = label.value.trim();
	emit('submit', trimmed === '' ? null : trimmed);
}
</script>

<template>
	<N8nDialog
		:open="open"
		size="medium"
		stacked
		:show-close-button="!loading"
		@update:open="(value) => !value && !loading && emit('cancel')"
	>
		<div data-testid="skill-version-name-dialog">
			<N8nDialogHeader>
				<N8nDialogTitle>
					{{
						i18n.baseText(
							mode === 'name'
								? 'settings.context.skills.versions.nameDialog.title.name'
								: 'settings.context.skills.versions.nameDialog.title.saveWithName',
						)
					}}
				</N8nDialogTitle>
			</N8nDialogHeader>
			<N8nDialogDescription as-child>
				<N8nText size="medium" color="text-base" tag="p" :class="$style.description">
					{{
						mode === 'name'
							? i18n.baseText('settings.context.skills.versions.nameDialog.description.name', {
									interpolate: { version: String(latestVersion) },
								})
							: i18n.baseText(
									'settings.context.skills.versions.nameDialog.description.saveWithName',
								)
					}}
				</N8nText>
			</N8nDialogDescription>
			<form :class="$style.form" @submit.prevent="onSubmit">
				<N8nInputLabel
					:label="i18n.baseText('settings.context.skills.versions.nameDialog.label')"
					size="small"
				>
					<N8nInput
						v-model="label"
						:maxlength="AGENT_SKILL_NAME_MAX_LENGTH"
						:placeholder="i18n.baseText('settings.context.skills.versions.nameDialog.placeholder')"
						:disabled="loading"
						autofocus
						data-testid="skill-version-name-input"
					/>
				</N8nInputLabel>
			</form>
			<N8nDialogFooter>
				<div :class="$style.actions">
					<N8nButton
						variant="outline"
						:disabled="loading"
						data-testid="skill-version-name-cancel"
						@click="emit('cancel')"
					>
						{{ i18n.baseText('settings.context.skills.versions.nameDialog.cancel') }}
					</N8nButton>
					<N8nButton
						variant="solid"
						:loading="loading"
						:disabled="!canSubmit"
						data-testid="skill-version-name-submit"
						@click="onSubmit"
					>
						{{ i18n.baseText('settings.context.skills.versions.nameDialog.save') }}
					</N8nButton>
				</div>
			</N8nDialogFooter>
		</div>
	</N8nDialog>
</template>

<style module lang="scss">
.description {
	margin: var(--spacing--xs) 0 0;
}

.form {
	margin-top: var(--spacing--md);
}

.actions {
	display: flex;
	justify-content: flex-end;
	gap: var(--spacing--xs);
	width: 100%;
}
</style>
