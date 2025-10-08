<script setup lang="ts">
import { useToast } from '@/composables/useToast';
import { useUsersStore } from '@/stores/users.store';
import {
	N8nButton,
	N8nCheckbox,
	N8nIconButton,
	N8nPopoverReka,
	N8nText,
	N8nTooltip,
} from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { useCssVar } from '@vueuse/core';
import { type CheckboxValueType } from 'element-plus';
import type { IAiAssistantUserSettings } from 'n8n-workflow';
import { ref, computed } from 'vue';
import { useAssistantStore } from '@/features/assistant/assistant.store';

const i18n = useI18n();
const toast = useToast();

const usersStore = useUsersStore();
const assistantStore = useAssistantStore();

const zIndex = useCssVar('--z-index-ask-assistant-chat');
const isOpen = ref(false);
const loading = ref(false);
const localState = ref<IAiAssistantUserSettings>({
	allowAssistantToSendParameterValues: false,
	allowAssistantToSendExpressions: false,
});

const currentUserSettings = computed(() => usersStore.currentUser?.settings?.aiAssistant);

const isDirty = computed(() => {
	return (
		localState.value.allowAssistantToSendParameterValues !==
			(currentUserSettings.value?.allowAssistantToSendParameterValues ?? false) ||
		localState.value.allowAssistantToSendExpressions !==
			(currentUserSettings.value?.allowAssistantToSendExpressions ?? false)
	);
});

const onAllowParametersChange = (value: CheckboxValueType) => {
	if (value === false) {
		// If user disables sending node parameters, also disable sending resolved expressions
		localState.value.allowAssistantToSendExpressions = false;
	}
};

const onPopoverOpenChange = (open: boolean) => {
	isOpen.value = open;
	if (open) {
		// Reset to current settings when opening the menu
		localState.value = currentUserSettings.value
			? { ...currentUserSettings.value }
			: { allowAssistantToSendParameterValues: false, allowAssistantToSendExpressions: false };
	}
};

const onSaveClick = async () => {
	try {
		loading.value = true;
		await usersStore.updateUserSettings({
			aiAssistant: {
				...localState.value,
			},
		});
		isOpen.value = false;
		assistantStore.workflowDataStale = true;
	} catch (error) {
		toast.showError(error, i18n.baseText('aiAssistant.privacySettings.save.error'));
	} finally {
		loading.value = false;
	}
};
</script>

<template>
	<div :class="$style['container']">
		<N8nTooltip
			:content="i18n.baseText('aiAssistant.privacySettings.trigger.tooltip')"
			:disabled="isOpen"
		>
			<div>
				<N8nPopoverReka v-model:open="isOpen" :z-index="zIndex" @update:open="onPopoverOpenChange">
					<template #trigger>
						<div :class="$style['trigger-container']">
							<N8nIconButton icon="settings" type="tertiary" size="large" />
						</div>
					</template>
					<template #content>
						<div :class="$style['menu-content']">
							<N8nText size="small">
								{{ i18n.baseText('aiAssistant.privacySettings.heading') }}
							</N8nText>
							<div :class="$style.form">
								<N8nCheckbox
									v-model="localState.allowAssistantToSendParameterValues"
									:label="
										i18n.baseText('aiAssistant.privacySettings.allowSendingNodeParameters.label')
									"
									:tooltip-text="
										i18n.baseText('aiAssistant.privacySettings.allowSendingNodeParameters.tooltip')
									"
									label-size="small"
									@update:model-value="onAllowParametersChange"
								/>
								<N8nCheckbox
									v-model="localState.allowAssistantToSendExpressions"
									:label="
										i18n.baseText(
											'aiAssistant.privacySettings.allowSendingResolvedExpressions.label',
										)
									"
									:tooltip-text="
										i18n.baseText(
											'aiAssistant.privacySettings.allowSendingResolvedExpressions.tooltip',
										)
									"
									:disabled="!localState.allowAssistantToSendParameterValues"
									label-size="small"
								/>
							</div>
							<N8nButton
								type="primary"
								size="small"
								:disabled="!isDirty || loading"
								:loading="loading"
								@click="onSaveClick"
							>
								{{ i18n.baseText('generic.unsavedWork.confirmMessage.confirmButtonText') }}
							</N8nButton>
						</div>
					</template>
				</N8nPopoverReka>
			</div>
		</N8nTooltip>
	</div>
</template>

<style module lang="scss">
.container {
	padding: var(--spacing-2xs);
}

.trigger-container button {
	border: none;
}

.menu-content {
	padding: var(--spacing-m);
	display: flex;
	flex-direction: column;
}

.form {
	display: flex;
	flex-direction: column;
	padding: var(--spacing-xs) var(--spacing-xs) var(--spacing-3xs);
}
</style>
