<script lang="ts" setup>
/**
 * The "Saved logins" section of the personal settings. It shows only when the cloud browser is
 * available, and opens the list of saved logins.
 */
import {
	N8nIconButton,
	N8nSettingsRow,
	N8nSettingsRowGroup,
	N8nSettingsSection,
} from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { useSettingsStore } from '@n8n/stores/settings.store';
import { computed, onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import { useInstanceAiCloudBrowserExperiment } from '@/experiments/instanceAiCloudBrowser/useInstanceAiCloudBrowserExperiment';

import { SAVED_LOGINS_QUERY } from '../constants';
import SavedLoginsDialog from './SavedLoginsDialog.vue';

const i18n = useI18n();
const route = useRoute();
const router = useRouter();
const settingsStore = useSettingsStore();
const { isEnabled: isCloudBrowserExperimentEnabled } = useInstanceAiCloudBrowserExperiment();

// The cloud browser runs here: the checks of the cloud browser row in the n8n Assistant settings,
// and the admin turned it on.
const isCloudBrowserAvailable = computed(() => {
	const instanceAiSettings = settingsStore.moduleSettings?.['instance-ai'];
	return (
		isCloudBrowserExperimentEnabled.value &&
		settingsStore.isAiGatewayEnabled &&
		settingsStore.isAiGatewayCloudUbbEnabled &&
		!settingsStore.isMultiMain &&
		(instanceAiSettings?.enabled ?? false) &&
		(instanceAiSettings?.cloudBrowserEnabled ?? false)
	);
});

const isDialogOpen = ref(false);

// The live view links here to open the list at once.
onMounted(() => {
	if (route.query[SAVED_LOGINS_QUERY] === undefined) return;
	isDialogOpen.value = true;
	const { [SAVED_LOGINS_QUERY]: _, ...query } = route.query;
	void router.replace({ query });
});
</script>

<template>
	<N8nSettingsSection
		v-if="isCloudBrowserAvailable"
		:title="i18n.baseText('instanceAi.cloudBrowser.savedLogins.sectionTitle')"
		data-test-id="saved-logins-section"
	>
		<N8nSettingsRowGroup>
			<N8nSettingsRow
				:title="i18n.baseText('instanceAi.cloudBrowser.savedLogins.title')"
				:description="i18n.baseText('instanceAi.cloudBrowser.savedLogins.description')"
			>
				<template #action>
					<N8nIconButton
						icon="external-link"
						variant="ghost"
						size="medium"
						:aria-label="i18n.baseText('instanceAi.cloudBrowser.savedLogins.open')"
						data-test-id="saved-logins-open"
						@click="isDialogOpen = true"
					/>
				</template>
			</N8nSettingsRow>
		</N8nSettingsRowGroup>
		<SavedLoginsDialog v-model:open="isDialogOpen" />
	</N8nSettingsSection>
</template>
