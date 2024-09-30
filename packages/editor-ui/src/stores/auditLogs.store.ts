import { computed } from 'vue';
import { defineStore } from 'pinia';
import { EnterpriseEditionFeature } from '@/constants';
import { useSettingsStore } from '@/stores/settings.store';

export const useAuditLogsStore = defineStore('auditLogs', () => {
	const settingsStore = useSettingsStore();

	const isEnterpriseAuditLogsFeatureEnabled = computed(
		() => settingsStore.isEnterpriseFeatureEnabled[EnterpriseEditionFeature.AuditLogs],
	);

	return {
		isEnterpriseAuditLogsFeatureEnabled,
	};
});
