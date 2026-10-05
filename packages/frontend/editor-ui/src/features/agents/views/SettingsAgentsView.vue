<script setup lang="ts">
import { onMounted, ref } from 'vue';
import type { AgentsSettingsDto } from '@n8n/api-types';
import {
	N8nButton,
	N8nLoading,
	N8nPreviewBadge,
	N8nSettingsLayout,
	N8nSettingsPageHeader,
	N8nSettingsRow,
	N8nSettingsRowGroup,
	N8nSettingsSection,
	N8nSwitch,
} from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { useToast } from '@n8n/composables/useToast';
import { useRootStore } from '@n8n/stores/useRootStore';
import { useSettingsStore } from '@n8n/stores/settings.store';
import { useDocumentTitle } from '@/app/composables/useDocumentTitle';
import AgentsSandboxSettings from '../components/AgentsSandboxSettings.vue';
import { getAgentsSettings, updateAgentsSettings } from '../composables/useAgentApi';

const i18n = useI18n();
const toast = useToast();
const rootStore = useRootStore();
const settingsStore = useSettingsStore();
const documentTitle = useDocumentTitle();
const settings = ref<AgentsSettingsDto | null>(null);
const isLoading = ref(true);
const isSaving = ref(false);

function applySettings(value: AgentsSettingsDto) {
	settings.value = value;
	if (settingsStore.moduleSettings.agents) {
		settingsStore.moduleSettings.agents.enabled = value.enabled;
	}
}

async function loadSettings() {
	isLoading.value = true;
	try {
		applySettings(await getAgentsSettings(rootStore.restApiContext));
	} catch (error) {
		toast.showError(error, i18n.baseText('settings.agents.loadError'));
	} finally {
		isLoading.value = false;
	}
}

async function saveEnabled(enabled: boolean) {
	isSaving.value = true;
	try {
		applySettings(await updateAgentsSettings(rootStore.restApiContext, { enabled }));
	} catch (error) {
		toast.showError(error, i18n.baseText('settings.agents.saveError'));
	} finally {
		isSaving.value = false;
	}
}

onMounted(async () => {
	documentTitle.set(i18n.baseText('settings.agents'));
	await loadSettings();
});
</script>

<template>
	<N8nSettingsLayout data-test-id="agents-settings">
		<N8nSettingsPageHeader
			:title="i18n.baseText('settings.agents')"
			:description="i18n.baseText('settings.agents.description')"
			docs-url="https://docs.n8n.io/build/build-and-manage-agents"
			:docs-label="i18n.baseText('settings.agents.docsLabel')"
			:docs-leading-text="i18n.baseText('settings.agents.docsLeadingText')"
		>
			<template #titleTrailing>
				<N8nPreviewBadge size="medium" />
			</template>
		</N8nSettingsPageHeader>
		<N8nLoading v-if="isLoading" :rows="1" :shrink-last="false" />
		<N8nSettingsSection v-else-if="settings">
			<N8nSettingsRowGroup>
				<N8nSettingsRow
					:title="i18n.baseText('settings.agents.enable.label')"
					:description="i18n.baseText('settings.agents.enable.description')"
					:max-description-lines="3"
				>
					<template #action>
						<N8nSwitch
							:model-value="settings.enabled"
							:disabled="isSaving"
							:aria-label="i18n.baseText('settings.agents.enable.label')"
							@update:model-value="saveEnabled"
						/>
					</template>
				</N8nSettingsRow>
			</N8nSettingsRowGroup>
		</N8nSettingsSection>
		<N8nButton v-else variant="outline" @click="loadSettings">
			{{ i18n.baseText('generic.retry') }}
		</N8nButton>
		<AgentsSandboxSettings v-if="settings" />
	</N8nSettingsLayout>
</template>
