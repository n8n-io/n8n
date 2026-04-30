<script setup lang="ts">
import { computed } from 'vue';
import { N8nActionDropdown, N8nButton, N8nIconButton } from '@n8n/design-system';
import type { ActionDropdownItem } from '@n8n/design-system/types/action-dropdown';
import { useI18n } from '@n8n/i18n';
import { useAgentPublish } from '../composables/useAgentPublish';
import type { AgentResource } from '../types';

const props = defineProps<{
	agent: AgentResource | null;
	projectId: string;
	agentId: string;
	isSaving?: boolean;
	beforeRevertToPublished?: () => Promise<void> | void;
}>();

const emit = defineEmits<{
	published: [agent: AgentResource];
	unpublished: [agent: AgentResource];
	reverted: [agent: AgentResource];
}>();

const locale = useI18n();
const { publish, unpublish, revertToPublished, publishing } = useAgentPublish();

type AgentPublishState = 'not-published' | 'published-no-changes' | 'published-with-changes';

const publishState = computed((): AgentPublishState => {
	if (!props.agent?.publishedVersion) return 'not-published';
	if (props.agent.versionId !== props.agent.publishedVersion.publishedFromVersionId)
		return 'published-with-changes';
	return 'published-no-changes';
});

const buttonConfig = computed(() => {
	switch (publishState.value) {
		case 'not-published':
			return {
				text: locale.baseText('agents.publish.button.publish'),
				enabled: true,
				showIndicator: false,
				indicatorClass: '',
			};
		case 'published-with-changes':
			return {
				text: locale.baseText('agents.publish.button.publish'),
				enabled: true,
				showIndicator: true,
				indicatorClass: 'changes',
			};
		case 'published-no-changes':
		default:
			return {
				text: locale.baseText('agents.publish.button.published'),
				enabled: false,
				showIndicator: true,
				indicatorClass: 'published',
			};
	}
});

const dropdownActions = computed(() => {
	const actions: Array<ActionDropdownItem<string>> = [
		{
			id: 'publish',
			label: locale.baseText('agents.publish.dropdown.publish'),
			disabled: !buttonConfig.value.enabled || publishing.value || props.isSaving,
		},
	];

	if (props.agent?.publishedVersion) {
		actions.push({
			id: 'revert-to-published',
			label: locale.baseText('agents.publish.dropdown.revertToPublished'),
			disabled: publishing.value || props.isSaving,
		});
	}

	actions.push({
		id: 'unpublish',
		label: locale.baseText('agents.publish.dropdown.unpublish'),
		disabled: !props.agent?.publishedVersion || publishing.value || props.isSaving,
		divided: true,
	});

	return actions;
});

async function onPublishClick() {
	if (!buttonConfig.value.enabled || props.isSaving) return;
	const updated = await publish(props.projectId, props.agentId);
	if (updated) emit('published', updated);
}

async function onDropdownSelect(action: string) {
	if (action === 'publish') {
		await onPublishClick();
		return;
	}
	if (action === 'revert-to-published') {
		if (!props.agent?.publishedVersion || props.isSaving) return;
		await props.beforeRevertToPublished?.();
		const updated = await revertToPublished(props.projectId, props.agentId);
		if (updated) emit('reverted', updated);
		return;
	}
	if (action !== 'unpublish') return;
	const updated = await unpublish(props.projectId, props.agentId, props.agent?.name);
	if (updated) emit('unpublished', updated);
}
</script>

<template>
	<div :class="$style.buttonGroup">
		<N8nButton
			:class="$style.groupButtonLeft"
			:loading="publishing"
			:disabled="!buttonConfig.enabled || isSaving"
			variant="ghost"
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
					variant="ghost"
					icon="chevron-down"
					:aria-label="locale.baseText('agents.publish.dropdown.ariaLabel')"
					data-testid="agent-publish-dropdown-trigger"
				/>
			</template>
		</N8nActionDropdown>
	</div>
</template>

<style module lang="scss">
.buttonGroup {
	display: inline-flex;
	border: var(--border);
	border-radius: var(--radius--3xs);
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
	border-left: var(--border);
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
	background-color: var(--text-color--success);
}

.indicatorPublishedText {
	color: var(--text-color--subtle);
}

.indicatorChanges {
	background-color: var(--text-color--warning);
}

.flex {
	display: flex;
	align-items: center;
}
</style>
