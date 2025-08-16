<script setup lang="ts">
import { useVersionsStore } from '@/stores/versions.store';
import { N8nButton, N8nLink } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { usePageRedirectionHelper } from '@/composables/usePageRedirectionHelper';
import { useUIStore } from '@/stores/ui.store';
import { useTelemetry } from '@/composables/useTelemetry';
import { VERSIONS_MODAL_KEY } from '@/constants';

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
	<div :class="$style.container">
		<N8nLink
			size="small"
			:class="$style.link"
			data-test-id="version-update-next-versions-link"
			@click="openUpdatesPanel"
		>
			{{
				i18n.baseText('whatsNew.versionsBehind', {
					interpolate: {
						count:
							versionsStore.nextVersions.length > 99 ? '99+' : versionsStore.nextVersions.length,
					},
				})
			}}{{ ', ' }}
		</N8nLink>

		<N8nButton
			:class="$style.button"
			:label="i18n.baseText('whatsNew.update')"
			data-test-id="version-update-cta-button"
			size="mini"
			text
			@click="onUpdateClick"
		/>
	</div>
</template>

<style lang="scss" module>
.container {
	margin-top: var(--spacing-xs);
	padding: var(--spacing-xs) var(--spacing-xs);
	border-radius: var(--border-radius-base);
	background: var(--color-background-base);
	width: 100%;
}

.button,
.link {
	display: inline;
	padding: 0;
}
</style>
