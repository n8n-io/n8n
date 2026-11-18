<script setup lang="ts">
import type { WorkflowTestResult } from '@n8n/api-types';
import { useToast } from '@n8n/composables/useToast';
import {
	N8nButton,
	N8nCallout,
	N8nHeading,
	N8nIcon,
	N8nLoading,
	N8nSegmentControl,
	N8nText,
	N8nTooltip,
} from '@n8n/design-system';
import type { IconName } from '@n8n/design-system/components/N8nIcon/icons';
import { useI18n } from '@n8n/i18n';
import { useRBACStore } from '@n8n/stores/rbac.store';
import { useEventListener } from '@vueuse/core';
import { computed, inject, onMounted, ref, watch } from 'vue';

import { WorkflowDocumentStoreKey } from '@/app/constants/injectionKeys';
import { useUIStore } from '@/app/stores/ui.store';
import JsEditor from '@/features/shared/editors/components/JsEditor/JsEditor.vue';

import { useGenerateWorkflowTests } from '../useGenerateWorkflowTests';
import { useWorkflowTestsStore } from '../workflowTests.store';
import { parseTestNames } from '../workflowTests.utils';

const props = defineProps<{ workflowId: string }>();

const i18n = useI18n();
const toast = useToast();
const uiStore = useUIStore();
const rbacStore = useRBACStore();
const testsStore = useWorkflowTestsStore();
const generateTests = useGenerateWorkflowTests();
const workflowDocumentStore = inject(WorkflowDocumentStoreKey, null);

type Mode = 'results' | 'code';
type RowStatus = WorkflowTestResult['status'] | 'running' | 'notRun';

const isLoading = ref(true);
const isSaving = ref(false);
const mode = ref<Mode>('results');
const draft = ref('');

const file = computed(() => testsStore.files[props.workflowId] ?? null);
const run = computed(() => testsStore.runs[props.workflowId]);
const isRunning = computed(() => run.value?.status === 'running');
const isDirty = computed(() => draft.value !== (file.value?.source ?? ''));
const canRun = computed(() => rbacStore.hasScope('workflow:execute'));
const workflowHasUnsavedChanges = computed(() => uiStore.stateIsDirty);

const modeOptions = computed(() => [
	{ label: i18n.baseText('workflowTests.view.results'), value: 'results' as const },
	{ label: i18n.baseText('workflowTests.view.code'), value: 'code' as const },
]);

const rows = computed(() => {
	const names = parseTestNames(file.value?.source ?? '');
	const results = new Map((run.value?.tests ?? []).map((test) => [test.name, test]));
	// The runner can report a name that the parser missed, for example inside `describe`.
	for (const name of results.keys()) if (!names.includes(name)) names.push(name);

	return names.map((name) => {
		const result = results.get(name);
		// While the run is live, a test without a result is running or waiting for its turn.
		const status: RowStatus = result?.status ?? (isRunning.value ? 'running' : 'notRun');
		return { name, status, durationMs: result?.durationMs, error: result?.error };
	});
});

const summary = computed(() => {
	const tests = run.value?.tests ?? [];
	if (!run.value || run.value.status === 'running') return '';
	const count = (status: string) => String(tests.filter((test) => test.status === status).length);
	return i18n.baseText('workflowTests.summary', {
		interpolate: { passed: count('passed'), failed: count('failed'), skipped: count('skipped') },
	});
});

const STATUS_ICONS: Record<RowStatus, IconName> = {
	passed: 'circle-check',
	failed: 'circle-x',
	skipped: 'circle-minus',
	running: 'loader-circle',
	notRun: 'circle-dashed-filled',
};

const STATUS_LABELS = {
	passed: 'workflowTests.status.passed',
	failed: 'workflowTests.status.failed',
	skipped: 'workflowTests.status.skipped',
	running: 'workflowTests.status.running',
	notRun: 'workflowTests.status.notRun',
} as const satisfies Record<RowStatus, string>;

async function load() {
	try {
		const loaded = await testsStore.fetchFile(props.workflowId);
		if (!isDirty.value || !loaded) draft.value = loaded?.source ?? '';
	} catch (error) {
		toast.showError(error, i18n.baseText('workflowTests.error.load'));
	} finally {
		isLoading.value = false;
	}
}

