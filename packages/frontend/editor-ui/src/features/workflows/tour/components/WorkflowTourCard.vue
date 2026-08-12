<script setup lang="ts">
import NodeIcon from '@/app/components/NodeIcon.vue';
import { injectWorkflowDocumentStore } from '@/app/stores/workflowDocument.store';
import { useNodeTypesStore } from '@/app/stores/nodeTypes.store';
import { useI18n, type BaseTextKey } from '@n8n/i18n';
import { N8nButton, N8nIconButton, N8nText } from '@n8n/design-system';
import { computed, useCssModule } from 'vue';
import type { WorkflowTourCardPlacement, WorkflowTourStep } from '../workflowTour.types';

const props = defineProps<{
	step: WorkflowTourStep;
	stepIndex: number;
	totalSteps: number;
	placement: WorkflowTourCardPlacement;
	isFirstStep: boolean;
	isLastStep: boolean;
}>();

const emit = defineEmits<{
	prev: [];
	next: [];
	exit: [];
}>();

const $style = useCssModule();
const i18n = useI18n();
const workflowDocumentStore = injectWorkflowDocumentStore();
const nodeTypesStore = useNodeTypesStore();
const textKeys = {
	ariaLabel: 'workflowTour.card.ariaLabel' as BaseTextKey,
	groupBreadcrumb: 'workflowTour.groupBreadcrumb' as BaseTextKey,
	close: 'workflowTour.close' as BaseTextKey,
	rationaleTitle: 'workflowTour.rationaleTitle' as BaseTextKey,
	stepCounter: 'workflowTour.stepCounter' as BaseTextKey,
	previous: 'workflowTour.previous' as BaseTextKey,
	next: 'workflowTour.next' as BaseTextKey,
	done: 'workflowTour.done' as BaseTextKey,
};

const node = computed(() => workflowDocumentStore.value.getNodeById(props.step.nodeId));
const nodeType = computed(() =>
	node.value ? nodeTypesStore.getNodeType(node.value.type, node.value.typeVersion) : null,
);

const rationale = computed(() => {
	const value = props.step.description.rationale;
	return typeof value === 'string' && value.trim().length > 0 ? value : undefined;
});

const cardStyle = computed(() => ({
	left: `${props.placement.left}px`,
	top: `${props.placement.top}px`,
	maxHeight: `${props.placement.maxHeight}px`,
	'--workflow-tour-card--arrow-top': `${props.placement.arrowTop}px`,
}));

const cardClasses = computed(() => [
	$style.card,
	props.placement.side === 'left' ? $style.sideLeft : $style.sideRight,
]);

const ariaLabel = computed(() => i18n.baseText(textKeys.ariaLabel));
const groupBreadcrumbLabel = computed(() => i18n.baseText(textKeys.groupBreadcrumb));
const closeLabel = computed(() => i18n.baseText(textKeys.close));
const rationaleTitle = computed(() => i18n.baseText(textKeys.rationaleTitle));
const previousLabel = computed(() => i18n.baseText(textKeys.previous));
const nextLabel = computed(() => i18n.baseText(props.isLastStep ? textKeys.done : textKeys.next));
const stepCounterLabel = computed(() =>
	i18n.baseText(textKeys.stepCounter, {
		interpolate: { current: props.stepIndex + 1, total: props.totalSteps },
	}),
);
</script>

<template>
	<article
		:class="cardClasses"
		:style="cardStyle"
		role="dialog"
		aria-modal="false"
		:aria-label="ariaLabel"
		data-test-id="workflow-tour-card"
	>
		<header :class="$style.header">
			<div :class="$style.titleBlock">
				<N8nText v-if="step.groupName" :class="$style.breadcrumb" size="small" color="text-light">
					{{ groupBreadcrumbLabel }} / {{ step.groupName }}
				</N8nText>
				<div :class="$style.titleRow">
					<NodeIcon :node-type="nodeType" :node="node" :size="20" />
					<N8nText :class="$style.title" bold>{{ step.nodeName }}</N8nText>
				</div>
			</div>
			<N8nIconButton
				variant="ghost"
				size="small"
				icon="x"
				:aria-label="closeLabel"
				data-test-id="workflow-tour-close"
				@click="emit('exit')"
			/>
		</header>

		<div :class="$style.body">
			<N8nText :class="$style.summary" size="medium">
				{{ step.description.summary }}
			</N8nText>

			<section v-if="rationale" :class="$style.rationale">
				<N8nText size="small" bold>{{ rationaleTitle }}</N8nText>
				<N8nText size="small" color="text-light">
					{{ rationale }}
				</N8nText>
			</section>
		</div>

		<footer :class="$style.footer">
			<N8nText :class="$style.counter" size="small" color="text-light">
				{{ stepCounterLabel }}
			</N8nText>
			<div :class="$style.actions">
				<N8nButton
					variant="subtle"
					size="medium"
					:disabled="isFirstStep"
					:label="previousLabel"
					data-test-id="workflow-tour-prev"
					@click="emit('prev')"
				/>
				<N8nButton
					variant="solid"
					size="medium"
					:label="nextLabel"
					data-test-id="workflow-tour-next"
					@click="emit('next')"
				/>
			</div>
		</footer>
	</article>
</template>

<style lang="scss" module>
@use '@n8n/design-system/css/mixins/motion';

.card {
	position: absolute;
	z-index: 7;
	display: flex;
	flex-direction: column;
	width: 360px;
	border: 1px solid var(--border-color);
	border-radius: var(--radius--xs);
	background: var(--background--surface);
	box-shadow: var(--shadow--lg);
	pointer-events: auto;
	overflow: hidden;

	@include motion.popover-in;

	&::before {
		content: '';
		position: absolute;
		top: var(--workflow-tour-card--arrow-top);
		width: var(--spacing--xs);
		height: var(--spacing--xs);
		border: 1px solid var(--border-color);
		background: var(--background--surface);
		transform: translateY(-50%) rotate(45deg);
	}
}

.sideRight::before {
	left: calc(var(--spacing--3xs) * -1);
	border-top: 0;
	border-right: 0;
}

.sideLeft::before {
	right: calc(var(--spacing--3xs) * -1);
	border-bottom: 0;
	border-left: 0;
}

.header {
	display: flex;
	align-items: flex-start;
	justify-content: space-between;
	gap: var(--spacing--xs);
	padding: var(--spacing--sm) var(--spacing--sm) var(--spacing--xs);
	border-bottom: 1px solid var(--border-color--subtle);
}

.titleBlock {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--4xs);
	min-width: 0;
}

.breadcrumb {
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
}

.titleRow {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	min-width: 0;
}

.title {
	min-width: 0;
	overflow-wrap: anywhere;
	line-height: var(--line-height--md);
}

.body {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--xs);
	padding: var(--spacing--sm);
	overflow-y: auto;
}

.summary {
	line-height: var(--line-height--lg);
}

.rationale {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--4xs);
	padding: var(--spacing--xs);
	border-left: var(--spacing--4xs) solid var(--border-color--info);
	border-radius: var(--radius--2xs);
	background: var(--background--info);
}

.footer {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: var(--spacing--xs);
	padding: var(--spacing--xs) var(--spacing--sm) var(--spacing--sm);
	border-top: 1px solid var(--border-color--subtle);
}

.counter {
	font-variant-numeric: tabular-nums;
	white-space: nowrap;
}

.actions {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
}
</style>
