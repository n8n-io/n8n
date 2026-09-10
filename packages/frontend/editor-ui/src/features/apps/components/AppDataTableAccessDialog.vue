<script setup lang="ts">
import type { DataTablePermission } from '@n8n/api-types';
import { N8nButton, N8nCheckbox, N8nDialog, N8nDialogFooter } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { computed, ref, watch } from 'vue';

const props = defineProps<{
	open: boolean;
	name: string;
}>();

const emit = defineEmits<{
	cancel: [];
	connect: [permissions: DataTablePermission[]];
}>();

const i18n = useI18n();
const readAccess = ref(true);
const writeAccess = ref(true);

watch(
	() => props.open,
	(open) => {
		if (open) {
			readAccess.value = true;
			writeAccess.value = true;
		}
	},
);

const permissions = computed<DataTablePermission[]>(() => [
	...(readAccess.value ? (['read'] as const) : []),
	...(writeAccess.value ? (['write'] as const) : []),
]);
</script>

<template>
	<N8nDialog
		:open="open"
		size="small"
		:header="i18n.baseText('apps.connections.access.dialog.title', { interpolate: { name } })"
		:description="i18n.baseText('apps.connections.access.dialog.note')"
		data-test-id="app-data-table-access-dialog"
		@update:open="(value) => !value && emit('cancel')"
	>
		<div :class="$style.options">
			<N8nCheckbox
				v-model="readAccess"
				:label="i18n.baseText('apps.connections.access.read')"
				data-test-id="app-data-table-access-read"
			/>
			<N8nCheckbox
				v-model="writeAccess"
				:label="i18n.baseText('apps.connections.access.write')"
				data-test-id="app-data-table-access-write"
			/>
		</div>
		<N8nDialogFooter>
			<N8nButton variant="outline" @click="emit('cancel')">
				{{ i18n.baseText('generic.cancel') }}
			</N8nButton>
			<N8nButton
				:disabled="permissions.length === 0"
				data-test-id="app-data-table-access-connect"
				@click="emit('connect', permissions)"
			>
				{{ i18n.baseText('apps.connections.connect') }}
			</N8nButton>
		</N8nDialogFooter>
	</N8nDialog>
</template>

<style lang="scss" module>
.options {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
	margin-top: var(--spacing--sm);
}
</style>
