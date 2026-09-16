<script setup lang="ts">
import {
	N8nButton,
	N8nCheckbox,
	N8nDialog,
	N8nDialogFooter,
	N8nDialogHeader,
	N8nDialogTitle,
	N8nText,
} from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { ref, watch } from 'vue';

const props = defineProps<{
	open: boolean;
	loading: boolean;
}>();

const emit = defineEmits<{
	cancel: [];
	confirm: [deleteExternalResource: boolean];
}>();

const i18n = useI18n();
const deleteExternalResource = ref(true);

watch(
	() => props.open,
	(open) => {
		if (open) deleteExternalResource.value = true;
	},
);
</script>

<template>
	<N8nDialog
		:open="open"
		size="medium"
		stacked
		:show-close-button="!loading"
		@update:open="(value) => !value && !loading && emit('cancel')"
	>
		<N8nDialogHeader>
			<N8nDialogTitle>
				{{ i18n.baseText('agents.channels.slack.managed.remove.title') }}
			</N8nDialogTitle>
		</N8nDialogHeader>
		<div :class="$style.content">
			<N8nText size="medium">
				{{ i18n.baseText('agents.channels.slack.managed.remove.description') }}
			</N8nText>
			<N8nCheckbox
				v-model="deleteExternalResource"
				:disabled="loading"
				data-testid="slack-managed-remove-delete-app"
			>
				<template #label>
					<N8nText size="medium">
						{{ i18n.baseText('agents.channels.slack.managed.remove.deleteApp') }}
						<N8nText size="medium" :bold="true">
							{{ i18n.baseText('agents.channels.slack.managed.remove.messagesUnaffected') }}
						</N8nText>
					</N8nText>
				</template>
			</N8nCheckbox>
		</div>
		<N8nDialogFooter>
			<div :class="$style.actions">
				<N8nButton variant="outline" :disabled="loading" @click="emit('cancel')">
					{{ i18n.baseText('generic.cancel') }}
				</N8nButton>
				<N8nButton
					variant="destructive"
					:loading="loading"
					data-testid="slack-managed-remove-confirm"
					@click="emit('confirm', deleteExternalResource)"
				>
					{{ i18n.baseText('agents.channels.slack.managed.remove.confirm') }}
				</N8nButton>
			</div>
		</N8nDialogFooter>
	</N8nDialog>
</template>

<style module lang="scss">
.content {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--sm);
	margin-top: var(--spacing--md);
}

.actions {
	display: flex;
	justify-content: flex-end;
	gap: var(--spacing--xs);
	width: 100%;
}
</style>
