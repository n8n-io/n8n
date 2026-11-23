<script setup lang="ts">
import {
	N8nIcon,
	N8nMenuItem,
	N8nScrollArea,
	N8nSegmentControl,
	N8nText,
	N8nTooltip,
} from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import { computed } from 'vue';

import {
	PLAYGROUND_GROUPS,
	PLAYGROUND_SCENARIOS,
	PLAYGROUND_SIZES,
	type PlaygroundScenarioId,
	type PlaygroundSize,
} from './playground.scenarios';

/** Development only. Replaces the Settings links with the scenarios while the Playground is open. */
defineProps<{ scenarioId: PlaygroundScenarioId; size: PlaygroundSize }>();

const emit = defineEmits<{
	back: [];
	select: [scenario: PlaygroundScenarioId];
	resize: [size: PlaygroundSize];
}>();

const i18n = useI18n();

const groups = computed(() =>
	PLAYGROUND_GROUPS.map((group) => ({
		group,
		title: i18n.baseText(`promotions.playground.group.${group}`),
		items: PLAYGROUND_SCENARIOS.filter((scenario) => scenario.group === group).map(({ id }) => ({
			id,
			label: i18n.baseText(`promotions.playground.scenario.${id}.title`),
			description: i18n.baseText(`promotions.playground.scenario.${id}.description`),
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
	<div
		:class="$style.container"
		data-playground-sidebar
		data-test-id="promotions-playground-sidebar"
	>
		<div :class="$style.returnBar">
			<button
				type="button"
				:class="$style.returnButton"
				data-test-id="promotions-playground-back"
				@click="emit('back')"
			>
				<span :class="$style.arrowIcon"><N8nIcon icon="arrow-left" size="small" /></span>
				<N8nText bold>{{ i18n.baseText('settings') }}</N8nText>
			</button>
		</div>
		<N8nScrollArea edge-fade="y" :class="$style.scrollArea">
			<nav :class="$style.items" :aria-label="i18n.baseText('promotions.playground.scenarios')">
				<section v-for="{ group, title, items } in groups" :key="group" :class="$style.section">
					<N8nText tag="div" size="small" bold color="text-light" :class="$style.sectionTitle">
						{{ title }}
					</N8nText>
					<!-- The active item and its description share one background. -->
					<div
						v-for="item in items"
						:key="item.id"
						:class="[$style.item, { [$style.active]: item.id === scenarioId }]"
					>
						<!-- The active item shows its description. The others show it on hover. -->
						<N8nTooltip
							as-child
							placement="right"
							:show-after="300"
							:content="item.description"
							:disabled="item.id === scenarioId"
						>
							<N8nMenuItem
								:item="{ id: item.id, label: item.label }"
								:active="item.id === scenarioId"
								:data-test-id="`promotions-playground-scenario-${item.id}`"
								@click="emit('select', item.id)"
							/>
						</N8nTooltip>
						<N8nText
							v-if="item.id === scenarioId"
							tag="div"
							size="small"
							color="text-base"
							:class="$style.description"
							data-test-id="promotions-playground-description"
						>
							{{ item.description }}
						</N8nText>
					</div>
				</section>
			</nav>
		</N8nScrollArea>
		<div :class="$style.controls">
			<N8nText size="small" color="text-light">
				{{ i18n.baseText('promotions.playground.size.label') }}
			</N8nText>
			<N8nSegmentControl
				:model-value="size"
				:options="sizeOptions"
				data-test-id="promotions-playground-size"
				@update:model-value="emit('resize', $event)"
			/>
		</div>
	</div>
</template>

<style lang="scss" module>
.container {
	// A fixed width, so a long description wraps and does not stretch the sidebar. The Settings
	// sidebar is 200px. The scenario names need more.
	width: 280px;
	min-width: 280px;
	height: 100%;
	background-color: var(--color--background--light-3);
	border-right: var(--border);
	display: grid;
	grid-template-rows: auto minmax(0, 1fr) auto;
	overflow: hidden;
}

.returnBar {
	padding: var(--spacing--2xs) var(--spacing--3xs);
	border-bottom: var(--border);
}

.returnButton {
	display: flex;
	align-items: center;
	gap: var(--spacing--4xs);
	width: 100%;
	height: var(--spacing--xl);
	padding: var(--spacing--4xs);
	border: none;
	border-radius: var(--radius);
	background: none;
	color: inherit;
	cursor: pointer;

	&:hover {
		background-color: var(--color--background--light-1);
		color: var(--color--text--shade-1);
	}
}

.arrowIcon {
	display: grid;
	place-items: center;
	width: var(--spacing--lg);
	height: var(--spacing--lg);
}

.scrollArea {
	min-height: 0;
}

.items {
	display: flex;
	flex-direction: column;
	padding: var(--spacing--xs) var(--spacing--3xs) 0;
}

.section {
	display: flex;
	flex-direction: column;

	& + & {
		margin-top: var(--spacing--xs);
	}
}

.item {
	border-radius: var(--radius);
}

// The design system's background for a selected row. The menu item inside keeps no background of
// its own, so the label and the description share one box.
.active {
	background-color: var(--background--active);

	:is(
		[data-test-id^='promotions-playground-scenario-'],
		[data-test-id^='promotions-playground-scenario-'] *
	) {
		background-color: transparent;
	}
}

.description {
	padding: var(--spacing--4xs) var(--spacing--3xs) var(--spacing--2xs);
	white-space: normal;
	overflow-wrap: anywhere;
	text-wrap: pretty;
}

.sectionTitle {
	padding: var(--spacing--4xs) var(--spacing--3xs);
	margin-bottom: var(--spacing--5xs);
}

.controls {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--4xs);
	padding: var(--spacing--xs) var(--spacing--xs) var(--spacing--xl);
	border-top: var(--border);
}
</style>
