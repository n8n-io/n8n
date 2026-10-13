<script lang="ts" setup>
import { computed, ref, watch } from 'vue';

import { useI18n } from '../../composables/useI18n';
import N8nDialog from '../N8nDialog/Dialog.vue';
import N8nIcon from '../N8nIcon';
import N8nNodeIcon from '../N8nNodeIcon';
import ResultCardChart from './bodies/ResultCardChart.vue';
import ResultCardEmail from './bodies/ResultCardEmail.vue';
import ResultCardEvent from './bodies/ResultCardEvent.vue';
import ResultCardKeyValue from './bodies/ResultCardKeyValue.vue';
import ResultCardList from './bodies/ResultCardList.vue';
import ResultCardMessage from './bodies/ResultCardMessage.vue';
import ResultCardMetric from './bodies/ResultCardMetric.vue';
import ResultCardPulse from './bodies/ResultCardPulse.vue';
import ResultCardRecords from './bodies/ResultCardRecords.vue';
import ResultCardTicket from './bodies/ResultCardTicket.vue';
import ResultCardWeather from './bodies/ResultCardWeather.vue';
import RcMenu from './motion/RcMenu.vue';
import RcPill from './motion/RcPill.vue';
import RcSwitch from './motion/RcSwitch.vue';
import RcTabs from './motion/RcTabs.vue';
import RcTextSoft from './motion/RcTextSoft.vue';
import type {
	ResultCardActionEvent,
	ResultCardActionState,
	ResultCardIcon,
	ResultCardProps,
	ResultCardStatus,
} from './ResultCard.types';
import { resolveResultCardService, resolveResultCardTone } from './tones';
import { useResultCardVariants } from './useResultCardVariants';
import { isSafeCoverSrc } from './utils';

defineOptions({ name: 'N8nResultCard' });

const props = withDefaults(defineProps<ResultCardProps>(), {
	icons: undefined,
	icon: undefined,
	footer: undefined,
	expandable: true,
	executionLink: false,
	animated: true,
});

const emit = defineEmits<{
	openExecution: [];
	action: [event: ResultCardActionEvent];
	variantChange: [key: string];
}>();

const { t } = useI18n();

const tone = computed(() => resolveResultCardTone(props.card));
const service = computed(() => resolveResultCardService(props.card.nodeType));

const { options, control, placement, hasSwitcher, activeKey, merged, select } =
	useResultCardVariants(() => props.card);

watch(activeKey, (key) => emit('variantChange', key));

const iconList = computed<ResultCardIcon[]>(() =>
	(props.icons ?? (props.icon ? [props.icon] : []))
		.filter((icon) => icon.type !== 'unknown')
		.slice(0, 4),
);

const cover = computed(() =>
	props.card.cover && isSafeCoverSrc(props.card.cover.src) ? props.card.cover : undefined,
);

/** Bodies that print the eyebrow themselves (the weather day line); the header must not repeat it. */
const BODY_EYEBROW = new Set(['weather']);
const topLine = computed(
	() =>
		props.footer?.workflowName ??
		(BODY_EYEBROW.has(props.card.type) ? '' : (merged.value.eyebrow ?? '')),
);
const statusLabel = computed(() => merged.value.statusLabel ?? '');
const STATUS_TONE: Record<ResultCardStatus, string> = {
	success: 'ok',
	error: 'error',
	pending: 'warn',
	info: 'info',
};
const statusTone = computed(() => STATUS_TONE[merged.value.status ?? 'info']);

/** Bodies that carry their own hero (a number, a place, a date tile) leave the shell title out. */
const SHELL_HERO = new Set(['message', 'records', 'list', 'keyValue']);
const shellHero = computed(() => SHELL_HERO.has(props.card.type));

/**
 * The weather sky spans the whole card and, as in the reference, the card has
 * no header: the body opens with the place. The provenance (workflow, time)
 * moves into the single footer row over the sky, and the status badge is
 * drawn by the body beside the place name.
 */
const onSky = computed(() => props.card.type === 'weather');

