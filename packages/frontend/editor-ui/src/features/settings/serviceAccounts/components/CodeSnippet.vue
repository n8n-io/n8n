<script setup lang="ts">
import { useClipboard } from '@n8n/composables/useClipboard';
import { N8nButton, N8nMarkdown, N8nTooltip } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { computed } from 'vue';

const props = defineProps<{
	/** Raw snippet; rendered as a copyable fenced code block. */
	value: string;
	/** Fence language for syntax highlighting. */
	language?: string;
}>();

const i18n = useI18n();
const { copy, copied, isSupported } = useClipboard();

const code = computed(() => `\`\`\`${props.language ?? 'bash'}\n${props.value}\n\`\`\``);

const onCopy = async () => await copy(props.value);
</script>

<template>
	<div :class="$style.container" data-test-id="code-snippet">
		<N8nMarkdown :content="code" />
		<div :class="$style.copyWrapper">
			<N8nTooltip
				placement="bottom-end"
				:disabled="!isSupported"
				:content="copied ? i18n.baseText('generic.copied') : i18n.baseText('generic.copy')"
			>
				<N8nButton
					v-if="isSupported"
					variant="ghost"
					iconOnly
					:icon="copied ? 'check' : 'copy'"
					:class="$style.copyButton"
					data-test-id="code-snippet-copy"
					@click="onCopy"
				/>
			</N8nTooltip>
		</div>
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
		padding-right: var(--spacing--xl) !important;
		tab-size: 1;
		background: none !important;
		overflow-x: auto;
	}
}

.copyWrapper {
	position: absolute;
	top: var(--spacing--2xs);
	right: var(--spacing--2xs);
}

/* Icon-only buttons are forced to a square (width = button height) with the icon
   centred, leaving dead space each side; shrink to the glyph so it sits flush. */
.copyButton {
	width: auto !important;

	> * {
		width: auto !important;
	}
}
</style>
