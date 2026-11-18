<script setup lang="ts">
import { N8nBadge, N8nButton, N8nText, N8nTooltip } from '@n8n/design-system';
import type { BadgeVariant } from '@n8n/design-system';
import type { IconName } from '@n8n/design-system/components/N8nIcon/icons';
import { type BaseTextKey, useI18n } from '@n8n/i18n';
import {
	computed,
	effectScope,
	onScopeDispose,
	shallowRef,
	useCssModule,
	watch,
	type EffectScope,
} from 'vue';

import { injectWorkflowDocumentStore } from '@/app/stores/workflowDocument.store';
import { useWorkflowDocumentRenderData } from '@/app/stores/workflowDocument/useWorkflowDocumentRenderData';
import { CanvasNodeRenderType } from '@/features/workflows/canvas/canvas.types';
import {
	createEmptyCanvasRenderData,
	type CanvasRenderData,
} from '@/features/workflows/canvas/canvas.utils';
import Canvas from '@/features/workflows/canvas/components/Canvas.vue';
import CanvasNode from '@/features/workflows/canvas/components/elements/nodes/CanvasNode.vue';
import { useCanvasMapping } from '@/features/workflows/canvas/composables/useCanvasMapping';

import {
	collectNodeMarks,
	type NodeTestMarks,
	type WorkflowTestRow,
} from '../workflowTests.display';
import type { TestNodeMark } from '../workflowTests.utils';

/**
 * Shows the workflow with what the tests do to each node: the trigger input,
 * the mocks and the assertions. It reads the test file. It does not change it.
 */
const props = defineProps<{
	/** The tests to show: the selected test, or all tests of the file. */
	rows: WorkflowTestRow[];
	/** The name of the selected test. Without one, the canvas shows all tests. */
	selectedName: string | undefined;
}>();

const emit = defineEmits<{
	showInCode: [line: number];
	clearSelection: [];
}>();

const i18n = useI18n();
const $style = useCssModule();
const workflowDocumentStore = injectWorkflowDocumentStore();

// `useWorkflowDocumentRenderData` subscribes to the document store, so it runs
// one time for each document in a scope that this component stops.
const renderData = shallowRef<CanvasRenderData>(createEmptyCanvasRenderData());
let renderDataScope: EffectScope | undefined;
watch(
	() => workflowDocumentStore.value.documentId,
	(documentId) => {
		renderDataScope?.stop();
		renderDataScope = effectScope(true);
		renderDataScope.run(() => {
			renderData.value = useWorkflowDocumentRenderData(documentId);
		});
	},
	{ immediate: true },
);
onScopeDispose(() => renderDataScope?.stop());

const { nodes: mappedNodes, connections: mappedConnections } = useCanvasMapping({
	nodes: computed(() => workflowDocumentStore.value.allNodes),
	connections: computed(() => workflowDocumentStore.value.connectionsBySourceNode),
	renderData,
});

const nodes = computed(() =>
	mappedNodes.value.map((node) => ({ ...node, draggable: false, selectable: false })),
);
const connections = computed(() =>
	mappedConnections.value.map((connection) => ({ ...connection, selectable: false, label: '' })),
);

/** The nodes that run. A sticky note is not one of them. */
const runnableNodes = computed(() =>
	mappedNodes.value.flatMap((node) => {
		const render = node.data?.render;
		if (!node.data || render?.type !== CanvasNodeRenderType.Default) return [];
		return [{ name: node.data.name, isTrigger: render.options.trigger === true }];
	}),
);

const nodeMarks = computed(() => {
	const triggers = runnableNodes.value.filter((node) => node.isTrigger);
	return collectNodeMarks(props.rows, triggers.length === 1 ? triggers[0].name : undefined);
});

const coverage = computed(() =>
	i18n.baseText('workflowTests.canvas.coverage', {
		interpolate: {
			covered: String(runnableNodes.value.filter((node) => nodeMarks.value.has(node.name)).length),
			total: String(runnableNodes.value.length),
		},
	}),
);

const httpMocks = computed(() => props.rows.reduce((sum, row) => sum + row.httpMocks, 0));

type MarkBadge = {
	kind: TestNodeMark['kind'];
	label: string;
	icon: IconName;
	variant: BadgeVariant;
	tests: number;
	marks: TestNodeMark[];
};

const MARK_DISPLAY: Record<
	TestNodeMark['kind'],
	{ label: BaseTextKey; icon: IconName; variant: BadgeVariant }
> = {
	input: { label: 'workflowTests.canvas.input', icon: 'arrow-right-to-line', variant: 'info' },
	mocked: { label: 'workflowTests.canvas.mocked', icon: 'square-dashed', variant: 'filled' },
	asserted: { label: 'workflowTests.canvas.asserted', icon: 'eye', variant: 'outline' },
};

const PASSED_ASSERTION: Pick<MarkBadge, 'icon' | 'variant'> = {
	icon: 'circle-check',
	variant: 'success',
};

function markBadges(entry: NodeTestMarks): MarkBadge[] {
	return (['input', 'mocked', 'asserted'] as const)
		.filter((kind) => entry[kind].tests > 0)
		.map((kind) => ({
			kind,
			...MARK_DISPLAY[kind],
			...(kind === 'asserted' && entry.assertionsPassed ? PASSED_ASSERTION : {}),
			label: i18n.baseText(MARK_DISPLAY[kind].label),
			tests: entry[kind].tests,
			marks: entry[kind].marks,
		}));
}

