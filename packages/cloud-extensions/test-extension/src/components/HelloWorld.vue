<script setup lang="ts">
import { useI18n } from '@n8n/i18n';
import { useUIStore } from '@/app/stores/ui.store';
import { N8nButton, N8nText } from '@n8n/design-system';

const i18n = useI18n();
const uiStore = useUIStore();

const openModal = () => {
	uiStore.openModal('@n8n/ce-test-extension.demo');
};
</script>

<template>
	<div :class="$style.container">
		<N8nText tag="h3">{{ i18n.baseText('ce.testExtension.title') }}</N8nText>
		<N8nText tag="p" size="small">{{ i18n.baseText('ce.testExtension.description') }}</N8nText>
		<div :class="$style.actions">
			<N8nButton type="secondary" size="small" @click="openModal">
				{{ i18n.baseText('ce.testExtension.openModal') }}
			</N8nButton>
			<router-link to="/extension-demo" :class="$style.link">
				{{ i18n.baseText('ce.testExtension.viewPage') }}
			</router-link>
		</div>
	</div>
</template>

<style module>
.container {
	padding: var(--spacing--sm);
}

.actions {
	display: flex;
	gap: var(--spacing--xs);
	align-items: center;
	margin-top: var(--spacing--xs);
}

.link {
	color: var(--color--primary);
	font-size: var(--font-size--sm);
}
</style>
