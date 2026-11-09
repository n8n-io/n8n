<script setup lang="ts">
import { truncateBeforeLast } from '@n8n/utils/string/truncate';
import { usePreferredReducedMotion } from '@vueuse/core';
import { computed, nextTick, onBeforeUnmount, ref, useTemplateRef, watch } from 'vue';
import { useI18n } from '../../../composables/useI18n';
import N8nIcon from '../../N8nIcon';
import N8nIconButton from '../../N8nIconButton';
import N8nText from '../../N8nText';
import N8nTooltip from '../../N8nTooltip';
import type { AttachmentEmits, AttachmentProps } from './Attachment.types';
import poofSprite from './mono-poof-sprite.svg?url';

const props = withDefaults(defineProps<AttachmentProps>(), {
	isRemovable: true,
});
const emit = defineEmits<AttachmentEmits>();

const { t } = useI18n();

const MAX_FILE_NAME_CHARS = 20;
/** Keep the source frame timing, but omit its loop pause. */
const POOF_DURATION_MS = 520;
/** Close the gap after the initial burst. */
const POOF_COLLAPSE_DELAY_MS = 160;
/** Keep attachment actions small and prevent form submission. */
const actionButtonProps = { size: 'small', variant: 'solid', type: 'button' } as const;

const hasPreviewError = ref(false);
watch(
	() => props.src,
	() => {
		hasPreviewError.value = false;
	},
);

function onPreviewError() {
	hasPreviewError.value = true;
	emit('error');
}

const isHovered = ref(false);
const isReturning = ref(false);
const isSpaceReleased = ref(false);
const isRemoving = ref(false);
const poofRect = ref<DOMRect>();
const spriteReady = ref(false);
const isPlaying = ref(false);

const reducedMotion = usePreferredReducedMotion();
const attachmentRoot = useTemplateRef<HTMLDivElement>('attachmentRoot');

let removalEmitted = false;
let collapseTimeout: ReturnType<typeof setTimeout> | undefined;
let removalTimeout: ReturnType<typeof setTimeout> | undefined;

function finishRemoval() {
	if (!isRemoving.value || removalEmitted) return;
	clearTimeout(removalTimeout);
	clearTimeout(collapseTimeout);
	isSpaceReleased.value = true;
	removalEmitted = true;
	emit('remove');
}

function startPlayback() {
	spriteReady.value = true;
	if (!isRemoving.value || isPlaying.value) return;
	isPlaying.value = true;
	collapseTimeout = setTimeout(() => {
		isSpaceReleased.value = true;
	}, POOF_COLLAPSE_DELAY_MS);
	clearTimeout(removalTimeout);
	/** Recover if the browser does not send animationend. */
	removalTimeout = setTimeout(finishRemoval, POOF_DURATION_MS + 200);
}

function removeAttachment() {
	if (isRemoving.value) return;
	poofRect.value = attachmentRoot.value?.getBoundingClientRect();
	isRemoving.value = true;
	if (reducedMotion.value === 'reduce') {
		finishRemoval();
	} else if (spriteReady.value) {
		startPlayback();
	} else {
		/** Recover if the sprite never loads. Start playback only after load. */
		removalTimeout = setTimeout(finishRemoval, 5000);
	}
}

function onBackspace(event: KeyboardEvent) {
	if (
		!props.isRemovable ||
		event.repeat ||
		event.altKey ||
		event.ctrlKey ||
		event.metaKey ||
		event.shiftKey ||
		event.isComposing ||
		event.target !== event.currentTarget
	) {
		return;
	}

	event.preventDefault();
	removeAttachment();
}

function finishPoof(event: AnimationEvent) {
	if (event.target === event.currentTarget) finishRemoval();
}

watch(reducedMotion, (preference) => {
	if (preference === 'reduce') finishRemoval();
});

onBeforeUnmount(() => {
	clearTimeout(removalTimeout);
	clearTimeout(collapseTimeout);
});

const marqueeDistance = ref(0);
const captionViewport = useTemplateRef<HTMLSpanElement>('captionViewport');

async function startMarquee() {
	isHovered.value = true;
	isReturning.value = false;
	await nextTick();
	if (!isHovered.value) return;
	const viewport = captionViewport.value;
	marqueeDistance.value = viewport ? Math.max(0, viewport.scrollWidth - viewport.clientWidth) : 0;
}

function stopMarquee() {
	const name = captionViewport.value?.firstElementChild;
	const transform = name ? getComputedStyle(name).transform : 'none';
	isReturning.value =
		reducedMotion.value !== 'reduce' &&
		marqueeDistance.value > 0 &&
		!!transform &&
		transform !== 'none' &&
		transform !== 'matrix(1, 0, 0, 1, 0, 0)';
	isHovered.value = false;
}

