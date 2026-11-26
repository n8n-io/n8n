<script setup lang="ts">
import { useToast } from '@n8n/composables/useToast';
import { N8nSettingsEnableRow } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { useRootStore } from '@n8n/stores/useRootStore';
import { onMounted, ref } from 'vue';

import {
	getPromotionProjectEnvironmentsSettings,
	updatePromotionProjectEnvironmentsSettings,
} from '../promotionsSettings.api';

const i18n = useI18n();
const toast = useToast();
const rootStore = useRootStore();

const enabled = defineModel<boolean>('enabled', { default: false });
// Stays true when loading fails, so the switch never offers a guessed value as saved.
const busy = ref(true);

onMounted(async () => {
	try {
		enabled.value = (
			await getPromotionProjectEnvironmentsSettings(rootStore.publicApiContext)
		).enabled;
		busy.value = false;
	} catch (error) {
		toast.showError(
			error,
			i18n.baseText('settings.promotions.projectEnvironments.toast.error.load'),
			{ message: i18n.baseText('settings.promotions.projectEnvironments.toast.error.description') },
		);
	}
});

async function save(value: boolean) {
	busy.value = true;
	try {
		enabled.value = (
			await updatePromotionProjectEnvironmentsSettings(rootStore.publicApiContext, {
				enabled: value,
			})
		).enabled;
		toast.showMessage({
			title: i18n.baseText('settings.promotions.projectAccess.toast.saved'),
			type: 'success',
		});
	} catch (error) {
		// The server can save the setting and the response can still fail, so show what it stored.
		enabled.value = await getPromotionProjectEnvironmentsSettings(rootStore.publicApiContext)
			.then((settings) => settings.enabled)
			.catch(() => enabled.value);
		toast.showError(
			error,
			i18n.baseText('settings.promotions.projectEnvironments.toast.error.save'),
			{ message: i18n.baseText('settings.promotions.projectEnvironments.toast.error.description') },
		);
	} finally {
		busy.value = false;
	}
}
</script>

<template>
	<N8nSettingsEnableRow
		:title="i18n.baseText('settings.promotions.projectEnvironments.title')"
		:description="i18n.baseText('settings.promotions.projectEnvironments.description')"
		:enabled="enabled"
		:disabled="busy"
		switch-test-id="promotion-project-environments-switch"
		@update:enabled="save"
	/>
</template>
