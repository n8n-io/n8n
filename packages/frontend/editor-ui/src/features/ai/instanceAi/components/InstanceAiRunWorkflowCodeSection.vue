<script lang="ts" setup>
import type { InstanceAiRunDebugWorkflowCodeSnapshot } from '@n8n/api-types';
import { N8nText } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import InstanceAiDebugWorkflowCodeSnapshot from './InstanceAiDebugWorkflowCodeSnapshot.vue';

defineProps<{
	snapshots: InstanceAiRunDebugWorkflowCodeSnapshot[];
	showDivider?: boolean;
}>();

const i18n = useI18n();

function formatCharCount(count: number): string {
	return i18n.baseText('instanceAi.debug.runDebug.charCount', {
		interpolate: { count: count.toLocaleString() },
	});
}
</script>

<template>
	<section :class="[$style.section, showDivider && $style.sectionDivider]">
		<N8nText tag="h3" size="small" bold color="text-dark" :class="$style.sectionTitle">
			{{ i18n.baseText('instanceAi.debug.tab.workflowCode') }}
		</N8nText>

		<div :class="$style.stack">
			<details
				v-for="(snapshot, index) in snapshots"
				:key="`${snapshot.capturedAt}-${index}`"
				:class="[$style.card, $style.cardWorkflow, $style.expandableCard]"
				data-test-id="instance-ai-run-workflow-code-snapshot"
			>
				<summary :class="$style.cardHeader">
					<span :class="$style.roleLabel">{{ snapshot.source }}</span>
					<span :class="$style.headerMeta">
						<span :class="$style.metaLabel">{{ formatCharCount(snapshot.code.length) }}</span>
					</span>
				</summary>
				<div :class="$style.cardBody">
					<InstanceAiDebugWorkflowCodeSnapshot :snapshot="snapshot" />
				</div>
			</details>
		</div>
	</section>
</template>

<style lang="scss" module>
.section {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
}

.sectionDivider {
	padding-top: var(--spacing--2xs);
	border-top: var(--border);
}

.sectionTitle {
	margin: 0;
}

.stack {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--3xs);
}

.card {
	border-radius: var(--radius);
	background: var(--background--surface);
	border: 1px solid var(--color--foreground--tint-2);
	overflow: hidden;
}

.expandableCard {
	.cardHeader {
		cursor: pointer;
		list-style: none;

		&::-webkit-details-marker {
			display: none;
		}
	}

	.headerMeta::after {
		content: '▸';
		margin-left: var(--spacing--3xs);
		color: var(--color--text--tint-1);
		transition: transform var(--duration--fast) ease;
	}

	&[open] .headerMeta::after {
		transform: rotate(90deg);
	}
}

.cardWorkflow {
	border-left: 2px solid color-mix(in srgb, var(--color--secondary) 45%, transparent);
}

.cardHeader {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: var(--spacing--2xs);
	padding: var(--spacing--3xs) var(--spacing--2xs);
	background: var(--color--background--shade-1);
}

.headerMeta {
	display: inline-flex;
	align-items: center;
	flex-wrap: wrap;
	justify-content: flex-end;
	gap: var(--spacing--2xs);
}

.cardBody {
	padding: var(--spacing--2xs);
}

.roleLabel {
	font-size: var(--font-size--3xs);
	font-weight: var(--font-weight--medium);
	color: var(--color--text);
	text-transform: lowercase;
}

.metaLabel {
	font-size: var(--font-size--3xs);
	color: var(--color--text--tint-1);
	font-family: monospace;
}
</style>