function finishReturn(event: TransitionEvent) {
	if (event.propertyName === 'transform' && !isHovered.value) {
		isReturning.value = false;
	}
}

const displayFileName = computed(() => {
	const extensionIndex = props.fileName.lastIndexOf('.');
	const suffixLength = extensionIndex > 0 ? props.fileName.length - extensionIndex + 2 : 5;

	/** Keep room for the full suffix and skip word-based truncation for file names. */
	return truncateBeforeLast(
		props.fileName,
		Math.max(MAX_FILE_NAME_CHARS, suffixLength + 2),
		suffixLength,
		Infinity,
	);
});

const fileType = computed(() => {
	const mimeType = props.mimeType.split(';')[0].trim().toLowerCase();
	const fileName = props.fileName.toLowerCase();

	if (mimeType.startsWith('image/')) return 'image';
	if (mimeType.startsWith('video/')) return 'video';
	if (mimeType === 'application/pdf' || fileName.endsWith('.pdf')) return 'pdf';
	if (mimeType === 'text/markdown' || fileName.endsWith('.md')) return 'markdown';

	return 'file';
});

const hasImagePreview = computed(
	() => fileType.value === 'image' && !!props.src && !hasPreviewError.value,
);
</script>

<template>
	<div
		v-show="!isSpaceReleased"
		ref="attachmentRoot"
		:class="[$style.container, { [$style.removing]: isRemoving }]"
		@mouseenter="startMarquee"
		@mouseleave="stopMarquee"
	>
		<component
			:is="props.href ? 'a' : 'figure'"
			:href="!isRemoving ? href : undefined"
			:target="href ? '_blank' : undefined"
			:rel="href ? 'noopener noreferrer' : undefined"
			:aria-label="href ? `${fileName}: ${t('commandBar.openInNewTab')}` : undefined"
			:class="['n8n-attachment', $style.attachment]"
			:aria-hidden="isRemoving || undefined"
			:data-type="fileType === 'image' && !hasImagePreview ? 'file' : fileType"
			@keydown.backspace="onBackspace"
		>
			<img
				v-if="hasImagePreview"
				:src="src"
				:alt="fileName"
				:class="$style.coverPreview"
				loading="lazy"
				@load="emit('load')"
				@error="onPreviewError"
			/>
			<video
				v-else-if="fileType === 'video'"
				:src="src"
				:class="$style.coverPreview"
				preload="metadata"
			/>
			<div v-else :class="$style.preview" aria-hidden="true">
				<N8nIcon
					:icon="fileType === 'pdf' ? 'file-text' : fileType === 'markdown' ? 'file-code' : 'file'"
					size="large"
				/>
			</div>
			<component :is="href ? 'div' : 'figcaption'" :class="$style.caption" :title="fileName">
				<span :class="$style.srOnly">{{ fileName }}</span>
				<span
					ref="captionViewport"
					:class="[
						$style.captionViewport,
						{
							[$style.marqueeMask]:
								reducedMotion !== 'reduce' && ((isHovered && marqueeDistance > 0) || isReturning),
						},
					]"
					:style="{ '--marquee-distance': `-${marqueeDistance}px` }"
					aria-hidden="true"
				>
					<N8nText
						size="xsmall"
						:class="[$style.fileName, { [$style.scrolling]: isHovered && marqueeDistance > 0 }]"
						@transitionend="finishReturn"
						>{{ isHovered || isReturning ? fileName : displayFileName }}</N8nText
					>
				</span>
			</component>
		</component>
		<div v-if="isRemovable && !isRemoving" :class="$style.toolbar">
			<N8nTooltip :content="t('generic.remove')">
				<N8nIconButton
					v-bind="actionButtonProps"
					:aria-label="t('attachment.remove', { fileName })"
					data-test-id="attachment-remove"
					icon="trash-2"
					@click.stop="removeAttachment"
				/>
			</N8nTooltip>
		</div>
		<Teleport to="body">
			<div
				:class="[$style.poof, { [$style.playing]: isPlaying }]"
				:style="{
					'--poof-duration': `${POOF_DURATION_MS}ms`,
					left: `${poofRect?.left ?? 0}px`,
					top: `${poofRect?.top ?? 0}px`,
					width: `${poofRect?.width ?? 0}px`,
					height: `${poofRect?.height ?? 0}px`,
				}"
				aria-hidden="true"
			>
				<img
					:src="poofSprite"
					role="presentation"
					:class="$style.sprite"
					@load="startPlayback"
					@error="finishRemoval"
					@animationend="finishPoof"
				/>
			</div>
		</Teleport>
	</div>
