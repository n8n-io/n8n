import { defineStore } from 'pinia';
import { ref } from 'vue';

export interface WorkflowGraphNode {
	id: string;
	name: string;
	type: 'trigger' | 'step' | 'condition' | 'approval' | 'end';
	stepFunctionRef: string;
	config: Record<string, unknown>;
}

export interface WorkflowGraphEdge {
	from: string;
	to: string;
	label?: string;
	condition?: string;
}

export interface WorkflowGraph {
	nodes: WorkflowGraphNode[];
	edges: WorkflowGraphEdge[];
}

export interface Workflow {
	id: string;
	version: number;
	name: string;
	active: boolean;
	code: string;
	triggers?: unknown[];
	settings?: Record<string, unknown>;
	graph: WorkflowGraph | null;
	createdAt: string;
}

export interface WorkflowVersion {
	id: string;
	version: number;
	name: string;
	createdAt: string;
}

export interface CompilationError {
	message: string;
	line?: number;
	column?: number;
}

export interface WorkflowListItem {
	id: string;
	name: string;
	version: number;
	active: boolean;
	createdAt: string;
}

export const useWorkflowStore = defineStore('workflow', () => {
	const currentWorkflow = ref<Workflow | null>(null);
	const workflows = ref<WorkflowListItem[]>([]);
	const loading = ref(false);
	const error = ref<string | null>(null);
	const compilationErrors = ref<CompilationError[]>([]);
	const versions = ref<WorkflowVersion[]>([]);

	async function fetchWorkflows() {
		loading.value = true;
		error.value = null;
		try {
			const res = await fetch('/api/workflows');
			if (!res.ok) throw new Error(`Failed: ${res.status}`);
			workflows.value = await res.json();
		} catch (e) {
			error.value = (e as Error).message;
		} finally {
			loading.value = false;
		}
	}

	async function fetchWorkflow(id: string, version?: number) {
		loading.value = true;
		error.value = null;
		try {
			const url = version ? `/api/workflows/${id}?version=${version}` : `/api/workflows/${id}`;
			const res = await fetch(url);
			if (!res.ok) {
				const body = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
				throw new Error(body.error ?? `Failed to fetch workflow: ${res.status}`);
			}
			currentWorkflow.value = await res.json();
		} catch (e) {
			error.value = (e as Error).message;
		} finally {
			loading.value = false;
		}
	}

	async function createWorkflow(data: {
		name: string;
		code: string;
		triggers?: unknown[];
	}): Promise<Workflow> {
		compilationErrors.value = [];
		const res = await fetch('/api/workflows', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(data),
		});
		if (res.status === 422) {
			const body = await res.json();
			compilationErrors.value = body.errors ?? [];
			throw new Error('Compilation failed');
		}
		if (!res.ok) {
			const body = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
			throw new Error(body.error ?? `Failed to create workflow`);
		}
		const workflow = await res.json();
		currentWorkflow.value = workflow;
		return workflow;
	}

	async function saveWorkflow(
		id: string,
		data: { name: string; code: string; triggers?: unknown[] },
	): Promise<Workflow> {
		compilationErrors.value = [];
		const res = await fetch(`/api/workflows/${id}`, {
			method: 'PUT',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(data),
		});
		if (res.status === 422) {
			const body = await res.json();
			compilationErrors.value = body.errors ?? [];
			throw new Error('Compilation failed');
		}
		if (!res.ok) {
			const body = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
			throw new Error(body.error ?? `Failed to save workflow`);
		}
		const workflow = await res.json();
		// Merge with current workflow data (PUT response is partial)
		if (currentWorkflow.value) {
			currentWorkflow.value = {
				...currentWorkflow.value,
				...workflow,
			};
		}
		return workflow;
	}

	async function fetchVersions(id: string): Promise<WorkflowVersion[]> {
		const res = await fetch(`/api/workflows/${id}/versions`);
		if (!res.ok) throw new Error(`Failed: ${res.status}`);
		versions.value = await res.json();
		return versions.value;
	}

	async function activateWorkflow(id: string) {
		const res = await fetch(`/api/workflows/${id}/activate`, { method: 'POST' });
		if (!res.ok) throw new Error(`Failed: ${res.status}`);
		if (currentWorkflow.value && currentWorkflow.value.id === id) {
			currentWorkflow.value.active = true;
		}
	}

	async function deactivateWorkflow(id: string) {
		const res = await fetch(`/api/workflows/${id}/deactivate`, { method: 'POST' });
		if (!res.ok) throw new Error(`Failed: ${res.status}`);
		if (currentWorkflow.value && currentWorkflow.value.id === id) {
			currentWorkflow.value.active = false;
		}
	}

	async function deleteWorkflow(id: string) {
		const res = await fetch(`/api/workflows/${id}`, { method: 'DELETE' });
		if (!res.ok) throw new Error(`Failed: ${res.status}`);
		workflows.value = workflows.value.filter((w) => w.id !== id);
		if (currentWorkflow.value?.id === id) {
			currentWorkflow.value = null;
		}
	}

	function clearErrors() {
		error.value = null;
		compilationErrors.value = [];
	}

	return {
		currentWorkflow,
		workflows,
		loading,
		error,
		compilationErrors,
		versions,
		fetchWorkflows,
		fetchWorkflow,
		createWorkflow,
		saveWorkflow,
		fetchVersions,
		activateWorkflow,
		deactivateWorkflow,
		deleteWorkflow,
		clearErrors,
	};
});
