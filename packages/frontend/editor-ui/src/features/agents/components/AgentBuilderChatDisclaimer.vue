<script setup lang="ts">
import { useI18n } from '@n8n/i18n';

const i18n = useI18n();
</script>

<template>
	<p :class="$style.disclaimer" data-testid="agent-builder-chat-disclaimer">
		{{ i18n.baseText('instanceAi.input.disclaimer') }}
	</p>
</template>

<style lang="scss" module>
.disclaimer {
	margin: 0;
	text-align: center;
	color: var(--color--text--tint-1);
	font-size: var(--font-size--2xs);
	line-height: var(--line-height--md);
}
</style>