// The Assistant writes the file in another browser tab. Reload when the user comes back.
useEventListener(document, 'visibilitychange', () => {
	if (document.visibilityState === 'visible' && !isDirty.value) void load();
});

// A save by the Assistant arrives through a reload. Keep the editor in step unless the user typed.
watch(
	() => file.value?.source,
	(source, previous) => {
		if (draft.value === (previous ?? '')) draft.value = source ?? '';
	},
);

watch(() => props.workflowId, load);
onMounted(load);

async function save() {
	isSaving.value = true;
	try {
		await testsStore.saveFile(props.workflowId, draft.value);
		toast.showMessage({ title: i18n.baseText('workflowTests.saved'), type: 'success' });
	} catch (error) {
		toast.showError(error, i18n.baseText('workflowTests.error.save'));
	} finally {
		isSaving.value = false;
	}
}

async function runAll() {
	try {
		await testsStore.runFile(props.workflowId);
	} catch (error) {
		toast.showError(error, i18n.baseText('workflowTests.error.run'));
	}
}

async function generate() {
	await generateTests.open({
		id: props.workflowId,
		name: workflowDocumentStore?.value?.name ?? '',
		homeProjectId: workflowDocumentStore?.value?.homeProject?.id,
	});
}

function startWriting() {
	mode.value = 'code';
}

function formatDuration(durationMs: number | undefined) {
	if (durationMs === undefined) return '';
	return durationMs < 1000 ? `${Math.round(durationMs)} ms` : `${(durationMs / 1000).toFixed(1)} s`;
}
</script>

