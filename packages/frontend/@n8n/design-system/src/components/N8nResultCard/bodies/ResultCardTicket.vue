<script lang="ts" setup>
import { computed } from 'vue';

import RcAvatar from '../motion/RcAvatar.vue';
import RcDigits from '../motion/RcDigits.vue';
import RcGlyph from '../motion/RcGlyph.vue';
import RcTextSoft from '../motion/RcTextSoft.vue';
import RcTextSwap from '../motion/RcTextSwap.vue';
import type { TicketCardData } from '../ResultCard.types';

/**
 * Ticket (transitions.dev "Boarding Pass Check-in"): large origin/destination
 * codes joined by a dotted path, a status badge that swaps its label, times
 * that pop digit by digit when a variant changes them, a perforated divider,
 * a facts grid and the holder. The check-in button lives in the shell's action
 * bar as an `event` pill with pendingLabel / doneLabel.
 */
const props = defineProps<{ card: TicketCardData; animated: boolean }>();

const modeIcon = computed(() => {
	switch (props.card.mode) {
		case 'train':
		case 'bus':
		case 'ferry':
		case 'ride':
			return 'arrow-right';
		default:
			return 'plane';
	}
});

const facts = computed(() => (props.card.facts ?? []).slice(0, 4));
const badgeTone = computed(() => props.card.badge?.tone ?? 'ok');

/** Times are "HH:MM"-ish strings; non-numeric characters are kept but only digits animate. */
const isTimeLike = (value?: string) => !!value && /^[\d:.\s]+$/.test(value);
</script>

<template>
	<div :class="$style.ticket" data-test-id="result-card-ticket">
		<div :class="$style.top">
			<div :class="$style.head">
				<span :class="$style.reference">{{ card.reference }}</span>
				<span
					v-if="card.badge"
					:class="[$style.badge, $style[`tone-${badgeTone}`]]"
					data-test-id="result-card-ticket-badge"
				>
					<RcTextSwap :text="card.badge.label" />
				</span>
			</div>

			<div :class="$style.route">
				<div :class="$style.end">
					<span :class="$style.code">{{ card.from.code }}</span>
					<span :class="$style.city">{{ card.from.name }}</span>
					<span v-if="card.from.time" :class="$style.time">
						<RcDigits
							v-if="isTimeLike(card.from.time)"
							:value="card.from.time"
							:animated="animated"
						/>
						<RcTextSoft v-else :text="card.from.time" />
					</span>
				</div>
				<div :class="$style.path" aria-hidden="true">
					<div :class="$style.line">
						<span :class="$style.dot" />
						<span :class="$style.dash" />
						<span :class="$style.vehicle"><RcGlyph :name="modeIcon" :size="16" /></span>
						<span :class="$style.dash" />
						<span :class="$style.dot" />
					</div>
					<span v-if="card.duration" :class="$style.duration">
						<RcTextSoft :text="card.duration" align="center" />
					</span>
				</div>
				<div :class="[$style.end, $style.right]">
					<span :class="$style.code">{{ card.to.code }}</span>
					<span :class="$style.city">{{ card.to.name }}</span>
					<span v-if="card.to.time" :class="$style.time">
						<RcDigits v-if="isTimeLike(card.to.time)" :value="card.to.time" :animated="animated" />
						<RcTextSoft v-else :text="card.to.time" align="end" />
					</span>
				</div>
			</div>
		</div>

		<div :class="$style.perf" aria-hidden="true">
			<span :class="[$style.notch, $style.notchLeft]" />
			<span :class="$style.perfLine" />
			<span :class="[$style.notch, $style.notchRight]" />
		</div>

		<div :class="$style.bottom">
			<dl v-if="facts.length" :class="$style.grid" :style="{ '--cols': facts.length }">
				<div v-for="fact in facts" :key="fact.label">
					<dt>{{ fact.label }}</dt>
					<dd>
						<RcDigits v-if="isTimeLike(fact.value)" :value="fact.value" :animated="animated" />
						<RcTextSoft v-else :text="fact.value" />
					</dd>
				</div>
			</dl>
			<template v-if="card.holder">
				<div v-if="facts.length" :class="$style.divider" />
				<div :class="$style.holder">
					<RcAvatar :name="card.holder.name" :initials="card.holder.initials" :size="32" />
					<div :class="$style.holderText">
						<span :class="$style.holderName">{{ card.holder.name }}</span>
						<span v-if="card.holder.detail" :class="$style.holderMeta">{{
							card.holder.detail
						}}</span>
					</div>
				</div>
			</template>
		</div>
	</div>
</template>

<style lang="scss" module>
.ticket {
	position: relative;
	/* softly textured paper */
	&::before {
		content: '';
		position: absolute;
		inset: 0;
		pointer-events: none;
		opacity: var(--rc-noise-opacity, 0.05);
		background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0.5 0 0 0 0 0.5 0 0 0 0 0.5 0 0 0 0.9 0'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>");
		background-size: 160px 160px;
	}
	> * {
		position: relative;
	}
}