/** The header row only exists when it has something to say; a lone dot is not a header. */
const hasHeader = computed(
	() =>
		!onSky.value &&
		(Boolean(topLine.value || statusLabel.value || props.footer?.time) ||
			(hasSwitcher.value && control.value === 'menu')),
);
/** Without a header, the footer carries the workflow name and the time. */
const footerMeta = computed(() => !hasHeader.value && Boolean(topLine.value || props.footer?.time));

/** A top segmented switcher sits above the body, except for bodies that slot it under their own title. */
const topSegmented = computed(
	() => hasSwitcher.value && control.value === 'segmented' && placement.value === 'top',
);
const INLINE_SWITCHER = new Set(['chart']);
const inlineSwitcher = computed(() => topSegmented.value && INLINE_SWITCHER.has(props.card.type));

const actions = computed(() => (merged.value.actions ?? []).slice(0, 2));

function onActionChange(index: number, state: ResultCardActionState) {
	const action = actions.value[index];
	if (action) emit('action', { action, index, state });
}

const detailsOpen = ref(false);
const detailsJson = computed(() => JSON.stringify(props.card, null, 2));

const switcherLabel = computed(() => props.card.switcher?.label ?? t('resultCard.switcher'));

const accentStyle = computed(() => ({
	'--rc-tone': tone.value.accent,
	'--rc-tone-soft': tone.value.soft,
	'--rc-tone-ink': tone.value.ink,
}));
</script>

