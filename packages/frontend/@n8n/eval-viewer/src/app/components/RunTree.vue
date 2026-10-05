<script setup lang="ts">
import { N8nIcon, N8nText } from '@n8n/design-system';
import { computed, ref, watch } from 'vue';

import { armCase, caseNamesOf, iterationPassed, iterationsOfArm } from '../../metrics';
import type { ViewerIndex } from '../../schema';
import { armColorVar } from '../colors';
import { formatCost } from '../format';
import type { Selection } from '../selection';

const props = defineProps<{ index: ViewerIndex; selection: Selection }>();
const emit = defineEmits<{ select: [selection: Selection] }>();

interface Badge {
	text: string;
	title: string;
	color: string;
}

interface Row {
	key: string;
	depth: number;
	label: string;
	secondary: string | null;
	status: boolean | null;
	badges: Badge[];
	expandable: boolean;
	selected: boolean;
	onClick: () => void;
}

const expanded = ref(new Set<string>());
const caseNames = computed(() => caseNamesOf(props.index.arms));
const isPool = (armIndex: number) =>
	new Set(iterationsOfArm(props.index.arms[armIndex]).map((iteration) => iteration.sub)).size > 1;

function toggle(key: string, open?: boolean) {
	const next = new Set(expanded.value);
	if (open ?? !next.has(key)) next.add(key);
	else next.delete(key);
	expanded.value = next;
}

/** Opens the ancestors of the selected node. */
watch(
	() => props.selection,
	(selection) => {
		if (selection.kind === 'case') toggle(`case:${selection.caseName}`, true);
		if (selection.kind !== 'iteration' && selection.kind !== 'scenario') return;
		const iteration = props.index.arms
			.flatMap(iterationsOfArm)
			.find((entry) => entry.id === selection.id);
		if (!iteration) return;
		const keys = [
			`case:${iteration.caseName}`,
			`arm:${iteration.caseName}:${iteration.arm}`,
			...(selection.kind === 'scenario' ? [`iteration:${iteration.id}`] : []),
		];
		expanded.value = new Set([...expanded.value, ...keys]);
	},
	{ immediate: true },
);

const isSelected = (selection: Selection) =>
	JSON.stringify(selection) ===
	JSON.stringify(
		props.selection.kind === 'iteration'
			? { ...props.selection, tab: 'transcript' }
			: props.selection,
	);

const rows = computed<Row[]>(() => {
	const summary: Row = {
		key: 'summary',
		depth: 0,
		label: 'Summary',
		secondary: props.index.arms.map((arm) => arm.name).join(' vs '),
		status: null,
		badges: [],
		expandable: false,
		selected: props.selection.kind === 'summary',
		onClick: () => emit('select', { kind: 'summary' }),
	};
	return [
		summary,
		...caseNames.value.flatMap((caseName): Row[] => {
			const caseKey = `case:${caseName}`;
			const caseRow: Row = {
				key: caseKey,
				depth: 0,
				label: caseName,
				secondary: null,
				status: null,
				badges: props.index.arms.map((arm, armIndex) => {
					const totals = armCase(arm, caseName)?.totals;
					return {
						text: totals ? `${totals.scenPass}/${totals.scenN}` : '–',
						title: `${arm.name}: scenarios passed`,
						color: armColorVar(armIndex),
					};
				}),
				expandable: true,
				selected: props.selection.kind === 'case' && props.selection.caseName === caseName,
				onClick: () => {
					toggle(caseKey, true);
					emit('select', { kind: 'case', caseName });
				},
			};
			if (!expanded.value.has(caseKey)) return [caseRow];
			return [
				caseRow,
				...props.index.arms.flatMap((arm, armIndex): Row[] => {
					const entry = armCase(arm, caseName);
					if (!entry) return [];
					const armKey = `arm:${caseName}:${armIndex}`;
					const armRow: Row = {
						key: armKey,
						depth: 1,
						label: arm.name,
						secondary: entry.totals
							? `${entry.totals.scenPass}/${entry.totals.scenN} scenarios`
							: null,
						status: null,
						badges: [{ text: '', title: arm.name, color: armColorVar(armIndex) }],
						expandable: true,
						selected: false,
						onClick: () => toggle(armKey),
					};
					if (!expanded.value.has(armKey)) return [armRow];
					return [
						armRow,
						...entry.iterations.flatMap((iteration): Row[] => {
							const iterationKey = `iteration:${iteration.id}`;
							const iterationRow: Row = {
								key: iterationKey,
								depth: 2,
								label: `Iteration ${iteration.index + 1}`,
								secondary: [
									isPool(armIndex) ? iteration.sub : null,
									formatCost(iteration.metrics?.cost),
								]
									.filter(Boolean)
									.join(' · '),
								status: iterationPassed(iteration),
								badges: [],
								expandable: iteration.scenarios.length > 0,
								selected: isSelected({ kind: 'iteration', id: iteration.id, tab: 'transcript' }),
								onClick: () => {
									toggle(iterationKey, true);
									emit('select', { kind: 'iteration', id: iteration.id, tab: 'transcript' });
								},
							};
							if (!expanded.value.has(iterationKey)) return [iterationRow];
							return [
								iterationRow,
								...iteration.scenarios.map(
									(scenario, scenarioIndex): Row => ({
										key: `scenario:${iteration.id}:${scenarioIndex}`,
										depth: 3,
										label: scenario.title,
										secondary: scenario.slug,
										status: scenario.passed,
										badges: [],
										expandable: false,
										selected: isSelected({
											kind: 'scenario',
											id: iteration.id,
											scenario: scenarioIndex,
										}),
										onClick: () =>
											emit('select', {
												kind: 'scenario',
												id: iteration.id,
												scenario: scenarioIndex,
											}),
									}),
								),
							];
						}),
					];
				}),
			];
		}),
	];
});
</script>

