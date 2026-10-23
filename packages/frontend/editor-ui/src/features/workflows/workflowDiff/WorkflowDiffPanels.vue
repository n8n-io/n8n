<script setup lang="ts">
import { N8nText } from '@n8n/design-system';
defineProps<{ sourceLabel?: string; targetLabel?: string }>();
</script>
<template>
	<div :class="$style.workflowDiff">
		<div :class="$style.workflowDiffPanel">
			<slot name="sourceLabel">
				<N8nText color="text-dark" size="small" :class="$style.sourceBadge">{{
					sourceLabel
				}}</N8nText>
			</slot>
			<slot name="source" />
		</div>
		<div :class="$style.workflowDiffPanel">
			<slot name="targetLabel">
				<N8nText color="text-dark" size="small" :class="$style.sourceBadge">{{
					targetLabel
				}}</N8nText>
			</slot>
			<slot name="target" />
		</div>
	</div>
</template>
<style module lang="scss">
.workflowDiff {
	display: flex;
	flex-direction: column;
	height: 100%;
	min-height: 0;
	flex: 1;
}

.workflowDiffPanel {
	flex: 1;
	min-height: 0;
	position: relative;
	border-top: 1px solid var(--color--foreground);
	background: var(--canvas--color--background);
}

.sourceBadge {
	composes: sourceBadge from './workflowDiff.module.scss';
}
</style>
