<script setup lang="ts">
import { computed, ref } from 'vue';
import { useI18n } from '@n8n/i18n';
import {
	AVATAR_BACKGROUND_COLORS,
	N8nButton,
	N8nEmptyState,
	N8nSlider,
	N8nText,
	type SliderValue,
	type UserAvatarBackground,
} from '@n8n/design-system';

import {
	AVATAR_ACCEPT_ATTRIBUTE,
	AVATAR_MAX_SOURCE_BYTES,
	AVATAR_MAX_ZOOM,
	AVATAR_MIN_ZOOM,
	cropPreviewStyle,
	cropRectangle,
	type CropState,
	type DecodedAvatarSource,
} from './avatarImage';
import AvatarStageNote from './AvatarStageNote.vue';

/**
 * The "Upload" side of the avatar dialog: pick a file and frame it. The
 * dialog owns the decoded picture, the crop and the backdrop a transparent
 * picture sits on, so it can render the final image on save.
 */

const KEYBOARD_PAN_STEP = 0.08;

const props = defineProps<{
	/** A freshly chosen picture, not yet uploaded. */
	source: DecodedAvatarSource | null;
	crop: CropState;
	/** The picture already on the server, when there is one. */
	existingUrl: string | null;
	/** The backdrop a see-through picture sits on; dealt by the dialog, not chosen here. */
	background: UserAvatarBackground;
	/** Whether the shown picture has see-through pixels, so the backdrop shows. */
	hasTransparency: boolean;
	/** Instance setting; when off, an existing picture can still be removed. */
	uploadsEnabled: boolean;
	busy: boolean;
}>();

const emit = defineEmits<{
	pick: [file: File];
	remove: [];
	'update:crop': [crop: CropState];
}>();

const i18n = useI18n();

const fileInput = ref<HTMLInputElement | null>(null);
const isDragOver = ref(false);

const dropzoneHint = i18n.baseText('auth.avatar.upload.dropzone.hint', {
	interpolate: { megabytes: Math.round(AVATAR_MAX_SOURCE_BYTES / (1024 * 1024)) },
});

const backdropColor = computed(() =>
	props.hasTransparency ? AVATAR_BACKGROUND_COLORS[props.background] : undefined,
);

const previewStyle = computed(() =>
	props.source ? cropPreviewStyle(props.source, props.crop) : undefined,
);

const canPan = computed(() => {
	if (!props.source) return { x: false, y: false };
	const { size } = cropRectangle(props.source, props.crop);
	return { x: props.source.width - size > 1, y: props.source.height - size > 1 };
});

const openFilePicker = () => {
	if (!props.uploadsEnabled || props.busy) return;
	fileInput.value?.click();
};

const onFileChosen = (event: Event) => {
	const input = event.target as HTMLInputElement;
	const file = input.files?.[0];
	// Reset so choosing the same file again still fires `change`.
	input.value = '';
	if (file) emit('pick', file);
};

const onDrop = (event: DragEvent) => {
	isDragOver.value = false;
	if (!props.uploadsEnabled || props.busy) return;
	const file = event.dataTransfer?.files?.[0];
	if (file) emit('pick', file);
};

const onDragOver = () => {
	if (props.uploadsEnabled && !props.busy) isDragOver.value = true;
};

const updateCrop = (patch: Partial<CropState>) => {
	emit('update:crop', { ...props.crop, ...patch });
};

const onZoom = ([zoom]: SliderValue) => updateCrop({ zoom });
/** "1.4" means nothing read aloud; "140%" does. */
const zoomValueText = (zoom: number) => `${Math.round(zoom * 100)}%`;

/** Drag to pan. Pointer movement is converted from frame pixels to pan fractions. */
const dragStart = ref<{ x: number; y: number; panX: number; panY: number } | null>(null);

