<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { useI18n } from '@n8n/i18n';
import { N8nButton, N8nIcon, N8nText } from '@n8n/design-system';

import { useTelemetry } from '@/app/composables/useTelemetry';
import { useEvaluationsWizardSidepanelExperiment } from '@/experiments/evaluationsWizardSidepanel/useEvaluationsWizardSidepanelExperiment';
import { useEvaluationsWizardSidepanelStore } from '../../wizardSidepanel.store';
import { useAiRootNodes } from '../../composables/useAiRootNodes';
import { listEvaluationConfigs } from '../../evaluation.api';
import { injectWorkflowDocumentStore } from '@/app/stores/workflowDocument.store';
import { useRootStore } from '@n8n/stores/useRootStore';
import { useStorage } from '@/app/composables/useStorage';
import { LOCAL_STORAGE_EVALUATIONS_CANVAS_INFO_CARD_DISMISSED } from '@/app/constants';
import { CANNED_METRICS, LLM_JUDGE_METRIC_KEYS } from '../../evaluation.constants';
import CheckCard from '../WizardSidepanel/CheckCard.vue';
import { useEvaluationsLicense } from '../../composables/useEvaluationsLicense';

// Preview cards that scroll in the marquee at the top of the info card. We
// duplicate the list once so the CSS `translateY(-50%)` loop reads as a
// continuous scroll — single-list looping would visibly snap back. The
// `AI` pill is only shown for metrics in `LLM_JUDGE_METRIC_KEYS`
// (correctness, helpfulness) — labelling the exact-match / string-similarity /
// tools-used checks as AI-judged would be wrong, those are deterministic.
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
const telemetry = useTelemetry();
const wizardStore = useEvaluationsWizardSidepanelStore();
const workflowDocumentStore = injectWorkflowDocumentStore();
const rootStore = useRootStore();
const aiRootNodes = useAiRootNodes();
const { isFeatureEnabled: isEvaluationsWizardSidepanelEnabled } =
	useEvaluationsWizardSidepanelExperiment();
const { isLicensed, ensureLicenseLoaded } = useEvaluationsLicense();

const hasConfigs = ref<boolean | null>(null);

// Workflow id of the fetch currently in flight, used to (a) dedupe concurrent
// fetches for the same workflow and (b) still allow a fresh fetch when the
// user switches to a different workflow mid-request. Plain variable — it's a
// control flag, nothing in the template reacts to it.
let inFlightWorkflowId: string | null = null;

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
		isLicensed.value &&
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

onMounted(() => {
	void ensureLicenseLoaded();
});

async function checkConfigs() {
	const wfId = workflowId.value;
	if (!wfId) return;
	// Already fetching for this exact workflow — let that call settle the state.
	if (inFlightWorkflowId === wfId) return;
	inFlightWorkflowId = wfId;
	try {
		const configs = await listEvaluationConfigs(rootStore.restApiContext, wfId);
		// Drop the response if the user has since switched workflows, so a slow
		// fetch for the previous workflow can't clobber the current one's state.
		if (wfId !== workflowId.value) return;
		hasConfigs.value = configs.length > 0;
	} catch {
		if (wfId !== workflowId.value) return;
		// API failures shouldn't crash the canvas — treat as "configs exist"
		// to hide the card defensively rather than nag the user with a stale
		// prompt while the server is misbehaving.
		hasConfigs.value = true;
	} finally {
		if (inFlightWorkflowId === wfId) inFlightWorkflowId = null;
	}
}

// Re-check whenever the local predicates flip from false → true. Avoids the
// fetch on every workflow load if the card wouldn't render anyway. Runs
// immediately so the initial mount also triggers the fetch when it qualifies.
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

// Re-fetch when the workflow itself changes. The qualify-predicate watch above
// only fires on transitions, so switching between two *qualifying* workflows
// leaves it untouched — without this the card would compute visibility from the
// previous workflow's configs and show/hide incorrectly. Reset to null first so
// the card stays hidden until the new workflow's configs come back.
watch(workflowId, () => {
	hasConfigs.value = null;
	if (shouldRenderModuleQualifies.value) void checkConfigs();
});

// Re-check configs when the wizard closes — the user may have just completed
// it and created a config. Without this, the cached `hasConfigs === false`
// from the initial fetch would let the card pop back up over a workflow that
// now has a config.
watch(
	() => wizardStore.isOpen,
	(isOpen, wasOpen) => {
		if (wasOpen && !isOpen && shouldRenderModuleQualifies.value) {
			void checkConfigs();
		}
	},
);

function dismiss() {
	const wfId = workflowId.value;
	if (!wfId) return;
	const next = new Set(dismissedSet.value);
	next.add(wfId);
	dismissedStorage.value = [...next].join(',');
}

function openWizard() {
	telemetry.track('User opened evaluations wizard', {
		workflow_id: workflowId.value,
		source: 'canvas_info_card',
	});
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
			Marquee preview of canned checks. Pure CSS marquee — the list is
			duplicated in `marqueeMetrics` and the animation translates the
			track by 50% so the loop is seamless. Hidden from assistive tech;
			the heading + description below carries the actual message.

			Renders `CheckCard` in `readonly` mode so the preview reads as the
			same component family the user will see inside the wizard. The card
			handles its own icon/title/badge layout so we only feed it data —
			click handlers and selected marks stay off via `readonly`.
		-->
		<div :class="$style.marquee" aria-hidden="true">
			<ul :class="$style.marqueeTrack">
				<li
					v-for="(metric, index) in marqueeMetrics"
					:key="`${metric.key}-${index}`"
					:class="$style.marqueeItem"
				>
					<CheckCard
						:icon="metric.icon"
						:icon-bg="metric.tileBg"
						:icon-fg="metric.tileFg"
						:title="locale.baseText(metric.labelKey)"
						:description="locale.baseText(metric.descriptionKey)"
						:badge="
							metric.isJudge
								? locale.baseText('evaluations.wizardSidepanel.metric.judgeTag')
								: undefined
						"
						readonly
					/>
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
	box-shadow: var(--shadow--md);
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
// Sized to fit ~2 full CheckCard tiles at once. Smaller heights crop the
// description; bigger feels like the card overstays its welcome.
.marquee {
	position: relative;
	height: 180px;
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

// Each marquee item is a thin wrapper around CheckCard, used purely for the
// list semantics + the marquee track's `gap` — CheckCard owns its own
// border/padding/typography so there's nothing to style here.
.marqueeItem {
	display: flex;
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
