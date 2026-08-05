import { defineStore } from 'pinia';
import { ref } from 'vue';
import { useRootStore } from '@n8n/stores/useRootStore';
import * as auditLogApi from '@n8n/rest-api-client/api/audit-log';
import type { AuditLogEventRecord } from '@n8n/rest-api-client/api/audit-log';
import type { TableOptions } from '@n8n/design-system/components/N8nDataTableServer';

const DEFAULT_PAGE_SIZE = 25;
const initialTableOptions = (): TableOptions => ({
	page: 0,
	itemsPerPage: DEFAULT_PAGE_SIZE,
	sortBy: [],
});

// ponytail: local store, no STORES enum entry (PoC debug page).
export const useAuditLogStore = defineStore('auditLog', () => {
	const rootStore = useRootStore();

	const events = ref<AuditLogEventRecord[]>([]);
	const count = ref(0);
	const prefix = ref('');
	const tableOptions = ref<TableOptions>(initialTableOptions());

	const fetchEvents = async () => {
		const opts = tableOptions.value;
		const trimmed = prefix.value.trim();
		const response = await auditLogApi.getAuditLogEvents(rootStore.restApiContext, {
			take: opts.itemsPerPage,
			skip: Math.max(0, opts.page) * opts.itemsPerPage,
			...(trimmed ? { prefix: trimmed } : {}),
		});
		events.value = response.data;
		count.value = response.count;
	};

	const setPrefix = async (value: string) => {
		if (prefix.value === value) return;
		prefix.value = value;
		tableOptions.value.page = 0;
		await fetchEvents();
	};

	// DTS already wrote the new page/itemsPerPage via v-model; just refetch.
	const applyTableOptions = async () => {
		await fetchEvents();
	};

	return { events, count, prefix, tableOptions, fetchEvents, setPrefix, applyTableOptions };
});
