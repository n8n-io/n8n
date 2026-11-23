<script setup lang="ts">
import { N8nHeading, N8nText } from '@n8n/design-system';
import { VIEWS } from '@n8n/frontend-constants/views';
import { useI18n } from '@n8n/i18n';
import { computed, onBeforeUnmount, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import PlaygroundSidebar from './PlaygroundSidebar.vue';
import {
	DEFAULT_PLAYGROUND_SCENARIO,
	DEFAULT_PLAYGROUND_SIZE,
	isPlaygroundScenarioId,
	isPlaygroundSize,
	type PlaygroundScenarioId,
	type PlaygroundSize,
} from './playground.scenarios';

/**
 * Development only. Shows one promotion scenario at a time, with sample data. The scenario list
 * takes the place of the Settings links, so the page reads as a part of Settings.
 */
const i18n = useI18n();
const route = useRoute();
const router = useRouter();

// The URL holds the choice, so a link shares the exact screen.
const scenarioId = computed<PlaygroundScenarioId>(() =>
	isPlaygroundScenarioId(route.query.scenario) ? route.query.scenario : DEFAULT_PLAYGROUND_SCENARIO,
);
const size = computed<PlaygroundSize>(() =>
	isPlaygroundSize(route.query.size) ? route.query.size : DEFAULT_PLAYGROUND_SIZE,
);

async function show(next: { scenario?: PlaygroundScenarioId; size?: PlaygroundSize }) {
	await router.replace({
		query: {
			...route.query,
			scenario: next.scenario ?? scenarioId.value,
			size: next.size ?? size.value,
		},
	});
}

async function back() {
	await router.push({ name: VIEWS.SETTINGS });
}

// The Settings layout owns the sidebar. The Playground teleports its own into the same place and
// marks the sidebar, so the CSS below hides the Settings links only while this page is open.
const SIDEBAR = '#sidebar';
onMounted(() => document.querySelector(SIDEBAR)?.setAttribute('data-playground', ''));
onBeforeUnmount(() => document.querySelector(SIDEBAR)?.removeAttribute('data-playground'));
</script>

<template>
	<div :class="$style.playground" data-test-id="promotions-playground">
		<Teleport defer :to="SIDEBAR">
			<PlaygroundSidebar
				:scenario-id="scenarioId"
				:size="size"
				@back="back"
				@select="show({ scenario: $event })"
				@resize="show({ size: $event })"
			/>
		</Teleport>
		<header :class="$style.header">
			<N8nHeading tag="h2" size="large">
				{{ i18n.baseText(`promotions.playground.scenario.${scenarioId}.title`) }}
			</N8nHeading>
			<N8nText color="text-light">
				{{ i18n.baseText(`promotions.playground.scenario.${scenarioId}.description`) }}
			</N8nText>
		</header>
		<div :class="$style.stage" data-test-id="promotions-playground-stage" />
	</div>
</template>

<style lang="scss">
#sidebar[data-playground] > :not([data-playground-sidebar]) {
	display: none;
}
</style>

<style lang="scss" module>
.playground {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--sm);
	min-height: 70vh;
}

.header {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--4xs);
}

.stage {
	flex: 1;
	min-height: 0;
}
</style>
