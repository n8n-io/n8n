import { ref, computed } from 'vue';
import { defineStore } from 'pinia';
import { BROWSER_ID_STORAGE_KEY } from '@n8n/constants';
import { makeRestApiRequest } from '@n8n/rest-api-client';
import { useRootStore } from '@n8n/stores/useRootStore';
import { useAgentsStore } from './agents.store';
import type {
	AgentCapabilitiesResponse,
	AgentTaskDispatchResponse,
	ExternalAgentNode,
	LiveStep,
	StreamEvent,
} from './agents.types';
import { isExternalAgent } from './agents.types';

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
	const rawSseEvents = ref<Array<{ type: string; data: StreamEvent }>>([]);
	let abortController: AbortController | null = null;

	// Active connection tracking for animated lines
	const activeConnections = ref<Set<string>>(new Set());

	const rootStore = useRootStore();
	const agentsStore = useAgentsStore();

	// External agent panel state
	const externalAgentData = ref<ExternalAgentNode | null>(null);
	const isExternalPanel = computed(() => externalAgentData.value !== null);

	const llmConfigured = computed(() => {
		// External agents use their own LLM — always "configured" from our perspective
		if (isExternalPanel.value) return true;
		return capabilities.value?.llmConfigured ?? false;
	});

	const selectedAgent = computed(() => {
		if (!panelAgentId.value) return null;
		return agentsStore.allAgents.find((a) => a.id === panelAgentId.value) ?? null;
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

		return agentsStore.allAgents.filter((a) => connectedIds.has(a.id));
	});

	const openPanel = async (agentId: string) => {
		panelAgentId.value = agentId;
		panelOpen.value = true;
		taskResult.value = null;
		streamingSteps.value = [];
		streamingSummary.value = null;
		externalAgentData.value = null;

		agentsStore.initializePushListener();

		// Check if this is an external agent
		const agent = agentsStore.allAgents.find((a) => a.id === agentId);
		if (agent && isExternalAgent(agent)) {
			// External agents — populate from stored card data, skip API call
			externalAgentData.value = agent;
			capabilities.value = null;
			isLoading.value = false;
			return;
		}

		isLoading.value = true;
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
		externalAgentData.value = null;
		taskResult.value = null;
		streamingSteps.value = [];
		streamingSummary.value = null;
		rawSseEvents.value = [];
		isLoading.value = false;
		isSubmitting.value = false;
		isStreaming.value = false;
		activeConnections.value = new Set();

		agentsStore.teardownPushListener();

		// Reset all agent statuses (local + external)
		for (const agent of agentsStore.allAgents) {
			agentsStore.setAgentStatus(agent.id, 'idle');
		}
	};

	const updateAgent = async (updates: {
		firstName?: string;
		avatar?: string | null;
		agentAccessLevel?: 'external' | 'internal' | 'closed';
	}) => {
		if (!panelAgentId.value) return;
		await agentsStore.updateAgent(panelAgentId.value, updates);
	};

	function computeConnectionId(agentId1: string, agentId2: string): string {
		const sorted = [agentId1, agentId2].sort();
		return `${sorted[0]}-${sorted[1]}`;
	}

	function findAgentIdByName(firstName: string): string | null {
		const agent = agentsStore.allAgents.find(
			(a) => a.firstName.toLowerCase() === firstName.toLowerCase(),
		);
		return agent?.id ?? null;
	}

	function handleActionEvent(event: StreamEvent & { type: 'task.action' }) {
		const step: LiveStep = {
			action: event.action,
			workflowName: event.workflowName,
			targetUserName: event.targetUserName,
			origin: event.origin,
			status: 'running',
		};
		streamingSteps.value = [...streamingSteps.value, step];

		// If delegating to another agent, light up that agent + connection
		if (event.targetUserName && panelAgentId.value) {
			const targetId = findAgentIdByName(event.targetUserName);
			if (targetId) {
				agentsStore.setAgentStatus(targetId, 'busy');
				const connId = computeConnectionId(panelAgentId.value, targetId);
				activeConnections.value = new Set([...activeConnections.value, connId]);
			}
		}
	}

	function handleObservationEvent(event: StreamEvent & { type: 'task.observation' }) {
		const steps = [...streamingSteps.value];

		// Find the matching step: last running step with the same targetUserName context,
		// falling back to the last step. This handles interleaved steps from nested
		// delegation where the last step may belong to a different agent.
		let targetStep = steps[steps.length - 1];
		if (event.targetUserName) {
			const delegationStep = [...steps]
				.reverse()
				.find((s) => s.targetUserName === event.targetUserName && s.status === 'running');
			if (delegationStep) targetStep = delegationStep;
		}

		if (targetStep) {
			targetStep.result = event.result;
			targetStep.error = event.error;
			targetStep.status = event.error ? 'failed' : 'success';
		}
		streamingSteps.value = steps;

		// Clear busy agent + connection using the event's targetUserName (not the step's)
		// because nested delegation interleaves steps from multiple agents
		const agentName = event.targetUserName ?? targetStep?.targetUserName;
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

	function handleCompletionEvent(event: StreamEvent & { type: 'task.completion' }) {
		streamingSummary.value = event.summary;
		isStreaming.value = false;
		isSubmitting.value = false;
		activeConnections.value = new Set();

		// Reset all agent statuses (not just the dispatching agent)
		// Observation events may not fire for every delegation (error paths, races)
		for (const agent of agentsStore.allAgents) {
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

	/**
	 * Consume an SSE ReadableStream, dispatching events into the streaming state.
	 * Shared between local and external task dispatch paths.
	 */
	async function consumeSseStream(response: Response) {
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
				rawSseEvents.value = [...rawSseEvents.value, { type: event.type, data: event }];
				switch (event.type) {
					case 'task.action':
						handleActionEvent(event);
						break;
					case 'task.observation':
						handleObservationEvent(event);
						break;
					case 'task.completion':
						handleCompletionEvent(event);
						break;
				}
			}
		}

		if (isStreaming.value) {
			isStreaming.value = false;
			isSubmitting.value = false;
		}
	}

	function resetStreamingState() {
		isSubmitting.value = true;
		isStreaming.value = true;
		taskResult.value = null;
		streamingSteps.value = [];
		streamingSummary.value = null;
		rawSseEvents.value = [];
	}

	const dispatchTask = async (
		prompt: string,
		externalAgents?: Array<{ url: string; apiKey?: string }>,
	) => {
		if (!panelAgentId.value) return;

		// If viewing an external agent panel, dispatch directly to the remote agent
		if (isExternalPanel.value && externalAgentData.value) {
			await dispatchExternalTask(prompt);
			return;
		}

		resetStreamingState();
		agentsStore.setAgentStatus(panelAgentId.value, 'active');
		abortController = new AbortController();

		// Registered external agents are now resolved server-side from encrypted credentials.
		// Only pass explicitly provided external agents (non-persisted).
		const body: Record<string, unknown> = { prompt };
		if (externalAgents && externalAgents.length > 0) {
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

			await consumeSseStream(response);
		} catch (error: unknown) {
			if (error instanceof Error && error.name === 'AbortError') return;
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

	const dispatchExternalTask = async (prompt: string) => {
		if (!externalAgentData.value) return;

		resetStreamingState();
		agentsStore.setAgentStatus(externalAgentData.value.id, 'active');
		abortController = new AbortController();

		// remoteUrl stores the full task endpoint from the card's interface URL
		const taskUrl = externalAgentData.value.remoteUrl;

		try {
			const { baseUrl } = rootStore.restApiContext;

			// Proxy through local backend to avoid CORS.
			// For registered agents (registrationId), the backend resolves the API key
			// from the encrypted credential. For ephemeral agents, pass apiKey directly.
			const proxyBody: Record<string, unknown> = { url: taskUrl, prompt };
			if (externalAgentData.value.registrationId) {
				proxyBody.registrationId = externalAgentData.value.registrationId;
			}
			if (externalAgentData.value.apiKey) {
				proxyBody.apiKey = externalAgentData.value.apiKey;
			}

			const response = await fetch(`${baseUrl}/agents/external-task`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					Accept: 'text/event-stream',
					'browser-id': localStorage.getItem(BROWSER_ID_STORAGE_KEY) ?? '',
				},
				credentials: 'include',
				body: JSON.stringify(proxyBody),
				signal: abortController.signal,
			});

			await consumeSseStream(response);
		} catch (error: unknown) {
			if (error instanceof Error && error.name === 'AbortError') return;
			taskResult.value = {
				status: 'error',
				message: 'Failed to reach external agent. Check the remote instance is running.',
			};
			isStreaming.value = false;
			isSubmitting.value = false;

			if (externalAgentData.value) {
				agentsStore.setAgentStatus(externalAgentData.value.id, 'idle');
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
		rawSseEvents,
		activeConnections,
		selectedAgent,
		zoneName,
		connectedAgents,
		isExternalPanel,
		externalAgentData,
		openPanel,
		closePanel,
		updateAgent,
		dispatchTask,
	};
});
