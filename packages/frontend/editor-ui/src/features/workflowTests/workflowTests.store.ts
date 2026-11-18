import type {
	WorkflowTestFile,
	WorkflowTestResult,
	WorkflowTestRunEvent,
	WorkflowTestRunResult,
} from '@n8n/api-types';
import { useRootStore } from '@n8n/stores/useRootStore';
import { defineStore } from 'pinia';
import { ref } from 'vue';

import { usePushConnectionStore } from '@/app/stores/pushConnection.store';

import * as api from './workflowTests.api';

/** The run that the Tests tab shows: a live run, or the last stored run. */
export type WorkflowTestRunState = {
	/** `null` until the run reply or the first event arrives. */
	runId: string | null;
	status: 'running' | WorkflowTestRunResult['status'];
	tests: WorkflowTestResult[];
	errors: string[];
	finishedAt?: string;
};

function fromStoredRun(run: WorkflowTestRunResult): WorkflowTestRunState {
	return { ...run };
}

export const useWorkflowTestsStore = defineStore('workflowTests', () => {
	const rootStore = useRootStore();
	const pushStore = usePushConnectionStore();

	/** The test file of each loaded workflow. `null` when the workflow has none. */
	const files = ref<Record<string, WorkflowTestFile | null>>({});
	const runs = ref<Record<string, WorkflowTestRunState | undefined>>({});

	async function fetchFile(workflowId: string) {
		const [file] = await api.getWorkflowTests(rootStore.restApiContext, workflowId);
		files.value[workflowId] = file ?? null;
		const current = runs.value[workflowId];
		if (current?.status !== 'running') {
			runs.value[workflowId] = file?.lastRun ? fromStoredRun(file.lastRun) : undefined;
		}
		return file ?? null;
	}

	async function saveFile(workflowId: string, source: string) {
		const file = await api.saveWorkflowTests(rootStore.restApiContext, workflowId, source);
		files.value[workflowId] = file;
		// A new source makes the last run stale. The server cleared it too.
		if (runs.value[workflowId]?.status !== 'running') runs.value[workflowId] = undefined;
		return file;
	}

	async function runFile(workflowId: string) {
		const file = files.value[workflowId];
		if (!file) return;
		runs.value[workflowId] = {
			runId: null,
			status: 'running',
			tests: [],
			errors: [],
		};
		try {
			const { runId } = await api.runWorkflowTests(rootStore.restApiContext, workflowId, file.id);
			// Push events can arrive before the reply. Then the run already has its id.
			const run = runs.value[workflowId];
			if (run && run.runId === null) run.runId = runId;
		} catch (error) {
			runs.value[workflowId] = undefined;
			throw error;
		}
	}

	/**
	 * Applies one run event. An event of an unknown run starts a new run state:
	 * the Assistant can start a run too, and the user sees it live.
	 */
	function applyEvent(workflowId: string, runId: string, event: WorkflowTestRunEvent) {
		let run = runs.value[workflowId];
		if (run && run.runId === null && run.status === 'running') {
			run.runId = runId;
		} else if (!run || run.runId !== runId) {
			run = { runId, status: 'running', tests: [], errors: [] };
			runs.value[workflowId] = run;
			// Another client (usually the Assistant) started this run, maybe after it saved a new source.
			void fetchFile(workflowId).catch(() => {});
		}

		switch (event.type) {
			case 'testFinished': {
				const { type: _, ...result } = event;
				run.tests = [...run.tests.filter((test) => test.name !== event.name), result];
				break;
			}
			case 'runFinished':
				run.status = event.status;
				run.errors = event.errors;
				run.finishedAt = new Date().toISOString();
				break;
			default:
				break;
		}
	}

	pushStore.addEventListener((message) => {
		if (message.type !== 'workflowTestRunEvent') return;
		const { workflowId, runId, event } = message.data;
		applyEvent(workflowId, runId, event);
	});

	return { files, runs, fetchFile, saveFile, runFile };
});
