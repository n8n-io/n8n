<script lang="ts" setup>
import { N8nIcon, N8nIconButton, N8nText } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';

const props = defineProps<{ memory: string | null }>();
const emit = defineEmits<{ close: [] }>();

const i18n = useI18n();
</script>

<template>
	<div :class="$style.panel">
		<div :class="$style.header">
			<div :class="$style.headerTitle">
				<N8nIcon icon="brain" :size="16" />
				<N8nText bold>{{ i18n.baseText('agentSessions.timeline.memory') }}</N8nText>
			</div>
			<N8nIconButton
				icon="x"
				variant="ghost"
				data-test-id="memory-detail-close"
				@click="emit('close')"
			/>
		</div>
		<div :class="$style.container">
			<pre v-if="props.memory" :class="$style.memory" data-test-id="session-memory-content">{{
				props.memory
			}}</pre>
			<div v-else :class="$style.empty" data-test-id="session-memory-empty">
				{{ i18n.baseText('agentSessions.timeline.memory.empty') }}
			</div>
		</div>
	</div>
</template>

<style module lang="scss">
.panel {
	display: flex;
	flex-direction: column;
	height: 100%;
	min-height: 0;
}

.header {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: var(--spacing--2xs);
	padding: var(--spacing--xs) var(--spacing--sm);
	background-color: var(--background--surface);
	border-bottom: var(--border);
	flex-shrink: 0;
	height: var(--height--4xl);
}

.headerTitle {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	min-width: 0;
	color: var(--text-color);
}

.container {
	display: flex;
	flex-direction: column;
	flex: 1;
	min-height: 0;
	padding: var(--spacing--sm);
	overflow-y: auto;
}

.memory {
	font-family: var(--font-family--monospace);
	font-size: var(--font-size--sm);
	line-height: var(--line-height--xl);
	white-space: pre-wrap;
	word-break: break-word;
	margin: 0;
	color: var(--color--text--tint-1);
}

.empty {
	color: var(--color--text--tint-1);
	text-align: center;
	padding: var(--spacing--sm);
}
</style>
