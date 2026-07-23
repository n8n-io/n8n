<script setup lang="ts">
import { computed, ref } from 'vue';
import type { ExecutionSummary } from 'n8n-workflow';
import { useI18n } from '@n8n/i18n';
import { N8nButton, N8nIcon, N8nText } from '@n8n/design-system';

import { injectWorkflowDocumentStore } from '@/app/stores/workflowDocument.store';
import { useNodeTypesStore } from '@/app/stores/nodeTypes.store';
import { useExecutionsStore } from '@/features/execution/executions/executions.store';
import type { IExecutionResponse } from '@/features/execution/executions/executions.types';
import { useEvaluationsWizardSidepanelStore } from '../../wizardSidepanel.store';
import { readFirstOutputItem, readFirstInputItemViaGraph } from '../../composables/useSliceInputs';
import { formatShortDateTime, stringifyValue } from '../../evaluation.utils';

const props = defineProps<{
	execution: ExecutionSummary;
	/** Striped background for alternating rows. */
	alt?: boolean;
}>();

const emit = defineEmits<{
	create: [];
}>();

const locale = useI18n();
const workflowDocumentStore = injectWorkflowDocumentStore();
const nodeTypesStore = useNodeTypesStore();
const executionsStore = useExecutionsStore();
const wizardStore = useEvaluationsWizardSidepanelStore();

const expanded = ref(false);
const loading = ref(false);
const fullExecution = ref<IExecutionResponse | null>(null);

// Manual executions are flagged with a flask icon (matches the canvas convention).
const isManual = computed(() => props.execution.mode === 'manual');

const dateLabel = computed(() => {
	const started = props.execution.startedAt;
	if (!started) return props.execution.id;
	return formatShortDateTime(started, { withSeconds: true });
});

async function toggle() {
	expanded.value = !expanded.value;
	if (expanded.value && !fullExecution.value && !loading.value) {
		loading.value = true;
		try {
			fullExecution.value = (await executionsStore.fetchExecution(props.execution.id)) ?? null;
		} catch (error) {
			console.warn('[ExecutionRow] failed to load execution', error);
		} finally {
			loading.value = false;
		}
	}
}

// Resolve the AI node's input item (from its parent) and output item.
const items = computed<{ input?: Record<string, unknown>; output?: Record<string, unknown> }>(
	() => {
		const runData = fullExecution.value?.data?.resultData?.runData;
		const probe = wizardStore.aiNodeName;
		if (!runData || !probe) return {};
		const allNodes = workflowDocumentStore.value?.allNodes ?? [];
		const connections = workflowDocumentStore.value?.connectionsBySourceNode ?? {};
		const isTrigger = allNodes.some(
			(n) => n.name === probe && nodeTypesStore.isTriggerNode(n.type),
		);
		const input = isTrigger
			? readFirstOutputItem(runData, probe)
			: readFirstInputItemViaGraph(runData, connections, probe);
		const output = readFirstOutputItem(runData, probe);
		return { input, output };
	},
);

function toEntries(item?: Record<string, unknown>): Array<{ name: string; value: string }> {
	if (!item) return [];
	return Object.entries(item).map(([name, value]) => ({ name, value: stringifyValue(value) }));
}

const inputEntries = computed(() => toEntries(items.value.input));
const outputEntries = computed(() => toEntries(items.value.output));
</script>

<template>
	<div :class="[$style.row, props.alt ? $style.alt : null]">
		<div :class="$style.header">
			<button
				type="button"
				:class="$style.chevron"
				:data-test-id="`tests-execution-toggle-${execution.id}`"
				:aria-expanded="expanded"
				@click="toggle"
			>
				<N8nIcon
					:icon="expanded ? 'chevron-down' : 'chevron-right'"
					size="small"
					color="text-base"
				/>
			</button>

			<N8nText size="small" color="text-dark" :class="$style.date">{{ dateLabel }}</N8nText>

			<N8nIcon
				v-if="isManual"
				icon="flask-conical"
				size="small"
				color="text-light"
				:title="locale.baseText('evaluations.tests.executions.manualBadge')"
				:data-test-id="`tests-execution-manual-${execution.id}`"
			/>

			<span :class="$style.spacer" />

			<N8nButton
				size="mini"
				type="primary"
				:class="[$style.createButton, expanded ? $style.createButtonVisible : null]"
				:data-test-id="`tests-execution-create-${execution.id}`"
				@click="emit('create')"
			>
				{{ locale.baseText('evaluations.tests.executions.createCase') }}
			</N8nButton>
		</div>

		<div
			v-if="expanded"
			:class="$style.detail"
			:data-test-id="`tests-execution-detail-${execution.id}`"
		>
			<div v-if="loading" :class="$style.loading">
				<N8nIcon icon="spinner" size="small" :spin="true" />
			</div>
			<template v-else>
				<div v-if="inputEntries.length > 0" :class="$style.group">
					<N8nText size="xsmall" bold color="text-light" :class="$style.groupLabel">
						{{ locale.baseText('evaluations.tests.executions.input') }}
					</N8nText>
					<div v-for="entry in inputEntries" :key="`in-${entry.name}`" :class="$style.field">
						<N8nText size="xsmall" color="text-light">{{ entry.name }}</N8nText>
						<N8nText size="xsmall" color="text-dark" :class="$style.value">{{
							entry.value
						}}</N8nText>
					</div>
				</div>

				<div v-if="outputEntries.length > 0" :class="$style.group">
					<N8nText size="xsmall" bold color="text-light" :class="$style.groupLabel">
						{{ locale.baseText('evaluations.tests.executions.output') }}
					</N8nText>
					<div v-for="entry in outputEntries" :key="`out-${entry.name}`" :class="$style.field">
						<N8nText size="xsmall" color="text-light">{{ entry.name }}</N8nText>
						<N8nText size="xsmall" color="text-dark" :class="$style.value">{{
							entry.value
						}}</N8nText>
					</div>
				</div>
			</template>
		</div>
	</div>
</template>

<style module lang="scss">
.row {
	border-bottom: var(--border);

	&.alt {
		background-color: var(--background--surface);
	}
}

.header {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	padding: 0 var(--spacing--2xs);
	height: 48px;

	&:hover .createButton {
		opacity: 1;
	}
}

.chevron {
	display: inline-flex;
	align-items: center;
	justify-content: center;
	flex-shrink: 0;
	width: 24px;
	height: 24px;
	padding: 0;
	background: none;
	border: none;
	border-radius: var(--radius--sm);
	cursor: pointer;

	&:hover {
		background-color: var(--background--subtle);
	}
}

.date {
	flex-shrink: 0;
}

.spacer {
	flex: 1 1 auto;
}

.createButton {
	flex-shrink: 0;
	opacity: 0;
	transition: opacity var(--duration--snappy) ease;
}

.createButtonVisible {
	opacity: 1;
}

.detail {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--lg);
	padding: 0 var(--spacing--md) var(--spacing--lg) var(--spacing--sm);
}

.loading {
	display: flex;
	justify-content: center;
	padding: var(--spacing--md);
}

.group {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--xs);
}

.groupLabel {
	text-transform: uppercase;
}

.field {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--4xs);
}

.value {
	white-space: pre-wrap;
	word-break: break-word;
}
</style>
