<script lang="ts" setup>
import { N8nIcon } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import type { StepCacheBreak, StepDebugSummary } from '@n8n/api-types';

defineProps<{
	stepNumber: number;
	summary: StepDebugSummary;
	selected: boolean;
	cacheBreak?: StepCacheBreak;
	cacheBreakDescription?: string;
	/** Number of sub-agents this step started. */
	subAgentCount?: number;
}>();

const emit = defineEmits<{ select: [] }>();

const i18n = useI18n();

function formatCompactTokens(tokens: number): string {
	return tokens < 1000 ? tokens.toString() : `${(tokens / 1000).toFixed(1)}k`;
}
</script>

<template>
	<button
		type="button"
		:class="[
			$style.stepButton,
			cacheBreak && $style.stepButtonCacheBreak,
			selected && $style.stepButtonSelected,
		]"
		@click="emit('select')"
	>
		<div :class="$style.stepTopRow">
			<span :class="[$style.stepNumber, cacheBreak && $style.stepNumberCacheBreak]">
				{{ stepNumber + 1 }}
			</span>
			<span v-if="summary.finishReason" :class="$style.finishReason">
				{{ summary.finishReason }}
			</span>
			<span
				v-if="cacheBreak"
				:class="$style.cacheBreakBadge"
				:title="cacheBreakDescription"
				data-test-id="instance-ai-llm-step-cache-break"
			>
				<N8nIcon icon="triangle-alert" />
				{{ i18n.baseText('instanceAi.debug.runDebug.cacheBreak') }}
				<span :class="$style.cacheBreakTokens">
					{{
						i18n.baseText('instanceAi.debug.runDebug.cacheBreakLostTokens', {
							interpolate: { count: formatCompactTokens(cacheBreak.lostTokens) },
						})
					}}
				</span>
			</span>
		</div>
		<span v-if="summary.toolNames.length > 0" :class="$style.stepTools">
			{{ summary.toolNames.join(', ') }}
		</span>
		<span v-else-if="summary.messagePreview" :class="$style.stepPreview">
			{{ summary.messagePreview }}
		</span>
		<span v-if="summary.usageLabel" :class="$style.stepUsage">
			{{ summary.usageLabel }}
		</span>
		<span
			v-if="subAgentCount"
			:class="$style.subAgentBadge"
			data-test-id="instance-ai-llm-step-sub-agent-badge"
		>
			<N8nIcon icon="robot" size="xsmall" />
			{{
				i18n.baseText('instanceAi.debug.runDebug.subAgentCount', {
					adjustToNumber: subAgentCount,
					interpolate: { count: String(subAgentCount) },
				})
			}}
		</span>
	</button>
</template>

<style lang="scss" module>
.stepButton {
	display: flex;
	flex-direction: column;
	align-items: flex-start;
	gap: var(--spacing--5xs);
	width: 100%;
	padding: var(--spacing--3xs) var(--spacing--2xs);
	border: 1px solid transparent;
	border-radius: var(--radius);
	background: transparent;
	cursor: pointer;
	text-align: left;
	transition:
		background-color var(--duration--fast) ease,
		border-color var(--duration--fast) ease;

	&:hover {
		background: var(--background--surface);
		border-color: var(--color--foreground--tint-2);
	}
}

.stepButtonSelected {
	background: var(--background--surface);
	border-color: var(--color--foreground--tint-2);
	border-left: 2px solid var(--color--primary);

	&:hover {
		background: var(--background--surface);
	}
}

.stepTopRow {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: var(--spacing--2xs);
	width: 100%;
}

.stepNumber {
	display: inline-flex;
	align-items: center;
	justify-content: center;
	min-width: var(--spacing--sm);
	height: var(--spacing--sm);
	border-radius: var(--radius--xl);
	background: var(--color--foreground--tint-2);
	font-size: var(--font-size--3xs);
	font-weight: var(--font-weight--bold);
	color: var(--color--text);
}

.stepButtonSelected .stepNumber {
	background: color-mix(in srgb, var(--color--primary) 12%, var(--color--foreground--tint-2));
}

.stepButtonCacheBreak:not(.stepButtonSelected) {
	border-left: 2px solid var(--color--danger);
	background: color-mix(in srgb, var(--color--danger) 6%, transparent);

	&:hover {
		background: color-mix(in srgb, var(--color--danger) 10%, var(--background--surface));
	}
}

.cacheBreakBadge {
	display: inline-flex;
	align-items: center;
	gap: var(--spacing--5xs);
	flex-shrink: 0;
	padding: var(--spacing--5xs) var(--spacing--3xs);
	border: 1px solid color-mix(in srgb, var(--color--danger) 30%, transparent);
	border-radius: var(--radius--xl);
	background: color-mix(in srgb, var(--color--danger) 12%, transparent);
	font-size: var(--font-size--3xs);
	font-weight: var(--font-weight--medium);
	line-height: 1;
	white-space: nowrap;
	color: var(--color--danger);
}

.cacheBreakTokens {
	font-variant-numeric: tabular-nums;
	opacity: 0.8;
}

.stepNumber.stepNumberCacheBreak {
	background: var(--color--danger);
	color: var(--color--neutral-white);
}

.finishReason,
.stepTools,
.stepPreview,
.stepUsage {
	width: 100%;
	font-size: var(--font-size--3xs);
	line-height: var(--line-height--lg);
	color: var(--color--text--tint-1);
}

.stepTools {
	font-family: monospace;
	color: var(--color--text);
}

.subAgentBadge {
	display: inline-flex;
	align-items: center;
	gap: var(--spacing--5xs);
	padding: 0 var(--spacing--4xs);
	border-radius: var(--radius--sm);
	background: color-mix(in srgb, var(--color--primary) 10%, transparent);
	font-size: var(--font-size--3xs);
	line-height: var(--line-height--lg);
	color: var(--color--primary);
}
</style>
