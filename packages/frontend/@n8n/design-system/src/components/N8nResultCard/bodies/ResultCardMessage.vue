<script lang="ts" setup>
import { computed } from 'vue';

import RcAvatar from '../motion/RcAvatar.vue';
import RcGlyph from '../motion/RcGlyph.vue';
import type { MessageCardData } from '../ResultCard.types';
import type { ResultCardService } from '../tones';

/**
 * Message: the post as it landed in the channel. Slack-like services get a
 * quiet thread (two ghost rows, then the post); chat apps get a sent bubble
 * with a tail and read ticks.
 */
const props = defineProps<{
	card: MessageCardData;
	service: ResultCardService;
	animated: boolean;
}>();

const author = computed(() => props.card.author ?? 'n8n');
const BUBBLE_CHANNELS = new Set(['telegram', 'whatsapp', 'sms', 'chat']);
const variant = computed(() =>
	BUBBLE_CHANNELS.has(props.card.channel) || props.service === 'telegram' ? 'bubble' : 'panel',
);
</script>

<template>
	<div :class="[$style.message, $style[variant]]" data-test-id="result-card-message">
		<!-- thread: the channel suggested by two ghost rows, then the post -->
		<template v-if="variant === 'panel'">
			<div :class="[$style.ghost, $style.reveal]" style="--rc-delay: 0.1s" aria-hidden="true">
				<span :class="$style.ghostAvatar" /><span :class="$style.ghostLines"
					><span style="width: 62%" /><span style="width: 38%"
				/></span>
			</div>
			<div :class="[$style.ghost, $style.reveal]" style="--rc-delay: 0.16s" aria-hidden="true">
				<span :class="$style.ghostAvatar" /><span :class="$style.ghostLines"
					><span style="width: 48%"
				/></span>
			</div>
			<div :class="[$style.post, $style.reveal]" style="--rc-delay: 0.26s">
				<RcAvatar :name="author" :size="28" />
				<div :class="$style.postBody">
					<p :class="$style.meta">
						<span :class="$style.author">{{ author }}</span
						><span :class="$style.to">{{ card.to }}</span>
					</p>
					<p :class="$style.text">{{ card.text }}</p>
				</div>
			</div>
		</template>
		<!-- bubble: one sent message with a tail, from the right -->
		<template v-else>
			<p :class="[$style.toLine, $style.reveal]" style="--rc-delay: 0.1s">{{ card.to }}</p>
			<div :class="[$style.bubbleRow, $style.reveal]" style="--rc-delay: 0.2s">
				<div :class="$style.bubbleBox">
					<p :class="$style.bubbleText">{{ card.text }}</p>
					<span :class="$style.ticks" aria-hidden="true"><RcGlyph name="check" :size="12" /></span>
				</div>
			</div>
		</template>
	</div>
</template>

<style lang="scss" module>
.message {
	display: flex;
	flex-direction: column;
	gap: 8px;
	padding: 8px 24px 0;
}

.ghost {
	display: flex;
	align-items: flex-start;
	gap: 8px;
	opacity: 0.5;
}
.ghostAvatar {
	flex: none;
	width: 20px;
	height: 20px;
	border-radius: 50%;
	background: var(--rc-chip-hover);
}
.ghostLines {
	display: flex;
	flex: 1;
	flex-direction: column;
	gap: 6px;
	padding-top: 5px;
	span {
		display: block;
		height: 8px;
		border-radius: 50px;
		background: var(--rc-chip-hover);
	}
}

.post {
	display: flex;
	gap: 10px;
	padding: 10px 12px;
	border-radius: 12px;
	background: var(--rc-chip);
}
.postBody {
	flex: 1;
	min-width: 0;
}
.meta {
	display: flex;
	align-items: baseline;
	gap: 8px;
	margin: 0;
	min-width: 0;
}
.author {
	font-weight: 500;
	color: var(--rc-fg);
	white-space: nowrap;
}
.to {
	font-size: 12px;
	line-height: 16px;
	color: var(--rc-muted);
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}
.text {
	margin: 2px 0 0;
	color: var(--rc-fg);
	white-space: pre-wrap;
	overflow-wrap: anywhere;
	display: -webkit-box;
	-webkit-line-clamp: 4;
	-webkit-box-orient: vertical;
	overflow: hidden;
}

.toLine {
	margin: 0;
	font-size: 12px;
	line-height: 16px;
	color: var(--rc-muted);
	text-align: right;
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
}
.bubbleRow {
	display: flex;
	justify-content: flex-end;
}
.bubbleBox {
	position: relative;
	max-width: 88%;
	padding: 8px 12px;
	border-radius: 18px 18px 4px 18px;
	background: var(--rc-tone);
	color: #fff;
	box-shadow: var(--rc-cta-shadow);
	&::after {
		content: '';
		position: absolute;
		right: -6px;
		bottom: 0;
		width: 12px;
		height: 12px;
		background: var(--rc-tone);
		clip-path: polygon(0 0, 100% 100%, 0 100%);
	}
}
.bubbleText {
	margin: 0 28px 0 0;
	white-space: pre-wrap;
	overflow-wrap: anywhere;
	display: -webkit-box;
	-webkit-line-clamp: 4;
	-webkit-box-orient: vertical;
	overflow: hidden;
}
.ticks {
	position: absolute;
	right: 10px;
	bottom: 8px;
	display: inline-flex;
	opacity: 0.85;
}

/* entrance */
@keyframes rc-pop {
	from {
		opacity: 0;
		transform: translateY(8px);
		filter: blur(4px);
	}
	to {
		opacity: 1;
		transform: translateY(0);
		filter: blur(0);
	}
}
@keyframes rc-pop-ghost {
	from {
		opacity: 0;
		transform: translateY(8px);
		filter: blur(4px);
	}
	to {
		opacity: 0.5;
		transform: translateY(0);
		filter: blur(0);
	}
}
@keyframes rc-fade {
	from {
		opacity: 0;
	}
	to {
		opacity: 1;
	}
}
.reveal {
	opacity: 1;
}
.ghost.reveal {
	opacity: 0.5;
}
:global(.rc-animated) .reveal {
	animation: rc-pop var(--rc-enter-dur, 500ms) var(--rc-ease-smooth-out) both;
	animation-delay: var(--rc-delay, 0s);
}
:global(.rc-animated) .ghost.reveal {
	animation-name: rc-pop-ghost;
}
@media (prefers-reduced-motion: reduce) {
	:global(.rc-animated) .reveal {
		animation: rc-fade 0.2s ease both;
		animation-delay: 0s;
	}
	:global(.rc-animated) .ghost.reveal {
		animation: none;
	}
}
</style>
