<script setup lang="ts">
import type { AppResponse } from '@n8n/api-types';
import { useTelemetry } from '@n8n/composables/useTelemetry';
import { useToast } from '@n8n/composables/useToast';
import { N8nActionToggle, useMessage } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { ResponseError } from '@n8n/rest-api-client';
import { useRootStore } from '@n8n/stores/useRootStore';
import { TELEMETRY_EVENT } from '@n8n/telemetry';
import { computed } from 'vue';

import { deleteApp } from '../apps.api';
import { getAppPermissions } from '../apps.permissions';

const props = defineProps<{ app: AppResponse; showCode?: boolean }>();

const emit = defineEmits<{ deleted: [appId: string] }>();

const i18n = useI18n();
const toast = useToast();
const message = useMessage();
const rootStore = useRootStore();
const telemetry = useTelemetry();

const canDelete = computed(() => getAppPermissions(props.app.projectId).canDelete);
const actions = computed(() => [
	...(props.showCode ? [{ label: i18n.baseText('apps.actions.showCode'), value: 'showCode' }] : []),
	...(canDelete.value ? [{ label: i18n.baseText('generic.delete'), value: 'delete' }] : []),
]);

function onShowCode() {
	telemetry.track(TELEMETRY_EVENT.APPS.USER_CLICKED_SHOW_APP_CODE, {
		app_id: props.app.id,
		project_id: props.app.projectId,
	});
	toast.showMessage({
		type: 'info',
		title: i18n.baseText('apps.showCode.comingSoon.title'),
		message: i18n.baseText('apps.showCode.comingSoon.message'),
	});
}

async function onAction(action: string) {
	if (action === 'showCode') {
		onShowCode();
		return;
	}
	if (action !== 'delete') return;

	const answer = await message.confirm(
		i18n.baseText('apps.delete.message', { interpolate: { name: props.app.name } }),
		i18n.baseText('apps.delete.title'),
		{
			confirmButtonText: i18n.baseText('generic.delete'),
			cancelButtonText: i18n.baseText('generic.cancel'),
			type: 'warning',
		},
	);
	if (answer !== 'confirm') return;

	try {
		await deleteApp(rootStore.restApiContext, props.app.projectId, props.app.id);
		emit('deleted', props.app.id);
	} catch (error) {
		if (error instanceof ResponseError && error.httpStatusCode === 404) {
			emit('deleted', props.app.id);
			return;
		}
		toast.showError(error, i18n.baseText('apps.delete.error'));
	}
}
</script>

<template>
	<N8nActionToggle
		v-if="actions.length > 0"
		:actions="actions"
		theme="dark"
		data-test-id="app-actions"
		@action="onAction"
	/>
</template>
