<script lang="ts" setup>
import { computed } from 'vue';

import { useI18n } from '../../../composables/useI18n';
import RcAvatar from '../motion/RcAvatar.vue';
import RcGlyph from '../motion/RcGlyph.vue';
import type { EmailCardData } from '../ResultCard.types';

/**
 * Email: the counterpart as an avatar row, the subject as the hero line, a
 * two-line preview on a quiet sheet, and attachments / labels as soft chips.
 */
const props = defineProps<{ card: EmailCardData; animated: boolean }>();
const { t } = useI18n();

const counterpart = computed(() =>
	props.card.direction === 'sent' ? props.card.to.join(', ') : (props.card.from ?? ''),
);
const counterpartName = computed(() => {
	const first = props.card.direction === 'sent' ? props.card.to[0] : props.card.from;
	return (first ?? '').replace(/<.*>/, '').trim() || counterpart.value;
});
const MAX_CHIPS = 3;
const chips = computed(() => [
	...(props.card.attachments ?? []).map((name) => ({ name, kind: 'file' as const })),
	...(props.card.labels ?? []).map((name) => ({ name, kind: 'label' as const })),
]);
const shownChips = computed(() => chips.value.slice(0, MAX_CHIPS));
const moreChips = computed(() => Math.max(0, chips.value.length - shownChips.value.length));
</script>

<template>
	<div :class="$style.email" data-test-id="result-card-email">
		<div :class="[$style.who, $style.reveal]" style="--rc-delay: 0.05s">
			<RcAvatar :name="counterpartName" :size="32" />
			<div :class="$style.whoText">
				<span :class="$style.whoLine">
					<span :class="$style.whoLabel">{{
						card.direction === 'sent' ? t('resultCard.email.to') : t('resultCard.email.from')
					}}</span>
					<span :class="$style.whoValue">{{ counterpart }}</span>
				</span>
				<span v-if="card.cc?.length" :class="$style.whoLine">
					<span :class="$style.whoLabel">{{ t('resultCard.email.cc') }}</span>
					<span :class="$style.whoValue">{{ card.cc.join(', ') }}</span>
				</span>
			</div>
			<RcGlyph :name="card.direction === 'sent' ? 'send' : 'mail'" :size="16" :class="$style.dir" />
		</div>

		<h3 :class="[$style.subject, $style.reveal]" style="--rc-delay: 0.15s">{{ card.subject }}</h3>

		<div v-if="card.preview" :class="[$style.sheet, $style.reveal]" style="--rc-delay: 0.25s">
			<p :class="$style.preview">{{ card.preview }}</p>
		</div>

		<ul v-if="shownChips.length" :class="[$style.chips, $style.reveal]" style="--rc-delay: 0.35s">
			<li v-for="(chip, index) in shownChips" :key="index" :class="$style.chip">
				<RcGlyph v-if="chip.kind === 'file'" name="download" :size="12" />
				{{ chip.name }}
			</li>
			<li v-if="moreChips" :class="[$style.chip, $style.chipMore]">
				{{ t('resultCard.more', { count: String(moreChips) }) }}
			</li>
		</ul>
	</div>
</template>

<style lang="scss" module>
.email {
	display: flex;
	flex-direction: column;
	padding: 8px 24px 0;
}

.who {
	display: flex;
	align-items: center;
	gap: 10px;
}
.whoText {
	flex: 1;
	min-width: 0;
	display: flex;
	flex-direction: column;
}
.whoLine {
	display: flex;
	gap: 6px;
	font-size: 12px;
	line-height: 16px;
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
}
.whoLabel {
	flex: none;
	color: var(--rc-muted);
}
.whoValue {
	min-width: 0;
	overflow: hidden;
	text-overflow: ellipsis;
	color: var(--rc-fg);
}
.dir {
	flex: none;
	color: var(--rc-muted);
}

.subject {
	margin: 12px 0 0;
	font-size: 20px;
	line-height: 26px;
	font-weight: 500;
	color: var(--rc-fg);
	overflow-wrap: anywhere;
	text-wrap: balance;
}

.sheet {
	position: relative;
	margin-top: 8px;
	padding: 10px 12px;
	border-radius: 12px;
	background: var(--rc-chip);
}
.preview {
	margin: 0;
	font-size: 13px;
	line-height: 20px;
	color: var(--rc-muted);
	display: -webkit-box;
	-webkit-line-clamp: 3;
	-webkit-box-orient: vertical;
	overflow: hidden;
	overflow-wrap: anywhere;
}

.chips {
	display: flex;
	flex-wrap: wrap;
	gap: 6px;
	margin: 12px 0 0;
	padding: 0;
	list-style: none;
}
.chip {
	display: inline-flex;
	align-items: center;
	gap: 4px;
	height: 22px;
	padding: 0 8px;
	border-radius: 50px;
	background: var(--rc-chip);
	font-size: 12px;
	line-height: 16px;
	color: var(--rc-fg);
	max-width: 100%;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}
.chipMore {
	background: transparent;
	color: var(--rc-muted);
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
:global(.rc-animated) .reveal {
	animation: rc-pop var(--rc-enter-dur, 500ms) var(--rc-ease-smooth-out) both;
	animation-delay: var(--rc-delay, 0s);
}
@media (prefers-reduced-motion: reduce) {
	:global(.rc-animated) .reveal {
		animation: rc-fade 0.2s ease both;
		animation-delay: 0s;
	}
}
</style>
