<script lang="ts" setup>
import { computed, ref, useId } from 'vue';

import { useI18n } from '../../composables/useI18n';
import N8nIcon from '../N8nIcon';
import N8nNodeIcon from '../N8nNodeIcon';
import ResultCardEmail from './bodies/ResultCardEmail.vue';
import ResultCardKeyValue from './bodies/ResultCardKeyValue.vue';
import ResultCardList from './bodies/ResultCardList.vue';
import ResultCardMessage from './bodies/ResultCardMessage.vue';
import ResultCardMetric from './bodies/ResultCardMetric.vue';
import ResultCardRecords from './bodies/ResultCardRecords.vue';
import type { ResultCardIcon, ResultCardProps } from './ResultCard.types';
import { resolveResultCardService, resolveResultCardTone } from './tones';
import { isSafeCoverSrc, isSafeHref } from './utils';

defineOptions({ name: 'N8nResultCard' });

const props = withDefaults(defineProps<ResultCardProps>(), {
	icons: undefined,
	icon: undefined,
	footer: undefined,
	expandable: true,
	executionLink: false,
	animated: true,
});

const emit = defineEmits<{ openExecution: [] }>();

const { t } = useI18n();

const tone = computed(() => resolveResultCardTone(props.card));
const service = computed(() => resolveResultCardService(props.card.nodeType));
const cover = computed(() =>
	props.card.cover && isSafeCoverSrc(props.card.cover.src) ? props.card.cover : undefined,
);
/** Cover photos force the dark treatment so white ink stays readable over the shade */
const isLight = computed(() => tone.value.kind === 'light' && !cover.value);

const iconList = computed<ResultCardIcon[]>(() =>
	(props.icons ?? (props.icon ? [props.icon] : []))
		.filter((icon) => icon.type !== 'unknown')
		.slice(0, 4),
);

const expanded = ref(false);
const detailsId = `result-card-details-${useId()}`;

const topLine = computed(() => props.footer?.workflowName ?? props.card.eyebrow ?? '');

const safeActions = computed(() =>
	(props.card.actions ?? []).filter((action) => isSafeHref(action.href)),
);

/** The shell owns the hero sentence for every archetype except metric (number + label) and email (the letter). */
const shellHero = computed(() => props.card.type !== 'metric' && props.card.type !== 'email');

const surfaceStyle = computed(() => ({
	'--rc-surface': tone.value.surface,
	'--rc-surface-dark': tone.value.surfaceDark ?? tone.value.surface,
	'--rc-accent': tone.value.accent ?? 'oklch(100% 0 0)',
	...(cover.value ? { '--rc-cover': `url("${cover.value.src}")` } : {}),
}));

const detailsJson = computed(() => JSON.stringify(props.card, null, 2));
</script>

