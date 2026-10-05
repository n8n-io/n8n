<script setup lang="ts">
/**
 * The Checks tab filter. With failing checks among others it's one toggle,
 * "Show N failing checks" then "Show all"; otherwise a plain status ("All 4 pass",
 * "1 pass, 3 not run"), since there's nothing worth narrowing to.
 */
import { computed } from 'vue';
import { N8nButton } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';

import {
	singleState,
	type AgentCheckCounts,
	type AgentCheckFilter,
} from '../../utils/agentChecks.utils';
import AgentReaction from './AgentReaction.vue';

const props = defineProps<{
	counts: AgentCheckCounts;
	running?: boolean;
}>();

const filter = defineModel<AgentCheckFilter>({ required: true });

const i18n = useI18n();

const only = computed(() => singleState(props.counts));
const canNarrow = computed(() => props.counts.needsWork > 0 && only.value === null);

const statusFace = computed(() => {
	if (props.running) return 'waiting';
	if (props.counts.needsWork > 0) return 'needs_work';
	if (props.counts.pass > 0) return 'pass';
	return 'idle';
});

const statusLabel = computed(() => {
	const n = props.counts;
	const count = String(n.total);
	if (only.value === 'needs_work') {
		return i18n.baseText('agents.builder.agentChecks.filter.allFail', { interpolate: { count } });
	}
	if (only.value === 'pass') {
		return i18n.baseText('agents.builder.agentChecks.filter.allPass', { interpolate: { count } });
	}
	if (only.value === 'not_run') {
		return i18n.baseText('agents.builder.agentChecks.filter.allNotRun', { interpolate: { count } });
	}
	return i18n.baseText('agents.builder.agentChecks.filter.mixed', {
		interpolate: { pass: String(n.pass), notRun: String(n.notRun) },
	});
});

const toggle = () => {
	filter.value = filter.value === 'needs_work' ? 'all' : 'needs_work';
};
</script>

<template>
	<N8nButton
		v-if="canNarrow"
		variant="outline"
		size="small"
		:aria-pressed="filter === 'needs_work'"
		data-testid="agent-check-filter-toggle"
		@click="toggle"
	>
		<AgentReaction
			v-if="filter !== 'needs_work'"
			:kind="running ? 'waiting' : 'needs_work'"
			size="xs"
			:class="$style.face"
		/>
		{{
			filter === 'needs_work'
				? i18n.baseText('agents.builder.agentChecks.filter.showAll')
				: i18n.baseText('agents.builder.agentChecks.filter.showFailing', {
						adjustToNumber: counts.needsWork,
						interpolate: { count: String(counts.needsWork) },
					})
		}}
	</N8nButton>
	<span v-else :class="$style.status" data-testid="agent-check-filter-only">
		<AgentReaction :kind="statusFace" size="xs" />
		{{ statusLabel }}
	</span>
</template>

<style lang="scss" module>
.status {
	display: inline-flex;
	align-items: center;
	gap: var(--spacing--3xs);
	color: var(--text-color--subtle);
	font-size: var(--font-size--sm);
}

.face {
	margin-inline-end: var(--spacing--4xs);
}
</style>
