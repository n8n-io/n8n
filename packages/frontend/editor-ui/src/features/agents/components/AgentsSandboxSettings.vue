<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import {
	N8nButton,
	N8nLink,
	N8nLoading,
	N8nSettingsRow,
	N8nSettingsRowGroup,
	N8nSettingsSection,
	N8nText,
} from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { useToast } from '@n8n/composables/useToast';
import { useSettingsStore } from '@n8n/stores/settings.store';
import { useCredentialsStore } from '@/features/credentials/credentials.store';
import ConnectionDialog from '@/features/ai/instanceAi/components/settings/ConnectionDialog.vue';
import SandboxSettingsRow from '@/features/ai/instanceAi/components/settings/SandboxSettingsRow.vue';
import { useInstanceAiSettingsStore } from '@/features/ai/instanceAi/instanceAiSettings.store';

const i18n = useI18n();
const toast = useToast();
const settingsStore = useSettingsStore();
const credentialsStore = useCredentialsStore();
const sandboxStore = useInstanceAiSettingsStore();
const isLoading = ref(true);
const hasLoaded = ref(false);
const dialogOpen = ref(false);

const hasSettingsModule = computed(() => settingsStore.isModuleActive('instance-ai'));
const isCloudManaged = computed(
	() => settingsStore.isCloudDeployment || sandboxStore.isCloudManaged,
);
const connectionDescription = computed(() => {
	if (isCloudManaged.value) return i18n.baseText('instanceAi.onboarding.sandbox.description');
	if (!hasSettingsModule.value) return i18n.baseText('settings.agents.sandbox.moduleDisabled');
	return i18n.baseText('settings.agents.sandbox.loadError');
});

async function loadSettings() {
	isLoading.value = true;
	try {
		if (hasSettingsModule.value && !isCloudManaged.value) {
			const [settingsLoaded] = await Promise.all([
				sandboxStore.fetch(),
				credentialsStore.fetchCredentialTypes(false),
			]);
			hasLoaded.value = settingsLoaded && sandboxStore.settings !== null;
		}
	} catch (error) {
		toast.showError(error, i18n.baseText('settings.agents.sandbox.loadError'));
	} finally {
		isLoading.value = false;
	}
}

async function enableEnvironmentSandbox() {
	sandboxStore.setField('sandboxEnabled', true);
	await sandboxStore.save();
}

onMounted(loadSettings);
</script>

<template>
	<N8nSettingsSection
		:title="i18n.baseText('settings.agents.sandbox.title')"
		:description="i18n.baseText('settings.agents.sandbox.description')"
	>
		<N8nLoading v-if="isLoading" :rows="1" :shrink-last="false" />
		<N8nSettingsRowGroup v-else>
			<SandboxSettingsRow
				v-if="hasSettingsModule && !isCloudManaged && hasLoaded"
				@configure="dialogOpen = true"
				@enable="enableEnvironmentSandbox"
			/>
			<N8nSettingsRow
				v-else
				:title="i18n.baseText('settings.n8nAgent.sandbox.label')"
				:description="connectionDescription"
				:max-description-lines="3"
			>
				<template #action>
					<N8nText v-if="isCloudManaged" size="small" color="text-light">
						{{ i18n.baseText('settings.agents.sandbox.cloudManaged') }}
					</N8nText>
					<N8nLink
						v-else-if="!hasSettingsModule"
						href="https://docs.n8n.io/deploy/host-n8n/configure-n8n/set-up-n8n-assistant#enable-agents"
						target="_blank"
					>
						{{ i18n.baseText('settings.agents.docsLabel') }}
					</N8nLink>
					<N8nButton v-else variant="outline" @click="loadSettings">
						{{ i18n.baseText('generic.retry') }}
					</N8nButton>
				</template>
			</N8nSettingsRow>
		</N8nSettingsRowGroup>
		<ConnectionDialog v-if="dialogOpen" v-model:open="dialogOpen" kind="sandbox" />
	</N8nSettingsSection>
</template>
