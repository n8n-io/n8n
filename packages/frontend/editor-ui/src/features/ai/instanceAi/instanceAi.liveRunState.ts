import type {
	InstanceAiAgentNode,
	InstanceAiConfirmRequest,
	InstanceAiMessage,
	InstanceAiThreadStatusResponse,
	InstanceAiToolCallState,
} from '@n8n/api-types';

export function isOrchestratorLive(
	status: Pick<InstanceAiThreadStatusResponse, 'hasActiveRun' | 'isSuspended'>,
): boolean {
	return status.hasActiveRun || status.isSuspended;
}

function findLastAssistantMessage(messages: InstanceAiMessage[]): InstanceAiMessage | undefined {
	return [...messages].reverse().find((m) => m.role === 'assistant');
}

export function findToolCallInTree(
	node: InstanceAiAgentNode,
	requestId: string,
): InstanceAiToolCallState | undefined {
	for (const tc of node.toolCalls) {
		if (tc.confirmation?.requestId === requestId) return tc;
	}
	for (const child of node.children) {
		const found = findToolCallInTree(child, requestId);
		if (found) return found;
	}
	return undefined;
}

function findRunIdForRequestId(messages: InstanceAiMessage[], requestId: string): string | null {
	for (const msg of messages) {
		if (msg.role !== 'assistant' || !msg.agentTree) continue;
		const found = findToolCallInTree(msg.agentTree, requestId);
		if (found) {
			return msg.runIds?.at(-1) ?? msg.runId ?? null;
		}
	}
	return null;
}

export function resolveActiveRunId(options: {
	confirmRunId?: string;
	apiRunId?: string;
	messages: InstanceAiMessage[];
	requestId?: string;
}): string | null {
	if (options.confirmRunId) return options.confirmRunId;
	if (options.apiRunId) return options.apiRunId;
	if (options.requestId) {
		const fromRequest = findRunIdForRequestId(options.messages, options.requestId);
		if (fromRequest) return fromRequest;
	}
	const lastAssistant = findLastAssistantMessage(options.messages);
	if (!lastAssistant) return null;
	return lastAssistant.runIds?.at(-1) ?? lastAssistant.runId ?? null;
}

export function markAssistantMessageStreaming(messages: InstanceAiMessage[], runId: string): void {
	for (const msg of messages) {
		if (msg.role !== 'assistant') continue;
		if (msg.runId === runId || msg.runIds?.includes(runId)) {
			msg.isStreaming = true;
			return;
		}
	}
	const lastAssistant = findLastAssistantMessage(messages);
	if (lastAssistant) lastAssistant.isStreaming = true;
}

export function syncLiveRunFromStatus(
	status: InstanceAiThreadStatusResponse,
	messages: InstanceAiMessage[],
): string | null {
	if (!isOrchestratorLive(status)) return null;

	const runId = resolveActiveRunId({
		apiRunId: status.runId,
		messages,
	});
	if (!runId) return null;

	markAssistantMessageStreaming(messages, runId);
	return runId;
}

export function shouldRearmRunAfterConfirm(payload: InstanceAiConfirmRequest): boolean {
	switch (payload.kind) {
		case 'approval':
			return payload.approved === true;
		case 'credentialSelection':
		case 'domainAccessApprove':
		case 'resourceDecision':
		case 'questions':
		case 'setupWorkflowApply':
		case 'setupWorkflowTestTrigger':
			return true;
		default:
			return false;
	}
}
