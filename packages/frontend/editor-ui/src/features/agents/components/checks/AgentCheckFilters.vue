<script setup lang="ts">
/**
 * The Checks tab health as filter buttons with heads: N need work (yellow),
 * N pass (green), N not run (grey), All N. Only buttons with a count show.
 * With every check in one state there is a single button, "All N pass" or
 * "All N fail", since All would filter to the same list.
 */
import { computed } from 'vue';
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

const face = (state: Exclude<AgentCheckFilter, 'all'>) => {
	if (props.running) return 'waiting';
	return state === 'needs_work' ? 'needs_work' : state === 'pass' ? 'pass' : 'idle';
};

const buttons = computed(() => {
	const n = props.counts;
	const list: Array<{
		key: AgentCheckFilter;
		label: string;
		head?: Exclude<AgentCheckFilter, 'all'>;
	}> = [];
	if (n.needsWork) {
		list.push({
			key: 'needs_work',
			head: 'needs_work',
			label: i18n.baseText('agents.builder.agentChecks.filter.needWork', {
				adjustToNumber: n.needsWork,
				interpolate: { count: String(n.needsWork) },
			}),
		});
	}
	if (n.pass) {
		list.push({
			key: 'pass',
			head: 'pass',
			label: i18n.baseText('agents.builder.agentChecks.filter.pass', {
				interpolate: { count: String(n.pass) },
			}),
		});
	}
	if (n.notRun) {
		list.push({
			key: 'not_run',
			head: 'not_run',
			label: i18n.baseText('agents.builder.agentChecks.filter.notRun', {
				interpolate: { count: String(n.notRun) },
			}),
		});
	}
	list.push({
		key: 'all',
		label: i18n.baseText('agents.builder.agentChecks.filter.everything', {
			interpolate: { count: String(n.total) },
		}),
	});
	return list;
});

const onlyLabel = computed(() => {
	const count = String(props.counts.total);
	if (only.value === 'needs_work') {
		return i18n.baseText('agents.builder.agentChecks.filter.allFail', { interpolate: { count } });
	}
	if (only.value === 'pass') {
		return i18n.baseText('agents.builder.agentChecks.filter.allPass', { interpolate: { count } });
	}
	return i18n.baseText('agents.builder.agentChecks.filter.allNotRun', { interpolate: { count } });
});
</script>

<template>
	<div
		:class="$style.group"
		role="group"
		:aria-label="i18n.baseText('agents.builder.agentChecks.filter.label')"
		data-testid="agent-check-filters"
	>
		<span v-if="only" :class="[$style.button, $style.solo]" data-testid="agent-check-filter-only">
			<AgentReaction :kind="face(only)" size="xs" />
			{{ onlyLabel }}
		</span>
		<template v-else>
			<button
				v-for="item in buttons"
				:key="item.key"
				type="button"
				:class="[$style.button, { [$style.on]: filter === item.key, [$style.plain]: !item.head }]"
				:aria-pressed="filter === item.key"
				:data-testid="`agent-check-filter-${item.key}`"
				@click="filter = item.key"
			>
				<AgentReaction v-if="item.head" :kind="face(item.head)" size="xs" />
				{{ item.label }}
			</button>
		</template>
	</div>
</template>

<style lang="scss" module>
.group {
	display: inline-flex;
	flex-wrap: wrap;
	align-items: center;
	gap: var(--spacing--3xs);
}

.button {
	display: inline-flex;
	align-items: center;
	gap: var(--spacing--3xs);
	height: var(--height--md);
	padding: 0 var(--spacing--xs) 0 var(--spacing--3xs);
	border: var(--border-width) var(--border-style) var(--border-color);
	border-radius: var(--radius);
	background: var(--background--surface);
	font: inherit;
	font-size: var(--font-size--sm);
	font-variant-numeric: tabular-nums;
	color: var(--text-color--subtle);
}

button.button {
	cursor: pointer;

	&:hover {
		background: var(--background--hover);
		color: var(--text-color);
	}

	&:focus-visible {
		outline: var(--focus--border-width) solid var(--color--primary);
		outline-offset: 2px;
	}
}

.plain {
	padding-left: var(--spacing--xs);
}

.on {
	border-color: var(--border-color--strong);
	background: var(--background--subtle);
	box-shadow: inset 0 0 0 1px var(--border-color--strong);
	color: var(--text-color);
	font-weight: var(--font-weight--medium);
}

.solo {
	color: var(--text-color);
	font-weight: var(--font-weight--medium);
}
</style>
