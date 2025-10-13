<script setup lang="ts">
import { useI18n } from '@n8n/i18n';
import { useClipboard } from '@/composables/useClipboard';
import { N8nButton, N8nTooltip } from '@n8n/design-system';

type Props = {
	value: string;
	allowCopy?: boolean;
	maxWidth?: number;
};

const { copy, copied, isSupported } = useClipboard();
const i18n = useI18n();

const props = withDefaults(defineProps<Props>(), {
	allowCopy: true,
	maxWidth: undefined,
});
</script>

<template>
	<div
		:class="$style.container"
		:style="{ maxWidth: props.maxWidth ? props.maxWidth + 'px' : 'none' }"
	>
		<code>{{ props.value }}</code>
		<div :class="$style['copy-button-wrapper']">
			<slot name="customActions" />
			<N8nTooltip
				:disables="!isSupported"
				:content="copied ? i18n.baseText('generic.copied') : i18n.baseText('generic.copy')"
				placement="right"
			>
				<N8nButton
					v-if="props.allowCopy && isSupported"
					type="tertiary"
					:icon="copied ? 'clipboard-check' : 'clipboard'"
					:square="true"
					:class="$style['copy-button']"
					@click="copy(props.value)"
				/>
			</N8nTooltip>
		</div>
	</div>
</template>

<style module lang="scss">
.container {
	display: flex;
	align-items: stretch;
	gap: var(--spacing--2xs);
	background: var(--color--background--light-3);
	border: var(--border);
	border-radius: var(--radius);
	font-size: var(--font-size--sm);
	overflow: hidden;

	button {
		border: none;
		border-radius: 0;

		&:hover {
			border-color: inherit;
		}
	}

	button + button {
		border-left: var(--border);
	}

	@media screen and (max-width: 820px) {
		word-wrap: break-word;
		margin-top: var(--spacing--2xs);
	}
}

code {
	text-overflow: ellipsis;
	overflow: hidden;
	white-space: pre;
	padding: var(--spacing--2xs) var(--spacing--3xs);
}

.copy-button-wrapper {
	display: flex;
	align-items: center;
	border-left: var(--border);
}

.copy-button {
	border: none;
	border-radius: 0;
}
</style>
