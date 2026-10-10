<script lang="ts" setup>
import NodeIcon from '@/app/components/NodeIcon.vue';
import { useNodeTypesStore } from '@/app/stores/nodeTypes.store';
import { convertToDisplayDate } from '@/app/utils/formatters/dateFormatter';
import {
	N8nAiActivityStepButton,
	N8nAiActivityStepChevron,
	N8nAiActivityStepResultSection,
	N8nAnimatedCollapsibleContent,
	N8nCallout,
	N8nCodeBlock,
	N8nIcon,
	N8nSpinner,
	N8nText,
	N8nTooltip,
} from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { truncate } from '@n8n/utils/string/truncate';
import { CollapsibleRoot, CollapsibleTrigger } from 'reka-ui';
import { computed, ref, watch } from 'vue';
import type { TimelineItem } from '../../session-timeline.types';
import { timelineItemErrorMessage } from '../../session-timeline.utils';
import { formatToolNameForDisplay, resolveToolNameForDisplay } from '../../utils/toolDisplayName';
import SessionTimelinePill from '../SessionTimelinePill.vue';

const props = defineProps<{
	item: TimelineItem;
	selected: boolean;
	searchQuery?: string;
}>();

const i18n = useI18n();
const nodeTypesStore = useNodeTypesStore();

const nodeType = computed(() => {
	if (props.item.kind !== 'node' || !props.item.nodeType) return null;
	return nodeTypesStore.getNodeType(props.item.nodeType, props.item.nodeTypeVersion) ?? null;
});

const label = computed((): string => {
	if (props.item.kind === 'skill') {
		return (
			props.item.skillName ??
			resolveToolNameForDisplay(props.item.toolName, i18n, props.item.toolOutput)
		);
	}
	if (props.item.kind === 'workflow') {
		return props.item.workflowName ?? formatToolNameForDisplay(props.item.toolName);
	}
	if (props.item.kind === 'node') {
		return props.item.nodeDisplayName ?? formatToolNameForDisplay(props.item.toolName);
	}
	return resolveToolNameForDisplay(props.item.toolName, i18n, props.item.toolOutput);
});

const isRunning = computed(() => props.item.activityStatus === 'running');

const isInterrupted = computed(() => props.item.activityStatus === 'interrupted');

const canExpand = computed(() => !isRunning.value && !isInterrupted.value);

const error = computed((): string | undefined => {
	if (props.item.activityStatus === 'waiting' || isRunning.value || isInterrupted.value) {
		return undefined;
	}
	if (
		props.item.activityStatus !== 'failed' &&
		props.item.toolOutcome !== 'error' &&
		props.item.toolSuccess !== false
	) {
		return undefined;
	}
	return timelineItemErrorMessage(props.item) || i18n.baseText('agentSessions.timeline.toolError');
});

const errorTooltip = computed(() => (error.value ? truncate(error.value, 160) : ''));

const time = computed((): string => {
	if (!props.item.timestamp) return '';
	return convertToDisplayDate(new Date(props.item.timestamp).toISOString()).time;
});

function stringifyJson(value: unknown): string {
	if (typeof value === 'string') {
		try {
			return JSON.stringify(JSON.parse(value), null, 2);
		} catch {
			return value;
		}
	}
	return JSON.stringify(value, null, 2) ?? String(value);
}

const isOpen = ref(false);

const searchableText = computed((): string => {
	return [
		label.value,
		props.item.toolInput !== undefined ? stringifyJson(props.item.toolInput) : '',
		props.item.toolOutput !== undefined ? stringifyJson(props.item.toolOutput) : '',
	]
		.join('\n')
		.toLowerCase();
});

watch(
	[() => props.searchQuery, canExpand],
	function onSearchQueryChange([query, expandable]) {
		if (!expandable) {
			isOpen.value = false;
			return;
		}
		const normalized = query?.trim().toLowerCase();
		if (normalized) {
			if (searchableText.value.includes(normalized)) {
				isOpen.value = true;
			}
			return;
		}
		isOpen.value = false;
	},
	{ immediate: true },
);
</script>

