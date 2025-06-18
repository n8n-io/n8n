<script setup lang="ts">
import { computed } from 'vue';
import { useVersionsStore } from '@/stores/versions.store';
import { N8nButton } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';

const i18n = useI18n();
const versionsStore = useVersionsStore();

const nextVersions = computed(() => versionsStore.nextVersions);

const onUpdate = () => {
	console.log('Update button clicked');
};
</script>

<template>
	<div :class="$style.container">
		<N8nText :size="'small'" :class="$style.text" :color="'text-base'">
			{{
				i18n.baseText('mainSidebar.whatsNew.versionsBehind', {
					interpolate: {
						count: nextVersions.length > 99 ? '99+' : nextVersions.length,
					},
				})
			}}
		</N8nText>
		<N8nButton
			:class="$style.button"
			:label="i18n.baseText('mainSidebar.whatsNew.update')"
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
