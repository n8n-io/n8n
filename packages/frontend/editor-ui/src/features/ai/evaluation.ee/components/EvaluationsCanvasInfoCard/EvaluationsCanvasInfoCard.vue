<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { useI18n } from '@n8n/i18n';
import { N8nButton, N8nIcon, N8nText } from '@n8n/design-system';

import { useEvaluationsWizardSidepanelExperiment } from '@/experiments/evaluationsWizardSidepanel/useEvaluationsWizardSidepanelExperiment';
import { useEvaluationsWizardSidepanelStore } from '../../wizardSidepanel.store';
import { useAiRootNodes } from '../../composables/useAiRootNodes';
import { listEvaluationConfigs } from '../../evaluation.api';
import { injectWorkflowDocumentStore } from '@/app/stores/workflowDocument.store';
import { useRootStore } from '@n8n/stores/useRootStore';
import { useStorage } from '@/app/composables/useStorage';
import { LOCAL_STORAGE_EVALUATIONS_CANVAS_INFO_CARD_DISMISSED } from '@/app/constants';
import { CANNED_METRICS, LLM_JUDGE_METRIC_KEYS } from '../../evaluation.constants';

// Preview cards that scroll in the marquee at the top of the info card. We
// duplicate the list once so the CSS `translateY(-50%)` loop reads as a
// continuous scroll — single-list looping would visibly snap back. The
// `LLM-as-Judge` pill is only shown for metrics in `LLM_JUDGE_METRIC_KEYS`
// (correctness, helpfulness) — labelling Tools Used / String Similarity /
// Categorization as judge-based would be wrong, those are deterministic.
const marqueeMetrics = computed(() =>
	[...CANNED_METRICS, ...CANNED_METRICS].map((m) => ({
		...m,
		isJudge: LLM_JUDGE_METRIC_KEYS.has(m.key),
	})),
);

// Floating onboarding card in the bottom-left of the canvas, nudging users
// with an active AI workflow toward setting up evaluations. Conditions:
//
//   - experiment flag on
//   - workflow is active (published)
//   - workflow has at least one AI root node
//   - no evaluation configs exist for this workflow
//   - the card hasn't been dismissed for this workflow before
//
// All five must hold. The dismiss state is scoped per-workflow so different
// workflows surface the prompt independently — matches the per-workflow
// nature of evaluation configs.

const locale = useI18n();
const wizardStore = useEvaluationsWizardSidepanelStore();
const workflowDocumentStore = injectWorkflowDocumentStore();
const rootStore = useRootStore();
const aiRootNodes = useAiRootNodes();
const { isFeatureEnabled: isEvaluationsWizardSidepanelEnabled } =
	useEvaluationsWizardSidepanelExperiment();

const hasConfigs = ref<boolean | null>(null);
const isLoadingConfigs = ref(false);

// LOCAL_STORAGE_EVALUATIONS_CANVAS_INFO_CARD_DISMISSED is a comma-separated
// list of workflow ids. We could use one key per workflow, but localStorage's
// flat keyspace gets noisy fast — single key + Set membership is cheaper.
const dismissedStorage = useStorage(LOCAL_STORAGE_EVALUATIONS_CANVAS_INFO_CARD_DISMISSED);

const dismissedSet = computed<Set<string>>(() => {
	const raw = dismissedStorage.value;
	if (!raw) return new Set();
	return new Set(raw.split(',').filter(Boolean));
});

const workflowId = computed(() => workflowDocumentStore.value?.workflowId ?? '');
const isWorkflowActive = computed(() => workflowDocumentStore.value?.active ?? false);
const hasAiNodes = computed(() => aiRootNodes.value.length > 0);

const isDismissed = computed(() => {
	if (!workflowId.value) return true;
	return dismissedSet.value.has(workflowId.value);
});

// Gate the config fetch on the cheap local predicates first — no point in
// hitting the API when we already know we won't show the card.
const shouldRenderModuleQualifies = computed(
	() =>
		isEvaluationsWizardSidepanelEnabled.value &&
		isWorkflowActive.value &&
		hasAiNodes.value &&
		!isDismissed.value,
);

