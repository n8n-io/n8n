<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import {
	N8nOption,
	N8nSelect,
	N8nSettingsRow,
	N8nSettingsRowGroup,
	N8nSettingsSection,
} from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { useToast } from '@n8n/composables/useToast';

import {
	useOpenWorkflowInAssistantStore,
	type DefaultEditor,
} from '../stores/openWorkflowInAssistant.store';

const store = useOpenWorkflowInAssistantStore();
const i18n = useI18n();
const toast = useToast();

const rootEl = ref<HTMLElement | null>(null);
const highlighted = ref(false);

const selected = computed<DefaultEditor>({
	get: () => store.resolvedDefaultEditor,
	set: (value) => {
		store.saveDefaultEditor(value).catch((error: unknown) => {
			toast.showError(
				error,
				i18n.baseText('experiments.openWorkflowInAssistant.setting.saveError'),
			);
		});
	},
});

onMounted(() => {
	// Consume-on-read: the notification link arms this once, so a reload or
	// back-navigation cannot replay the highlight.
	if (!store.consumeSettingHighlight()) return;
	rootEl.value?.scrollIntoView({ block: 'center' });
	highlighted.value = true;
	setTimeout(() => (highlighted.value = false), 2400);
});
</script>

<template>
	<div
		v-if="store.isTreatment"
		ref="rootEl"
		:class="{ [$style.highlighted]: highlighted }"
		data-test-id="default-editor-setting"
	>
		<N8nSettingsSection>
			<N8nSettingsRowGroup>
				<N8nSettingsRow
					:title="i18n.baseText('experiments.openWorkflowInAssistant.setting.label')"
					:description="i18n.baseText('experiments.openWorkflowInAssistant.setting.description')"
				>
					<template #action>
						<N8nSelect v-model="selected" size="small" data-test-id="default-editor-select">
							<N8nOption
								value="assistant"
								:label="i18n.baseText('experiments.openWorkflowInAssistant.setting.assistant')"
							/>
							<N8nOption
								value="manual"
								:label="i18n.baseText('experiments.openWorkflowInAssistant.setting.manual')"
							/>
						</N8nSelect>
					</template>
				</N8nSettingsRow>
			</N8nSettingsRowGroup>
		</N8nSettingsSection>
	</div>
</template>

<style lang="scss" module>
.highlighted {
	border-radius: var(--radius);
	animation: flash 1.2s ease-in-out 2;
}

@keyframes flash {
	50% {
		background-color: var(--color--foreground--tint-1);
	}
}
</style>