<template>
	<article
		:class="[
			$style.card,
			{
				[$style.animated]: animated,
				'rc-animated': animated,
				[$style.onSky]: onSky,
				[$style.headless]: !hasHeader,
			},
		]"
		:style="accentStyle"
		:data-tone="tone.id"
		:data-service="service"
		:data-archetype="card.type"
		:data-variant="hasSwitcher ? activeKey : undefined"
		:aria-label="card.title"
		data-test-id="result-card"
	>
		<div v-if="cover && !onSky" :class="$style.cover" role="img" :aria-label="cover.alt ?? ''">
			<img :src="cover.src" :alt="cover.alt ?? ''" />
		</div>

		<header v-if="hasHeader" :class="$style.top">
			<span
				:class="[$style.dot, card.status ? $style[`dot-${card.status}`] : '']"
				aria-hidden="true"
			/>
			<span :class="$style.topLine" data-test-id="result-card-top">{{ topLine }}</span>
			<span
				v-if="statusLabel"
				:class="[$style.badge, $style[`badge-${statusTone}`]]"
				data-test-id="result-card-status"
			>
				<RcTextSoft :text="statusLabel" />
			</span>
			<span v-if="footer?.time" :class="$style.time">{{ footer.time }}</span>
			<RcMenu
				v-if="hasSwitcher && control === 'menu'"
				:options="options"
				:model-value="activeKey"
				:label="switcherLabel"
				:class="$style.menu"
				@update:model-value="select"
			/>
		</header>

		<div v-if="topSegmented && !inlineSwitcher" :class="$style.topSwitcher">
			<RcTabs
				variant="segmented"
				:options="options"
				:model-value="activeKey"
				:label="switcherLabel"
				@update:model-value="select"
			/>
		</div>

		<h3 v-if="shellHero" :class="$style.hero">{{ merged.title }}</h3>

		<div :class="$style.body" :data-variant="hasSwitcher ? activeKey : undefined">
			<ResultCardEmail v-if="merged.type === 'email'" :card="merged" :animated="animated" />
			<ResultCardMessage
				v-else-if="merged.type === 'message'"
				:card="merged"
				:service="service"
				:animated="animated"
			/>
			<ResultCardRecords
				v-else-if="merged.type === 'records'"
				:card="merged"
				:animated="animated"
			/>
			<ResultCardMetric v-else-if="merged.type === 'metric'" :card="merged" :animated="animated" />
			<ResultCardList v-else-if="merged.type === 'list'" :card="merged" :animated="animated" />
			<ResultCardWeather
				v-else-if="merged.type === 'weather'"
				:card="merged"
				:animated="animated"
			/>
			<ResultCardEvent v-else-if="merged.type === 'event'" :card="merged" :animated="animated" />
			<ResultCardTicket v-else-if="merged.type === 'ticket'" :card="merged" :animated="animated" />
			<ResultCardChart v-else-if="merged.type === 'chart'" :card="merged" :animated="animated">
				<template v-if="inlineSwitcher" #switcher>
					<RcTabs
						variant="segmented"
						:options="options"
						:model-value="activeKey"
						:label="switcherLabel"
						@update:model-value="select"
					/>
				</template>
			</ResultCardChart>
			<ResultCardPulse v-else-if="merged.type === 'pulse'" :card="merged" :animated="animated" />
			<ResultCardKeyValue v-else :card="merged" :animated="animated" />
		</div>

		<div
			v-if="hasSwitcher && control !== 'menu' && !(control === 'segmented' && placement === 'top')"
			:class="[$style.bottomSwitcher, { [$style.strip]: control === 'tabs' }]"
		>
			<RcSwitch
				v-if="control === 'switch'"
				:options="options"
				:model-value="activeKey"
				:label="card.switcher?.label"
				@update:model-value="select"
			/>
			<RcTabs
				v-else
				:variant="control === 'segmented' ? 'segmented' : 'strip'"
				:options="options"
				:model-value="activeKey"
				:label="switcherLabel"
				@update:model-value="select"
			/>
		</div>

		<div v-if="actions.length" :class="$style.actions" data-test-id="result-card-actions">
			<RcPill
				v-for="(action, index) in actions"
				:key="`${index}-${action.label}`"
				:action="action"
				:primary="index === 0"
				@change="(state) => onActionChange(index, state)"
			/>
		</div>

		<footer v-if="iconList.length || expandable || footerMeta" :class="$style.bottom">
			<span :class="$style.lead">
				<span v-if="iconList.length" :class="$style.cluster" aria-hidden="true">
					<span v-for="(nodeIcon, index) in iconList" :key="index" :class="$style.clusterItem">
						<N8nNodeIcon
							:type="nodeIcon.type"
							:src="nodeIcon.src"
							:name="nodeIcon.name"
							:color="onSky ? undefined : nodeIcon.color"
							:size="12"
						/>
					</span>
				</span>
				<span v-if="footerMeta && topLine" :class="$style.topLine" data-test-id="result-card-top">{{
					topLine
				}}</span>
			</span>
			<span :class="$style.trail">
				<span v-if="footerMeta && footer?.time" :class="$style.time">{{ footer.time }}</span>
				<RcMenu
					v-if="!hasHeader && hasSwitcher && control === 'menu'"
					:options="options"
					:model-value="activeKey"
					:label="switcherLabel"
					:class="$style.menu"
					@update:model-value="select"
				/>
				<button
					v-if="expandable"
					type="button"
					:class="$style.details"
					:aria-expanded="detailsOpen"
					aria-haspopup="dialog"
					data-test-id="result-card-toggle"
					@click="detailsOpen = true"
				>
					{{ t('resultCard.details') }}
					<N8nIcon icon="chevron-right" size="xsmall" />
				</button>
			</span>
		</footer>

		<N8nDialog
			v-if="expandable"
			v-model:open="detailsOpen"
			:header="card.title"
			:description="topLine || undefined"
			size="medium"
		>
			<div :class="$style.dialogBody" data-test-id="result-card-details">
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
		</N8nDialog>
	</article>
</template>

<style lang="scss" module>
@use './motion/tokens';

@keyframes rc-card-in {
	from {
		opacity: 0;
		transform: translateY(8px) scale(0.985);
		filter: blur(4px);
	}
	to {
		opacity: 1;
		transform: translateY(0) scale(1);
		filter: blur(0);
	}
}

