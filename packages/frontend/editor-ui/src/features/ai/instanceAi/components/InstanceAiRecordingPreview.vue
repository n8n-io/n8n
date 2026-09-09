<script lang="ts" setup>
import { computed, onBeforeUnmount, ref, watch } from 'vue';
import { N8nButton, N8nIcon, N8nText } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { useRootStore } from '@n8n/stores/useRootStore';
import { useToast } from '@n8n/composables/useToast';
import { discardBrowserRecording, stopBrowserRecording } from '../instanceAi.api';

/** How long each screenshot stays on screen by default — used as-is for a handful of
 *  frames. As more arrive, the per-frame duration shrinks so the whole loop still
 *  takes about TOTAL_LOOP_MS to cycle once, instead of a longer and longer flip-book. */
const DEFAULT_FRAME_MS = 2000;
const TOTAL_LOOP_MS = 5000;

function frameDurationMs(frameCount: number): number {
	return Math.min(DEFAULT_FRAME_MS, TOTAL_LOOP_MS / frameCount);
}

const props = withDefaults(
	defineProps<{
		actionCount: number;
		elapsedMs: number;
		caption?: string;
		/** Whether the recording is still live. false renders the finished recap instead —
		 *  same layout, no stop/discard actions. */
		isRecording?: boolean;
		screenshots?: Array<{ actionId: string; mimeType: string; data: string }>;
		/** Whether the preview panel is expanded to fill the thread view — scales the
		 *  summary text and flip-book up to use the extra space instead of staying
		 *  pinned to their small fixed-panel size. */
		isExpanded?: boolean;
	}>(),
	{ isRecording: true, screenshots: () => [], isExpanded: false },
);

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

const frameIndex = ref(0);
let frameInterval: ReturnType<typeof setInterval> | undefined;

function stopFraming() {
	clearInterval(frameInterval);
	frameInterval = undefined;
}

// Loops over the screenshots received so far. Restarts the timer on every arrival,
// both to extend the range the modulo cycles over and to re-pace it via
// frameDurationMs — a later screenshot changes the frame count, so the per-frame
// duration for a still-growing recording keeps shrinking as it goes.
watch(
	() => props.screenshots.length,
	(length) => {
		stopFraming();
		if (length === 0) {
			frameIndex.value = 0;
			return;
		}
		frameInterval = setInterval(() => {
			frameIndex.value = (frameIndex.value + 1) % props.screenshots.length;
		}, frameDurationMs(length));
	},
	{ immediate: true },
);

onBeforeUnmount(stopFraming);

const currentScreenshot = computed(() => props.screenshots[frameIndex.value]);

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
		<div :class="[$style.centerState, { [$style.centerStateExpanded]: isExpanded }]">
			<img
				v-if="currentScreenshot"
				:key="currentScreenshot.actionId"
				:src="`data:${currentScreenshot.mimeType};base64,${currentScreenshot.data}`"
				:class="[$style.frame, { [$style.frameExpanded]: isExpanded }]"
				alt=""
			/>
			<N8nIcon
				v-else
				icon="circle-dot"
				:size="48"
				:class="[$style.recordingIcon, { [$style.finished]: !isRecording }]"
			/>
			<N8nText :size="isExpanded ? 'xlarge' : 'large'" bold>
				{{
					i18n.baseText(
						isRecording
							? 'instanceAi.recordingPreview.status'
							: 'instanceAi.recordingPreview.finishedStatus',
					)
				}}
			</N8nText>
			<N8nText :size="isExpanded ? 'medium' : undefined" color="text-light">{{
				elapsedLabel
			}}</N8nText>
			<N8nText :size="isExpanded ? 'medium' : undefined" color="text-light">
				{{
					i18n.baseText('instanceAi.recordingPreview.actionsRecorded', {
						interpolate: { count: actionCount },
					})
				}}
			</N8nText>
			<N8nText
				v-if="caption"
				color="text-light"
				:size="isExpanded ? 'medium' : 'small'"
				:class="$style.caption"
			>
				{{ caption }}
			</N8nText>
			<div v-if="isRecording" :class="$style.actions">
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

.centerStateExpanded {
	max-width: 80%;
}

.frame {
	max-width: 100%;
	max-height: 180px;
	object-fit: contain;
	border-radius: var(--radius--sm);
}

.frameExpanded {
	max-height: 65vh;
}

.recordingIcon {
	color: var(--color--danger);
}

.finished {
	color: var(--color--text--tint-1);
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
