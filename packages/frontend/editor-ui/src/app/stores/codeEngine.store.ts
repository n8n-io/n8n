import { defineStore } from 'pinia';
import { ref } from 'vue';

interface ExecutionTrace {
	nodes: Array<{
		id: string;
		label: string;
		type: 'trigger' | 'callable';
		input: unknown;
		output: unknown;
		startedAt: number;
		completedAt: number;
		error?: string;
	}>;
	edges: Array<{
		from: string;
		to: string;
	}>;
	startedAt: number;
	completedAt: number;
	status: 'success' | 'error';
	error?: string;
}

export const useCodeEngineStore = defineStore('codeEngine', () => {
	const executingNodes = ref<Set<string>>(new Set());
	const waitingForWebhook = ref(false);
	const webhookTimedOut = ref(false);
	const executionTrace = ref<ExecutionTrace | null>(null);
	const nodeOutputs = ref<Map<string, { output: unknown; error?: string }>>(new Map());

	function addExecutingNode(nodeId: string) {
		executingNodes.value = new Set([...executingNodes.value, nodeId]);
	}

	function removeExecutingNode(nodeId: string) {
		const next = new Set(executingNodes.value);
		next.delete(nodeId);
		executingNodes.value = next;
	}

	function setNodeOutput(nodeId: string, output: unknown, error?: string) {
		const next = new Map(nodeOutputs.value);
		next.set(nodeId, { output, error });
		nodeOutputs.value = next;
	}

	function setWaitingForWebhook(value: boolean) {
		waitingForWebhook.value = value;
	}

	function setWebhookTimedOut(value: boolean) {
		webhookTimedOut.value = value;
	}

	function setExecutionTrace(trace: ExecutionTrace) {
		executionTrace.value = trace;
	}

	function reset() {
		executingNodes.value = new Set();
		waitingForWebhook.value = false;
		webhookTimedOut.value = false;
		executionTrace.value = null;
		nodeOutputs.value = new Map();
	}

	return {
		executingNodes,
		waitingForWebhook,
		webhookTimedOut,
		executionTrace,
		nodeOutputs,
		addExecutingNode,
		removeExecutingNode,
		setNodeOutput,
		setWaitingForWebhook,
		setWebhookTimedOut,
		setExecutionTrace,
		reset,
	};
});