<template>
	<div :class="$style.container" data-testid="workflow-tests-view">
		<N8nLoading v-if="isLoading" :rows="5" />

		<div v-else-if="!file && mode === 'results'" :class="$style.empty">
			<N8nIcon icon="flask-conical" size="xlarge" />
			<N8nHeading tag="h2" size="large">{{
				i18n.baseText('workflowTests.empty.title')
			}}</N8nHeading>
			<N8nText color="text-light" align="center">
				{{ i18n.baseText('workflowTests.empty.description') }}
			</N8nText>
			<div :class="$style.actions">
				<N8nTooltip
					:disabled="generateTests.available.value"
					:content="i18n.baseText('workflowTests.generate.unavailable')"
				>
					<N8nButton
						variant="brand"
						:disabled="!generateTests.available.value"
						data-testid="workflow-tests-generate"
						data-attr="workflow-tests-generate"
						@click="generate"
					>
						<template #icon><N8nIcon icon="sparkles" /></template>
						{{ i18n.baseText('workflowTests.generate') }}
					</N8nButton>
				</N8nTooltip>
				<N8nButton variant="outline" data-testid="workflow-tests-write" @click="startWriting">
					{{ i18n.baseText('workflowTests.empty.write') }}
				</N8nButton>
			</div>
		</div>

		<template v-else>
			<div :class="$style.toolbar">
				<N8nSegmentControl v-model="mode" :options="modeOptions" size="small" />
				<N8nText
					v-if="summary"
					size="small"
					color="text-light"
					data-testid="workflow-tests-summary"
				>
					{{ summary }}
				</N8nText>
				<div :class="$style.spacer" />
				<N8nButton
					v-if="isDirty"
					variant="outline"
					size="small"
					:loading="isSaving"
					data-testid="workflow-tests-save"
					@click="save"
				>
					{{ i18n.baseText('workflowTests.save') }}
				</N8nButton>
				<N8nButton
					variant="outline"
					size="small"
					:disabled="!generateTests.available.value"
					data-testid="workflow-tests-generate"
					data-attr="workflow-tests-generate"
					@click="generate"
				>
					<template #icon><N8nIcon icon="sparkles" /></template>
					{{ i18n.baseText('workflowTests.generate') }}
				</N8nButton>
				<N8nTooltip
					:disabled="canRun && !isDirty"
					:content="
						canRun
							? i18n.baseText('workflowTests.unsaved')
							: i18n.baseText('workflowTests.runOwnerOnly')
					"
				>
					<N8nButton
						size="small"
						:loading="isRunning"
						:disabled="!file || isDirty || !canRun"
						data-testid="workflow-tests-run-all"
						data-attr="workflow-tests-run-all"
						@click="runAll"
					>
						<template #icon><N8nIcon icon="play" /></template>
						{{
							isRunning
								? i18n.baseText('workflowTests.running')
								: i18n.baseText('workflowTests.runAll')
						}}
					</N8nButton>
				</N8nTooltip>
			</div>

			<N8nCallout v-if="workflowHasUnsavedChanges" theme="warning" slim>
				{{ i18n.baseText('workflowTests.workflowUnsaved') }}
			</N8nCallout>

			<N8nCallout
				v-if="mode === 'results' && run?.status === 'error'"
				theme="danger"
				data-testid="workflow-tests-run-error"
			>
				<N8nText bold>{{ i18n.baseText('workflowTests.runError') }}</N8nText>
				<pre :class="$style.errorText">{{ run.errors.join('\n') }}</pre>
			</N8nCallout>

			<div v-if="mode === 'results'" :class="$style.results">
				<N8nText v-if="rows.length === 0" color="text-light">
					{{ i18n.baseText('workflowTests.noTestsFound') }}
				</N8nText>
				<div
					v-for="row in rows"
					:key="row.name"
					:class="[$style.row, $style[row.status]]"
					data-testid="workflow-tests-row"
				>
					<div :class="$style.rowHeader">
						<N8nTooltip :content="i18n.baseText(STATUS_LABELS[row.status])">
							<N8nIcon
								:icon="STATUS_ICONS[row.status]"
								:spin="row.status === 'running'"
								:class="$style.statusIcon"
							/>
						</N8nTooltip>
						<N8nText :class="$style.name">{{ row.name }}</N8nText>
						<N8nText size="small" color="text-light">{{ formatDuration(row.durationMs) }}</N8nText>
					</div>
					<div v-if="row.error" :class="$style.rowError">
						<N8nText v-if="row.error.code || row.error.node" size="small" bold>
							{{ [row.error.code, row.error.node].filter(Boolean).join(' · ') }}
						</N8nText>
						<pre :class="$style.errorText">{{ row.error.message }}</pre>
					</div>
				</div>
			</div>

			<div v-else :class="$style.editor" data-testid="workflow-tests-editor">
				<JsEditor v-model="draft" fill-parent />
			</div>
		</template>
	</div>
</template>

<style module lang="scss">
.container {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--sm);
	height: 100%;
	width: 100%;
	padding: var(--spacing--lg);
	overflow: auto;
}

.empty {
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: var(--spacing--sm);
	max-width: 32rem;
	margin: var(--spacing--3xl) auto 0;
	text-align: center;
}

.actions {
	display: flex;
	gap: var(--spacing--xs);
	margin-top: var(--spacing--xs);
}

.toolbar {
	display: flex;
	align-items: center;
	gap: var(--spacing--xs);
}

.spacer {
	flex: 1;
}

.results {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
}

.row {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--2xs);
	padding: var(--spacing--xs) var(--spacing--sm);
	border: var(--border);
	border-radius: var(--radius);
	background-color: var(--color--background--light-3);
}

.rowHeader {
	display: flex;
	align-items: center;
	gap: var(--spacing--xs);
}

.name {
	flex: 1;
}

.statusIcon {
	color: var(--color--text--tint-1);
}

.passed .statusIcon {
	color: var(--color--success);
}

.failed .statusIcon {
	color: var(--color--danger);
}

.running .statusIcon {
	color: var(--color--primary);
}

.rowError {
	padding-left: var(--spacing--lg);
}

.errorText {
	margin: 0;
	white-space: pre-wrap;
	word-break: break-word;
	font-family: var(--font-family--monospace);
	font-size: var(--font-size--2xs);
	color: var(--color--text);
}

.editor {
	flex: 1;
	min-height: 0;
	border: var(--border);
	border-radius: var(--radius);
	overflow: hidden;
}
</style>
