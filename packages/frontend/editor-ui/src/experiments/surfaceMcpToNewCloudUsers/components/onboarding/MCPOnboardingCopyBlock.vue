<script setup lang="ts">
import { useClipboard } from '@/app/composables/useClipboard';
import { N8nIconButton, N8nMarkdown, N8nTooltip } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { computed, ref } from 'vue';

const props = withDefaults(
	defineProps<{
		content: string;
		copyTooltip?: string;
		copyButtonTestId?: string;
	}>(),
	{
		copyTooltip: undefined,
		copyButtonTestId: undefined,
	},
);

const emit = defineEmits<{
	copy: [value: string];
}>();

const i18n = useI18n();
const { copy } = useClipboard();

const justCopied = ref(false);
let copyResetTimeout: ReturnType<typeof setTimeout> | null = null;

const markdown = computed(() => `\`\`\`\n${props.content}\n\`\`\``);
const copyTooltip = computed(() =>
	justCopied.value
		? i18n.baseText('experiments.surfaceMcpToNewCloudUsers.onboarding.copy.copied')
		: (props.copyTooltip ?? i18n.baseText('generic.copy')),
);

async function handleCopy() {
	await copy(props.content);
	emit('copy', props.content);

	justCopied.value = true;
	if (copyResetTimeout) {
		clearTimeout(copyResetTimeout);
	}
	copyResetTimeout = setTimeout(() => {
		justCopied.value = false;
	}, 1800);
}
</script>

<template>
	<div :class="$style.codeBlock">
		<div :class="$style.codeToolbar">
			<N8nTooltip :content="copyTooltip" placement="top">
				<N8nIconButton
					icon="copy"
					variant="ghost"
					size="small"
					:aria-label="copyTooltip"
					:data-test-id="copyButtonTestId"
					@click="handleCopy"
				/>
			</N8nTooltip>
		</div>
		<N8nMarkdown :content="markdown" />
	</div>
</template>

<style lang="scss" module>
.codeBlock {
	position: relative;
	border: var(--border);
	border-radius: var(--radius);
	background: var(--background--surface);
	overflow: hidden;
	width: 100%;

	:global(.n8n-markdown) {
		width: 100%;
	}

	:global(pre) {
		margin: 0;
		max-height: 240px;
		overflow-y: auto;
	}

	:global(code) {
		display: block;
		overflow-x: auto;
		font-size: var(--font-size--3xs);
		line-height: 1.55;
		padding-right: var(--spacing--xl);
	}
}

.codeToolbar {
	position: absolute;
	top: var(--spacing--4xs);
	right: var(--spacing--4xs);
	z-index: 1;
	background: var(--background--surface);
	border-radius: var(--radius--xs);
	padding: var(--spacing--5xs);
}
</style>