.card {
	@include tokens.rc-tokens;
	@include tokens.rc-pressable;

	position: relative;
	display: flex;
	flex-direction: column;
	width: 100%;
	max-width: 320px;
	border-radius: var(--rc-radius);
	background: var(--rc-surface);
	color: var(--rc-fg);
	box-shadow: var(--rc-card-shadow);
	font-size: 13px;
	line-height: 20px;
	-webkit-font-smoothing: antialiased;
	overflow: hidden;
	isolation: isolate;
	user-select: text;
	-webkit-user-select: text;
}
:global([data-theme='dark']) .card {
	@include tokens.rc-tokens-dark;
}
@media (prefers-color-scheme: dark) {
	:global(body:not([data-theme])) .card {
		@include tokens.rc-tokens-dark;
	}
}
.card :where(button) {
	@include tokens.rc-pressable;
}

.animated {
	animation: rc-card-in var(--rc-enter-dur, 500ms) var(--rc-ease-smooth-out) both;
}
@media (prefers-reduced-motion: reduce) {
	.animated {
		animation: none;
	}
}

/* the weather sky fills the card; every piece of chrome over it reads in white */
.onSky {
	--rc-fg: #fff;
	--rc-muted: rgba(255, 255, 255, 0.8);
	--rc-border: rgba(255, 255, 255, 0.28);
	--rc-chip: rgba(255, 255, 255, 0.16);
	--rc-chip-hover: rgba(255, 255, 255, 0.24);
	--rc-gray-hover: rgba(255, 255, 255, 0.08);
	--rc-accent: #fff;
	--rc-on-accent: #1f3f6e;
	--rc-link: #fff;
	--rc-tone: #fff;
	color: #fff;
}

/* ---- cover (optional photo header, faded like the event map) ---- */
.cover {
	height: 104px;
	overflow: hidden;
	img {
		display: block;
		width: 100%;
		height: 100%;
		object-fit: cover;
		opacity: 0.75;
	}
}

/* ---- header ---- */
.top {
	display: flex;
	align-items: center;
	gap: 6px;
	min-height: 20px;
	padding: 16px 24px 0;
	font-size: 12px;
	line-height: 16px;
	color: var(--rc-muted);
}
.dot {
	flex: none;
	width: 6px;
	height: 6px;
	border-radius: 50%;
	background: var(--rc-border);
}
.dot-success {
	background: var(--rc-ok-ink);
}
.dot-error {
	background: var(--rc-red);
}
.dot-pending {
	background: var(--rc-warn-ink);
}
.dot-info {
	background: var(--rc-tone);
}
.onSky .dot {
	background: rgba(255, 255, 255, 0.85);
}
.topLine {
	min-width: 0;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
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
	--fill: var(--rc-chip);
	--ink: var(--rc-fg);
	background: var(--fill);
	color: var(--ink);
	box-shadow:
		0 1px 3px rgba(0, 0, 0, 0.04),
		inset 0 0 0 1px color-mix(in srgb, var(--ink) 14%, transparent),
		inset 0 -1px 0 0 color-mix(in srgb, var(--ink) 10%, transparent);
	transition:
		background-color var(--rc-duration-fast) var(--rc-ease-smooth-out),
		color var(--rc-duration-fast) var(--rc-ease-smooth-out);
}
.badge-ok {
	--fill: var(--rc-ok-fill);
	--ink: var(--rc-ok-ink);
}
.badge-warn {
	--fill: var(--rc-warn-fill);
	--ink: var(--rc-warn-ink);
}
.badge-error {
	--fill: var(--rc-error-fill);
	--ink: var(--rc-error-ink);
}
.badge-info {
	--fill: var(--rc-info-fill);
	--ink: var(--rc-info-ink);
}
.onSky .badge {
	--fill: rgba(255, 255, 255, 0.18);
	--ink: #fff;
	box-shadow: none;
}
.time {
	margin-left: auto;
	font-variant-numeric: tabular-nums;
	color: var(--rc-muted);
	opacity: 0.8;
}
.menu {
	margin-left: auto;
	margin-top: -6px;
	margin-bottom: -6px;
}
.time + .menu {
	margin-left: 8px;
}

