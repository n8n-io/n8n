<script setup lang="ts">
import { N8nHeading, N8nIcon, N8nText } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { onMounted } from 'vue';
import { useDocumentTitle } from '@/app/composables/useDocumentTitle';
import { useToast } from '@/app/composables/useToast';
import AgentBuilderModelSection from '../components/settings/AgentBuilderModelSection.vue';
import { useAgentBuilderSettingsStore } from '../agentBuilderSettings.store';

const i18n = useI18n();
const documentTitle = useDocumentTitle();
const toast = useToast();
const store = useAgentBuilderSettingsStore();

onMounted(async () => {
	documentTitle.set(i18n.baseText('settings.agentBuilder.title'));
	try {
		await store.fetch();
	} catch (error) {
		toast.showError(error, i18n.baseText('settings.agentBuilder.loadError'));
	}
});
</script>

<template>
	<div :class="$style.container" data-test-id="agent-builder-settings">
		<header :class="$style.header">
			<N8nHeading :class="$style.pageTitle" size="xlarge" class="mb-2xs">
				{{ i18n.baseText('settings.agentBuilder.title') }}
			</N8nHeading>
			<N8nText size="medium" color="text-light">
				{{ i18n.baseText('settings.agentBuilder.description') }}
			</N8nText>
		</header>

		<div v-if="store.isLoading" :class="$style.loading">
			<N8nIcon icon="spinner" spin />
		</div>

		<div v-else :class="$style.card">
			<AgentBuilderModelSection />
		</div>
	</div>
</template>

<style lang="scss" module>
.container {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--md);
	max-width: 720px;
}

.header {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--3xs);
}

.pageTitle {
	margin-bottom: var(--spacing--3xs);
}

.loading {
	display: flex;
	justify-content: center;
	padding: var(--spacing--xl);
}

.card {
	border: var(--border);
	border-radius: var(--radius--lg);
	padding: var(--spacing--md);
}
</style>