<template>
	<nav :class="$style.tree" data-test-id="run-tree">
		<button
			v-for="row in rows"
			:key="row.key"
			type="button"
			:class="[$style.row, row.selected && $style.selected]"
			:style="{
				paddingInlineStart: `calc(var(--spacing--sm) * ${row.depth} + var(--spacing--4xs))`,
			}"
			:aria-expanded="row.expandable ? expanded.has(row.key) : undefined"
			:aria-current="row.selected ? 'true' : undefined"
			:data-test-id="`tree-${row.key}`"
			@click="row.onClick"
		>
			<N8nIcon
				v-if="row.expandable"
				:icon="expanded.has(row.key) ? 'chevron-down' : 'chevron-right'"
				size="small"
				:class="$style.chevron"
			/>
			<span v-else :class="$style.chevron" />
			<N8nIcon
				v-if="row.status !== null"
				:icon="row.status ? 'check' : 'x'"
				size="small"
				:color="row.status ? 'success' : 'danger'"
				:aria-label="row.status ? 'passed' : 'failed'"
			/>
			<span :class="$style.text">
				<N8nText size="small" :bold="row.depth === 0" :class="$style.label" :title="row.label">
					{{ row.label }}
				</N8nText>
				<N8nText v-if="row.secondary" size="xsmall" color="text-light" :class="$style.label">
					{{ row.secondary }}
				</N8nText>
			</span>
			<span
				v-for="(badge, i) in row.badges"
				:key="i"
				:class="$style.badge"
				:title="badge.title"
				:style="{ borderColor: `var(${badge.color})` }"
			>
				<span :class="$style.dot" :style="{ backgroundColor: `var(${badge.color})` }" />
				<N8nText v-if="badge.text" size="xsmall">{{ badge.text }}</N8nText>
			</span>
		</button>
	</nav>
</template>

<style module>
.tree {
	display: flex;
	flex-direction: column;
}

.row {
	display: flex;
	align-items: center;
	gap: var(--spacing--4xs);
	width: 100%;
	padding-block: var(--spacing--4xs);
	padding-inline-end: var(--spacing--4xs);
	border: none;
	border-radius: var(--radius--sm);
	background: transparent;
	color: inherit;
	text-align: left;
	cursor: pointer;
	user-select: none;
}

@media (hover: hover) {
	.row:hover {
		background-color: var(--background--hover);
	}
}

.selected,
.selected:hover {
	background-color: var(--background--active);
}

.chevron {
	flex-shrink: 0;
	width: var(--spacing--sm);
}

.text {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--5xs);
	min-width: 0;
	flex: 1;
}

.label {
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.badge {
	display: inline-flex;
	align-items: center;
	gap: var(--spacing--5xs);
	flex-shrink: 0;
	font-variant-numeric: tabular-nums;
}

.dot {
	display: inline-block;
	width: var(--spacing--3xs);
	height: var(--spacing--3xs);
	border-radius: var(--radius--full);
}
</style>
