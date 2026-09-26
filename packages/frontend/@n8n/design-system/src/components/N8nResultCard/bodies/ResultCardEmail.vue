<script lang="ts" setup>
import { computed } from 'vue';

import { useI18n } from '../../../composables/useI18n';
import type { EmailCardData } from '../ResultCard.types';

const props = defineProps<{ card: EmailCardData; light: boolean; animated: boolean }>();
const { t } = useI18n();

const counterpart = computed(() =>
	props.card.direction === 'sent' ? props.card.to.join(', ') : (props.card.from ?? ''),
);
const MAX_CHIPS = 2;
const chips = computed(() => [...(props.card.attachments ?? []), ...(props.card.labels ?? [])]);
const shownChips = computed(() => chips.value.slice(0, MAX_CHIPS));
const moreChips = computed(() => Math.max(0, chips.value.length - shownChips.value.length));
</script>

<template>
	<div :class="$style.email">
		<h3 :class="[$style.hero, $style.reveal]" style="--rc-delay: 0.1s">{{ card.title }}</h3>
		<div :class="[$style.sheet, $style.reveal]" style="--rc-delay: 0.3s">
			<p :class="$style.line">
				<span :class="$style.label">{{
					card.direction === 'sent' ? t('resultCard.email.to') : t('resultCard.email.from')
				}}</span>
				<span :class="$style.value">{{ counterpart }}</span>
			</p>
			<p v-if="card.cc?.length" :class="$style.line">
				<span :class="$style.label">{{ t('resultCard.email.cc') }}</span>
				<span :class="$style.value">{{ card.cc.join(', ') }}</span>
			</p>
			<p :class="$style.subject">{{ card.subject }}</p>
			<p v-if="card.preview" :class="$style.preview">{{ card.preview }}</p>
			<span :class="$style.fade" aria-hidden="true" />
		</div>
		<ul v-if="shownChips.length" :class="[$style.chips, $style.reveal]" style="--rc-delay: 0.6s">
			<li v-for="(chip, index) in shownChips" :key="index" :class="$style.chip">{{ chip }}</li>
			<li v-if="moreChips" :class="[$style.chip, $style.chipMore]">
				{{ t('resultCard.more', { count: String(moreChips) }) }}
			</li>
		</ul>
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
@keyframes rc-slide {
	from {
		opacity: 0;
		transform: translateY(14px) rotate(0deg);
	}
	to {
		opacity: 1;
		transform: translateY(0) rotate(-1deg);
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

.email {
	display: flex;
	flex-direction: column;
}
.hero {
	margin: var(--spacing--2xs) 0 var(--spacing--xs);
	font-size: 17px;
	font-weight: var(--font-weight--bold);
	line-height: 1.3;
	letter-spacing: -0.01em;
	color: var(--rc-ink);
	overflow-wrap: anywhere;
}
/* the letter: a white sheet, slightly rotated, sliding out of the paper card */
.sheet {
	position: relative;
	margin: 0 var(--spacing--3xs);
	padding: var(--spacing--xs) var(--spacing--sm) var(--spacing--sm);
	border-radius: 12px;
	background: var(--rc-sheet);
	box-shadow:
		0 10px 24px -14px oklch(27% 0.03 45 / 0.45),
		0 0 0 1px oklch(27% 0.018 45 / 0.06);
	transform: rotate(-1deg);
	overflow: hidden;
}
.line {
	margin: 0;
	font-size: var(--font-size--3xs);
	color: var(--rc-ink-muted);
	overflow-wrap: anywhere;
}
.label {
	display: inline-block;
	min-width: 2.4em;
}
.value {
	color: var(--rc-ink-soft);
}
.subject {
	margin: var(--spacing--3xs) 0 0;
	font-size: var(--font-size--sm);
	font-weight: var(--font-weight--bold);
	color: var(--rc-ink);
	overflow-wrap: anywhere;
}
.preview {
	margin: var(--spacing--4xs) 0 0;
	color: var(--rc-ink-soft);
	display: -webkit-box;
	-webkit-line-clamp: 2;
	-webkit-box-orient: vertical;
	overflow: hidden;
}
.fade {
	position: absolute;
	inset: auto 0 0;
	height: 18px;
	background: linear-gradient(to bottom, transparent, var(--rc-sheet));
	pointer-events: none;
}
.chips {
	display: flex;
	flex-wrap: wrap;
	gap: var(--spacing--4xs);
	margin: var(--spacing--xs) 0 0;
	padding: 0;
	list-style: none;
}
.chip {
	padding: 2px var(--spacing--2xs);
	border-radius: var(--radius--full);
	background: var(--rc-panel-strong);
	font-size: var(--font-size--3xs);
	color: var(--rc-ink-soft);
	max-width: 100%;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}
.chipMore {
	background: transparent;
	color: var(--rc-ink-muted);
}

.reveal {
	opacity: 1;
}
:global(.rc-animated) .reveal {
	animation: rc-pop 0.5s cubic-bezier(0.22, 1, 0.36, 1) both;
	animation-delay: var(--rc-delay, 0s);
}
:global(.rc-animated) .sheet.reveal {
	animation-name: rc-slide;
	animation-duration: 0.6s;
}
@media (prefers-reduced-motion: reduce) {
	:global(.rc-animated) .reveal {
		animation: rc-fade 0.2s ease both;
		animation-delay: 0s;
	}
	:global(.rc-animated) .sheet.reveal {
		animation: rc-fade 0.2s ease both;
		transform: rotate(-1deg);
	}
}
</style>
