<script setup lang="ts">
import { VIEWS } from '@n8n/frontend-constants/views';
import { useI18n } from '@n8n/i18n';
import { makeRestApiRequest } from '@n8n/rest-api-client';
import { useRootStore } from '@n8n/stores/useRootStore';
import { N8nText } from '@n8n/design-system';
import { computed, defineAsyncComponent, onBeforeUnmount, onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import PlaygroundSidebar from './PlaygroundSidebar.vue';
import { buildPlaygroundPreview, type PlaygroundProject } from './playground.data';
import { installMockPromotionApi } from './playground.mock-api';
import { reviewFrameUrl } from './playground.embed';
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
const rootStore = useRootStore();
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

// The create actions of the page use the real editors, which save to a project that exists. So
// the sample data belongs to a real project of the user: a team project, else the personal one.
const project = ref<PlaygroundProject>();
async function loadProject() {
	const projects = await makeRestApiRequest<Array<{ id: string; name: string; type: string }>>(
		rootStore.restApiContext,
		'GET',
		'/projects/my-projects',
	);
	const chosen = projects.find(({ type }) => type === 'team') ?? projects[0];
	if (chosen) project.value = { id: chosen.id, name: chosen.name };
}

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
removeMockApi = installMockPromotionApi(
	(state) =>
		buildPlaygroundPreview(
			scenarioId.value,
			scenario.value?.direction ?? 'promote',
			size.value,
			project.value ?? { id: 'playground-project', name: 'Sales' },
			state,
		),
	() => `${scenarioId.value}-${size.value}`,
);
onMounted(() => {
	document.querySelector(SIDEBAR)?.setAttribute('data-playground', '');
	void loadProject();
});

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
				v-if="scenario?.built && scenario.direction && project"
				:key="`${scenarioId}-${size}-${project.id}`"
				:project-id="project.id"
				:direction="scenario.direction"
			/>
			<!-- The real Inbox, in a frame. Its own page gives it the sample data. -->
			<iframe
				v-else-if="scenarioId === 'b1'"
				:key="size"
				:src="reviewFrameUrl(size)"
				:title="i18n.baseText('promotions.playground.review.frame')"
				:class="$style.frame"
				data-test-id="promotions-playground-review-frame"
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

.frame {
	border: none;
	background: transparent;
}
</style>
