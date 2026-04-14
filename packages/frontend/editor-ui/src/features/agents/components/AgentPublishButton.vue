<script setup lang="ts">
import { ref, computed } from 'vue';
import { N8nActionDropdown, N8nButton, N8nIconButton } from '@n8n/design-system';
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

type AgentPublishState = 'not-published' | 'published-no-changes' | 'published-with-changes';

const publishState = computed((): AgentPublishState => {
	if (!props.agent?.publishedVersion) return 'not-published';
	if (props.agent.versionId !== props.agent.activeVersionId) return 'published-with-changes';
	return 'published-no-changes';
});

const buttonConfig = computed(() => {
	switch (publishState.value) {
		case 'not-published':
			return { text: 'Publish', enabled: true, showIndicator: false, indicatorClass: '' };
		case 'published-with-changes':
			return { text: 'Publish', enabled: true, showIndicator: true, indicatorClass: 'changes' };
		case 'published-no-changes':
			return {
				text: 'Published',
				enabled: false,
				showIndicator: true,
				indicatorClass: 'published',
			};
	}
});

const dropdownActions = computed(() => [
	{
		id: 'publish',
		label: 'Publish',
		disabled: !buttonConfig.value.enabled || publishing.value,
	},
	{
		id: 'unpublish',
		label: 'Unpublish',
		disabled: !props.agent?.publishedVersion || publishing.value,
		divided: true,
	},
]);

async function onPublishClick() {
	if (publishing.value || !buttonConfig.value.enabled) return;
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
	if (action === 'publish') {
		await onPublishClick();
		return;
	}
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
	<div :class="$style.buttonGroup">
		<N8nButton
			:class="$style.groupButtonLeft"
			:loading="publishing"
			:disabled="!buttonConfig.enabled"
			variant="subtle"
			data-testid="publish-agent-button"
			@click="onPublishClick"
		>
			<div :class="$style.flex">
				<span
					v-if="buttonConfig.showIndicator"
					:class="{
						[$style.indicatorDot]: true,
						[$style.indicatorPublished]: buttonConfig.indicatorClass === 'published',
						[$style.indicatorChanges]: buttonConfig.indicatorClass === 'changes',
					}"
				/>
				<span :class="{ [$style.indicatorPublishedText]: publishState === 'published-no-changes' }">
					{{ buttonConfig.text }}
				</span>
			</div>
		</N8nButton>
		<N8nActionDropdown
			:items="dropdownActions"
			placement="bottom-end"
			data-testid="agent-publish-dropdown"
			@select="onDropdownSelect"
		>
			<template #activator>
				<N8nIconButton
					:class="$style.groupButtonRight"
					variant="subtle"
					icon="chevron-down"
					aria-label="More publish actions"
					data-testid="agent-publish-dropdown-trigger"
				/>
			</template>
		</N8nActionDropdown>
	</div>
</template>

<style module lang="scss">
.buttonGroup {
	display: inline-flex;
}

.groupButtonLeft,
.groupButtonLeft:disabled,
.groupButtonLeft:hover:disabled {
	border-top-right-radius: 0;
	border-bottom-right-radius: 0;
	border-right-color: transparent;
}

.groupButtonLeft:hover {
	border-right-color: inherit;
}

.groupButtonRight {
	border-top-left-radius: 0;
	border-bottom-left-radius: 0;
}

.buttonGroup:has(.groupButtonLeft:not(:disabled):hover) .groupButtonRight {
	border-left-color: transparent;
}

.indicatorDot {
	height: var(--spacing--2xs);
	width: var(--spacing--2xs);
	border-radius: 50%;
	display: inline-block;
	margin-right: var(--spacing--2xs);
}

.indicatorPublished {
	background-color: var(--color--mint-600);
}

.indicatorPublishedText {
	color: var(--color--text--tint-1);
}

.indicatorChanges {
	background-color: var(--color--yellow-500);
}

.flex {
	display: flex;
	align-items: center;
}
</style>
