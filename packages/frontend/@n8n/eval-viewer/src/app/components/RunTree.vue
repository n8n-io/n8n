<script setup lang="ts">
import { N8nText, N8nTree2, type TreeBranch } from '@n8n/design-system';
import { computed } from 'vue';

import { armCase, attemptTotals, caseNamesOf, caseOf } from '../../metrics';
import type { ViewerIndex } from '../../schema';
import { armColorVar } from '../colors';
import type { Selection } from '../selection';

const props = defineProps<{ index: ViewerIndex; selection: Selection }>();
const emit = defineEmits<{ select: [selection: Selection] }>();

interface Badge {
	text: string;
	title: string;
	color: string;
}

/** What a row shows besides its label. The tree items carry only id, label and children. */
interface RowInfo {
	secondary: string | null;
	badges: Badge[];
	selection: Selection;
}

const tree = computed(() => {
	const summary: RowInfo = {
		secondary: props.index.arms.map((arm) => arm.name).join(' vs '),
		badges: [],
		selection: { kind: 'summary' },
	};
	const cases = caseNamesOf(props.index.arms).map((caseName): [string, RowInfo] => [
		`case:${caseName}`,
		{
			secondary: caseName,
			badges: props.index.arms.map((arm, armIndex) => {
				const entry = armCase(arm, caseName);
				const totals = entry ? attemptTotals(entry.iterations) : null;
				return {
					text: totals ? `${totals.passed}/${totals.attempts}` : '–',
					title: `${arm.name}: attempts that passed every scenario and expectation`,
					color: armColorVar(armIndex),
				};
			}),
			selection: { kind: 'case', caseName },
		},
	]);
	const info = new Map<string, RowInfo>([['summary', summary], ...cases]);
	const items: TreeBranch[] = [
		{ id: 'summary', label: 'Summary' },
		...caseNamesOf(props.index.arms).map((caseName) => ({
			id: `case:${caseName}`,
			label: caseOf(props.index.arms, caseName)?.title ?? caseName,
		})),
	];
	return { items, info };
});

const selectedKey = computed(() =>
	props.selection.kind === 'case' ? `case:${props.selection.caseName}` : 'summary',
);

/** The tree deselects on a second click and then emits no key: the page stays as it is. */
function onSelect(keys: string[]) {
	const selection = keys[0] ? tree.value.info.get(keys[0])?.selection : undefined;
	if (selection) emit('select', selection);
}
</script>

<template>
	<N8nTree2
		:items="tree.items"
		:model-value="[selectedKey]"
		:class="$style.tree"
		aria-label="Summary and cases"
		data-test-id="run-tree"
		@update:model-value="onSelect"
	>
		<template #default="{ item }">
			<li
				:class="[$style.row, item._id === selectedKey && $style.selected]"
				:data-test-id="`tree-${item._id}`"
			>
				<span :class="$style.text">
					<N8nText size="small" bold :class="$style.label" :title="item.value.label">
						{{ item.value.label }}
					</N8nText>
					<N8nText
						v-if="tree.info.get(item._id)?.secondary"
						size="xsmall"
						color="text-light"
						:class="$style.label"
					>
						{{ tree.info.get(item._id)?.secondary }}
					</N8nText>
				</span>
				<span
					v-for="(badge, i) in tree.info.get(item._id)?.badges ?? []"
					:key="i"
					:class="$style.badge"
					:title="badge.title"
				>
					<span :class="$style.dot" :style="{ backgroundColor: `var(${badge.color})` }" />
					<N8nText v-if="badge.text" size="xsmall">{{ badge.text }}</N8nText>
				</span>
			</li>
		</template>
	</N8nTree2>
</template>

<style module>
.tree {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--5xs);
	margin: 0;
	padding: 0;
	list-style: none;
}

.row {
	display: flex;
	align-items: center;
	gap: var(--spacing--4xs);
	padding-block: var(--spacing--4xs);
	padding-inline: var(--spacing--2xs) var(--spacing--3xs);
	border-radius: var(--radius--3xs);
	cursor: pointer;
	user-select: none;
	outline: none;
}

@media (hover: hover) {
	.row:hover {
		background-color: var(--background--hover);
	}
}

.row:focus-visible {
	box-shadow: inset 0 0 0 var(--focus--border-width) var(--focus--border-color);
}

.selected,
.selected:hover {
	background-color: var(--background--active);
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