function nodeClass(entry: NodeTestMarks) {
	if (entry.failed) return $style.failedNode;
	if (entry.asserted.tests > 0 && entry.assertionsPassed) return $style.passedNode;
	if (entry.mocked.tests > 0) return $style.mockedNode;
	return undefined;
}

/** What the canvas draws on each node that a test touches, by node name. */
const overlays = computed(
	() =>
		new Map(
			[...nodeMarks.value].map(([name, entry]) => [
				name,
				{ failed: entry.failed, class: nodeClass(entry), badges: markBadges(entry) },
			]),
		),
);

const MAX_TOOLTIP_LINES = 4;

function tooltipLines(marks: TestNodeMark[]) {
	return marks.slice(0, MAX_TOOLTIP_LINES).map((mark) => mark.text);
}
</script>

<template>
	<section :class="$style.pane" data-testid="workflow-tests-canvas">
		<header :class="$style.header">
			<slot name="switch" />
			<div :class="$style.title">
				<N8nText size="small" bold :class="$style.name" :title="selectedName">
					{{ selectedName ?? i18n.baseText('workflowTests.canvas.allTests') }}
				</N8nText>
				<N8nText v-if="!selectedName" size="small" color="text-light" :class="$style.name">
					{{ coverage }}
				</N8nText>
			</div>
			<N8nBadge v-if="httpMocks > 0" variant="subtle" size="small" leading-icon="globe">
				{{
					i18n.baseText('workflowTests.canvas.httpMocks', {
						adjustToNumber: httpMocks,
						interpolate: { count: String(httpMocks) },
					})
				}}
			</N8nBadge>
			<N8nButton
				v-if="selectedName"
				variant="ghost"
				size="small"
				data-testid="workflow-tests-canvas-show-all"
				@click="emit('clearSelection')"
			>
				{{ i18n.baseText('workflowTests.canvas.showAll') }}
			</N8nButton>
		</header>

		<div :class="$style.canvas">
			<Canvas
				id="workflow-tests-canvas"
				:nodes="nodes"
				:connections="connections"
				:render-data="renderData"
				:read-only="true"
				:key-bindings="false"
				:show-node-groups="false"
				:striped-background="false"
			>
				<template #node="{ nodeProps }">
					<CanvasNode
						v-bind="nodeProps"
						:read-only="true"
						:class="overlays.get(nodeProps.data.name)?.class"
					>
						<template #toolbar="{ data }">
							<div v-if="overlays.has(data.name)" :class="[$style.marks, 'nodrag', 'nopan']">
								<N8nBadge
									v-if="overlays.get(data.name)?.failed"
									variant="danger"
									size="xsmall"
									leading-icon="circle-x"
								>
									{{ i18n.baseText('workflowTests.canvas.failed') }}
								</N8nBadge>
								<N8nTooltip v-for="badge in overlays.get(data.name)?.badges" :key="badge.kind">
									<template #content>
										<pre :class="$style.tooltip">{{ tooltipLines(badge.marks).join('\n') }}</pre>
									</template>
									<N8nBadge
										clickable
										:variant="badge.variant"
										size="xsmall"
										:leading-icon="badge.icon"
										:data-testid="`workflow-tests-mark-${badge.kind}`"
										@click.stop="emit('showInCode', badge.marks[0].line)"
									>
										{{ badge.label }}
										<span v-if="!selectedName" :class="$style.count">{{ badge.tests }}</span>
									</N8nBadge>
								</N8nTooltip>
							</div>
						</template>
					</CanvasNode>
				</template>
			</Canvas>
		</div>
	</section>
</template>

<style module lang="scss">
.pane {
	display: flex;
	flex-direction: column;
	min-width: 0;
	min-height: 0;
	border: var(--border);
	border-radius: var(--radius);
	background-color: var(--background--surface);
	overflow: hidden;
}

.header {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	min-height: var(--height--xl);
	padding: var(--spacing--2xs) var(--spacing--xs);
	border-bottom: var(--border);
}

.title {
	display: flex;
	align-items: baseline;
	gap: var(--spacing--2xs);
	flex: 1;
	min-width: 0;
}

.name {
	min-width: 0;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.canvas {
	position: relative;
	flex: 1;
	min-height: 0;
}

.marks {
	position: absolute;
	bottom: calc(100% + var(--spacing--3xs));
	left: 50%;
	display: flex;
	gap: var(--spacing--4xs);
	transform: translateX(-50%);
	white-space: nowrap;
}

.count {
	margin-left: var(--spacing--4xs);
	font-variant-numeric: tabular-nums;
	opacity: 0.7;
}

.tooltip {
	margin: 0;
	white-space: pre-wrap;
	word-break: break-word;
	font-family: var(--font-family--monospace);
	font-size: var(--font-size--3xs);
}

.failedNode {
	--canvas-node--border-color: var(--color--danger);
}

.passedNode {
	--canvas-node--border-color: var(--color--success);
}

.mockedNode {
	--canvas-node--color--background: var(--background--subtle);
}
</style>