const onPointerDown = (event: PointerEvent) => {
	if (!props.source || props.busy) return;
	(event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
	dragStart.value = {
		x: event.clientX,
		y: event.clientY,
		panX: props.crop.panX,
		panY: props.crop.panY,
	};
};

const onPointerMove = (event: PointerEvent) => {
	if (!dragStart.value || !props.source) return;
	const frameSize = (event.currentTarget as HTMLElement).clientWidth;
	if (!frameSize) return;
	const { size } = cropRectangle(props.source, props.crop);
	const scale = frameSize / size;
	const slackX = props.source.width - size;
	const slackY = props.source.height - size;
	const dx = event.clientX - dragStart.value.x;
	const dy = event.clientY - dragStart.value.y;
	const clampPan = (pan: number) => Math.min(1, Math.max(-1, pan));
	updateCrop({
		panX: slackX > 0 ? clampPan(dragStart.value.panX - (2 * dx) / (scale * slackX)) : 0,
		panY: slackY > 0 ? clampPan(dragStart.value.panY - (2 * dy) / (scale * slackY)) : 0,
	});
};

const onPointerUp = (event: PointerEvent) => {
	if (!dragStart.value) return;
	(event.currentTarget as HTMLElement).releasePointerCapture(event.pointerId);
	dragStart.value = null;
};

const onFrameKeydown = (event: KeyboardEvent) => {
	if (!props.source) return;
	const clampPan = (pan: number) => Math.min(1, Math.max(-1, pan));
	const moves: Record<string, Partial<CropState>> = {
		ArrowLeft: { panX: clampPan(props.crop.panX - KEYBOARD_PAN_STEP) },
		ArrowRight: { panX: clampPan(props.crop.panX + KEYBOARD_PAN_STEP) },
		ArrowUp: { panY: clampPan(props.crop.panY - KEYBOARD_PAN_STEP) },
		ArrowDown: { panY: clampPan(props.crop.panY + KEYBOARD_PAN_STEP) },
	};
	const move = moves[event.key];
	if (!move) return;
	event.preventDefault();
	updateCrop(move);
};

const onWheel = (event: WheelEvent) => {
	if (!props.source) return;
	event.preventDefault();
	const next = props.crop.zoom - event.deltaY * 0.002;
	updateCrop({ zoom: Math.min(AVATAR_MAX_ZOOM, Math.max(AVATAR_MIN_ZOOM, next)) });
};
</script>

<template>
	<div :class="$style.root" data-test-id="avatar-upload-panel">
		<input
			ref="fileInput"
			type="file"
			:accept="AVATAR_ACCEPT_ATTRIBUTE"
			hidden
			data-test-id="avatar-file-input"
			@change="onFileChosen"
		/>

		<!-- A fresh picture: the frame takes the stage's height, its controls sit beside it. -->
		<div v-if="source" :class="$style.crop">
			<div
				:class="[$style.frame, { [$style.frameDragging]: dragStart }]"
				tabindex="0"
				role="group"
				:aria-label="i18n.baseText('auth.avatar.upload.crop.ariaLabel')"
				data-test-id="avatar-crop-frame"
				@pointerdown="onPointerDown"
				@pointermove="onPointerMove"
				@pointerup="onPointerUp"
				@pointercancel="onPointerUp"
				@keydown="onFrameKeydown"
				@wheel="onWheel"
			>
				<div :class="$style.backdrop" :style="{ backgroundColor: backdropColor }"></div>
				<img
					:src="source.previewUrl"
					alt=""
					:class="$style.cropImage"
					:style="previewStyle"
					draggable="false"
				/>
				<div :class="$style.mask" aria-hidden="true"></div>
			</div>

			<div :class="$style.cropControls">
				<div :class="$style.zoom">
					<N8nSlider
						:model-value="[crop.zoom]"
						:label="i18n.baseText('auth.avatar.upload.zoom')"
						:format-value="zoomValueText"
						:min-value="AVATAR_MIN_ZOOM"
						:max-value="AVATAR_MAX_ZOOM"
						:step="0.05"
						size="small"
						:show-step-markers="false"
						:disabled="busy"
						data-test-id="avatar-zoom-slider"
						@update:model-value="onZoom"
					/>
					<N8nText size="xsmall" color="text-light" :class="$style.cropHint">
						{{
							canPan.x || canPan.y
								? i18n.baseText('auth.avatar.upload.crop.hint')
								: i18n.baseText('auth.avatar.upload.crop.hintZoom')
						}}
					</N8nText>
				</div>

				<N8nButton
					variant="outline"
					size="small"
					icon="upload"
					:disabled="busy"
					data-test-id="avatar-choose-another"
					@click="openFilePicker"
				>
					{{ i18n.baseText('auth.avatar.upload.chooseAnother') }}
				</N8nButton>
			</div>
		</div>

		<!--
			A picture already on the server; the orb above shows it. The drop zone stays,
			so a new picture replaces it the same way the first one was added.
		-->
		<N8nEmptyState
			v-else-if="existingUrl && uploadsEnabled"
			:class="[$style.dropzone, { [$style.dropzoneActive]: isDragOver }]"
			size="small"
			:heading="i18n.baseText('auth.avatar.upload.dropzone.replace')"
			:description="dropzoneHint"
			data-test-id="avatar-existing-upload"
			@dragover.prevent="onDragOver"
			@dragleave="isDragOver = false"
			@drop.prevent="onDrop"
		>
			<template #additionalContent>
				<div :class="$style.actions">
					<N8nButton
						variant="outline"
						size="small"
						icon="upload"
						:disabled="busy"
						data-test-id="avatar-replace"
						@click="openFilePicker"
					>
						{{ i18n.baseText('auth.avatar.upload.browse') }}
					</N8nButton>
					<N8nButton
						variant="ghost"
						size="small"
						icon="trash-2"
						:disabled="busy"
						data-test-id="avatar-remove-upload"
						@click="emit('remove')"
					>
						{{ i18n.baseText('auth.avatar.upload.remove') }}
					</N8nButton>
				</div>
			</template>
		</N8nEmptyState>

		<!-- Uploads are off: nothing can be dropped, but the old picture can still go. -->
		<AvatarStageNote
			v-else-if="existingUrl"
			:heading="i18n.baseText('auth.avatar.upload.disabled')"
			:description="i18n.baseText('auth.avatar.upload.disabled.hint')"
			data-test-id="avatar-existing-upload"
		>
			<N8nButton
				variant="outline"
				size="small"
				icon="trash-2"
				:disabled="busy"
				data-test-id="avatar-remove-upload"
				@click="emit('remove')"
			>
				{{ i18n.baseText('auth.avatar.upload.remove') }}
			</N8nButton>
		</AvatarStageNote>

		<!-- Nothing yet: the empty state doubles as the drop zone; its button opens the picker. -->
		<N8nEmptyState
			v-else
			:class="[$style.dropzone, { [$style.dropzoneActive]: isDragOver }]"
			size="small"
			:heading="i18n.baseText('auth.avatar.upload.dropzone')"
			:description="dropzoneHint"
			:button-text="i18n.baseText('auth.avatar.upload.browse')"
			button-variant="outline"
			button-icon="upload"
			:button-disabled="!uploadsEnabled || busy"
			data-test-id="avatar-dropzone"
			@click:button="openFilePicker"
			@dragover.prevent="onDragOver"
			@dragleave="isDragOver = false"
			@drop.prevent="onDrop"
		/>
	</div>
</template>

<style lang="scss" module>
@use '@n8n/design-system/css/mixins/focus';

/*
 * Matches the generator panel's height (set by the dialog), so switching orbs
 * never reshapes the dialog; the drop zone and the note stretch to fill it.
 */
.root {
	display: flex;
	flex-direction: column;
	align-items: stretch;
	justify-content: center;
	min-height: var(--avatar-stage--min-height, 0);
}

/* Side by side, so framing a picture fits the same height as every other state. */
.crop {
	display: flex;
	gap: var(--spacing--md);
}

.frame {
	position: relative;
	flex-shrink: 0;
	height: var(--avatar-stage--min-height, 172px);
	aspect-ratio: 1;
	overflow: hidden;
	border-radius: var(--radius--lg);
	cursor: grab;
	touch-action: none;
	user-select: none;
	/* A checkerboard so transparent pixels read as transparent. */
	background-color: var(--color--neutral-100);
	background-image:
		linear-gradient(45deg, var(--color--neutral-200) 25%, transparent 25%),
		linear-gradient(-45deg, var(--color--neutral-200) 25%, transparent 25%),
		linear-gradient(45deg, transparent 75%, var(--color--neutral-200) 75%),
		linear-gradient(-45deg, transparent 75%, var(--color--neutral-200) 75%);
	background-size: 16px 16px;
	background-position:
		0 0,
		0 8px,
		8px -8px,
		-8px 0;

	@include focus.focus-visible-ring-offset;
}

.frameDragging {
	cursor: grabbing;
}

.backdrop {
	position: absolute;
	inset: 0;
}

/* Sized and placed by `cropPreviewStyle`; the global image caps must not interfere. */
.cropImage {
	position: absolute;
	display: block;
	max-width: none;
	max-height: none;
	pointer-events: none;
}

/* Darkens what falls outside the circle without hiding it. */
.mask {
	position: absolute;
	inset: 0;
	border-radius: 50%;
	box-shadow: 0 0 0 999px rgba(0, 0, 0, 0.45);
	pointer-events: none;
}

/*
 * One group, centred against the frame. Both crop hints fit on one line, so
 * swapping them while zooming doesn't shift the group.
 */
.cropControls {
	flex: 1;
	min-width: 0;
	display: flex;
	flex-direction: column;
	justify-content: center;
	align-items: flex-start;
	gap: var(--spacing--sm);
}

.zoom {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
	align-self: stretch;
}

.cropHint {
	text-wrap: pretty;
}

.actions {
	display: flex;
	justify-content: center;
	gap: var(--spacing--2xs);
}

/*
 * The small empty state stretches to the stage height the generator panel
 * sets and centres its content, so the two panels line up edge to edge.
 */
.root .dropzone {
	flex: 1;
	justify-content: center;
	/*
	 * The empty state's own border color is the dialog's background in the dark
	 * theme, which would leave "Drop a picture here" with no visible "here".
	 */
	border-color: var(--border-color--strong);
	transition:
		border-color var(--duration--snappy) var(--easing--ease-out),
		background-color var(--duration--snappy) var(--easing--ease-out);

	/* A wash of brand pink marks the moment a picture is about to land. */
	&.dropzoneActive {
		border-color: var(--color--pink-500);
		background: light-dark(
			var(--color--pink-200),
			color-mix(in srgb, var(--color--pink-500) 22%, var(--background--surface))
		);
	}

	@media (prefers-reduced-motion: reduce) {
		transition: none;
	}
}
</style>
