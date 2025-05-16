<script setup lang="ts">
import { useClipboard } from '@/composables/useClipboard';
import { useI18n } from '@n8n/i18n';
import { useToast } from '@/composables/useToast';

type Props = {
	label?: string;
	hint?: string;
	value?: string;
	copyButtonText?: string;
	toastTitle?: string;
	toastMessage?: string;
	size?: 'medium' | 'large';
	collapse?: boolean;
	redactValue?: boolean;
	disableCopy?: boolean;
};

const props = withDefaults(defineProps<Props>(), {
	value: '',
	placeholder: '',
	label: '',
	hint: '',
	size: 'medium',
	copyButtonText: useI18n().baseText('generic.copy'),
	toastTitle: useI18n().baseText('generic.copiedToClipboard'),
	disableCopy: false,
});
const emit = defineEmits<{
	copy: [];
}>();

const clipboard = useClipboard();
const { showMessage } = useToast();

function copy() {
	if (props.disableCopy) return;

	emit('copy');
	void clipboard.copy(props.value ?? '');

	showMessage({
		title: props.toastTitle,
		message: props.toastMessage,
		type: 'success',
	});
}
</script>

<template>
	<div>
		<n8n-input-label :label="label">
			<div
				:class="{
					[$style.copyText]: true,
					[$style[size]]: true,
					[$style.collapsed]: collapse,
					[$style.noHover]: disableCopy,
					'ph-no-capture': redactValue,
				}"
				data-test-id="copy-input"
				@click="copy"
			>
				<span ref="copyInputValue">{{ value }}</span>
				<div v-if="!disableCopy" :class="$style.copyButton">
					<span>{{ copyButtonText }}</span>
				</div>
			</div>
		</n8n-input-label>
		<div v-if="hint" :class="$style.hint">{{ hint }}</div>
	</div>
</template>

<style lang="scss" module>
.copyText {
	span {
		font-family: Monaco, Consolas;
		color: var(--color-text-base);
		overflow-wrap: break-word;
	}

	padding: var(--spacing-xs);
	background-color: var(--color-background-light);
	border: var(--border-base);
	border-radius: var(--border-radius-base);
	cursor: pointer;
	position: relative;
	font-weight: var(--font-weight-regular);

	&:hover {
		--display-copy-button: flex;
		width: 100%;
	}
}

.noHover {
	cursor: default;
}

.large {
	span {
		font-size: var(--font-size-s);
		line-height: 1.5;
	}
}

.medium {
	span {
		font-size: var(--font-size-xs);
		line-height: 1;
	}
}

.collapsed {
	white-space: nowrap;
	overflow: hidden;
}

.copyButton {
	display: var(--display-copy-button, none);
	position: absolute;
	top: 0;
	right: 0;
	padding: var(--spacing-xs);
	background-color: var(--color-background-light);
	height: 100%;
	align-items: center;
	border-radius: var(--border-radius-base);

	span {
		font-family: unset;
	}
}

.hint {
	margin-top: var(--spacing-2xs);
	font-size: var(--font-size-2xs);
	line-height: var(--font-line-height-loose);
	font-weight: var(--font-weight-regular);
	word-break: normal;
}
</style>
