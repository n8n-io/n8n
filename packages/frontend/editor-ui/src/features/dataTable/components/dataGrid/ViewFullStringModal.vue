<script setup lang="ts">
import { computed } from 'vue';
import { N8nButton } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';

const props = defineProps<{
	value: string;
	modelValue: boolean;
}>();

const emit = defineEmits<{
	'update:modelValue': [value: boolean];
	copy: [];
}>();

const i18n = useI18n();

const lineCount = computed(() => {
	return props.value.split('\n').length;
});

const sizeInKB = computed(() => {
	const bytes = new Blob([props.value]).size;
	return (bytes / 1024).toFixed(1);
});

const handleClose = () => {
	emit('update:modelValue', false);
};

const handleCopy = () => {
	emit('copy');
};
</script>

<template>
	<div v-if="modelValue" :class="$style.overlay" @click.self="handleClose">
		<div :class="$style.modal" data-test-id="view-full-string-modal">
			<div :class="$style.header">
				<h3 :class="$style.title">
					{{ i18n.baseText('dataTable.viewFullModal.title') }}
				</h3>
				<div :class="$style.info">
					{{ i18n.baseText('dataTable.viewFullModal.info', {
						interpolate: { lines: String(lineCount), size: sizeInKB }
					}) }}
				</div>
			</div>
			<div :class="$style.content">
				<pre :class="$style.pre">{{ value }}</pre>
			</div>
			<div :class="$style.footer">
				<N8nButton
					type="secondary"
					:label="i18n.baseText('dataTable.viewFullModal.copy')"
					data-test-id="copy-full-string-button"
					@click="handleCopy"
				/>
				<N8nButton
					type="primary"
					:label="i18n.baseText('dataTable.viewFullModal.close')"
					data-test-id="close-full-string-button"
					@click="handleClose"
				/>
			</div>
		</div>
	</div>
</template>

<style module lang="scss">
.overlay {
	position: fixed;
	top: 0;
	left: 0;
	right: 0;
	bottom: 0;
	background-color: rgba(0, 0, 0, 0.5);
	display: flex;
	align-items: center;
	justify-content: center;
	z-index: 9999;
	padding: var(--spacing--lg);
}

.modal {
	background-color: var(--color--background--light-3);
	border-radius: var(--radius);
	box-shadow: var(--box-shadow--large);
	display: flex;
	flex-direction: column;
	max-width: 900px;
	max-height: 80vh;
	width: 100%;
}

.header {
	padding: var(--spacing--lg);
	border-bottom: var(--border-width) var(--border-style) var(--border-color);
}

.title {
	margin: 0 0 var(--spacing--2xs) 0;
	font-size: var(--font-size--lg);
	font-weight: var(--font-weight--medium);
	color: var(--color--text);
}

.info {
	font-size: var(--font-size--xs);
	color: var(--color--text--tint-1);
}

.content {
	flex: 1;
	overflow: auto;
	padding: var(--spacing--lg);
	min-height: 200px;
}

.pre {
	margin: 0;
	padding: var(--spacing--md);
	background-color: var(--color--background--light-1);
	border-radius: var(--radius);
	border: var(--border-width) var(--border-style) var(--border-color);
	font-family: var(--font-family--monospace);
	font-size: var(--font-size--2xs);
	line-height: 1.5;
	// Ensure content is rendered as text only (no HTML)
	white-space: pre-wrap;
	word-break: break-word;
	overflow-wrap: anywhere;
	color: var(--color--text);
}

.footer {
	display: flex;
	justify-content: flex-end;
	gap: var(--spacing--xs);
	padding: var(--spacing--lg);
	border-top: var(--border-width) var(--border-style) var(--border-color);
}
</style>
