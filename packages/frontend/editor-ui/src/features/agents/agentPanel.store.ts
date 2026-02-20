import { ref, computed } from 'vue';
import { defineStore } from 'pinia';
import { BROWSER_ID_STORAGE_KEY } from '@n8n/constants';
import { makeRestApiRequest } from '@n8n/rest-api-client';
import { useRootStore } from '@n8n/stores/useRootStore';
import { useAgentsStore } from './agents.store';
import type {
	AgentCapabilitiesResponse,
	AgentTaskDispatchResponse,
	LiveStep,
	StreamEvent,
} from './agents.types';

export const useAgentPanelStore = defineStore('agentPanel', () => {
	const panelOpen = ref(false);
	const panelAgentId = ref<string | null>(null);
	const capabilities = ref<AgentCapabilitiesResponse | null>(null);
	const isLoading = ref(false);
	const taskResult = ref<AgentTaskDispatchResponse | null>(null);
	const isSubmitting = ref(false);

	// SSE streaming state
	const streamingSteps = ref<LiveStep[]>([]);
	const streamingSummary = ref<string | null>(null);
	const isStreaming = ref(false);
	let abortController: AbortController | null = null;

	// Active connection tracking for animated lines
	const activeConnections = ref<Set<string>>(new Set());

	const rootStore = useRootStore();
	const agentsStore = useAgentsStore();

	const llmConfigured = computed(() => capabilities.value?.llmConfigured ?? false);

	const selectedAgent = computed(() => {
		if (!panelAgentId.value) return null;
		return agentsStore.agents.find((a) => a.id === panelAgentId.value) ?? null;
	});

	const zoneName = computed(() => {
		const agent = selectedAgent.value;
		if (!agent?.zoneId) return null;
		const zone = agentsStore.zones.find((z) => z.projectId === agent.zoneId);
		return zone?.name ?? null;
	});

	const connectedAgents = computed(() => {
		if (!panelAgentId.value) return [];
		const id = panelAgentId.value;
		const connectedIds = new Set<string>();

		for (const conn of agentsStore.connections) {
			if (conn.fromAgentId === id) connectedIds.add(conn.toAgentId);
			if (conn.toAgentId === id) connectedIds.add(conn.fromAgentId);
		}

		return agentsStore.agents.filter((a) => connectedIds.has(a.id));
	});

	const openPanel = async (agentId: string) => {
		panelAgentId.value = agentId;
		panelOpen.value = true;
		taskResult.value = null;
		streamingSteps.value = [];
		streamingSummary.value = null;
		isLoading.value = true;

		agentsStore.initializePushListener();

		try {
			capabilities.value = await makeRestApiRequest<AgentCapabilitiesResponse>(
				rootStore.restApiContext,
				'GET',
				`/agents/${agentId}/capabilities`,
			);
		} catch {
			capabilities.value = null;
		} finally {
			isLoading.value = false;
		}
	};

	const closePanel = () => {
		// Abort any in-flight SSE stream
		if (abortController) {
			abortController.abort();
			abortController = null;
		}

		panelOpen.value = false;
		panelAgentId.value = null;
		capabilities.value = null;
		taskResult.value = null;
		streamingSteps.value = [];
		streamingSummary.value = null;
		isLoading.value = false;
		isSubmitting.value = false;
		isStreaming.value = false;
		activeConnections.value = new Set();

		agentsStore.teardownPushListener();

		// Reset all agent statuses
		for (const agent of agentsStore.agents) {
			agentsStore.setAgentStatus(agent.id, 'idle');
		}
	};

	const updateAgent = async (updates: { firstName?: string; avatar?: string | null }) => {
		if (!panelAgentId.value) return;
		await agentsStore.updateAgent(panelAgentId.value, updates);
	};

	function computeConnectionId(agentId1: string, agentId2: string): string {
		const sorted = [agentId1, agentId2].sort();
		return `${sorted[0]}-${sorted[1]}`;
	}

	function findAgentIdByName(firstName: string): string | null {
		const agent = agentsStore.agents.find(
			(a) => a.firstName.toLowerCase() === firstName.toLowerCase(),
		);
		return agent?.id ?? null;
	}

	function handleStepEvent(event: StreamEvent & { type: 'step' }) {
		const step: LiveStep = {
			action: event.action,
			workflowName: event.workflowName,
			toAgent: event.toAgent,
			external: event.external,
			status: 'running',
		};
		streamingSteps.value = [...streamingSteps.value, step];

		// If delegating to another agent, light up that agent + connection
		if (event.toAgent && panelAgentId.value) {
			const targetId = findAgentIdByName(event.toAgent);
			if (targetId) {
				agentsStore.setAgentStatus(targetId, 'busy');
				const connId = computeConnectionId(panelAgentId.value, targetId);
				activeConnections.value = new Set([...activeConnections.value, connId]);
			}
		}
	}

	function handleObservationEvent(event: StreamEvent & { type: 'observation' }) {
		const steps = [...streamingSteps.value];

		// Find the matching step: last running step with the same toAgent context,
		// falling back to the last step. This handles interleaved steps from nested
		// delegation where the last step may belong to a different agent.
		let targetStep = steps[steps.length - 1];
		if (event.toAgent) {
			const delegationStep = [...steps]
				.reverse()
				.find((s) => s.toAgent === event.toAgent && s.status === 'running');
			if (delegationStep) targetStep = delegationStep;
		}

		if (targetStep) {
			targetStep.result = event.result;
			targetStep.error = event.error;
			targetStep.status = event.error ? 'failed' : 'success';
		}
		streamingSteps.value = steps;

		// Clear busy agent + connection using the event's toAgent (not the step's)
		// because nested delegation interleaves steps from multiple agents
		const agentName = event.toAgent ?? targetStep?.toAgent;
		if (agentName && panelAgentId.value) {
			const targetId = findAgentIdByName(agentName);
			if (targetId) {
				agentsStore.setAgentStatus(targetId, 'idle');
				const connId = computeConnectionId(panelAgentId.value, targetId);
				const next = new Set(activeConnections.value);
				next.delete(connId);
				activeConnections.value = next;
			}
		}
	}

	function handleDoneEvent(event: StreamEvent & { type: 'done' }) {
		streamingSummary.value = event.summary;
		isStreaming.value = false;
		isSubmitting.value = false;
		activeConnections.value = new Set();

		// Reset all agent statuses (not just the dispatching agent)
		// Observation events may not fire for every delegation (error paths, races)
		for (const agent of agentsStore.agents) {
			agentsStore.setAgentStatus(agent.id, 'idle');
		}
	}

	function parseSSEEvents(buffer: string): { events: StreamEvent[]; remainder: string } {
		const events: StreamEvent[] = [];
		const blocks = buffer.split('\n\n');
		const remainder = blocks.pop() ?? '';

		for (const block of blocks) {
			const lines = block.split('\n');
			for (const line of lines) {
				if (line.startsWith('data: ')) {
					try {
						const parsed = JSON.parse(line.slice(6)) as StreamEvent;
						events.push(parsed);
					} catch {
						// Skip malformed JSON
					}
				}
			}
		}

		return { events, remainder };
	}

	const dispatchTask = async (
		prompt: string,
		externalAgents?: Array<{ url: string; apiKey?: string }>,
	) => {
		if (!panelAgentId.value) return;

		isSubmitting.value = true;
		isStreaming.value = true;
		taskResult.value = null;
		streamingSteps.value = [];
		streamingSummary.value = null;

		// Set dispatching agent active
		agentsStore.setAgentStatus(panelAgentId.value, 'active');

		abortController = new AbortController();

		const body: Record<string, unknown> = { prompt };
		if (externalAgents?.length) {
			body.externalAgents = externalAgents;
		}

		try {
			const { baseUrl } = rootStore.restApiContext;
			const url = `${baseUrl}/agents/${panelAgentId.value}/task`;

			const response = await fetch(url, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					Accept: 'text/event-stream',
					'browser-id': localStorage.getItem(BROWSER_ID_STORAGE_KEY) ?? '',
				},
				credentials: 'include',
				body: JSON.stringify(body),
				signal: abortController.signal,
			});

			// If server doesn't support SSE, fall back to JSON
			const contentType = response.headers.get('content-type') ?? '';
			if (!contentType.includes('text/event-stream')) {
				const json = (await response.json()) as AgentTaskDispatchResponse;
				taskResult.value = json;
				isStreaming.value = false;
				isSubmitting.value = false;
				if (panelAgentId.value) {
					agentsStore.setAgentStatus(panelAgentId.value, 'idle');
				}
				return;
			}

			// SSE streaming via ReadableStream
			const reader = response.body?.getReader();
			if (!reader) {
				throw new Error('No response body');
			}

			const decoder = new TextDecoder();
			let sseBuffer = '';

			while (true) {
				const { done, value } = await reader.read();
				if (done) break;

				sseBuffer += decoder.decode(value, { stream: true });
				const { events, remainder } = parseSSEEvents(sseBuffer);
				sseBuffer = remainder;

				for (const event of events) {
					switch (event.type) {
						case 'step':
							handleStepEvent(event);
							break;
						case 'observation':
							handleObservationEvent(event);
							break;
						case 'done':
							handleDoneEvent(event);
							break;
					}
				}
			}

			// If stream ended without a done event
			if (isStreaming.value) {
				isStreaming.value = false;
				isSubmitting.value = false;
			}
		} catch (error: unknown) {
			if (error instanceof Error && error.name === 'AbortError') {
				// User closed panel mid-stream
				return;
			}
			taskResult.value = {
				status: 'error',
				message: 'Failed to dispatch task. Check agent worker configuration.',
			};
			isStreaming.value = false;
			isSubmitting.value = false;

			if (panelAgentId.value) {
				agentsStore.setAgentStatus(panelAgentId.value, 'idle');
			}
			activeConnections.value = new Set();
		} finally {
			abortController = null;
		}
	};

	return {
		panelOpen,
		panelAgentId,
		capabilities,
		isLoading,
		taskResult,
		isSubmitting,
		llmConfigured,
		streamingSteps,
		streamingSummary,
		isStreaming,
		activeConnections,
		selectedAgent,
		zoneName,
		connectedAgents,
		openPanel,
		closePanel,
		updateAgent,
		dispatchTask,
	};
});
