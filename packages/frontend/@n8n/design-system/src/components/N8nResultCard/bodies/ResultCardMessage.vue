<script lang="ts" setup>
import { computed } from 'vue';

import N8nIcon from '../../N8nIcon';
import type { MessageCardData } from '../ResultCard.types';
import type { ResultCardService } from '../tones';

const props = defineProps<{
	card: MessageCardData;
	service: ResultCardService;
	light: boolean;
	animated: boolean;
}>();

const author = computed(() => props.card.author ?? 'n8n');
const initial = computed(() => author.value.trim().charAt(0).toUpperCase() || 'N');
const variant = computed(() =>
	props.card.channel === 'telegram' || props.service === 'telegram' ? 'bubble' : 'panel',
);
</script>

<template>
	<div :class="[$style.message, $style[variant]]">
		<!-- Slack-style: the channel suggested by two ghost rows, then the message that was posted -->
		<template v-if="variant === 'panel'">
			<div :class="[$style.ghost, $style.reveal]" style="--rc-delay: 0.2s" aria-hidden="true">
				<span :class="$style.ghostAvatar" /><span :class="$style.ghostLines"
					><span style="width: 62%" /><span style="width: 38%"
				/></span>
			</div>
			<div :class="[$style.ghost, $style.reveal]" style="--rc-delay: 0.28s" aria-hidden="true">
				<span :class="$style.ghostAvatar" /><span :class="$style.ghostLines"
					><span style="width: 48%"
				/></span>
			</div>
			<div :class="[$style.post, $style.reveal]" style="--rc-delay: 0.4s">
				<span :class="$style.avatar" aria-hidden="true">{{ initial }}</span>
				<div :class="$style.postBody">
					<p :class="$style.meta">
						<span :class="$style.author">{{ author }}</span
						><span :class="$style.to">{{ card.to }}</span>
					</p>
					<p :class="$style.text">{{ card.text }}</p>
				</div>
			</div>
		</template>
		<!-- Telegram-style: one white bubble with a tail, sent from the right -->
		<template v-else>
			<div :class="[$style.bubbleRow, $style.reveal]" style="--rc-delay: 0.25s">
				<div :class="$style.bubbleBox">
					<p :class="$style.bubbleText">{{ card.text }}</p>
					<span :class="$style.ticks" aria-hidden="true"
						><N8nIcon icon="check-check" size="xsmall"
					/></span>
				</div>
			</div>
		</template>
	</div>
</template>

<style lang="scss" module>
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
		opacity: 0.45;
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

.message {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
}

.ghost {
	display: flex;
	align-items: flex-start;
	gap: var(--spacing--2xs);
	opacity: 0.45;
}
.ghostAvatar {
	flex: none;
	width: 20px;
	height: 20px;
	border-radius: var(--radius--full);
	background: var(--rc-ink-faint);
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
		border-radius: var(--radius--full);
		background: var(--rc-ink-faint);
	}
}

.post {
	display: flex;
	gap: var(--spacing--2xs);
	padding: var(--spacing--2xs) var(--spacing--xs);
	border-radius: var(--rc-radius-inner);
	background: var(--rc-panel-strong);
}
.avatar {
	display: inline-flex;
	flex: none;
	width: 28px;
	height: 28px;
	align-items: center;
	justify-content: center;
	border-radius: 8px;
	background: var(--rc-ink);
	color: var(--rc-surface-fallback, oklch(30% 0.1 320));
	font-weight: var(--font-weight--bold);
	font-size: var(--font-size--2xs);
}
.postBody {
	flex: 1;
	min-width: 0;
}
.meta {
	display: flex;
	align-items: baseline;
	gap: var(--spacing--2xs);
	margin: 0;
}
.author {
	font-weight: var(--font-weight--bold);
	color: var(--rc-ink);
}
.to {
	font-size: var(--font-size--3xs);
	color: var(--rc-ink-muted);
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}
.text {
	margin: 2px 0 0;
	color: var(--rc-ink-soft);
	white-space: pre-wrap;
	overflow-wrap: anywhere;
	display: -webkit-box;
	-webkit-line-clamp: 4;
	-webkit-box-orient: vertical;
	overflow: hidden;
}

.bubbleRow {
	display: flex;
	justify-content: flex-end;
}
.bubbleBox {
	position: relative;
	max-width: 88%;
	padding: var(--spacing--2xs) var(--spacing--xs) var(--spacing--2xs) var(--spacing--xs);
	border-radius: 18px 18px 4px;
	background: oklch(100% 0 0);
	color: oklch(27% 0.018 45);
	box-shadow: 0 6px 16px -10px oklch(20% 0.05 250 / 0.5);
	&::after {
		content: '';
		position: absolute;
		right: -6px;
		bottom: 0;
		width: 12px;
		height: 12px;
		background: oklch(100% 0 0);
		clip-path: polygon(0 0, 100% 100%, 0 100%);
	}
}
.bubbleText {
	margin: 0 32px 0 0;
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
	bottom: 6px;
	color: oklch(60% 0.13 243);
	line-height: 1;
}
.reveal,
.chrome {
	opacity: 1;
}
.ghost.reveal {
	opacity: 0.45;
}
:global(.rc-animated) .reveal {
	animation: rc-pop 0.5s cubic-bezier(0.22, 1, 0.36, 1) both;
	animation-delay: var(--rc-delay, 0s);
}
:global(.rc-animated) .ghost.reveal {
	animation-name: rc-pop-ghost;
}
:global(.rc-animated) .chrome {
	animation: rc-fade 0.55s cubic-bezier(0.22, 1, 0.36, 1) both;
	animation-delay: var(--rc-delay, 0s);
}
@media (prefers-reduced-motion: reduce) {
	:global(.rc-animated) .reveal,
	:global(.rc-animated) .chrome {
		animation: rc-fade 0.2s ease both;
		animation-delay: 0s;
	}
	:global(.rc-animated) .ghost.reveal {
		animation: none;
	}
}
</style>