// Hide the nudge while the user is already inside the evaluations wizard —
// the card's whole purpose is to surface that flow, so it's redundant (and
// visually noisy under the open sidepanel). `wizardStore.isOpen` is itself
// derived from the focus panel store, so this stays reactive across both
// the wizard's own open/close actions and direct focus-panel tab switches.
const isVisible = computed(
	() => shouldRenderModuleQualifies.value && hasConfigs.value === false && !wizardStore.isOpen,
);

async function checkConfigs() {
	const wfId = workflowId.value;
	if (!wfId) return;
	if (isLoadingConfigs.value) return;
	isLoadingConfigs.value = true;
	try {
		const configs = await listEvaluationConfigs(rootStore.restApiContext, wfId);
		hasConfigs.value = configs.length > 0;
	} catch {
		// API failures shouldn't crash the canvas — treat as "configs exist"
		// to hide the card defensively rather than nag the user with a stale
		// prompt while the server is misbehaving.
		hasConfigs.value = true;
	} finally {
		isLoadingConfigs.value = false;
	}
}

// Re-check whenever the local predicates flip from false → true. Avoids the
// fetch on every workflow load if the card wouldn't render anyway.
watch(
	shouldRenderModuleQualifies,
	(qualifies) => {
		if (!qualifies) {
			hasConfigs.value = null;
			return;
		}
		if (hasConfigs.value === null) void checkConfigs();
	},
	{ immediate: true },
);

onMounted(() => {
	if (shouldRenderModuleQualifies.value && hasConfigs.value === null) void checkConfigs();
});

function dismiss() {
	const wfId = workflowId.value;
	if (!wfId) return;
	const next = new Set(dismissedSet.value);
	next.add(wfId);
	dismissedStorage.value = [...next].join(',');
}

function openWizard() {
	wizardStore.open(0);
}
</script>

<template>
	<aside
		v-if="isVisible"
		:class="$style.card"
		role="complementary"
		data-test-id="evaluations-canvas-info-card"
	>
		<button
			type="button"
			:class="$style.dismiss"
			:aria-label="locale.baseText('evaluations.canvasInfoCard.dismiss')"
			data-test-id="evaluations-canvas-info-card-dismiss"
			@click="dismiss"
		>
			<N8nIcon icon="x" size="small" />
		</button>

		<!--
			Marquee preview of canned metrics. Pure CSS marquee — the list is
			duplicated in `marqueeMetrics` and the animation translates the
			track by 50% so the loop is seamless. Hidden from assistive tech;
			the heading + description below carries the actual message.
		-->
		<div :class="$style.marquee" aria-hidden="true">
			<ul :class="$style.marqueeTrack">
				<li
					v-for="(metric, index) in marqueeMetrics"
					:key="`${metric.key}-${index}`"
					:class="$style.marqueeItem"
				>
					<div :class="$style.marqueeTitleRow">
						<span
							:class="$style.marqueeIcon"
							:style="{ backgroundColor: metric.tileBg, color: metric.tileFg }"
						>
							<N8nIcon :icon="metric.icon" size="xsmall" />
						</span>
						<N8nText size="small" bold color="text-dark" :class="$style.marqueeTitle">
							{{ locale.baseText(metric.labelKey) }}
						</N8nText>
						<span v-if="metric.isJudge" :class="$style.marqueeBadge">
							{{ locale.baseText('evaluations.wizardSidepanel.metric.judgeTag') }}
						</span>
					</div>
					<N8nText size="xsmall" color="text-base" :class="$style.marqueeDescription">
						{{ locale.baseText(metric.descriptionKey) }}
					</N8nText>
				</li>
			</ul>
		</div>

		<div :class="$style.body">
			<N8nText size="small" bold color="text-dark">
				{{ locale.baseText('evaluations.canvasInfoCard.title') }}
			</N8nText>
			<N8nText size="small" color="text-base" :class="$style.description">
				{{ locale.baseText('evaluations.canvasInfoCard.description') }}
			</N8nText>
		</div>

		<div :class="$style.footer">
			<N8nButton
				variant="solid"
				size="medium"
				type="button"
				:class="$style.setupButton"
				data-test-id="evaluations-canvas-info-card-setup"
				@click="openWizard"
			>
				{{ locale.baseText('evaluations.canvasInfoCard.setup') }}
			</N8nButton>
		</div>
	</aside>
