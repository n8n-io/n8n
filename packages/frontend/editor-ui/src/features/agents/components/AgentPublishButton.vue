<script setup lang="ts">
import { ref, computed } from 'vue';
import { N8nActionDropdown, N8nButton, N8nIconButton } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { useRootStore } from '@n8n/stores/useRootStore';
import { useToast } from '@/app/composables/useToast';
import { useMessage } from '@/app/composables/useMessage';
import { MODAL_CONFIRM } from '@/app/constants';
import { publishAgent, unpublishAgent } from '../composables/useAgentApi';
import type { AgentResource } from '../types';

const props = defineProps<{
	agent: AgentResource | null;
	projectId: string;
	agentId: string;
	isSaving?: boolean;
}>();

const emit = defineEmits<{
	published: [agent: AgentResource];
	unpublished: [agent: AgentResource];
}>();

const rootStore = useRootStore();
const locale = useI18n();
const { showMessage, showError } = useToast();
const message = useMessage();

const publishing = ref(false);

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
			return {
				text: locale.baseText('agents.publish.button.published'),
				enabled: false,
				showIndicator: true,
				indicatorClass: 'published',
			};
	}
});

const dropdownActions = computed(() => [
	{
		id: 'publish',
		label: locale.baseText('agents.publish.dropdown.publish'),
		disabled: !buttonConfig.value.enabled || publishing.value || props.isSaving,
	},
	{
		id: 'unpublish',
		label: locale.baseText('agents.publish.dropdown.unpublish'),
		disabled: !props.agent?.publishedVersion || publishing.value || props.isSaving,
		divided: true,
	},
]);

async function onPublishClick() {
	if (publishing.value || !buttonConfig.value.enabled || props.isSaving) return;
	publishing.value = true;
	try {
		const updated = await publishAgent(rootStore.restApiContext, props.projectId, props.agentId);
		emit('published', updated);
		showMessage({ title: locale.baseText('agents.publish.toast.published'), type: 'success' });
	} catch (error) {
		showError(error, locale.baseText('agents.publish.error.publish'));
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
	const confirmed = await message.confirm(
		locale.baseText('agents.unpublish.modal.description'),
		locale.baseText('agents.unpublish.modal.title'),
		{
			confirmButtonText: locale.baseText('agents.unpublish.modal.button.unpublish'),
			cancelButtonText: locale.baseText('generic.cancel'),
			type: 'warning',
		},
	);
	if (confirmed !== MODAL_CONFIRM) return;
	publishing.value = true;
	try {
		const updated = await unpublishAgent(rootStore.restApiContext, props.projectId, props.agentId);
		emit('unpublished', updated);
		showMessage({ title: locale.baseText('agents.publish.toast.unpublished'), type: 'success' });
	} catch (error) {
		showError(error, locale.baseText('agents.publish.error.unpublish'));
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
			:disabled="!buttonConfig.enabled || isSaving"
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
