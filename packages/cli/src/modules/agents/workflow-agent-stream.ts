import { SKILL_LOAD_TOOL_NAME, type StreamChunk } from '@n8n/agents';
import type { AgentNodeCapability, PushPayload } from '@n8n/api-types';
import type { ExecuteAgentInvocationContext, IWorkflowExecuteAdditionalData } from 'n8n-workflow';

type WorkflowAgentStreamEvent =
	| { type: 'response-begin' }
	| { type: 'response-delta'; delta: string }
	| { type: 'response-end' }
	| { type: 'capability-start'; toolCallId: string; capability: AgentNodeCapability }
	| {
			type: 'capability-end';
			toolCallId: string;
			capability: AgentNodeCapability;
			status: 'succeeded' | 'failed';
	  };

export type WorkflowAgentStreamObserver = (event: WorkflowAgentStreamEvent) => Promise<void>;

type PendingTool = {
	toolName: string;
	input: unknown;
};

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function capabilityFor(toolName: string, input: unknown): AgentNodeCapability | undefined {
	if (toolName !== SKILL_LOAD_TOOL_NAME) return { kind: 'tool', name: toolName };
	if (!isRecord(input)) return undefined;

	const id =
		typeof input.skillId === 'string' && input.skillId.length > 0 ? input.skillId : undefined;
	const name = typeof input.name === 'string' && input.name.length > 0 ? input.name : undefined;
	if (id) return { kind: 'skill', id, ...(name ? { name } : {}) };
	if (name) return { kind: 'skill', name };
	return undefined;
}

export function createWorkflowAgentStreamObserver({
	additionalData,
	executionId,
	invocation,
}: {
	additionalData: IWorkflowExecuteAdditionalData;
	executionId: string;
	invocation: ExecuteAgentInvocationContext;
}): WorkflowAgentStreamObserver {
	let sequenceNumber = 0;

	return async (event) => {
		switch (event.type) {
			case 'response-begin':
				await invocation.sendResponseChunk?.('begin');
				return;
			case 'response-delta':
				await invocation.sendResponseChunk?.('item', event.delta);
				return;
			case 'response-end':
				await invocation.sendResponseChunk?.('end');
				return;
		}

		if (!additionalData.sendDataToUI) return;

		const data: PushPayload<'agentNodeProgress'> = {
			executionId,
			nodeId: invocation.nodeId,
			nodeName: invocation.nodeName,
			runIndex: invocation.runIndex,
			itemIndex: invocation.itemIndex,
			sequenceNumber: sequenceNumber++,
			toolCallId: event.toolCallId,
			capability: event.capability,
			status: event.type === 'capability-start' ? 'running' : event.status,
		};
		additionalData.sendDataToUI('agentNodeProgress', data);
	};
}

export class WorkflowAgentStreamAdapter {
	private openTextId: string | undefined;

	private readonly pendingTools = new Map<string, PendingTool>();

	private readonly runningCapabilities = new Map<string, AgentNodeCapability>();

	constructor(private readonly observer?: WorkflowAgentStreamObserver) {}

	async observe(chunk: StreamChunk): Promise<void> {
		switch (chunk.type) {
			case 'text-start':
				await this.beginText(chunk.id);
				return;
			case 'text-delta':
				if (chunk.delta.length === 0) return;
				if (this.openTextId !== chunk.id) await this.beginText(chunk.id);
				await this.emit({ type: 'response-delta', delta: chunk.delta });
				return;
			case 'text-end':
				await this.endText();
				return;
			case 'finish':
				await this.endText();
				return;
			case 'error':
				this.fail();
				return;
			case 'tool-call':
				this.pendingTools.set(chunk.toolCallId, {
					toolName: chunk.toolName,
					input: chunk.input,
				});
				return;
			case 'tool-execution-start':
				await this.startCapability(chunk.toolCallId, chunk.toolName);
				return;
			case 'tool-execution-end':
				await this.endCapability(chunk.toolCallId, chunk.isError ? 'failed' : 'succeeded');
				return;
			case 'tool-result':
				await this.endCapability(chunk.toolCallId, chunk.isError === true ? 'failed' : 'succeeded');
				return;
		}
	}

	fail(): void {
		this.openTextId = undefined;
	}

	private async beginText(id: string): Promise<void> {
		if (this.openTextId !== undefined) await this.endText();
		this.openTextId = id;
		await this.emit({ type: 'response-begin' });
	}

	private async endText(): Promise<void> {
		if (this.openTextId === undefined) return;
		this.openTextId = undefined;
		await this.emit({ type: 'response-end' });
	}

	private async startCapability(toolCallId: string, toolName: string): Promise<void> {
		const pending = this.pendingTools.get(toolCallId);
		const capability = capabilityFor(toolName, pending?.input);
		if (!capability) return;

		this.runningCapabilities.set(toolCallId, capability);
		await this.emit({ type: 'capability-start', toolCallId, capability });
	}

	private async endCapability(toolCallId: string, status: 'succeeded' | 'failed'): Promise<void> {
		const capability = this.runningCapabilities.get(toolCallId);
		if (!capability) return;

		this.runningCapabilities.delete(toolCallId);
		this.pendingTools.delete(toolCallId);
		await this.emit({ type: 'capability-end', toolCallId, capability, status });
	}

	private async emit(event: WorkflowAgentStreamEvent): Promise<void> {
		await this.observer?.(event);
	}
}
