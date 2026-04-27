import { computed } from 'vue';
import { defineStore } from 'pinia';
import { useLocalStorage } from '@vueuse/core';
import { EVALUATION_NODE_TYPE, EVALUATION_TRIGGER_NODE_TYPE } from 'n8n-workflow';
import { useWorkflowsStore } from '@/app/stores/workflows.store';
import { LOCAL_STORAGE_EVAL_MODE_BY_WORKFLOW } from '@/app/constants';

const NEW_WORKFLOW_KEY = 'new';

const EVAL_NODE_TYPES = new Set<string>([EVALUATION_NODE_TYPE, EVALUATION_TRIGGER_NODE_TYPE]);

export const useEvalModeStore = defineStore('evalMode', () => {
	const workflowsStore = useWorkflowsStore();

	// `flush: 'sync'` so toggle clicks write to localStorage immediately. Keeps
	// per-workflow state durable across hard reloads that might happen before
	// Vue's next tick.
	const storage = useLocalStorage<Record<string, boolean>>(
		LOCAL_STORAGE_EVAL_MODE_BY_WORKFLOW,
		{},
		{ flush: 'sync' },
	);

	// workflowsStore.workflowId is a string that defaults to '' for new/unsaved
	// workflows (never null/undefined), so `??` would let every new workflow
	// collide on the empty-string key. Use `||` to route them all through the
	// sentinel — accepting that two concurrent new workflows share state until
	// one is saved.
	const workflowKey = computed(() => workflowsStore.workflowId || NEW_WORKFLOW_KEY);

	const isEvalMode = computed<boolean>({
		get: () => storage.value[workflowKey.value] ?? false,
		set: (value) => {
			storage.value = { ...storage.value, [workflowKey.value]: value };
		},
	});

	function toggle() {
		isEvalMode.value = !isEvalMode.value;
	}

	function isEvalNodeType(type: string | undefined): boolean {
		return type !== undefined && EVAL_NODE_TYPES.has(type);
	}

	function shouldDim(nodeType: string | undefined): boolean {
		return !isEvalMode.value && isEvalNodeType(nodeType);
	}

	return {
		isEvalMode,
		toggle,
		isEvalNodeType,
		shouldDim,
	};
});
