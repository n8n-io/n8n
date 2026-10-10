<script setup lang="ts">
import { N8nText, N8nIcon } from '@n8n/design-system';

import type { AgentExecutionThread } from '@/features/agents/composables/useAgentThreadsApi';
import type { SessionTimelineMetadata } from '@/features/agents/types';

const props = defineProps<{
	thread: AgentExecutionThread;
	metadata: SessionTimelineMetadata;
	isVisible: boolean;
	lastMessage?: string | null;
}>();
defineEmits<{}>();

const tokenFormatter = new Intl.NumberFormat('en-US', {
	notation: 'compact',
	maximumFractionDigits: 1,
});
</script>

<template>
	<aside :class="[$style.container, { [$style.isVisible]: isVisible }]">
		<section :class="$style.section">
			<ul :class="$style.descriptionList">
				<li>
					<N8nIcon color="text-light" :icon="metadata.trigger.icon" />
					<N8nText step="xs" bold>{{ metadata.trigger.label }}</N8nText>
				</li>
				<li>
					<N8nIcon color="text-light" icon="hash" />
					<N8nText step="xs" bold>
						{{ tokenFormatter.format(metadata.totalTokens).toUpperCase() }}
						<span :class="$style.innerLabel">(${{ metadata.totalCost }})</span>
					</N8nText>
				</li>
				<li>
					<N8nIcon color="text-light" icon="clock" />
					<N8nText step="xs" bold>{{ metadata.durationLabel }}</N8nText>
				</li>
			</ul>
		</section>
	</aside>
</template>

<style module lang="scss">
@use '@n8n/design-system/css/mixins/motion';
@use '@n8n/design-system/css/mixins/mixins';
@use '@n8n/design-system/css/mixins/utils';

.container {
	--n8n-session-side-panel--spacing: var(--spacing--sm);
	--n8n-session-side-panel--x-offset: 150%;

	position: absolute;
	inset-block-start: var(--n8n-session-side-panel--spacing);
	inset-inline-end: var(--n8n-session-side-panel--spacing);
	width: 248px;
	height: fit-content;
	background: light-dark(var(--background--surface), var(--background--subtle));
	border-radius: var(--radius--xl);
	box-shadow: var(--shadow--outline), var(--shadow--xs);
	transform: translateX(var(--n8n-session-side-panel--x-offset));
	transition: transform var(--duration--snappy) var(--easing--ease-out);
	pointer-events: none;

	&.isVisible {
		--n8n-session-side-panel--x-offset: 0;
		pointer-events: auto;
	}
}

.section {
	display: flex;
	flex-direction: column;
	gap: calc(var(--n8n-session-side-panel--spacing) / 2);
	padding: var(--n8n-session-side-panel--spacing);

	& + .section {
		border-top: var(--border);
		border-color: var(--border-color--subtle);
	}
}

.descriptionList {
	display: flex;
	flex-direction: column;

	.innerLabel {
		color: var(--text-color--subtler);
	}

	li {
		min-width: 0;
		display: flex;
		justify-content: flex-start;
		align-items: center;
		gap: var(--spacing--2xs);
		height: var(--height--sm);
		font-size: var(--font-size--sm);
		padding-inline: var(--spacing--xs);
		margin-inline: calc(var(--spacing--xs) * -1);
		background-color: transparent;
		border-radius: var(--radius);
		user-select: none;

		:global(.n8n-icon) {
			flex-shrink: 0;
			height: auto;
		}

		:global(.n8n-text) {
			flex: 1;
			@include utils.utils-ellipsis;
		}
	}
}
</style>