</template>

<style module lang="scss">
.card {
	position: relative;
	display: flex;
	flex-direction: column;
	gap: var(--spacing--xs);
	width: 280px;
	padding: var(--spacing--sm);
	background-color: var(--background--surface);
	border: var(--border);
	border-radius: var(--border-radius--base);
	box-shadow: 0 8px 20px var(--color--black-alpha-100, rgba(0, 0, 0, 0.08));
	overflow: hidden;
}

.dismiss {
	position: absolute;
	top: var(--spacing--3xs);
	right: var(--spacing--3xs);
	display: inline-flex;
	align-items: center;
	justify-content: center;
	width: 22px;
	height: 22px;
	padding: 0;
	background: transparent;
	border: none;
	border-radius: var(--border-radius--base);
	color: var(--color--text--tint-1);
	cursor: pointer;

	&:hover,
	&:focus-visible {
		color: var(--color--text);
		background-color: var(--background--subtle);
	}

	&:focus-visible {
		outline: 1px solid var(--focus--border-color);
	}
}

// Mask the marquee at top/bottom so cards fade in/out instead of clipping.
// The list translates by -50% over the duration so the duplicated half lines
// up perfectly with the start — no visible reset on each cycle.
.marquee {
	position: relative;
	height: 140px;
	overflow: hidden;
	mask-image: linear-gradient(to bottom, transparent 0%, black 15%, black 85%, transparent 100%);
	-webkit-mask-image: linear-gradient(
		to bottom,
		transparent 0%,
		black 15%,
		black 85%,
		transparent 100%
	);
}

.marqueeTrack {
	list-style: none;
	margin: 0;
	padding: 0;
	display: flex;
	flex-direction: column;
	gap: var(--spacing--xs);
	animation: marqueeScroll 24s linear infinite;
}

@keyframes marqueeScroll {
	from {
		transform: translateY(0);
	}
	to {
		transform: translateY(-50%);
	}
}

@media (prefers-reduced-motion: reduce) {
	.marqueeTrack {
		animation: none;
	}
}

// Each marquee tile is a bordered card to match the desired design — gives a
// preview of what a configured scorer entry looks like in the wizard. Uses
// `--radius--xs` (8px) — the design uses a more pronounced corner than the
// 4px `--border-radius--base` default.
.marqueeItem {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--3xs);
	padding: var(--spacing--2xs) var(--spacing--xs);
	border: var(--border);
	border-radius: var(--radius--xs);
	background-color: var(--background--surface);
}

.marqueeIcon {
	display: inline-flex;
	align-items: center;
	justify-content: center;
	width: 20px;
	height: 20px;
	border-radius: 4px;
	flex-shrink: 0;
}

.marqueeTitleRow {
	display: flex;
	align-items: center;
	gap: var(--spacing--3xs);
	min-width: 0;
}

.marqueeTitle {
	flex-shrink: 1;
	min-width: 0;
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
}

.marqueeBadge {
	background-color: var(--background--subtle);
	color: var(--color--text--tint-1);
	border-radius: 999px;
	font-size: 10px;
	font-weight: var(--font-weight--medium);
	line-height: 1.2;
	padding: 2px 6px;
	flex-shrink: 0;
}

.marqueeDescription {
	display: -webkit-box;
	-webkit-line-clamp: 2;
	-webkit-box-orient: vertical;
	overflow: hidden;
	line-height: 1.3;
}

.body {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--3xs);
	padding-right: var(--spacing--md);
}

.description {
	display: block;
	line-height: 1.4;
}

.footer {
	display: flex;
}

.setupButton {
	width: 100%;
}
</style>