<template>
	<article
		:class="[
			$style.card,
			isLight ? $style.light : $style.dark,
			{ [$style.animated]: animated, 'rc-animated': animated, [$style.covered]: !!cover },
		]"
		:style="surfaceStyle"
		:data-tone="tone.id"
		:data-service="service"
		:data-archetype="card.type"
		:aria-label="card.title"
		data-test-id="result-card"
	>
		<div v-if="cover" :class="$style.cover" role="img" :aria-label="cover.alt ?? ''" />

		<header :class="[$style.top, $style.chrome]" style="--rc-delay: 0.85s">
			<span
				:class="[$style.dot, card.status ? $style[`dot-${card.status}`] : '']"
				aria-hidden="true"
			/>
			<span :class="$style.topLine" data-test-id="result-card-top">{{ topLine }}</span>
			<span v-if="footer?.time" :class="$style.time">{{ footer.time }}</span>
		</header>

		<h3 v-if="shellHero" :class="[$style.hero, $style.reveal]" style="--rc-delay: 0.1s">
			{{ card.title }}
		</h3>

		<div :class="$style.body">
			<ResultCardEmail
				v-if="card.type === 'email'"
				:card="card"
				:light="isLight"
				:animated="animated"
			/>
			<ResultCardMessage
				v-else-if="card.type === 'message'"
				:card="card"
				:service="service"
				:light="isLight"
				:animated="animated"
			/>
			<ResultCardRecords
				v-else-if="card.type === 'records'"
				:card="card"
				:light="isLight"
				:animated="animated"
			/>
			<ResultCardMetric
				v-else-if="card.type === 'metric'"
				:card="card"
				:light="isLight"
				:animated="animated"
			/>
			<ResultCardList
				v-else-if="card.type === 'list'"
				:card="card"
				:light="isLight"
				:animated="animated"
			/>
			<ResultCardKeyValue v-else :card="card" :light="isLight" :animated="animated" />
		</div>

		<div
			v-if="safeActions.length"
			:class="[$style.actions, $style.reveal]"
			style="--rc-delay: 0.7s"
		>
			<a
				v-for="(action, index) in safeActions"
				:key="index"
				:href="action.href"
				target="_blank"
				rel="noopener noreferrer"
				:class="[$style.pill, index === 0 ? $style.pillPrimary : $style.pillSecondary]"
			>
				{{ action.label }}
			</a>
		</div>

		<footer :class="[$style.bottom, $style.chrome]" style="--rc-delay: 1s">
			<span v-if="iconList.length" :class="$style.cluster" aria-hidden="true">
				<span v-for="(nodeIcon, index) in iconList" :key="index" :class="$style.clusterItem">
					<N8nNodeIcon
						:type="nodeIcon.type"
						:src="nodeIcon.src"
						:name="nodeIcon.name"
						:color="nodeIcon.color"
						:size="12"
					/>
				</span>
			</span>
			<span v-else />
			<button
				v-if="expandable"
				type="button"
				:class="$style.toggle"
				:aria-expanded="expanded"
				:aria-controls="detailsId"
				data-test-id="result-card-toggle"
				@click="expanded = !expanded"
			>
				{{ expanded ? t('resultCard.hideDetails') : t('resultCard.details') }}
				<!-- one glyph, rotated by state: swapping icons and rotating would cancel out -->
				<N8nIcon icon="chevron-down" size="xsmall" :class="$style.chevron" />
			</button>
		</footer>

		<!--
			Details open along a grid-row track (0fr → 1fr) so the card grows instead of jumping;
			the same path runs in reverse on close, faster. Transitions, not keyframes: a quick
			re-toggle retargets mid-motion instead of restarting.
		-->
		<Transition
			:enter-from-class="$style.detailsHidden"
			:enter-active-class="$style.detailsEntering"
			:leave-active-class="$style.detailsLeaving"
			:leave-to-class="$style.detailsHidden"
		>
			<div
				v-if="expandable && expanded"
				:id="detailsId"
				:class="$style.details"
				data-test-id="result-card-details"
			>
				<div :class="$style.detailsClip">
					<div :class="$style.detailsPanel">
						<pre :class="$style.json">{{ detailsJson }}</pre>
						<button
							v-if="executionLink"
							type="button"
							:class="$style.executionLink"
							@click="emit('openExecution')"
						>
							{{ t('resultCard.openExecution') }} <N8nIcon icon="external-link" size="xsmall" />
						</button>
					</div>
				</div>
			</div>
		</Transition>
	</article>
</template>

<style lang="scss" module>
@use '../../css/mixins/motion';

/* ---- motion primitives (shared by the bodies through :global class names) ---- */
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

