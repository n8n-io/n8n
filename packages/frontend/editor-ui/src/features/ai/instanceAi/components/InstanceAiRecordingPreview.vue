<script lang="ts" setup>
import { computed, ref } from 'vue';
import { N8nButton, N8nIcon, N8nText } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { useRootStore } from '@n8n/stores/useRootStore';
import { useToast } from '@n8n/composables/useToast';
import { discardBrowserRecording, stopBrowserRecording } from '../instanceAi.api';

const props = defineProps<{
	actionCount: number;
	elapsedMs: number;
	caption?: string;
}>();

const i18n = useI18n();
const rootStore = useRootStore();
const toast = useToast();

const isSubmitting = ref(false);

const elapsedLabel = computed(() => {
	const totalSeconds = Math.floor(props.elapsedMs / 1000);
	const minutes = Math.floor(totalSeconds / 60);
	const seconds = totalSeconds % 60;
	return `${minutes}:${seconds.toString().padStart(2, '0')}`;
});

async function stop() {
	if (isSubmitting.value) return;
	isSubmitting.value = true;
	try {
		await stopBrowserRecording(rootStore.restApiContext);
	} catch {
		toast.showError(
			new Error(i18n.baseText('instanceAi.recordingPreview.stopError.message')),
			i18n.baseText('instanceAi.recordingPreview.stopError.title'),
		);
	} finally {
		isSubmitting.value = false;
	}
}

async function discard() {
	if (isSubmitting.value) return;
	isSubmitting.value = true;
	try {
		await discardBrowserRecording(rootStore.restApiContext);
	} catch {
		toast.showError(
			new Error(i18n.baseText('instanceAi.recordingPreview.discardError.message')),
			i18n.baseText('instanceAi.recordingPreview.discardError.title'),
		);
	} finally {
		isSubmitting.value = false;
	}
}
</script>

<template>
	<div :class="$style.content">
		<div :class="$style.centerState">
			<N8nIcon icon="circle-dot" :size="48" :class="$style.recordingIcon" />
			<N8nText size="large" bold>{{ i18n.baseText('instanceAi.recordingPreview.status') }}</N8nText>
			<N8nText color="text-light">{{ elapsedLabel }}</N8nText>
			<N8nText color="text-light">
				{{
					i18n.baseText('instanceAi.recordingPreview.actionsRecorded', {
						interpolate: { count: actionCount },
					})
				}}
			</N8nText>
			<N8nText v-if="caption" color="text-light" size="small" :class="$style.caption">
				{{ caption }}
			</N8nText>
			<div :class="$style.actions">
				<N8nButton
					variant="solid"
					data-test-id="instance-ai-recording-stop"
					:disabled="isSubmitting"
					@click="stop"
				>
					{{ i18n.baseText('instanceAi.recordingPreview.stop') }}
				</N8nButton>
				<N8nButton
					variant="ghost"
					data-test-id="instance-ai-recording-discard"
					:disabled="isSubmitting"
					@click="discard"
				>
					{{ i18n.baseText('instanceAi.recordingPreview.discard') }}
				</N8nButton>
			</div>
		</div>
	</div>
</template>

<style lang="scss" module>
.content {
	flex: 1;
	min-height: 0;
	position: relative;
	height: 100%;
}

.centerState {
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	gap: var(--spacing--xs);
	height: 100%;
	max-width: 320px;
	margin: 0 auto;
	text-align: center;
}

.recordingIcon {
	color: var(--color--danger);
}

.caption {
	font-style: italic;
}

.actions {
	display: flex;
	gap: var(--spacing--2xs);
	margin-top: var(--spacing--sm);
}
</style>
