<script lang="ts" setup>
import { computed } from 'vue';
import { CollapsibleRoot, CollapsibleTrigger, CollapsibleContent } from 'reka-ui';
import { N8nIcon, type IconName } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import type { InstanceAiAgentNode, InstanceAiToolCallState } from '@n8n/api-types';
import { useToolLabel, getToolIcon } from '../toolLabels';
import ToolCallStep from './ToolCallStep.vue';
import InstanceAiMarkdown from './InstanceAiMarkdown.vue';

const props = defineProps<{
	agentNode: InstanceAiAgentNode;
}>();

const i18n = useI18n();
const { getToolLabel, getToggleLabel, getHideLabel } = useToolLabel();

const CODE_BLOCK_PATTERN = /```/;

interface TimelineStep {
	type: 'tool-call' | 'text' | 'done';
	icon: IconName;
	label: string;
	isLoading: boolean;
	toggleLabel?: string;
	hideLabel?: string;
	toolCall?: InstanceAiToolCallState;
	textContent?: string;
	isLongText?: boolean;
	shortLabel?: string;
}

function extractShortLabel(content: string): string {
	// Strip code blocks and return first meaningful line
	const withoutCode = content.replace(/```[\s\S]*?```/g, '').trim();
	const firstLine = withoutCode.split('\n').find((line) => line.trim().length > 0) ?? '';
	if (firstLine) {
		return firstLine.length > 80 ? firstLine.slice(0, 80) + '…' : firstLine;
	}
	// Content is only code blocks (e.g. generated workflow code)
	return i18n.baseText('instanceAi.stepTimeline.craftingWorkflow');
}

function isLongTextContent(content: string): boolean {
	return CODE_BLOCK_PATTERN.test(content);
}

/** Index tool calls by ID for O(1) lookup. */
const toolCallsById = computed(() => {
	const map: Record<string, InstanceAiToolCallState> = {};
	for (const tc of props.agentNode.toolCalls) {
		map[tc.toolCallId] = tc;
	}
	return map;
});

const steps = computed((): TimelineStep[] => {
	const result: TimelineStep[] = [];

	for (const entry of props.agentNode.timeline) {
		if (entry.type === 'text') {
			const longText = isLongTextContent(entry.content);
			result.push({
				type: 'text',
				icon: 'brain',
				label: longText ? extractShortLabel(entry.content) : entry.content,
				isLoading: false,
				textContent: entry.content,
				isLongText: longText,
				shortLabel: longText ? extractShortLabel(entry.content) : undefined,
			});
		} else if (entry.type === 'tool-call') {
			const tc = toolCallsById.value[entry.toolCallId];
			if (!tc) continue;
			result.push({
				type: 'tool-call',
				icon: tc.isLoading ? 'spinner' : getToolIcon(tc.toolName),
				label: getToolLabel(tc.toolName),
				isLoading: tc.isLoading,
				toggleLabel: getToggleLabel(tc),
				hideLabel: getHideLabel(tc),
				toolCall: tc,
			});
		}
		// Skip 'child' entries — parent AgentTimeline handles child cards
	}

	if (props.agentNode.status === 'completed') {
		result.push({
			type: 'done',
			icon: 'circle-check',
			label: i18n.baseText('instanceAi.stepTimeline.done'),
			isLoading: false,
		});
	}

	return result;
});
</script>

<template>
	<div :class="$style.timeline">
		<template v-for="(step, idx) in steps" :key="idx">
			<!-- Tool call: rendered via ToolCallStep (has its own icon column) -->
			<ToolCallStep
				v-if="step.type === 'tool-call' && step.toolCall"
				:tool-call="step.toolCall"
				:label="step.label"
				:show-connector="idx < steps.length - 1"
			/>

			<!-- Text and done steps: use shared icon column layout -->
			<div v-else :class="$style.step">
				<div :class="$style.iconColumn">
					<N8nIcon
						:icon="step.icon"
						size="small"
						:spin="step.isLoading"
						:class="[
							$style.stepIcon,
							step.type === 'done' && $style.doneIcon,
							step.isLoading && $style.loadingIcon,
						]"
					/>
					<div v-if="idx < steps.length - 1" :class="$style.connector" />
				</div>
				<div :class="$style.content">
					<!-- Text segment: short inline or long behind toggle -->
					<template v-if="step.type === 'text'">
						<template v-if="step.isLongText">
							<span :class="$style.textLabel">{{ step.shortLabel }}</span>
							<CollapsibleRoot v-slot="{ open: textOpen }" :class="$style.toggleBlock">
								<CollapsibleTrigger :class="$style.toggleButton">
									{{
										i18n.baseText(
											textOpen
												? 'instanceAi.stepTimeline.hideData'
												: 'instanceAi.stepTimeline.showData',
										)
									}}
								</CollapsibleTrigger>
								<CollapsibleContent :class="$style.toggleContent">
									<div :class="$style.dataSection">
										<InstanceAiMarkdown :content="step.textContent!" />
									</div>
								</CollapsibleContent>
							</CollapsibleRoot>
						</template>
						<div v-else :class="$style.textLabel">
							<InstanceAiMarkdown :content="step.textContent!" />
						</div>
					</template>

					<!-- Done marker -->
					<template v-else-if="step.type === 'done'">
						<span :class="$style.doneLabel">{{ step.label }}</span>
					</template>
				</div>
			</div>
		</template>
	</div>
</template>

<style lang="scss" module>
.timeline {
	display: flex;
	flex-direction: column;
}

.step {
	display: flex;
	gap: var(--spacing--xs);
}

.iconColumn {
	display: flex;
	flex-direction: column;
	align-items: center;
	width: 20px;
	flex-shrink: 0;
	padding-top: 2px;
}

.connector {
	width: 1px;
	flex: 1;
	background: var(--color--foreground--shade-1);
	min-height: 12px;
}

.stepIcon {
	color: var(--color--text--tint-1);
	flex-shrink: 0;
}

.doneIcon {
	color: var(--color--text--tint-1);
}

.loadingIcon {
	color: var(--color--primary);
}

.content {
	display: flex;
	flex-direction: column;
	min-width: 0;
	flex: 1;
	padding-bottom: var(--spacing--2xs);
}

.textLabel {
	font-size: var(--font-size--sm);
	color: var(--color--text);
	line-height: var(--line-height--lg);
}

.doneLabel {
	font-size: var(--font-size--sm);
	color: var(--color--text);
	line-height: var(--line-height--lg);
}

.toggleBlock {
	margin-top: var(--spacing--4xs);
}

.toggleButton {
	display: inline-flex;
	align-items: center;
	padding: var(--spacing--5xs) var(--spacing--2xs);
	font-family: var(--font-family);
	font-size: var(--font-size--2xs);
	font-weight: var(--font-weight--regular);
	color: var(--color--text--tint-1);
	background: var(--color--background--light-2);
	border: var(--border);
	border-radius: var(--radius);
	cursor: pointer;

	&:hover {
		background: var(--color--foreground--tint-2);
	}
}

.toggleContent {
	margin-top: var(--spacing--4xs);
	max-height: 300px;
	overflow-y: auto;
}

.dataSection {
	font-size: var(--font-size--2xs);
	color: var(--color--text--tint-1);
	background: var(--color--foreground--tint-2);
	border-radius: var(--radius);
	padding: var(--spacing--2xs);

	:global(pre) {
		background: transparent;
		margin: 0;
		padding: 0;
	}

	& + & {
		margin-top: var(--spacing--4xs);
	}
}
</style>