.card {
	/* ink scale — dark tones: white; light tones: warm ink (Daily Brief --ink / --ink-soft / --muted) */
	--rc-ink: oklch(100% 0 0);
	--rc-ink-soft: oklch(100% 0 0 / 0.78);
	--rc-ink-muted: oklch(100% 0 0 / 0.58);
	--rc-ink-faint: oklch(100% 0 0 / 0.3);
	--rc-panel: oklch(100% 0 0 / 0.12);
	--rc-panel-strong: oklch(100% 0 0 / 0.18);
	--rc-hairline: oklch(100% 0 0 / 0.22);
	--rc-bar: oklch(100% 0 0 / 0.9);
	--rc-bar-empty: oklch(100% 0 0 / 0.2);
	--rc-sheet: oklch(100% 0 0);
	/* text cut out of an ink-filled mark (message avatar): a solid stand-in for the gradient surface */
	--rc-surface-fallback: oklch(27% 0.018 45);
	--rc-ease: cubic-bezier(0.22, 1, 0.36, 1);
	--rc-radius: 24px;
	--rc-radius-inner: 16px;

	position: relative;
	display: flex;
	flex-direction: column;
	width: 100%;
	max-width: 400px;
	padding: var(--spacing--sm) var(--spacing--md) var(--spacing--sm);
	border-radius: var(--rc-radius);
	background: var(--rc-surface);
	color: var(--rc-ink);
	font-size: var(--font-size--xs);
	line-height: var(--line-height--lg);
	overflow: hidden;
	isolation: isolate;
}

.light {
	--rc-ink: oklch(27% 0.018 45);
	--rc-ink-soft: oklch(42% 0.02 45);
	--rc-ink-muted: oklch(57% 0.02 55);
	--rc-ink-faint: oklch(27% 0.018 45 / 0.16);
	--rc-panel: oklch(27% 0.018 45 / 0.05);
	--rc-panel-strong: oklch(27% 0.018 45 / 0.09);
	--rc-hairline: oklch(27% 0.018 45 / 0.1);
	--rc-bar: var(--rc-accent);
	--rc-bar-empty: oklch(27% 0.018 45 / 0.12);
	--rc-sheet: oklch(99.4% 0.004 84);
	--rc-surface-fallback: var(--rc-surface);

	box-shadow: 0 14px 30px -18px oklch(27% 0.05 45 / 0.35);
}

/* light tones switch to their deep variant in dark mode (explicit theme or OS preference) */
@mixin light-on-dark {
	--rc-ink: oklch(100% 0 0);
	--rc-ink-soft: oklch(100% 0 0 / 0.78);
	--rc-ink-muted: oklch(100% 0 0 / 0.58);
	--rc-ink-faint: oklch(100% 0 0 / 0.3);
	--rc-panel: oklch(100% 0 0 / 0.1);
	--rc-panel-strong: oklch(100% 0 0 / 0.16);
	--rc-hairline: oklch(100% 0 0 / 0.2);
	--rc-bar: oklch(100% 0 0 / 0.9);
	--rc-bar-empty: oklch(100% 0 0 / 0.2);
	--rc-sheet: oklch(100% 0 0 / 0.1);
	--rc-surface-fallback: var(--rc-surface-dark);
	background: var(--rc-surface-dark);
	box-shadow: none;
}
:global([data-theme='dark']) .light {
	@include light-on-dark;
}
@media (prefers-color-scheme: dark) {
	:global(body:not([data-theme])) .light {
		@include light-on-dark;
	}
}

.covered {
	background: var(--rc-surface);
}

.cover {
	position: absolute;
	inset: 0;
	z-index: -1;
	background-image:
		linear-gradient(
			180deg,
			oklch(18% 0.02 260 / 0.3) 0%,
			oklch(18% 0.02 260 / 0.45) 40%,
			oklch(16% 0.02 260 / 0.9) 100%
		),
		var(--rc-cover);
	background-size: cover;
	background-position: center;
}

/* over a photo the data sits on a glass panel so hairlines and small text stay legible */
.covered .body {
	padding: var(--spacing--xs) var(--spacing--sm);
	border-radius: var(--rc-radius-inner);
	background: oklch(15% 0.02 260 / 0.38);
	backdrop-filter: blur(14px);
	-webkit-backdrop-filter: blur(14px);
}

.animated {
	animation: rc-pop 0.5s var(--rc-ease) both;
}

