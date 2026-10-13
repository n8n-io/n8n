<script lang="ts" setup>
import { computed } from 'vue';

import { useI18n } from '../../../composables/useI18n';
import RcAccordion from '../motion/RcAccordion.vue';
import RcAvatarGroup from '../motion/RcAvatarGroup.vue';
import RcGlyph from '../motion/RcGlyph.vue';
import RcLearnLink from '../motion/RcLearnLink.vue';
import RcTextSoft from '../motion/RcTextSoft.vue';
import type { EventCardData } from '../ResultCard.types';
import { isSafeHref } from '../utils';

/**
 * Event (transitions.dev "Event Card With Attendees"): a faded map header, a
 * calendar date tile, the title, when and where, and an attendees accordion
 * that opens into a hoverable avatar group. Join / Decline live in the shell's
 * action bar.
 */
const props = defineProps<{ card: EventCardData; animated: boolean }>();

const { t } = useI18n();

const start = computed(() => (props.card.startsAt ? new Date(props.card.startsAt) : undefined));
const end = computed(() => (props.card.endsAt ? new Date(props.card.endsAt) : undefined));
const valid = (date?: Date) => !!date && !Number.isNaN(date.getTime());

const tile = computed(() => {
	if (!valid(start.value)) return undefined;
	return {
		day: start.value!.toLocaleDateString(undefined, { weekday: 'short' }),
		num: start.value!.toLocaleDateString(undefined, { day: 'numeric' }),
		full: start.value!.toLocaleDateString(undefined, {
			weekday: 'long',
			month: 'long',
			day: 'numeric',
		}),
	};
});

const time = (date: Date) =>
	date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });

const when = computed(() => {
	if (props.card.when) return props.card.when;
	if (!valid(start.value)) return '';
	const range = valid(end.value)
		? `${time(start.value!)} – ${time(end.value!)}`
		: time(start.value!);
	return [range, props.card.platform].filter(Boolean).join(' · ');
});

const locationHref = computed(() =>
	isSafeHref(props.card.locationHref) ? props.card.locationHref : undefined,
);
const showMap = computed(() => props.card.map ?? !!props.card.location);

const attendees = computed(() => (props.card.attendees ?? []).slice(0, 8));
const going = computed(() => {
	const count = props.card.attendeeCount ?? attendees.value.length;
	return count > 0 ? t('resultCard.event.going', { count: String(count) }) : '';
});
const names = computed(() => {
	const list = attendees.value.map((person) => person.name.split(/\s+/)[0]);
	const total = props.card.attendeeCount ?? list.length;
	const rest = total - Math.min(2, list.length);
	if (list.length === 0) return '';
	if (rest <= 0) return list.join(', ');
	return t('resultCard.event.others', { names: list.slice(0, 2).join(', '), count: String(rest) });
});
</script>

