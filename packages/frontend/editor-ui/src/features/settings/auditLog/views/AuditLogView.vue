<script lang="ts" setup>
import { onMounted, ref } from 'vue';
import { DateTime } from 'luxon';
import { useI18n } from '@n8n/i18n';
import { useDocumentTitle } from '@/app/composables/useDocumentTitle';
import { useDebounce } from '@n8n/composables/useDebounce';
import { DEBOUNCE_TIME } from '@/app/constants';
import { N8nDataTableServer, N8nHeading, N8nInput, N8nText, N8nTooltip } from '@n8n/design-system';
import type { TableHeader } from '@n8n/design-system/components/N8nDataTableServer';
import type { AuditLogEventRecord } from '@n8n/rest-api-client/api/audit-log';
import { useAuditLogStore } from '../auditLog.store';

const i18n = useI18n();
const documentTitle = useDocumentTitle();
const { debounce } = useDebounce();
const store = useAuditLogStore();

const loading = ref(false);

const headers = ref<Array<TableHeader<AuditLogEventRecord>>>([
	{
		title: i18n.baseText('settings.auditLog.column.ts'),
		key: 'ts',
		width: 200,
		value: (row) => DateTime.fromISO(row.ts).toFormat('yyyy-LL-dd HH:mm:ss'),
		disableSort: true,
	},
	{
		title: i18n.baseText('settings.auditLog.column.eventName'),
		key: 'eventName',
		width: 320,
		disableSort: true,
	},
	{
		title: i18n.baseText('settings.auditLog.column.payload'),
		key: 'payload',
		disableSort: true,
	},
]);

const formatPayload = (payload: unknown) => JSON.stringify(payload);

const load = async () => {
	loading.value = true;
	try {
		await store.fetchEvents();
	} finally {
		loading.value = false;
	}
};

const onPrefixInput = debounce(
	async (value: string) => {
		await store.setPrefix(value);
	},
	{ debounceTime: DEBOUNCE_TIME.INPUT.SEARCH },
);

const onUpdateOptions = async () => {
	loading.value = true;
	try {
		await store.applyTableOptions();
	} finally {
		loading.value = false;
	}
};

onMounted(async () => {
	documentTitle.set(i18n.baseText('settings.auditLog.title'));
	await load();
});
</script>

<template>
	<div :class="$style.container" data-test-id="audit-log-settings">
		<N8nHeading size="2xlarge">{{ i18n.baseText('settings.auditLog.title') }}</N8nHeading>
		<N8nText color="text-light" class="mt-2xs mb-l">
			{{ i18n.baseText('settings.auditLog.description') }}
		</N8nText>

		<N8nInput
			:model-value="store.prefix"
			:placeholder="i18n.baseText('settings.auditLog.filter.placeholder')"
			clearable
			class="mb-s"
			data-test-id="audit-log-prefix-filter"
			@update:model-value="onPrefixInput"
		/>

		<N8nDataTableServer
			v-model:page="store.tableOptions.page"
			v-model:items-per-page="store.tableOptions.itemsPerPage"
			:headers="headers"
			:items="store.events"
			:items-length="store.count"
			:loading="loading"
			:page-sizes="[25, 50, 100]"
			@update:options="onUpdateOptions"
		>
			<template #[`item.payload`]="{ item }">
				<N8nTooltip :content="formatPayload(item.payload)" placement="top">
					<code :class="$style.payload">{{ formatPayload(item.payload) }}</code>
				</N8nTooltip>
			</template>
		</N8nDataTableServer>
	</div>
</template>

<style lang="scss" module>
.container {
	display: flex;
	flex-direction: column;
	padding-bottom: var(--spacing--2xl);
}

.payload {
	display: block;
	max-width: 100%;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
	font-family: var(--font-family--monospace);
}
</style>