.reveal,
.chrome {
	opacity: 1;
}
.animated .reveal {
	animation: rc-pop 0.5s var(--rc-ease) both;
	animation-delay: var(--rc-delay, 0s);
}
.animated .chrome {
	animation: rc-fade 0.55s var(--rc-ease) both;
	animation-delay: var(--rc-delay, 0s);
}

@media (prefers-reduced-motion: reduce) {
	.animated,
	.animated .reveal,
	.animated .chrome {
		animation: rc-fade 0.2s ease both;
		animation-delay: 0s;
	}
}

/* ---- chrome ---- */
.top {
	display: flex;
	align-items: center;
	gap: var(--spacing--3xs);
	min-height: 18px;
	font-size: var(--font-size--2xs);
	font-weight: var(--font-weight--medium);
	color: var(--rc-ink-muted);
}
.dot {
	flex: none;
	width: 5px;
	height: 5px;
	border-radius: var(--radius--full);
	background: var(--rc-ink-faint);
}
.dot-success {
	background: oklch(72% 0.14 152);
}
.dot-error {
	background: oklch(66% 0.2 25);
}
.dot-pending {
	background: oklch(78% 0.14 80);
}
.dot-info {
	background: var(--rc-ink-muted);
}
.light .dot-success {
	background: oklch(56% 0.125 152);
}
.light .dot-error {
	background: oklch(54% 0.185 25);
}
.light .dot-pending {
	background: oklch(72% 0.14 75);
}

.topLine {
	min-width: 0;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}
.time {
	margin-left: auto;
	font-variant-numeric: tabular-nums;
	color: var(--rc-ink-faint);
}

.hero {
	margin: var(--spacing--2xs) 0 0;
	font-size: 17px;
	font-weight: var(--font-weight--bold);
	line-height: 1.3;
	letter-spacing: -0.01em;
	color: var(--rc-ink);
	overflow-wrap: anywhere;
}

.body {
	margin-top: var(--spacing--xs);
}

/* ---- actions ---- */
.actions {
	display: flex;
	gap: var(--spacing--2xs);
	margin-top: var(--spacing--sm);
}
.pill {
	display: inline-flex;
	align-items: center;
	justify-content: center;
	flex: 1;
	min-height: 40px;
	padding: 0 var(--spacing--sm);
	border-radius: var(--radius--full);
	font-size: var(--font-size--xs);
	font-weight: var(--font-weight--bold);
	text-decoration: none;
	transition:
		transform 160ms var(--rc-ease),
		opacity 160ms var(--rc-ease);
	&:active {
		transform: scale(0.97);
	}
}
.dark .pillPrimary {
	background: oklch(100% 0 0);
	color: oklch(27% 0.018 45);
}
.dark .pillSecondary {
	background: var(--rc-panel-strong);
	color: var(--rc-ink);
}
.light .pillPrimary {
	background: oklch(27% 0.018 45);
	color: oklch(99.4% 0.004 84);
}
.light .pillSecondary {
	background: var(--rc-panel-strong);
	color: var(--rc-ink);
}

/* ---- footer ---- */
.bottom {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: var(--spacing--2xs);
	margin-top: var(--spacing--sm);
	min-height: 22px;
}
.cluster {
	display: inline-flex;
	align-items: center;
}
.clusterItem {
	display: inline-flex;
	align-items: center;
	justify-content: center;
	width: 22px;
	height: 22px;
	border-radius: var(--radius--full);
	background: oklch(100% 0 0);
	box-shadow:
		0 0 0 1.5px var(--rc-surface-edge, transparent),
		0 1px 2px oklch(0% 0 0 / 0.12);
	& + & {
		margin-left: -6px;
	}
}
.dark .clusterItem {
	--rc-surface-edge: oklch(0% 0 0 / 0.25);
}
.light .clusterItem {
	--rc-surface-edge: oklch(27% 0.018 45 / 0.1);
}

