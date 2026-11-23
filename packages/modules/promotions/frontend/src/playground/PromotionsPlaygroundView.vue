<script setup lang="ts">
import { VIEWS } from '@n8n/frontend-constants/views';
import { useI18n } from '@n8n/i18n';
import { N8nText } from '@n8n/design-system';
import { computed, defineAsyncComponent, onBeforeUnmount, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import PlaygroundSidebar from './PlaygroundSidebar.vue';
import { PLAYGROUND_PROJECT_ID, buildPlaygroundPreview } from './playground.data';
import { installMockPromotionApi } from './playground.mock-api';
import {
	DEFAULT_PLAYGROUND_SCENARIO,
	DEFAULT_PLAYGROUND_SIZE,
	PLAYGROUND_SCENARIOS,
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

// The real preview page, as the product renders it. The mock API gives it the sample data.
const PreviewPage = defineAsyncComponent(
	async () => await import('../views/PromotionPreviewView.vue'),
);
const scenario = computed(() => PLAYGROUND_SCENARIOS.find(({ id }) => id === scenarioId.value));
let removeMockApi: (() => void) | undefined;

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
// Installed during setup, before the preview page below can send its first request.
removeMockApi = installMockPromotionApi(() =>
	buildPlaygroundPreview(scenario.value?.direction ?? 'promote', size.value),
);
onMounted(() => document.querySelector(SIDEBAR)?.setAttribute('data-playground', ''));
onBeforeUnmount(() => {
	document.querySelector(SIDEBAR)?.removeAttribute('data-playground');
	removeMockApi?.();
});
</script>

<template>
	<div data-test-id="promotions-playground">
		<Teleport defer :to="SIDEBAR">
			<PlaygroundSidebar
				:scenario-id="scenarioId"
				:size="size"
				@back="back"
				@select="show({ scenario: $event })"
				@resize="show({ size: $event })"
			/>
		</Teleport>
		<div :class="$style.stage" data-test-id="promotions-playground-stage">
			<!-- The key reloads the page when the scenario or the amount changes. -->
			<PreviewPage
				v-if="scenario?.built && scenario.direction"
				:key="`${scenarioId}-${size}`"
				:project-id="PLAYGROUND_PROJECT_ID"
				:direction="scenario.direction"
			/>
			<N8nText
				v-else
				color="text-light"
				:class="$style.pending"
				data-test-id="promotions-playground-pending"
			>
				{{ i18n.baseText('promotions.playground.stage.pending') }}
			</N8nText>
		</div>
	</div>
</template>

<style lang="scss">
#sidebar[data-playground] > :not([data-playground-sidebar]) {
	display: none;
}
</style>

<style lang="scss" module>
// The Settings layout pads its content and limits its width. The stage fills the whole content
// area instead, as a project page does in the product, and the page scrolls inside it.
.stage {
	position: absolute;
	inset: 0;
	display: flex;
	flex-direction: column;
	overflow: hidden;

	> * {
		flex: 1;
		min-height: 0;
	}
}

.pending {
	flex: none;
	padding: var(--spacing--lg);
}
</style>
