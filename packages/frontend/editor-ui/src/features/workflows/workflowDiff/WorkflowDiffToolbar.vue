<script setup lang="ts">
import { N8nButton, N8nCheckbox, N8nHeading, N8nIconButton } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';

defineProps<{
	title?: string;
	hideTitle?: boolean;
	showBackButton?: boolean;
	showFullscreenButton?: boolean;
	isFullscreen?: boolean;
	disabled?: boolean;
}>();
const syncIsEnabled = defineModel<boolean>('syncIsEnabled', { default: true });
const emit = defineEmits<{ back: []; previous: []; next: []; fullscreen: [] }>();
const i18n = useI18n();
</script>
<template>
	<div :class="$style.header">
		<div :class="$style.headerLeft">
			<slot name="header-prefix" />
			<N8nIconButton
				v-if="showBackButton"
				variant="outline"
				icon="arrow-left"
				:aria-label="i18n.baseText('generic.back')"
				:class="[$style.backButton, 'mr-xs']"
				icon-size="large"
				@click="emit('back')"
			/>
			<N8nHeading v-if="!hideTitle || isFullscreen" tag="h4" size="medium">
				{{ title }}
			</N8nHeading>
		</div>

		<div :class="$style.headerRight">
			<N8nCheckbox
				v-model="syncIsEnabled"
				:disabled="disabled"
				label-size="small"
				:label="i18n.baseText('workflowDiff.syncViews')"
				class="mb-0 mr-s"
			/>
			<slot name="changes">
				<N8nButton variant="outline" :disabled="disabled">{{
					i18n.baseText('workflowDiff.changes')
				}}</N8nButton>
			</slot>
			<N8nIconButton
				variant="outline"
				icon="chevron-left"
				:aria-label="i18n.baseText('workflowDiff.previousChange')"
				:class="$style.navigationButton"
				:disabled="disabled"
				@click="emit('previous')"
			/>
			<N8nIconButton
				variant="outline"
				icon="chevron-right"
				:aria-label="i18n.baseText('workflowDiff.nextChange')"
				:class="$style.navigationButton"
				:disabled="disabled"
				@click="emit('next')"
			/>
			<N8nIconButton
				v-if="showFullscreenButton"
				variant="outline"
				:icon="isFullscreen ? 'minimize-2' : 'maximize-2'"
				:title="
					i18n.baseText(
						isFullscreen ? 'workflowDiff.fullscreen.exit' : 'workflowDiff.fullscreen.enter',
					)
				"
				:aria-label="
					i18n.baseText(
						isFullscreen ? 'workflowDiff.fullscreen.exit' : 'workflowDiff.fullscreen.enter',
					)
				"
				:class="$style.fullscreenButton"
				data-test-id="workflow-diff-fullscreen-toggle"
				:disabled="disabled"
				@click="emit('fullscreen')"
			/>
		</div>
	</div>
</template>
<style module lang="scss">
.fullscreenButton {
	margin-left: var(--spacing--2xs);
}
.header {
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding: 11px 16px;
	border-bottom: 1px solid var(--color--foreground);

	.navigationButton {
		margin-left: var(--spacing--4xs);
	}

	.backButton {
		border: none;
	}
}

.headerLeft,
.headerRight {
	display: flex;
	align-items: center;
}
</style>
