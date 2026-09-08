<script setup lang="ts">
import type { BrowserRecordingCaptureSettings } from '@n8n/api-types';
import { N8nCheckbox } from '@n8n/design-system';

defineProps<{ settings: BrowserRecordingCaptureSettings }>();

defineEmits<{
	update: [setting: keyof BrowserRecordingCaptureSettings, enabled: boolean];
}>();
</script>

<template>
	<div class="capture-settings">
		<N8nCheckbox
			:model-value="settings.networkRequests"
			label="Include network requests"
			@update:model-value="$emit('update', 'networkRequests', $event)"
		/>
		<p>
			Records request methods, URLs, response statuses, and content types. It doesn't record headers
			or bodies.
		</p>
		<N8nCheckbox
			:model-value="settings.screenshots"
			label="Include screenshots"
			@update:model-value="$emit('update', 'screenshots', $event)"
		/>
		<p>
			Captures the visible page after each action. Screenshots can contain sensitive information.
		</p>
	</div>
</template>

<style scoped lang="scss">
.capture-settings {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
	padding: var(--spacing--sm) var(--spacing--md);
}

p {
	margin: calc(-1 * var(--spacing--3xs)) 0 var(--spacing--xs) var(--spacing--lg);
	font-size: var(--font-size--2xs);
	line-height: var(--line-height--sm);
	color: var(--text-color--subtler);
}
</style>
