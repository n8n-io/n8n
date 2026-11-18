<script setup lang="ts">
import type { WorkflowTestCaller, WorkflowTestCallers } from '@n8n/api-types';
import { useToast } from '@n8n/composables/useToast';
import { N8nButton, N8nIcon, N8nLink, N8nText, type IconColor } from '@n8n/design-system';
import type { IconName } from '@n8n/design-system/components/N8nIcon/icons';
import { useI18n } from '@n8n/i18n';
import { useRootStore } from '@n8n/stores/useRootStore';
import { useIntervalFn } from '@vueuse/core';
import { computed, ref, watch } from 'vue';

import { VIEWS } from '@/app/constants';

import * as api from '../workflowTests.api';

/**
 * The workflows that call this workflow as a sub-workflow. Their tests run with
 * the saved draft of this workflow, so they show whether a change here breaks
 * a caller.
 */
const props = defineProps<{ workflowId: string; canRun: boolean }>();

const POLL_INTERVAL_MS = 3000;

const i18n = useI18n();
const { showError } = useToast();
const rootStore = useRootStore();

const data = ref<WorkflowTestCallers | null>(null);
const starting = ref(false);

const callers = computed(() => data.value?.callers ?? []);
const inaccessibleCount = computed(() => data.value?.inaccessibleCount ?? 0);
const total = computed(() => callers.value.length + inaccessibleCount.value);
const withTests = computed(() => callers.value.filter((caller) => caller.testFileId !== null));
const isRunning = computed(() => callers.value.some((caller) => caller.running));

type CallerState = 'noTests' | 'notRun' | 'running' | 'passed' | 'failed' | 'error';

const STATE_ICON: Record<CallerState, { icon: IconName; color: IconColor }> = {
	noTests: { icon: 'circle-minus', color: 'text-light' },
	notRun: { icon: 'circle-pause', color: 'text-light' },
	running: { icon: 'loader-circle', color: 'text-light' },
	passed: { icon: 'circle-check', color: 'success' },
	failed: { icon: 'circle-x', color: 'danger' },
	error: { icon: 'triangle-alert', color: 'warning' },
};

function stateOf(caller: WorkflowTestCaller): CallerState {
	if (caller.testFileId === null) return 'noTests';
	if (caller.running) return 'running';
	return caller.lastRun?.status ?? 'notRun';
}

function describe(caller: WorkflowTestCaller) {
	const tests = caller.lastRun?.tests ?? [];
	const counts = {
		passed: String(tests.filter((test) => test.status === 'passed').length),
		failed: String(tests.filter((test) => test.status === 'failed').length),
		total: String(tests.length),
	};
	const state = stateOf(caller);
	switch (state) {
		case 'passed':
			return i18n.baseText('workflowTests.callers.passed', { interpolate: counts });
		case 'failed':
			return i18n.baseText('workflowTests.callers.failed', { interpolate: counts });
		default:
			return i18n.baseText(`workflowTests.callers.${state}`);
	}
}

async function load() {
	try {
		data.value = await api.getWorkflowTestCallers(rootStore.restApiContext, props.workflowId);
	} catch (error) {
		showError(error, i18n.baseText('workflowTests.callers.error.load'));
	}
}

async function runCallers() {
	starting.value = true;
	try {
		await api.runWorkflowTestCallers(rootStore.restApiContext, props.workflowId);
		await load();
	} catch (error) {
		showError(error, i18n.baseText('workflowTests.callers.error.run'));
	} finally {
		starting.value = false;
	}
}

// The runs are in the backend queue, so the list reloads until none is left.
const { pause, resume } = useIntervalFn(
	() => {
		void load();
	},
	POLL_INTERVAL_MS,
	{ immediate: false },
);
watch(isRunning, (running) => (running ? resume() : pause()));

watch(
	() => props.workflowId,
	() => {
		data.value = null;
		void load();
	},
	{ immediate: true },
);
</script>

<template>
	<section v-if="total > 0" :class="$style.callers" data-testid="workflow-tests-callers">
		<div :class="$style.header">
			<div :class="$style.heading">
				<N8nText tag="h3" bold size="medium" color="text-dark">
					{{
						i18n.baseText('workflowTests.callers.title', {
							adjustToNumber: total,
							interpolate: { count: String(total) },
						})
					}}
				</N8nText>
				<N8nText size="small" color="text-light">
					{{ i18n.baseText('workflowTests.callers.description') }}
				</N8nText>
			</div>
			<N8nButton
				v-if="canRun && withTests.length > 0"
				size="small"
				variant="outline"
				:loading="starting || isRunning"
				data-testid="workflow-tests-callers-run"
				data-attr="workflow-tests-callers-run"
				@click="runCallers"
			>
				<template #icon><N8nIcon icon="play" /></template>
				{{ i18n.baseText('workflowTests.callers.run') }}
			</N8nButton>
		</div>

		<ul :class="$style.list">
			<li
				v-for="caller in callers"
				:key="caller.workflowId"
				:class="$style.caller"
				:data-status="stateOf(caller)"
				data-testid="workflow-tests-caller"
			>
				<N8nIcon
					:icon="STATE_ICON[stateOf(caller)].icon"
					:color="STATE_ICON[stateOf(caller)].color"
					:spin="stateOf(caller) === 'running'"
					:size="16"
				/>
				<N8nLink
					:to="{ name: VIEWS.WORKFLOW_TESTS, params: { workflowId: caller.workflowId } }"
					theme="text"
					size="small"
					:class="$style.name"
				>
					{{ caller.name }}
				</N8nLink>
				<N8nText size="small" color="text-light" :class="$style.state">
					{{ describe(caller) }}
				</N8nText>
			</li>
			<li v-if="inaccessibleCount > 0" :class="$style.caller">
				<N8nText size="small" color="text-light">
					{{
						i18n.baseText('workflowTests.callers.inaccessible', {
							adjustToNumber: inaccessibleCount,
							interpolate: { count: String(inaccessibleCount) },
						})
					}}
				</N8nText>
			</li>
		</ul>
	</section>
</template>

<style lang="scss" module>
.callers {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--xs);
	margin-top: var(--spacing--md);
	padding-top: var(--spacing--sm);
	border-top: var(--border);
}

.header {
	display: flex;
	align-items: flex-start;
	justify-content: space-between;
	gap: var(--spacing--xs);
}

.heading {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--5xs);
	min-width: 0;
}

.list {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--3xs);
	margin: 0;
	padding: 0;
	list-style: none;
}

.caller {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	min-width: 0;
}

.name {
	min-width: 0;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.state {
	margin-left: auto;
	white-space: nowrap;
}
</style>