.top {
	padding: 8px 24px 12px;
}
.head {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 12px;
	margin-bottom: 16px;
}
.reference {
	flex: 1;
	min-width: 0;
	font-size: 12px;
	line-height: 16px;
	color: var(--rc-muted);
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
}

.badge {
	flex: none;
	display: inline-flex;
	align-items: center;
	height: 18px;
	padding: 0 6px;
	border-radius: 50px;
	font-size: 11px;
	line-height: 16px;
	font-weight: 500;
	--fill: var(--rc-ok-fill);
	--ink: var(--rc-ok-ink);
	background: var(--fill);
	color: var(--ink);
	box-shadow:
		0 1px 3px rgba(0, 0, 0, 0.04),
		inset 0 0 0 1px color-mix(in srgb, var(--ink) 14%, transparent),
		inset 0 -1px 0 0 color-mix(in srgb, var(--ink) 10%, transparent);
	transition:
		background-color var(--rc-duration-fast, 250ms) var(--rc-ease-smooth-out),
		color var(--rc-duration-fast, 250ms) var(--rc-ease-smooth-out),
		box-shadow var(--rc-duration-fast, 250ms) var(--rc-ease-smooth-out);
}
.tone-warn {
	--fill: var(--rc-warn-fill);
	--ink: var(--rc-warn-ink);
}
.tone-error {
	--fill: var(--rc-error-fill);
	--ink: var(--rc-error-ink);
}
.tone-info {
	--fill: var(--rc-info-fill);
	--ink: var(--rc-info-ink);
}

.route {
	display: grid;
	grid-template-columns: auto 1fr auto;
	gap: 8px;
	align-items: start;
}
.end {
	display: flex;
	flex-direction: column;
	min-width: 0;
}
.right {
	align-items: flex-end;
	text-align: right;
}
.code {
	font-size: 40px;
	line-height: 48px;
	font-weight: 500;
	color: var(--rc-fg);
	letter-spacing: -0.01em;
}
.city {
	font-size: 12px;
	line-height: 16px;
	color: var(--rc-muted);
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
	max-width: 110px;
}
.time {
	margin-top: 8px;
	font-size: 13px;
	line-height: 20px;
	color: var(--rc-fg);
	font-variant-numeric: tabular-nums;
}
.path {
	display: flex;
	flex-direction: column;
	align-items: center;
	padding-top: 16px;
	min-width: 0;
}
.line {
	display: flex;
	align-items: center;
	gap: 4px;
	width: 100%;
	color: var(--rc-muted);
}
.dot {
	flex: none;
	width: 6px;
	height: 6px;
	border-radius: 50%;
	box-shadow: inset 0 0 0 1.5px color-mix(in srgb, var(--rc-muted) 70%, transparent);
}
.dash {
	flex: 1;
	height: 1px;
	background: repeating-linear-gradient(
		90deg,
		color-mix(in srgb, var(--rc-muted) 45%, transparent) 0 3px,
		transparent 3px 6px
	);
}
.vehicle {
	flex: none;
	display: inline-flex;
}
.duration {
	margin-top: 8px;
	font-size: 12px;
	line-height: 16px;
	color: var(--rc-muted);
	white-space: nowrap;
}

/* perforation */
.perf {
	height: 24px;
}
.notch {
	position: absolute;
	top: 2px;
	width: 20px;
	height: 20px;
	border-radius: 50%;
	background: var(--rc-bg);
	box-shadow: inset 0 0 0 1px rgba(0, 0, 0, 0.04);
}
.notchLeft {
	left: -10px;
}
.notchRight {
	right: -10px;
}
.perfLine {
	position: absolute;
	left: 20px;
	right: 20px;
	top: 12px;
	height: 1px;
	background: repeating-linear-gradient(90deg, var(--rc-border) 0 4px, transparent 4px 8px);
	mask-image: linear-gradient(90deg, transparent, #000 15%, #000 85%, transparent);
}

.bottom {
	padding: 12px 24px 0;
}
.grid {
	display: grid;
	grid-template-columns: repeat(var(--cols, 4), 1fr);
	gap: 8px;
	margin: 0;
	> div {
		display: flex;
		flex-direction: column;
		min-width: 0;
	}
	dt {
		font-size: 12px;
		line-height: 16px;
		color: var(--rc-muted);
	}
	dd {
		margin: 0;
		font-size: 13px;
		line-height: 20px;
		color: var(--rc-fg);
		font-variant-numeric: tabular-nums;
		white-space: nowrap;
	}
}
.divider {
	height: 1px;
	margin: 16px 0;
	background: linear-gradient(
		90deg,
		transparent,
		var(--rc-divider) 20%,
		var(--rc-divider) 80%,
		transparent
	);
}
.holder {
	display: flex;
	align-items: center;
	gap: 12px;
}
.holderText {
	flex: 1;
	min-width: 0;
	display: flex;
	flex-direction: column;
}
.holderName,
.holderMeta {
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
}
.holderName {
	font-size: 13px;
	line-height: 20px;
	color: var(--rc-fg);
}
.holderMeta {
	font-size: 12px;
	line-height: 16px;
	color: var(--rc-muted);
}
</style>
