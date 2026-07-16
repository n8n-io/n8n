<script setup lang="ts">
import { N8nOption, N8nSelect, N8nText } from '@n8n/design-system';
import { useI18n } from '@n8n/i18n';
import omit from 'lodash/omit';
import { deepCopy } from 'n8n-workflow';
import { computed, markRaw, ref, watch } from 'vue';

import { useToast } from '@/app/composables/useToast';
import { useWorkflowsListStore } from '@/app/stores/workflowsList.store';
import WorkflowDiffView from '@/features/workflows/workflowDiff/WorkflowDiffView.vue';
import { useWorkflowHistoryStore } from '@/features/workflows/workflowHistory/workflowHistory.store';
import type { IWorkflowDb } from '@/Interface';

import type { CompareVersion } from '../../composables/useCompareData';

const props = defineProps<{
	versions: CompareVersion[];
	workflowId: string;
}>();

const i18n = useI18n();
const toast = useToast();
const workflowsListStore = useWorkflowsListStore();
const workflowHistoryStore = useWorkflowHistoryStore();

// The compare view can hold >2 versions but a diff is pairwise, so the tab
// picks two sides (defaulting to the first two) and lets the user re-point
// either. Versions are keyed by their stable compare `index`.
const sourceIndex = ref(props.versions[0]?.index ?? 0);
const targetIndex = ref(props.versions[1]?.index ?? props.versions[0]?.index ?? 0);

const sourceWorkflow = ref<IWorkflowDb>();
const targetWorkflow = ref<IWorkflowDb>();
const isLoading = ref(false);

const canDiff = computed(() => props.versions.length >= 2);

const versionOptions = computed(() =>
	props.versions.map((version) => ({
		value: version.index,
		label: `${version.letter} · ${version.label}`,
	})),
);

const versionByIndex = (index: number): CompareVersion | undefined =>
	props.versions.find((version) => version.index === index);

const labelFor = (index: number): string => {
	const version = versionByIndex(index);
	return version ? `${version.letter} · ${version.label}` : '';
};

// Stale-response guard: only the newest load applies its result.
let loadRequestId = 0;

// Hand the diff a fully-detached, non-reactive copy. WorkflowDiffView tracks the
// workflow deeply and its render stores snap node positions in place; on a
// reactive source that write feeds back into a hydrate → dispose → hydrate loop
// that pins the main thread. A plain, `markRaw`'d clone breaks the cycle — the
// diff is read-only, so it never needs reactivity or to reach the live stores.
const detach = (workflow: IWorkflowDb): IWorkflowDb => markRaw(deepCopy(workflow));

// Resolve a version to a full workflow the diff can render. A null
// `workflowVersionId` is the "current draft" — the live workflow itself; a real
// id pulls that history snapshot's nodes/connections onto the base workflow so
// settings and metadata still line up with the current workflow.
const resolveWorkflow = async (
	base: IWorkflowDb,
	version: CompareVersion,
): Promise<IWorkflowDb> => {
	const bare = omit(base, 'pinData');
	if (version.workflowVersionId === null) return bare;
	const snapshot = await workflowHistoryStore.getWorkflowVersion(
		props.workflowId,
		version.workflowVersionId,
	);
	return {
		...bare,
		versionId: snapshot.versionId,
		nodes: snapshot.nodes,
		connections: snapshot.connections,
		nodeGroups: snapshot.nodeGroups ?? [],
	};
};

const load = async () => {
	// Nothing to diff until there are two versions; the template shows a prompt
	// instead, so don't fetch workflows we won't render.
	if (!canDiff.value) return;
	const source = versionByIndex(sourceIndex.value);
	const target = versionByIndex(targetIndex.value);
	if (!source || !target) return;

	const requestId = ++loadRequestId;
	isLoading.value = true;
	try {
		const base = await workflowsListStore.fetchWorkflow(props.workflowId);
		const [resolvedSource, resolvedTarget] = await Promise.all([
			resolveWorkflow(base, source),
			resolveWorkflow(base, target),
		]);
		if (requestId !== loadRequestId) return;
		sourceWorkflow.value = detach(resolvedSource);
		targetWorkflow.value = detach(resolvedTarget);
	} catch (error) {
		toast.showError(error, i18n.baseText('evaluation.compare.workflowDiff.loadError'));
	} finally {
		if (requestId === loadRequestId) isLoading.value = false;
	}
};

// Keep the two sides distinct: picking a version already on the other side
// swaps them rather than diffing a version against itself.
const onSourceChange = (next: number) => {
	if (next === targetIndex.value) targetIndex.value = sourceIndex.value;
	sourceIndex.value = next;
};
const onTargetChange = (next: number) => {
	if (next === sourceIndex.value) sourceIndex.value = targetIndex.value;
	targetIndex.value = next;
};

watch([sourceIndex, targetIndex], load, { immediate: true });
</script>

<template>
	<div data-test-id="compare-workflow-diff-tab">
		<div v-if="!canDiff" :class="$style.placeholder">
			<N8nText size="small" color="text-light">
				{{ i18n.baseText('evaluation.compare.workflowDiff.needTwo') }}
			</N8nText>
		</div>

		<template v-else>
			<div :class="$style.controls">
				<label :class="$style.control">
					<N8nText size="xsmall" color="text-light" bold>
						{{ i18n.baseText('evaluation.compare.workflowDiff.base') }}
					</N8nText>
					<N8nSelect
						:model-value="sourceIndex"
						size="small"
						data-test-id="workflow-diff-source-select"
						@update:model-value="onSourceChange(Number($event))"
					>
						<N8nOption
							v-for="opt in versionOptions"
							:key="opt.value"
							:value="opt.value"
							:label="opt.label"
						/>
					</N8nSelect>
				</label>
				<label :class="$style.control">
					<N8nText size="xsmall" color="text-light" bold>
						{{ i18n.baseText('evaluation.compare.workflowDiff.compare') }}
					</N8nText>
					<N8nSelect
						:model-value="targetIndex"
						size="small"
						data-test-id="workflow-diff-target-select"
						@update:model-value="onTargetChange(Number($event))"
					>
						<N8nOption
							v-for="opt in versionOptions"
							:key="opt.value"
							:value="opt.value"
							:label="opt.label"
						/>
					</N8nSelect>
				</label>
			</div>

			<div :class="$style.diff">
				<div v-if="isLoading" :class="$style.state">
					<N8nText size="small" color="text-light">{{ i18n.baseText('generic.loading') }}</N8nText>
				</div>
				<WorkflowDiffView
					v-else-if="sourceWorkflow && targetWorkflow"
					:source-workflow="sourceWorkflow"
					:target-workflow="targetWorkflow"
					:source-label="labelFor(sourceIndex)"
					:target-label="labelFor(targetIndex)"
				/>
			</div>
		</template>
	</div>
</template>

<style module lang="scss">
.placeholder {
	display: flex;
	align-items: center;
	justify-content: center;
	padding: var(--spacing--2xl);
	border: 1px dashed var(--border-color--subtle);
	border-radius: var(--radius--md);
}

.controls {
	display: flex;
	gap: var(--spacing--md);
	margin-bottom: var(--spacing--sm);
}

.control {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--4xs);
	min-width: 220px;
}

.diff {
	height: 70vh;
	min-height: 480px;
	border: 1px solid var(--border-color--subtle);
	border-radius: var(--radius--md);
	overflow: hidden;
}

.state {
	display: flex;
	align-items: center;
	justify-content: center;
	height: 100%;
}
</style>
