<script setup lang="ts">
import { ref, computed } from 'vue';
import { N8nActionDropdown, N8nButton } from '@n8n/design-system';
import { useRootStore } from '@n8n/stores/useRootStore';
import { useToast } from '@/app/composables/useToast';
import { publishAgent, unpublishAgent } from '../composables/useAgentApi';
import type { AgentResource } from '../types';

const props = defineProps<{
	agent: AgentResource | null;
	projectId: string;
	agentId: string;
}>();

const emit = defineEmits<{
	published: [agent: AgentResource];
	unpublished: [agent: AgentResource];
}>();

const rootStore = useRootStore();
const { showMessage, showError } = useToast();

const publishing = ref(false);

const isPublished = computed(() => props.agent?.publishedVersion != null);

const hasUnpublishedChanges = computed(() => {
	if (!props.agent?.publishedVersion) return false;
	return props.agent.versionId !== props.agent.activeVersionId;
});

const unpublishActions = [{ id: 'unpublish', label: 'Unpublish' }];

async function onPublishClick() {
	if (publishing.value) return;
	publishing.value = true;
	try {
		const updated = await publishAgent(rootStore.restApiContext, props.projectId, props.agentId);
		emit('published', updated);
		showMessage({ title: 'Agent published', type: 'success' });
	} catch (error) {
		showError(error, 'Failed to publish agent');
	} finally {
		publishing.value = false;
	}
}

async function onDropdownSelect(action: string) {
	if (action !== 'unpublish') return;
	if (publishing.value) return;
	publishing.value = true;
	try {
		const updated = await unpublishAgent(rootStore.restApiContext, props.projectId, props.agentId);
		emit('unpublished', updated);
		showMessage({ title: 'Agent unpublished', type: 'success' });
	} catch (error) {
		showError(error, 'Failed to unpublish agent');
	} finally {
		publishing.value = false;
	}
}
</script>

<template>
	<template v-if="!isPublished">
		<N8nButton
			type="secondary"
			size="small"
			:loading="publishing"
			data-testid="publish-agent-button"
			@click="onPublishClick"
		>
			Publish
		</N8nButton>
	</template>
	<template v-else-if="hasUnpublishedChanges">
		<N8nButton
			type="secondary"
			size="small"
			:loading="publishing"
			data-testid="republish-agent-button"
			@click="onPublishClick"
		>
			Republish
		</N8nButton>
		<N8nActionDropdown
			:items="unpublishActions"
			data-testid="agent-publish-dropdown"
			@select="onDropdownSelect"
		/>
	</template>
	<template v-else>
		<span :class="$style.publishedBadge" data-testid="agent-published-badge">Published</span>
		<N8nActionDropdown
			:items="unpublishActions"
			data-testid="agent-publish-dropdown"
			@select="onDropdownSelect"
		/>
	</template>
</template>

<style module>
.publishedBadge {
	font-size: var(--font-size--xs);
	font-weight: var(--font-weight--bold);
	color: var(--color--success);
	padding: var(--spacing--5xs) var(--spacing--3xs);
	border: var(--border-width) var(--border-style) var(--color--success);
	border-radius: var(--radius);
}
</style>