<template>
	<div :class="$style.event" data-test-id="result-card-event">
		<div v-if="showMap" :class="$style.map" aria-hidden="true">
			<svg viewBox="0 0 300 104" preserveAspectRatio="xMidYMid slice">
				<rect width="300" height="104" fill="#e7e5de" />
				<path d="M0 0H96V46Q62 62 0 56Z" fill="#cde0c0" />
				<path d="M206 104Q224 72 300 64V104Z" fill="#b8d2e6" />
				<path d="M246 0H300V30Q272 36 246 22Z" fill="#cde0c0" />
				<g stroke="#ffffff" fill="none" stroke-linecap="round">
					<path d="M-10 20H310" stroke-width="4" />
					<path d="M120 -10V114" stroke-width="4" />
					<path d="M228 -10V114" stroke-width="3" />
					<path d="M40 -10V114" stroke-width="3" />
					<path d="M-10 64H310" stroke-width="3" />
					<path d="M178 20V64" stroke-width="2.5" />
					<path d="M80 64V114" stroke-width="2.5" />
					<path d="M-10 92L310 34" stroke-width="7" />
				</g>
				<path d="M-10 96L310 38" stroke="#f2cf78" stroke-width="2" fill="none" />
			</svg>
			<span :class="$style.pin" />
		</div>

		<div :class="[$style.body, { [$style.withMap]: showMap }]">
			<div
				v-if="tile"
				:class="$style.date"
				:aria-label="tile.full"
				data-test-id="result-card-event-date"
			>
				<span :class="$style.dateDay">{{ tile.day }}</span>
				<span :class="$style.dateNum">{{ tile.num }}</span>
			</div>

			<h3 :class="$style.title">{{ card.title }}</h3>

			<div :class="$style.meta">
				<div v-if="when" :class="$style.row">
					<RcGlyph name="clock" :size="16" />
					<span :class="$style.rowText"><RcTextSoft :text="when" /></span>
				</div>
				<div v-if="card.location" :class="$style.row">
					<RcGlyph name="map-pin" :size="16" />
					<span :class="$style.rowText">{{ card.location }}</span>
					<RcLearnLink
						v-if="locationHref"
						:href="locationHref"
						:label="t('resultCard.event.directions')"
					/>
				</div>
				<p v-if="card.description" :class="$style.description">{{ card.description }}</p>
			</div>

			<template v-if="attendees.length">
				<div :class="$style.divider" aria-hidden="true" />
				<RcAccordion :label="t('resultCard.event.attendees')" :meta="going" variant="row">
					<div :class="$style.people">
						<RcAvatarGroup :people="attendees" :size="28" />
						<span :class="$style.peopleText">{{ names }}</span>
					</div>
				</RcAccordion>
			</template>
		</div>
	</div>
</template>

<style lang="scss" module>
.event {
	display: flex;
	flex-direction: column;
}

/* map header: full width, no padding, map at 50% */
.map {
	position: relative;
	height: 104px;
	margin-top: 8px;
	overflow: hidden;
	svg {
		display: block;
		width: 100%;
		height: 100%;
		opacity: 0.5;
	}
}
.pin {
	position: absolute;
	left: 50%;
	top: 42%;
	width: 14px;
	height: 14px;
	margin: -7px 0 0 -7px;
	border-radius: 50%;
	background: var(--rc-red);
	box-shadow:
		0 0 0 3px var(--rc-surface),
		0 2px 6px rgba(0, 0, 0, 0.2);
	&::before {
		content: '';
		position: absolute;
		inset: -14px;
		border-radius: 50%;
		background: rgba(236, 74, 74, 0.16);
	}
}

.body {
	position: relative;
	padding: 8px 24px 0;
}

/* Apple Calendar style date tile */
.date {
	position: relative;
	width: 56px;
	height: 56px;
	border-radius: 12px;
	background: var(--rc-surface);
	box-shadow: var(--rc-material-shadow);
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
}
.withMap .date {
	margin-top: -36px;
}
.dateDay {
	font-size: 12px;
	line-height: 16px;
	color: var(--rc-red);
	text-transform: capitalize;
}
.dateNum {
	font-size: 28px;
	line-height: 34px;
	font-variant-numeric: tabular-nums;
	margin-top: -4px;
	color: var(--rc-fg);
}

.title {
	margin: 12px 0 0;
	font-size: 28px;
	line-height: 34px;
	font-weight: 500;
	color: var(--rc-fg);
	text-wrap: balance;
	overflow-wrap: anywhere;
}

.meta {
	margin-top: 8px;
	display: grid;
	gap: 4px;
}
.row {
	display: flex;
	align-items: center;
	gap: 8px;
	font-size: 13px;
	line-height: 20px;
	color: var(--rc-muted);
}
.rowText {
	flex: 1;
	min-width: 0;
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
}
.description {
	margin: 4px 0 0;
	font-size: 13px;
	line-height: 20px;
	color: var(--rc-muted);
	overflow-wrap: anywhere;
}

.divider {
	height: 1px;
	margin: 12px 0 4px;
	background: linear-gradient(
		90deg,
		transparent,
		var(--rc-divider) 20%,
		var(--rc-divider) 80%,
		transparent
	);
}

.people {
	display: flex;
	align-items: center;
	gap: 12px;
	padding: 8px 0 4px;
}
.peopleText {
	flex: 1;
	min-width: 0;
	font-size: 12px;
	line-height: 16px;
	color: var(--rc-muted);
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
}
</style>