<template>
	<div
		data-test-id="session-capability-item"
		:data-status="item.activityStatus"
		:class="[$style.step, { [$style.failed]: error, [$style.interrupted]: isInterrupted }]"
	>
		<CollapsibleRoot
			:open="canExpand && isOpen"
			:disabled="!canExpand"
			@update:open="isOpen = canExpand && $event"
		>
			<div :class="$style.header">
				<CollapsibleTrigger as-child>
					<N8nAiActivityStepButton
						size="small"
						:loading="isRunning"
						:interactive="canExpand"
						:tabindex="canExpand ? undefined : -1"
						:aria-disabled="!canExpand || undefined"
					>
						<template #prefix>
							<span :class="$style.iconContainer">
								<N8nSpinner v-if="isRunning" type="grid" size="medium" />
								<N8nIcon
									v-else-if="isInterrupted"
									icon="circle-x"
									size="medium"
									:class="$style.interruptedIcon"
								/>
								<N8nTooltip v-else-if="error" placement="top">
									<template #content>{{ errorTooltip }}</template>
									<N8nIcon icon="circle-alert" color="danger" size="medium" />
								</N8nTooltip>
								<NodeIcon v-else-if="nodeType" :node-type="nodeType" :size="20" />
								<SessionTimelinePill v-else :kind="item.kind" />
							</span>
						</template>
						{{ label }}
						<template v-if="canExpand" #suffix>
							<N8nAiActivityStepChevron :open="isOpen" />
						</template>
					</N8nAiActivityStepButton>
				</CollapsibleTrigger>
				<N8nText step="xs" color="text-light" bold>{{ time }}</N8nText>
			</div>
			<N8nAnimatedCollapsibleContent v-if="canExpand">
				<div :class="$style.content">
					<N8nAiActivityStepResultSection
						v-if="item.toolInput !== undefined"
						:class="$style.toolSection"
					>
						<N8nText step="xs" color="text-light" bold :class="$style.toolTitle">
							{{ i18n.baseText('agentSessions.timeline.input') }}
						</N8nText>
						<N8nCodeBlock
							:code="stringifyJson(item.toolInput)"
							language="json"
							:class="$style.toolCode"
						/>
					</N8nAiActivityStepResultSection>
					<N8nAiActivityStepResultSection v-if="error" :class="$style.toolSection">
						<N8nCallout theme="danger" :class="$style.errorCallout">
							{{ error }}
						</N8nCallout>
					</N8nAiActivityStepResultSection>
					<N8nAiActivityStepResultSection
						v-if="item.toolOutput !== undefined && !error"
						:class="$style.toolSection"
					>
						<N8nText step="xs" color="text-light" bold :class="$style.toolTitle">
							{{ i18n.baseText('agentSessions.timeline.output') }}
						</N8nText>
						<N8nCodeBlock
							:code="stringifyJson(item.toolOutput)"
							language="json"
							:class="$style.toolCode"
						/>
					</N8nAiActivityStepResultSection>
				</div>
			</N8nAnimatedCollapsibleContent>
		</CollapsibleRoot>
	</div>
</template>

<style module lang="scss">
.step {
	padding-inline: var(--spacing--sm);

	--ai-activity-step--color: var(--text-color--subtle);
}

.failed {
	--ai-activity-step--color: var(--color--text--danger);
}

.interrupted {
	--ai-activity-step--color: var(--text-color--disabled);

	button:hover {
		color: var(--text-color--disabled);
	}
}

.interruptedIcon {
	color: var(--icon-color--subtle);
}

.iconContainer {
	display: inline-flex;
	align-items: center;
	justify-content: center;
	width: var(--height--2xs);
	height: var(--height--2xs);
	flex-shrink: 0;
	border-radius: var(--radius);
}

.header {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: var(--spacing--sm);

	> button:disabled {
		pointer-events: none;
	}
}

.content {
	display: flex;
	flex-direction: column;
}

.toolTitle {
	margin-top: var(--spacing--xs);
}

.toolSection {
	background-color: transparent;
	display: flex;
	flex-direction: column;
	gap: var(--spacing--4xs);
	border: 0;
	padding-inline: var(--spacing--md);
	margin-block: 0;
	margin-inline-start: calc(var(--spacing--2xs) + 2px);

	border-left: var(--border);
	border-radius: 0;
}

.toolCode {
	background-color: var(--background--surface);
}

.errorCallout {
	margin-top: var(--spacing--xs);
	overflow-wrap: anywhere;
	word-break: break-word;
}
</style>
