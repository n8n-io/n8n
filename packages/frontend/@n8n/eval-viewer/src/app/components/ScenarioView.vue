<script setup lang="ts">
import { N8nButton, N8nCallout, N8nHeading, N8nText } from '@n8n/design-system';
import { computed } from 'vue';

import type { IterationSummary, ViewerIndex } from '../../schema';
import type { Selection } from '../selection';
import IterationHeader from './IterationHeader.vue';
import ScenarioVerdict from './ScenarioVerdict.vue';

const props = defineProps<{
	index: ViewerIndex;
	iteration: IterationSummary;
	scenarioIndex: number;
}>();
const emit = defineEmits<{ select: [selection: Selection] }>();

const run = computed(() => props.iteration.scenarios[props.scenarioIndex]);
const armName = computed(() => props.index.arms[props.iteration.arm]?.name ?? '');
</script>

<template>
	<div :class="$style.view" data-test-id="scenario-view">
		<N8nCallout v-if="!run" theme="warning">This iteration has no such scenario.</N8nCallout>
		<template v-else>
			<header>
				<N8nText size="small" color="text-light">Scenario · {{ run.slug }}</N8nText>
				<N8nHeading tag="h1" size="xlarge">{{ run.title }}</N8nHeading>
				<N8nText v-if="run.workflowId" size="small" color="text-light">
					workflow {{ run.workflowId }}
				</N8nText>
			</header>
			<ScenarioVerdict :run="run" :detailed="true" />
			<section :class="$style.section">
				<div :class="$style.row">
					<N8nHeading tag="h2" size="large">Ran on this iteration</N8nHeading>
					<N8nButton
						variant="outline"
						size="small"
						@click="emit('select', { kind: 'iteration', id: iteration.id, tab: 'transcript' })"
					>
						Open iteration
					</N8nButton>
				</div>
				<IterationHeader :iteration="iteration" :arm-name="armName" />
			</section>
		</template>
	</div>
</template>

<style module>
.view {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--lg);
}

.section {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
}

.row {
	display: flex;
	align-items: center;
	gap: var(--spacing--sm);
}
</style>