.topSwitcher {
	padding: 12px 24px 0;
}

.hero {
	margin: 8px 24px 0;
	font-size: 16px;
	line-height: 22px;
	font-weight: 500;
	color: var(--rc-fg);
	overflow-wrap: anywhere;
	text-wrap: balance;
}

.body {
	display: flex;
	flex-direction: column;
	min-width: 0;
}
/* without a header row the body takes the header's top inset (bodies add their own 8px);
   the sky body opens with its own 24px, as the reference does */
.headless:not(.onSky) > .body:first-child,
.headless > .hero:first-child,
.headless > .topSwitcher:first-child {
	padding-top: 16px;
}

/* ---- switcher at the bottom ---- */
.bottomSwitcher {
	padding: 12px 24px 0;
}
.strip {
	padding: 16px 12px 0;
}
.onSky .strip,
.onSky .topSwitcher {
	--rc-tabs-bar-bg: rgba(0, 0, 0, 0.16);
	--rc-tabs-pill-bg: rgba(255, 255, 255, 0.2);
	--rc-tabs-text-muted: rgba(255, 255, 255, 0.78);
	--rc-tabs-text-active: #fff;
	--rc-tabs-pill-shadow: none;
}

/* ---- actions ---- */
.actions {
	display: flex;
	gap: 8px;
	padding: 12px 24px 0;
}

/* ---- footer ---- */
.bottom {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 8px;
	min-height: 22px;
	padding: 12px 24px 16px;
}
.bottom:first-child {
	padding-top: 16px;
}
.lead,
.trail {
	display: inline-flex;
	align-items: center;
	gap: 8px;
	min-width: 0;
	font-size: 12px;
	line-height: 16px;
	color: var(--rc-muted);
}
.trail {
	flex: none;
}
.trail .time {
	margin-left: 0;
}
.trail .menu {
	margin: -6px 0;
}
.cluster {
	display: inline-flex;
	align-items: center;
	flex: none;
}
.clusterItem {
	display: inline-flex;
	align-items: center;
	justify-content: center;
	width: 22px;
	height: 22px;
	border-radius: 50%;
	background: var(--rc-surface);
	box-shadow:
		0 0 0 1.5px var(--rc-surface),
		0 1px 2px rgba(0, 0, 0, 0.12),
		inset 0 0 0 1px rgba(0, 0, 0, 0.06);
	& + & {
		margin-left: -6px;
	}
}
/* on the sky the cluster is glass: white glyphs on translucent discs, no shadow */
.onSky .clusterItem {
	--node--icon--color: #fff;
	background: rgba(255, 255, 255, 0.2);
	box-shadow: none;
}
.onSky .clusterItem + .clusterItem {
	margin-left: 2px;
}
.details {
	@include tokens.rc-button-reset;
	display: inline-flex;
	align-items: center;
	gap: 2px;
	font-size: 12px;
	line-height: 16px;
	font-weight: 500;
	color: var(--rc-muted);
	transition: color var(--rc-press-dur) var(--rc-ease-smooth-out);
	&:hover {
		color: var(--rc-fg);
	}
	&:focus-visible {
		outline: 2px solid var(--color--primary);
		outline-offset: 2px;
		border-radius: 4px;
	}
}

/* ---- details dialog ---- */
.dialogBody {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--xs);
}
.json {
	margin: 0;
	max-height: 60vh;
	overflow: auto;
	padding: var(--spacing--xs);
	border-radius: 12px;
	background: var(--color--background--light-2);
	font-family: var(--font-family--monospace);
	font-size: var(--font-size--3xs);
	line-height: var(--line-height--lg);
	color: var(--color--text);
	white-space: pre-wrap;
	overflow-wrap: anywhere;
}
.executionLink {
	@include tokens.rc-button-reset;
	align-self: flex-start;
	display: inline-flex;
	align-items: center;
	gap: 4px;
	font-size: var(--font-size--2xs);
	font-weight: var(--font-weight--bold);
	color: var(--color--text--shade-1, var(--color--text));
}
</style>
