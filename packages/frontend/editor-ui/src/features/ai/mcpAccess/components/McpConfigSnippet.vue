<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from '@n8n/i18n';
import { useClipboard } from '@/app/composables/useClipboard';
import { N8nButton, N8nMarkdown, N8nTooltip } from '@n8n/design-system';
import { MCP_TOOLTIP_DELAY } from '@/features/ai/mcpAccess/mcp.constants';

const props = defineProps<{
	/** Raw config snippet; rendered as a copyable code block. */
	value: string;
	/** Fence language for syntax highlighting. */
	language?: string;
}>();

const emit = defineEmits<{
	copy: [value: string];
}>();

const i18n = useI18n();
const { copy, copied, isSupported } = useClipboard();

const code = computed(() => `\`\`\`${props.language ?? 'json'}\n${props.value}\n\`\`\``);

const handleCopy = async () => {
	await copy(props.value);
	emit('copy', props.value);
};
</script>

<template>
	<div :class="$style.container" data-test-id="mcp-config-snippet">
		<N8nMarkdown :content="code" />
		<N8nTooltip
			:disabled="!isSupported"
			:content="copied ? i18n.baseText('generic.copied') : i18n.baseText('generic.copy')"
			:show-after="MCP_TOOLTIP_DELAY"
		>
			<N8nButton
				v-if="isSupported"
				variant="subtle"
				iconOnly
				:icon="copied ? 'check' : 'copy'"
				:class="$style['copy-button']"
				data-test-id="mcp-config-snippet-copy"
				@click="handleCopy"
			/>
		</N8nTooltip>
	</div>
</template>

<style lang="scss" module>
.container {
	position: relative;

	:global(.n8n-markdown) {
		width: 100%;
	}

	code {
		display: block;
		color: var(--color--text) !important;
		font-size: var(--font-size--2xs);
		padding: var(--spacing--2xs) !important;
		tab-size: 1;
		background: none !important;
		border: var(--border);
		border-radius: var(--radius);
		overflow-x: auto;
	}

	&:hover .copy-button {
		display: flex;
	}
}

.copy-button {
	position: absolute;
	top: var(--spacing--3xs);
	right: var(--spacing--3xs);
	display: none;
}
</style>
