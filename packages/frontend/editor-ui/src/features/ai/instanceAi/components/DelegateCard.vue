<script lang="ts" setup>
import { ref, computed } from 'vue';
import { CollapsibleRoot, CollapsibleTrigger, CollapsibleContent } from 'reka-ui';
import { N8nIcon } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { useToolLabel } from '../toolLabels';

const props = defineProps<{
	args: Record<string, unknown>;
	result?: unknown;
	isLoading: boolean;
	toolCallId?: string;
}>();

const i18n = useI18n();
const { getToolLabel } = useToolLabel();
const isBriefingOpen = ref(false);

const role = computed(() => {
	return typeof props.args.role === 'string' ? props.args.role : '';
});

const tools = computed((): string[] => {
	if (!Array.isArray(props.args.tools)) return [];
	return props.args.tools.every((item) => typeof item === 'string')
		? (props.args.tools as string[])
		: [];
});

const briefing = computed(() => {
	return typeof props.args.briefing === 'string' ? props.args.briefing : '';
});
</script>

<template>
	<div :class="$style.root">
		<!-- Header: role + loading -->
		<div :class="$style.header">
			<div :class="$style.headerLeft">
				<N8nIcon v-if="props.isLoading" icon="spinner" :class="$style.spinner" spin size="small" />
				<N8nIcon v-else icon="check" :class="$style.successIcon" size="small" />
				<span :class="$style.delegatingLabel">
					{{ i18n.baseText('instanceAi.delegateCard.delegatingTo') }}:
				</span>
				<span :class="$style.role">{{ role }}</span>
			</div>
		</div>

		<!-- Tool badges -->
		<div v-if="tools.length > 0" :class="$style.toolsRow">
			<span :class="$style.toolsLabel">{{ i18n.baseText('instanceAi.delegateCard.tools') }}</span>
			<span v-for="tool in tools" :key="tool" :class="$style.toolBadge">{{
				getToolLabel(tool)
			}}</span>
		</div>

		<!-- Briefing (collapsible, default collapsed) -->
		<CollapsibleRoot v-if="briefing" v-model:open="isBriefingOpen" :class="$style.briefingBlock">
			<CollapsibleTrigger :class="$style.briefingTrigger">
				<span>{{ i18n.baseText('instanceAi.delegateCard.briefing') }}</span>
				<N8nIcon :icon="isBriefingOpen ? 'chevron-up' : 'chevron-down'" size="small" />
			</CollapsibleTrigger>
			<CollapsibleContent :class="$style.briefingContent">
				<p>{{ briefing }}</p>
			</CollapsibleContent>
		</CollapsibleRoot>

		<!-- Result is intentionally NOT shown here.
			 The sub-agent's full activity (tool calls + text) is rendered by
			 AgentNodeSection which follows this card in the timeline. -->
	</div>
</template>

<style lang="scss" module>
.root {
	border: var(--border);
	border-radius: var(--radius--lg);
	margin: var(--spacing--2xs) 0;
	overflow: hidden;
	background: var(--color--background);
}

.header {
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding: var(--spacing--2xs) var(--spacing--xs);
}

.headerLeft {
	display: flex;
	align-items: center;
	gap: var(--spacing--3xs);
	font-size: var(--font-size--2xs);
}

.delegatingLabel {
	color: var(--color--text--tint-1);
}

.role {
	font-weight: var(--font-weight--bold);
	color: var(--color--text);
}

.spinner {
	color: var(--color--primary);
}

.successIcon {
	color: var(--color--success);
}

.toolsRow {
	display: flex;
	align-items: center;
	flex-wrap: wrap;
	gap: var(--spacing--4xs);
	padding: 0 var(--spacing--xs) var(--spacing--2xs);
}

.toolsLabel {
	font-size: var(--font-size--3xs);
	font-weight: var(--font-weight--bold);
	color: var(--color--text--tint-1);
	text-transform: uppercase;
	letter-spacing: 0.05em;
	margin-right: var(--spacing--4xs);
}

.toolBadge {
	display: inline-block;
	padding: 1px var(--spacing--4xs);
	font-size: var(--font-size--3xs);
	font-family: monospace;
	background: var(--color--foreground);
	border: var(--border);
	border-radius: var(--radius--sm);
	color: var(--color--text);
}

.briefingBlock {
	border-top: var(--border);
}

.briefingTrigger {
	display: flex;
	align-items: center;
	justify-content: space-between;
	width: 100%;
	padding: var(--spacing--4xs) var(--spacing--xs);
	background: none;
	border: none;
	cursor: pointer;
	font-family: var(--font-family);
	font-size: var(--font-size--3xs);
	font-weight: var(--font-weight--bold);
	color: var(--color--text--tint-1);
	text-transform: uppercase;
	letter-spacing: 0.05em;

	&:hover {
		background: var(--color--background--shade-1);
	}
}

.briefingContent {
	padding: var(--spacing--4xs) var(--spacing--xs) var(--spacing--2xs);
	font-size: var(--font-size--2xs);
	color: var(--color--text--tint-1);
	line-height: var(--line-height--xl);

	p {
		margin: 0;
	}
}
</style>
