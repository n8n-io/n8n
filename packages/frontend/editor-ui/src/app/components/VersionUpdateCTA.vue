<script setup lang="ts">
import { useVersionsStore } from '@/app/stores/versions.store';
import { useI18n } from '@n8n/i18n';
import { usePageRedirectionHelper } from '@/app/composables/usePageRedirectionHelper';
import { useUIStore } from '@/app/stores/ui.store';
import { useTelemetry } from '@/app/composables/useTelemetry';
import { VERSIONS_MODAL_KEY } from '@/app/constants';

import { N8nMenuItem } from '@n8n/design-system';
interface Props {
	disabled?: boolean;
	tooltipText?: string;
}

const props = withDefaults(defineProps<Props>(), {
	disabled: false,
	tooltipText: undefined,
});

const i18n = useI18n();
const versionsStore = useVersionsStore();
const uiStore = useUIStore();
const pageRedirectionHelper = usePageRedirectionHelper();
const telemetry = useTelemetry();

const openUpdatesPanel = () => {
	uiStore.openModal(VERSIONS_MODAL_KEY);
};

const onUpdateClick = async () => {
	telemetry.track('User clicked on update button', {
		source: 'main-sidebar',
	});

	await pageRedirectionHelper.goToVersions();
};
</script>

<template>
	<N8nMenuItem
		data-test-id="version-update-next-versions-link"
		:item="{
			id: 'version-update-cta',
			icon: 'status-warning',

			label: i18n.baseText('whatsNew.versionsBehind', {
				interpolate: {
					count: versionsStore.nextVersions.length > 99 ? '99+' : versionsStore.nextVersions.length,
				},
			}),
		}"
		@click="openUpdatesPanel"
	/>
</template>
