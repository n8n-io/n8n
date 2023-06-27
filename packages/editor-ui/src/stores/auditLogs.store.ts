import { computed, reactive } from 'vue';
import { defineStore } from 'pinia';
import type { AuditLog } from '@/Interface';
import { EnterpriseEditionFeature } from '@/constants';
import { useRootStore, useSettingsStore } from '@/stores';
import * as auditLogsApi from '@/api/auditLogs.api';

export const useAuditLogsStore = defineStore('auditLogs', () => {
	const rootStore = useRootStore();
	const settingsStore = useSettingsStore();

	const items = reactive<AuditLog[]>([]);

	const isEnterpriseAuditLogsFeatureEnabled = computed(() =>
		settingsStore.isEnterpriseFeatureEnabled(EnterpriseEditionFeature.AuditLogs),
	);

	const getAuditLogs = async () => {
		const data = await auditLogsApi.getAuditLogs(rootStore.getRestApiContext);
		items.splice(0, items.length, ...data);
	};

	return {
		isEnterpriseAuditLogsFeatureEnabled,
		items,
		getAuditLogs,
	};
});
