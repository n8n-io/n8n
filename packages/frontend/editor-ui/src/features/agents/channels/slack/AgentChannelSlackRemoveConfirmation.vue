<script setup lang="ts">
import { N8nButton, N8nCheckbox, N8nText } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { ref, watch } from 'vue';
import AgentModal from '../../components/modals/AgentModal.vue';
import { useAgentEditing } from '../../composables/useAgentEditing';

const props = defineProps<{
	open: boolean;
	loading: boolean;
}>();

const emit = defineEmits<{
	cancel: [];
	confirm: [deleteExternalResource: boolean];
}>();

const i18n = useI18n();
const { isEditingLocked } = useAgentEditing();
const deleteExternalResource = ref(true);

function confirm() {
	if (!props.loading && !isEditingLocked.value) emit('confirm', deleteExternalResource.value);
}

watch(
	() => props.open,
	(open) => {
		if (open) deleteExternalResource.value = true;
	},
);
</script>

<template>
	<AgentModal
		:open="open"
		size="medium"
		stacked
		:title="i18n.baseText('agents.channels.slack.managed.remove.title')"
		:busy="loading"
		@update:open="(value) => !value && !loading && emit('cancel')"
	>
		<div :class="$style.content">
			<N8nText size="medium">
				{{ i18n.baseText('agents.channels.slack.managed.remove.description') }}
			</N8nText>
			<N8nCheckbox
				:model-value="deleteExternalResource"
				:disabled="loading || isEditingLocked"
				data-testid="slack-managed-remove-delete-app"
				@update:model-value="!isEditingLocked && (deleteExternalResource = $event)"
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
		<template #footerActions>
			<N8nButton
				variant="destructive"
				:loading="loading"
				:disabled="isEditingLocked"
				data-testid="slack-managed-remove-confirm"
				@click="confirm"
			>
				{{ i18n.baseText('agents.channels.slack.managed.remove.confirm') }}
			</N8nButton>
		</template>
	</AgentModal>
</template>

<style module lang="scss">
.content {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--sm);
}
</style>
