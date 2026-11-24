<script lang="ts" setup>
/**
 * The "Saved logins" section of the personal settings. It shows only when the cloud browser is
 * available, and opens the list of saved logins. When the admin turned saved logins off, it
 * shows only while the user still has saved logins, so the user can delete them.
 */
import {
	N8nCallout,
	N8nIconButton,
	N8nSettingsRow,
	N8nSettingsRowGroup,
	N8nSettingsSection,
} from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { useSettingsStore } from '@n8n/stores/settings.store';
import { useRootStore } from '@n8n/stores/useRootStore';
import { computed, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import { useInstanceAiCloudBrowserExperiment } from '@/experiments/instanceAiCloudBrowser/useInstanceAiCloudBrowserExperiment';

import { SAVED_LOGINS_QUERY } from '../constants';
import { fetchSavedLogins } from '../instanceAi.api';
import SavedLoginsDialog from './SavedLoginsDialog.vue';

const i18n = useI18n();
const route = useRoute();
const router = useRouter();
const settingsStore = useSettingsStore();
const rootStore = useRootStore();
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

const isSavedLoginsEnabled = computed(
	() => settingsStore.moduleSettings?.['instance-ai']?.cloudBrowserSavedLoginsEnabled ?? false,
);
const hasSavedLogins = ref(false);
const isSectionShown = computed(
	() => isCloudBrowserAvailable.value && (isSavedLoginsEnabled.value || hasSavedLogins.value),
);

const isDialogOpen = ref(false);

// Only needed when the saved logins feature is off. A failed load hides the section.
async function checkForSavedLogins() {
	if (!isCloudBrowserAvailable.value || isSavedLoginsEnabled.value) return;
	try {
		const { savedLogins } = await fetchSavedLogins(rootStore.restApiContext);
		hasSavedLogins.value = savedLogins.length > 0;
	} catch {
		hasSavedLogins.value = false;
	}
}

// The user can delete their last saved login in the dialog.
watch(isDialogOpen, (isOpen) => {
	if (!isOpen) void checkForSavedLogins();
});

// The live view links here to open the list at once.
onMounted(() => {
	void checkForSavedLogins();
	if (route.query[SAVED_LOGINS_QUERY] === undefined) return;
	isDialogOpen.value = true;
	const { [SAVED_LOGINS_QUERY]: _, ...query } = route.query;
	void router.replace({ query });
});
</script>

<template>
	<N8nSettingsSection
		v-if="isSectionShown"
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
		<N8nCallout
			v-if="!isSavedLoginsEnabled"
			theme="warning"
			data-test-id="saved-logins-turned-off-notice"
		>
			{{ i18n.baseText('instanceAi.cloudBrowser.savedLogins.turnedOff') }}
		</N8nCallout>
		<SavedLoginsDialog v-model:open="isDialogOpen" />
	</N8nSettingsSection>
</template>
