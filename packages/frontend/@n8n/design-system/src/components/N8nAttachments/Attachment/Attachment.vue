<script setup lang="ts">
import { truncateBeforeLast } from '@n8n/utils/string/truncate';
import { usePreferredReducedMotion } from '@vueuse/core';
import { computed, nextTick, ref, useTemplateRef } from 'vue';
import { useI18n } from '../../../composables/useI18n';
import N8nIcon from '../../N8nIcon';
import N8nIconButton from '../../N8nIconButton';
import N8nText from '../../N8nText';
import N8nTooltip from '../../N8nTooltip';
import type { AttachmentEmits, AttachmentProps } from './Attachment.types';

const props = defineProps<AttachmentProps>();
defineEmits<AttachmentEmits>();

const { t } = useI18n();

const MAX_FILE_NAME_CHARS = 20;
/** Keep attachment actions small and prevent form submission. */
const actionButtonProps = { size: 'small', variant: 'solid', type: 'button' } as const;

const isHovered = ref(false);
const isReturning = ref(false);
const reducedMotion = usePreferredReducedMotion();
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
</script>

<template>
	<div :class="$style.container" @mouseenter="startMarquee" @mouseleave="stopMarquee">
		<div v-if="isRemovable !== false" :class="$style.toolbar">
			<N8nTooltip :content="t('generic.remove')">
				<N8nIconButton v-bind="actionButtonProps" icon="trash-2" @click.stop="$emit('remove')" />
			</N8nTooltip>
		</div>
		<figure :class="['n8n-attachment', $style.attachment]" :data-type="fileType">
			<img
				v-if="fileType === 'image'"
				:src="src"
				:alt="fileName"
				:class="$style.coverPreview"
				loading="lazy"
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
			<figcaption :class="$style.caption" :title="fileName">
				<span :class="$style.srOnly">{{ fileName }}</span>
				<span
					ref="captionViewport"
					:class="$style.captionViewport"
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
			</figcaption>
		</figure>
	</div>
</template>

<style module lang="scss">
@use '../../../css/mixins/utils';
@use '../../../css/mixins/motion';
@use '../../../css/mixins/mixins';

.container {
	position: relative;
	isolation: isolate;
	flex-shrink: 0;
	width: fit-content;

	&:hover,
	&:focus-within {
		z-index: 2;
	}
}

.toolbar {
	position: absolute;
	inset-block-start: var(--spacing--4xs);
	inset-inline-end: var(--spacing--4xs);
	z-index: 1;
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
	outline-offset: -1px;
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
		outline-color: var(--focus--border-color);
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
	@include mixins.scroll-mask(x);
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
