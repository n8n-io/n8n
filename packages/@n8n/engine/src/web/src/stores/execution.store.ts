import { defineStore } from 'pinia';
import { ref } from 'vue';

export interface Execution {
	id: string;
	workflowId: string;
	workflowVersion: number;
	status: string;
	mode: string;
	result: unknown;
	error: unknown;
	cancelRequested: boolean;
	pauseRequested: boolean;
	resumeAfter: string | null;
	startedAt: string;
	completedAt: string | null;
	durationMs: number | null;
	computeMs: number | null;
	waitMs: number | null;
	createdAt: string;
}

export interface ExecutionListItem {
	id: string;
	workflowId: string;
	workflowVersion: number;
	status: string;
	mode: string;
	cancelRequested: boolean;
	pauseRequested: boolean;
	startedAt: string;
	completedAt: string | null;
	durationMs: number | null;
	createdAt: string;
}

export interface StepExecution {
	id: string;
	executionId: string;
	stepId: string;
	stepType: string;
	status: string;
	input: unknown;
	output: unknown;
	error: unknown;
	attempt: number;
	parentStepExecutionId: string | null;
	startedAt: string | null;
	completedAt: string | null;
	durationMs: number | null;
}

export interface SSEEvent {
	type: string;
	executionId?: string;
	stepId?: string;
	[key: string]: unknown;
}

export const useExecutionStore = defineStore('execution', () => {
	const executions = ref<ExecutionListItem[]>([]);
	const currentExecution = ref<Execution | null>(null);
	const steps = ref<StepExecution[]>([]);
	const events = ref<SSEEvent[]>([]);
	const loading = ref(false);
	const error = ref<string | null>(null);
	const approvalTokens = ref<Map<string, string>>(new Map());

	async function fetchExecutions(filters?: { workflowId?: string; status?: string }) {
		loading.value = true;
		error.value = null;
		try {
			const params = new URLSearchParams();
			if (filters?.workflowId) params.set('workflowId', filters.workflowId);
			if (filters?.status) params.set('status', filters.status);
			const queryString = params.toString();
			const url = queryString
				? `/api/workflow-executions?${queryString}`
				: '/api/workflow-executions';
			const res = await fetch(url);
			if (!res.ok) throw new Error(`Failed: ${res.status}`);
			executions.value = await res.json();
		} catch (e) {
			error.value = (e as Error).message;
		} finally {
			loading.value = false;
		}
	}

	async function startExecution(
		workflowId: string,
		triggerData?: unknown,
		mode?: string,
	): Promise<{ executionId: string; status: string }> {
		const res = await fetch('/api/workflow-executions', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ workflowId, triggerData, mode: mode ?? 'manual' }),
		});
		if (!res.ok) {
			const body = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
			throw new Error(body.error ?? `Failed to start execution`);
		}
		return await res.json();
	}

	async function fetchExecution(id: string) {
		loading.value = true;
		error.value = null;
		try {
			const res = await fetch(`/api/workflow-executions/${id}`);
			if (!res.ok) throw new Error(`Failed: ${res.status}`);
			currentExecution.value = await res.json();
		} catch (e) {
			error.value = (e as Error).message;
		} finally {
			loading.value = false;
		}
	}

	async function fetchSteps(executionId: string) {
		const res = await fetch(`/api/workflow-executions/${executionId}/steps`);
		if (!res.ok) throw new Error(`Failed: ${res.status}`);
		steps.value = await res.json();
	}

	function subscribeSSE(executionId: string): EventSource {
		const evtSource = new EventSource(`/api/workflow-executions/${executionId}/stream`);
		evtSource.onmessage = (e: MessageEvent) => {
			try {
				const event: SSEEvent = JSON.parse(e.data);
				events.value.push(event);
				// Store approval tokens from waiting_approval events
				if (
					event.type === 'step:waiting_approval' &&
					event.approvalToken &&
					event.stepExecutionId
				) {
					approvalTokens.value.set(event.stepExecutionId as string, event.approvalToken as string);
				}
				// Auto-refresh on terminal events
				if (event.type?.startsWith('execution:')) {
					void fetchExecution(executionId);
					void fetchSteps(executionId);
				}
				if (event.type?.startsWith('step:')) {
					void fetchSteps(executionId);
				}
			} catch {
				// Skip malformed events
			}
		};
		return evtSource;
	}

	async function cancelExecution(id: string) {
		await fetch(`/api/workflow-executions/${id}/cancel`, { method: 'POST' });
		await fetchExecution(id);
	}

	async function pauseExecution(id: string, resumeAfter?: string) {
		await fetch(`/api/workflow-executions/${id}/pause`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ resumeAfter }),
		});
		await fetchExecution(id);
	}

	async function resumeExecution(id: string) {
		await fetch(`/api/workflow-executions/${id}/resume`, { method: 'POST' });
		await fetchExecution(id);
	}

	async function approveStep(stepExecutionId: string, approved: boolean, token?: string) {
		const approvalToken = token ?? approvalTokens.value.get(stepExecutionId);
		if (!approvalToken) {
			throw new Error('No approval token available for this step');
		}
		const res = await fetch(`/api/workflow-step-executions/${stepExecutionId}/approve`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ approved, token: approvalToken }),
		});
		if (!res.ok) {
			const body = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
			throw new Error(body.error ?? 'Failed to approve step');
		}
	}

	async function deleteExecution(id: string) {
		const res = await fetch(`/api/workflow-executions/${id}`, { method: 'DELETE' });
		if (!res.ok) throw new Error(`Failed: ${res.status}`);
		currentExecution.value = null;
		steps.value = [];
		// Remove from list if present
		executions.value = executions.value.filter((e) => e.id !== id);
	}

	function clearEvents() {
		events.value = [];
	}

	return {
		executions,
		currentExecution,
		steps,
		events,
		loading,
		error,
		fetchExecutions,
		startExecution,
		fetchExecution,
		fetchSteps,
		subscribeSSE,
		cancelExecution,
		pauseExecution,
		resumeExecution,
		approvalTokens,
		approveStep,
		deleteExecution,
		clearEvents,
	};
});
