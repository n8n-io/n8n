<script setup lang="ts">
import type { AppDescribedBinding, AppResponse } from '@n8n/api-types';
import { N8nIconTextButton } from '@n8n/design-system';
import { capabilities, capabilityRegistry } from '@n8n/frontend-module-sdk';
import { useI18n } from '@n8n/i18n';
import { useRootStore } from '@n8n/stores/useRootStore';
import { useUsersStore } from '@n8n/stores/users.store';
import { computed } from 'vue';

import { getAppBindings } from '../../apps.api';

// The form reads these query parameters into its hidden fields.
const BINDING_COUNT_PARAMS: Record<AppDescribedBinding['kind'], string> = {
	workflow: 'workflows',
	dataTable: 'dataTables',
	agent: 'agents',
};

const { app } = defineProps<{ app: AppResponse }>();

const i18n = useI18n();
const rootStore = useRootStore();
const usersStore = useUsersStore();
const readFormUrl = capabilityRegistry.tryUse(capabilities.appsFeedbackFormUrl);

const formUrl = computed(() => {
	const value = readFormUrl?.();
	if (!value) return undefined;
	try {
		const url = new URL(value);
		return url.protocol === 'https:' ? url : undefined;
	} catch {
		return undefined;
	}
});

async function buildFormUrl(base: URL) {
	const url = new URL(base);
	const params = url.searchParams;
	const user = usersStore.currentUser;
	params.set('source', 'apps');
	if (user) params.set('userId', user.id);
	if (user?.email) params.set('email', user.email);
	params.set('instanceId', rootStore.instanceId);
	params.set('appId', app.id);
	try {
		const { bindings } = await getAppBindings(rootStore.restApiContext, app.projectId, app.id);
		for (const param of Object.values(BINDING_COUNT_PARAMS)) params.set(param, '0');
		for (const { kind } of bindings) {
			const param = BINDING_COUNT_PARAMS[kind];
			params.set(param, String(Number(params.get(param)) + 1));
		}
	} catch {
		// The form still opens. It only misses the connection counts.
	}
	return url.toString();
}

async function openForm() {
	if (!formUrl.value) return;
	// Open the tab before the request, so the browser does not block it as a pop-up.
	const tab = window.open('about:blank', '_blank');
	if (!tab) return;
	tab.opener = null;
	tab.location.href = await buildFormUrl(formUrl.value);
}
</script>

<template>
	<div v-if="formUrl" :class="$style.footer">
		<N8nIconTextButton
			icon="message-square"
			:aria-label="i18n.baseText('apps.preview.feedback.ariaLabel')"
			data-test-id="app-preview-feedback"
			data-attr="app-preview-feedback"
			@click="openForm"
		>
			{{ i18n.baseText('apps.preview.feedback') }}
		</N8nIconTextButton>
	</div>
</template>

<style lang="scss" module>
.footer {
	display: flex;
	justify-content: flex-end;
	flex-shrink: 0;
	// The top padding matches the toolbar's, so the button sits as far from the frame as the toolbar buttons do.
	padding: var(--spacing--2xs) var(--spacing--xs) var(--spacing--xs);
}
</style>