</template>

<style module lang="scss">
@use '../../../css/common/var';
@use '../../../css/mixins/utils';
@use '../../../css/mixins/motion';
@use '../../../css/mixins/mixins';
@use '../../../css/mixins/_focus' as focus;

.container {
	position: relative;
	isolation: isolate;
	flex-shrink: 0;
	width: fit-content;
	border-radius: var(--radius--md);
}

.removing {
	visibility: hidden;
	pointer-events: none;
}

.poof {
	position: fixed;
	z-index: var.$index-popper;
	overflow: hidden;
	visibility: hidden;
	pointer-events: none;
}

.sprite {
	display: block;
	width: 400%;
	max-width: none;
	height: 300%;
}

.playing {
	visibility: visible;

	.sprite {
		/** Keep unequal frame delays without the source loop pause. */
		animation: poof var(--poof-duration) steps(1, end) 1 forwards;
	}
}

/** The source sheet has four columns and three rows. */
@keyframes poof {
	0% {
		transform: translate(0, 0);
	}
	7.692308% {
		transform: translate(-25%, 0);
	}
	15.384615% {
		transform: translate(-50%, 0);
	}
	30.769231% {
		transform: translate(-75%, 0);
	}
	38.461538% {
		transform: translate(0, -33.333333%);
	}
	46.153846% {
		transform: translate(-25%, -33.333333%);
	}
	53.846154% {
		transform: translate(-50%, -33.333333%);
	}
	61.538462% {
		transform: translate(-75%, -33.333333%);
	}
	69.230769% {
		transform: translate(0, -66.666667%);
	}
	76.923077% {
		transform: translate(-25%, -66.666667%);
	}
	84.615385% {
		transform: translate(-50%, -66.666667%);
	}
	92.307692%,
	100% {
		transform: translate(-75%, -66.666667%);
	}
}

.toolbar {
	position: absolute;
	inset-block-start: var(--spacing--4xs);
	inset-inline-end: var(--spacing--4xs);
	z-index: var.$index-normal;
	display: flex;
	gap: var(--spacing--4xs);
	opacity: 0;
	pointer-events: none;
}

.container:hover .toolbar,
.container:focus-within .toolbar {
	opacity: 1;
	pointer-events: auto;
}

@media (hover: none) {
	.toolbar {
		opacity: 1;
		pointer-events: auto;
	}
}

.attachment {
	position: relative;
	overflow: hidden;
	display: grid;
	grid-template-rows: minmax(0, 1fr) auto;
	aspect-ratio: 1;
	height: var(--height--4xl);
	border-radius: var(--radius--md);
	background-color: var(--n8n-attachment--background-color, var(--background--surface));
	outline: 1px solid var(--color--black-alpha-100);
	border: 1px solid transparent;
	/** This needs to be double border so offset sits over media **/
	outline-offset: -2px;
	transition: translate var(--duration--snappy) var(--easing--ease-out);

	@include motion.reduced-motion;

	.coverPreview {
		grid-area: 1/1;
		width: 100%;
		height: 100%;
		object-fit: cover;
	}

	.preview {
		grid-area: 1/1;
		place-self: stretch;
		display: grid;
		place-items: center;
		color: var(--text-color--subtle);
		background-color: var(--background--subtle);
		background-image: radial-gradient(
			circle,
			var(--border-color) calc(var(--spacing--5xs) / 2),
			transparent calc(var(--spacing--5xs) / 2)
		);
		background-size: var(--spacing--2xs) var(--spacing--2xs);
	}

	&:focus-visible {
		@include focus.focus-ring-with-border;
		outline-offset: 0;
	}
}

.srOnly {
	@include utils.utils-sr-only;
}
.captionViewport {
	display: flex;
	min-width: 0;
	width: auto;
	overflow: hidden;
	padding-inline: var(--spacing--2xs);
	margin-inline: calc(var(--spacing--5xs) * -1);
	@include mixins.scroll-mask(right);

	&.marqueeMask {
		@include mixins.scroll-mask(x);
	}
}

.fileName {
	display: inline-block;
	white-space: nowrap;
	transform: translateX(0);
	transition: transform calc(var(--duration--slowest) * 3) linear;
	@include motion.reduced-motion;
}

.scrolling {
	transform: translateX(var(--marquee-distance));
}
.caption {
	min-width: 0;
	display: flex;
	justify-content: flex-start;
	align-items: center;
	height: var(--height--2xs);
	border-top: var(--border);
	user-select: none;
}
.attachment[data-type='image'] .caption,
.attachment[data-type='video'] .caption {
	@include utils.utils-sr-only;
}
</style>