.toggle {
	display: inline-flex;
	align-items: center;
	gap: var(--spacing--5xs);
	padding: 0;
	border: 0;
	background: none;
	font: inherit;
	font-size: var(--font-size--2xs);
	font-weight: var(--font-weight--medium);
	color: var(--rc-ink-muted);
	cursor: pointer;
	transition: color 150ms var(--rc-ease);
	&:hover {
		color: var(--rc-ink);
	}
	&:focus-visible {
		outline: 2px solid var(--rc-ink-soft);
		outline-offset: 2px;
		border-radius: 4px;
	}
}
/* the chevron turns on the same clock as the panel it points at */
.chevron {
	transition: transform motion.$blur-motion-duration motion.$blur-motion-easing;
}
.toggle[aria-expanded='true'] .chevron {
	transform: rotate(180deg);
}

/* ---- details ---- */
.details {
	display: grid;
	grid-template-rows: 1fr;
	margin: var(--spacing--xs) calc(-1 * var(--spacing--2xs)) 0;
	opacity: 1;
}
/* the clip carries no padding, so a 0fr track really is zero pixels tall */
.detailsClip {
	min-height: 0;
	overflow: hidden;
}
/*
	The design system's blur motion (N8nSettingsRow, N8nAnimatedCollapsibleContent): a height
	change paired with an opacity fade and a 4px blur that reads as motion blur, 350ms on the
	drawer curve. The DS ships it as keyframes; here it is a transition so a quick re-toggle
	retargets mid-motion instead of restarting. `filter: none` when settled: a resting blur(0)
	would keep a compositing surface alive under the JSON.
*/
$details-enter: motion.$blur-motion-duration;
$details-leave: 250ms;
$details-ease: motion.$blur-motion-easing;
$details-blur: var(--animation--collapsible-slide-blurred--blur, 4px);

.detailsPanel {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
	padding: var(--spacing--xs);
	border-radius: var(--rc-radius-inner);
	background: var(--rc-panel);
	transform: translateY(0);
	filter: none;
}
.detailsHidden {
	grid-template-rows: 0fr;
	margin-top: 0;
	opacity: 0;
	.detailsPanel {
		transform: translateY(-6px);
		filter: blur($details-blur);
	}
}
.detailsEntering {
	transition:
		grid-template-rows $details-enter $details-ease,
		margin-top $details-enter $details-ease,
		opacity $details-enter $details-ease;
	.detailsPanel {
		transition:
			transform $details-enter $details-ease,
			filter $details-enter $details-ease;
	}
}
/* exits are softer and quicker than enters, along the same path */
.detailsLeaving {
	transition:
		grid-template-rows $details-leave $details-ease,
		margin-top $details-leave $details-ease,
		opacity $details-leave $details-ease;
	.detailsPanel {
		transition:
			transform $details-leave $details-ease,
			filter $details-leave $details-ease;
	}
}
@media (prefers-reduced-motion: reduce) {
	/* no height travel, no blur: a short cross-fade keeps the state change legible */
	.detailsHidden {
		grid-template-rows: 1fr;
		margin-top: var(--spacing--xs);
		.detailsPanel {
			transform: none;
			filter: none;
		}
	}
	.detailsEntering,
	.detailsLeaving {
		transition: opacity 150ms ease;
		.detailsPanel {
			transition: none;
		}
	}
	.chevron {
		transition: none;
	}
}
.json {
	margin: 0;
	max-height: 220px;
	overflow: auto;
	font-family: var(--font-family--monospace);
	font-size: var(--font-size--3xs);
	line-height: var(--line-height--lg);
	color: var(--rc-ink-soft);
	white-space: pre-wrap;
	overflow-wrap: anywhere;
}
.executionLink {
	display: inline-flex;
	align-items: center;
	gap: var(--spacing--5xs);
	padding: 0;
	border: 0;
	background: none;
	font: inherit;
	font-size: var(--font-size--2xs);
	font-weight: var(--font-weight--bold);
	color: var(--rc-ink);
	cursor: pointer;
}
</style>
