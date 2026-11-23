<script setup lang="ts">
import { N8nHeading, N8nMenuItem, N8nSegmentControl, N8nText } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import {
	DEFAULT_PLAYGROUND_SCENARIO,
	DEFAULT_PLAYGROUND_SIZE,
	PLAYGROUND_GROUPS,
	PLAYGROUND_SCENARIOS,
	PLAYGROUND_SIZES,
	isPlaygroundScenarioId,
	isPlaygroundSize,
	type PlaygroundScenarioId,
	type PlaygroundSize,
} from './playground.scenarios';

/** Development only. Shows one promotion scenario at a time, with sample data. */
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

const groups = computed(() =>
	PLAYGROUND_GROUPS.map((group) => ({
		group,
		title: i18n.baseText(`promotions.playground.group.${group}`),
		items: PLAYGROUND_SCENARIOS.filter((scenario) => scenario.group === group).map(({ id }) => ({
			id,
			label: i18n.baseText(`promotions.playground.scenario.${id}.title`),
		})),
	})).filter(({ items }) => items.length > 0),
);

const sizeOptions = computed(() =>
	PLAYGROUND_SIZES.map((value) => ({
		value,
		label: i18n.baseText(`promotions.playground.size.${value}`),
	})),
);
</script>

<template>
	<div :class="$style.playground" data-test-id="promotions-playground">
		<nav :class="$style.sidebar" :aria-label="i18n.baseText('promotions.playground.scenarios')">
			<section v-for="{ group, title, items } in groups" :key="group" :class="$style.group">
				<N8nText tag="h3" size="small" color="text-light" bold :class="$style.groupTitle">
					{{ title }}
				</N8nText>
				<N8nMenuItem
					v-for="item in items"
					:key="item.id"
					:item="{ id: item.id, label: item.label }"
					:active="item.id === scenarioId"
					:data-test-id="`promotions-playground-scenario-${item.id}`"
					@click="show({ scenario: item.id })"
				/>
			</section>
		</nav>
		<main :class="$style.main">
			<header :class="$style.header">
				<div :class="$style.heading">
					<N8nHeading tag="h2" size="large">
						{{ i18n.baseText(`promotions.playground.scenario.${scenarioId}.title`) }}
					</N8nHeading>
					<N8nText color="text-light">
						{{ i18n.baseText(`promotions.playground.scenario.${scenarioId}.description`) }}
					</N8nText>
				</div>
				<div :class="$style.size">
					<N8nText size="small" color="text-light">
						{{ i18n.baseText('promotions.playground.size.label') }}
					</N8nText>
					<N8nSegmentControl
						:model-value="size"
						:options="sizeOptions"
						data-test-id="promotions-playground-size"
						@update:model-value="show({ size: $event })"
					/>
				</div>
			</header>
			<div :class="$style.stage" data-test-id="promotions-playground-stage" />
		</main>
	</div>
</template>

<style lang="scss" module>
.playground {
	display: grid;
	grid-template-columns: 260px minmax(0, 1fr);
	min-height: 70vh;
	border: var(--border);
	border-radius: var(--radius);
	background: var(--background--surface);
}

.sidebar {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--sm);
	padding: var(--spacing--xs);
	border-inline-end: var(--border);
}

.group {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--4xs);
}

.groupTitle {
	padding-inline: var(--spacing--xs);
}

.main {
	display: flex;
	flex-direction: column;
	min-width: 0;
}

.header {
	display: flex;
	align-items: flex-start;
	justify-content: space-between;
	gap: var(--spacing--sm);
	padding: var(--spacing--sm);
	border-block-end: var(--border);
}

.heading {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--4xs);
}

.size {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
}

.stage {
	flex: 1;
	min-height: 0;
}
</style>
