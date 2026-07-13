<script setup lang="ts">
import { N8nButton, N8nIcon, N8nText } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { computed, onMounted, ref } from 'vue';

import { useEvalCollectionsStore } from '../../evalCollections.store';
import { useEvaluationsLicense } from '../../composables/useEvaluationsLicense';

const props = defineProps<{
	workflowId: string;
	collectionId: string;
}>();

const i18n = useI18n();
const store = useEvalCollectionsStore();
const license = useEvaluationsLicense();

const errored = ref(false);
const licenseChecked = ref(false);

const insights = computed(() => store.getInsights(props.collectionId));
const loading = computed(() => store.loadingInsights[props.collectionId] ?? false);

// Hidden entirely when the instance isn't entitled — a not-in-cohort state, not
// an error. Stay hidden until the license check resolves so an unlicensed user
// never sees the card flash in before it vanishes.
const hidden = computed(() => !licenseChecked.value || !license.isLicensed.value);

const generatedTime = computed(() => {
	const iso = insights.value?.generatedAt;
	if (!iso) return '';
	const date = new Date(iso);
	if (Number.isNaN(date.getTime())) return '';
	return date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
});

const primaryRegression = computed(() => insights.value?.insights.regressions[0] ?? null);

async function load(forceRegenerate: boolean) {
	errored.value = false;
	try {
		await store.generateInsights(props.workflowId, props.collectionId, forceRegenerate);
	} catch {
		errored.value = true;
	}
}

onMounted(async () => {
	await license.ensureLicenseLoaded();
	licenseChecked.value = true;
	if (!license.isLicensed.value) return;
	if (!store.getInsights(props.collectionId)) {
		await load(false);
	}
});
</script>

<template>
	<section v-if="!hidden" :class="$style.card" data-test-id="compare-ai-insights">
		<header :class="$style.header">
			<div :class="$style.title">
				<N8nIcon icon="wand-sparkles" size="small" />
				<N8nText size="medium" bold>{{
					i18n.baseText('evaluation.compare.insights.title')
				}}</N8nText>
				<N8nText v-if="generatedTime" size="xsmall" color="text-light">
					{{
						i18n.baseText('evaluation.compare.insights.generatedAt', {
							interpolate: { time: generatedTime },
						})
					}}
				</N8nText>
			</div>
			<N8nButton
				variant="ghost"
				size="small"
				icon="refresh-cw"
				:loading="loading"
				:label="i18n.baseText('evaluation.compare.insights.regenerate')"
				data-test-id="compare-ai-insights-regenerate"
				@click="load(true)"
			/>
		</header>

		<div v-if="loading" :class="$style.takeaways" data-test-id="compare-ai-insights-loading">
			<div v-for="n in 3" :key="n" :class="[$style.takeaway, $style.skeleton]" />
		</div>

		<div v-else-if="errored" :class="$style.errorCard" data-test-id="compare-ai-insights-error">
			<N8nText size="small" color="text-base">
				{{ i18n.baseText('evaluation.compare.insights.error') }}
			</N8nText>
			<N8nButton
				variant="outline"
				size="small"
				:label="i18n.baseText('evaluation.compare.insights.retry')"
				@click="load(true)"
			/>
		</div>

		<template v-else-if="insights">
			<div :class="$style.takeaways">
				<article :class="[$style.takeaway, $style.winner]">
					<span :class="[$style.badge, $style.badgeSuccess]">
						<N8nIcon icon="circle-check" size="small" />
					</span>
					<N8nText size="xsmall" bold color="text-light">
						{{ i18n.baseText('evaluation.compare.insights.winner') }}
					</N8nText>
					<N8nText size="small" bold>{{ insights.insights.winner.headline }}</N8nText>
					<N8nText size="xsmall" color="text-base">{{ insights.insights.winner.body }}</N8nText>
				</article>

				<article :class="[$style.takeaway, primaryRegression ? $style.regression : $style.neutral]">
					<span
						:class="[$style.badge, primaryRegression ? $style.badgeDanger : $style.badgeSuccess]"
					>
						<N8nIcon :icon="primaryRegression ? 'triangle-alert' : 'circle-check'" size="small" />
					</span>
					<N8nText size="xsmall" bold color="text-light">
						{{ i18n.baseText('evaluation.compare.insights.regression') }}
					</N8nText>
					<template v-if="primaryRegression">
						<N8nText size="small" bold>{{ primaryRegression.headline }}</N8nText>
						<N8nText size="xsmall" color="text-base">{{ primaryRegression.body }}</N8nText>
					</template>
					<N8nText v-else size="small" color="text-base">
						{{ i18n.baseText('evaluation.compare.insights.noRegressions') }}
					</N8nText>
				</article>

				<article :class="[$style.takeaway, $style.next]">
					<span :class="[$style.badge, $style.badgeInfo]">
						<N8nIcon icon="arrow-right" size="small" />
					</span>
					<N8nText size="xsmall" bold color="text-light">
						{{ i18n.baseText('evaluation.compare.insights.suggestedNext') }}
					</N8nText>
					<N8nText size="small" bold>{{ insights.insights.suggestedNext.headline }}</N8nText>
					<N8nText size="xsmall" color="text-base">{{
						insights.insights.suggestedNext.body
					}}</N8nText>
				</article>
			</div>

			<N8nText
				v-if="insights.status === 'fallback'"
				size="xsmall"
				color="text-light"
				:class="$style.fallbackNote"
			>
				{{ i18n.baseText('evaluation.compare.insights.fallbackNote') }}
			</N8nText>
		</template>
	</section>
</template>

<style module lang="scss">
.card {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--sm);
	border: 1px solid var(--border-color--subtle);
	border-radius: var(--radius--md);
	background: var(--background--surface);
	padding: var(--spacing--md) var(--spacing--lg);
}

.header {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: var(--spacing--md);
}

.title {
	display: inline-flex;
	align-items: center;
	gap: var(--spacing--2xs);
}

.takeaways {
	display: grid;
	grid-template-columns: repeat(3, 1fr);
	gap: var(--spacing--sm);
}

.takeaway {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--3xs);
	padding: var(--spacing--sm);
	border-radius: var(--radius);
	border: 1px solid var(--border-color--subtle);
}

.winner {
	background: var(--callout--color--background--success);
}

.regression {
	background: var(--callout--color--background--danger);
}

.next {
	background: var(--callout--color--background--info);
}

.neutral {
	background: var(--background--subtle);
}

.badge {
	display: inline-flex;
	align-items: center;
	justify-content: center;
	width: 24px;
	height: 24px;
	border-radius: var(--radius--full);
	margin-bottom: var(--spacing--3xs);
	background: var(--background--surface);
}

.badgeSuccess {
	color: var(--icon-color--success);
}

.badgeDanger {
	color: var(--icon-color--danger);
}

.badgeInfo {
	color: var(--icon-color--info);
}

.skeleton {
	height: 96px;
	background: var(--background--subtle);
	border-color: transparent;
}

.errorCard {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: var(--spacing--md);
	padding: var(--spacing--sm) var(--spacing--md);
	border: 1px solid var(--border-color--subtle);
	border-radius: var(--radius);
	background: var(--background--subtle);
}

.fallbackNote {
	font-style: italic;
}
</style>
