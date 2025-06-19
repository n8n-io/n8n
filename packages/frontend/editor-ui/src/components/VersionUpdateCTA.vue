<script setup lang="ts">
import { computed } from 'vue';
import { useVersionsStore } from '@/stores/versions.store';
import { N8nButton, N8nLink } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { usePageRedirectionHelper } from '@/composables/usePageRedirectionHelper';
import { useUIStore } from '@/stores/ui.store';
import { VERSIONS_MODAL_KEY } from '@/constants';

const i18n = useI18n();
const versionsStore = useVersionsStore();
const uiStore = useUIStore();
const pageRedirectionHelper = usePageRedirectionHelper();

const nextVersions = computed(() => versionsStore.nextVersions);

const openUpdatesPanel = () => {
	uiStore.openModal(VERSIONS_MODAL_KEY);
};

const onUpdate = async () => {
	await pageRedirectionHelper.goToVersions();
};
</script>

<template>
	<div :class="$style.container">
		<N8nLink size="small" theme="text" @click="openUpdatesPanel">
			{{
				i18n.baseText('whatsNew.versionsBehind', {
					interpolate: {
						count: nextVersions.length > 99 ? '99+' : nextVersions.length,
					},
				})
			}}
		</N8nLink>

		<N8nButton
			:class="$style.button"
			:label="i18n.baseText('whatsNew.update')"
			data-test-id="version-update-cta-button"
			size="mini"
			@click="onUpdate"
		/>
	</div>
</template>

<style lang="scss" module>
.container {
	display: flex;
	flex-direction: column;
	justify-content: space-between;
	gap: var(--spacing-2xs);
	padding: var(--spacing-2xs) var(--spacing-xs);
	margin-left: var(--spacing-s);
	margin-bottom: var(--spacing-3xs);
	border-radius: var(--border-radius-base);
	border: var(--border-base);
	border-color: var(--color-foreground-base);
	background: var(--color-background-light-base);
}

.button {
	width: 100%;
}
</style>
