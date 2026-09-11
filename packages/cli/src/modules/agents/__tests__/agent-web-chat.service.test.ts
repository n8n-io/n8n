import type { StreamChunk } from '@n8n/agents';
import { APPROVAL_TOOL_NAME, N8N_CHAT_ACTION_TOOL_NAME } from '@n8n/api-types';
import { mockLogger } from '@n8n/backend-test-utils';
import { mock } from 'vitest-mock-extended';

import type { CredentialsService } from '@/credentials/credentials.service';
import type { JwtService } from '@/services/jwt.service';

import type { AgentExecutionOrchestratorService } from '../agent-execution-orchestrator.service';
import { AgentWebChatService } from '../agent-web-chat.service';
import type { ResolvedWebChannel, WebChatSession } from '../agent-web-chat.service';
import type { Agent } from '../entities/agent.entity';
import type { AgentRepository } from '../repositories/agent.repository';

const integrationId = '11111111-1111-1111-1111-111111111111';
const sessionId = '22222222-2222-2222-2222-222222222222';

const channel: ResolvedWebChannel = {
	agent: { id: 'agent-1', projectId: 'project-1', name: 'Bot' } as Agent,
	settings: { accessMode: 'public' },
	integrationId,
};

const session: WebChatSession = { integrationId, sessionId };

function makeService() {
	const orchestrator = mock<AgentExecutionOrchestratorService>();
	const service = new AgentWebChatService(
		mock<AgentRepository>(),
		orchestrator,
		mock<CredentialsService>(),
		mock<JwtService>(),
		mockLogger(),
	);
	return { service, orchestrator };
}

async function* fromChunks(chunks: StreamChunk[]): AsyncGenerator<StreamChunk> {
	for (const chunk of chunks) yield chunk;
}

async function collect<T>(generator: AsyncGenerator<T>): Promise<T[]> {
	const events: T[] = [];
	for await (const event of generator) events.push(event);
	return events;
}

describe('AgentWebChatService.streamTurn', () => {
	it('forwards HITL cards and chat_action results, and drops other tool data', async () => {
		const { service, orchestrator } = makeService();
		orchestrator.executeForChatPublished.mockReturnValue(
			fromChunks([
				{ type: 'text-start', id: 't-1' },
				{ type: 'text-delta', id: 't-1', delta: 'Please confirm' },
				{ type: 'text-end', id: 't-1' },
				{
					type: 'tool-call',
					toolCallId: 'tc-secret',
					toolName: 'lookup',
					input: { apiKey: 'secret' },
				},
				{
					type: 'tool-result',
					toolCallId: 'tc-secret',
					toolName: 'lookup',
					output: { rows: [1] },
				},
				{
					type: 'tool-call',
					toolCallId: 'tc-card',
					toolName: N8N_CHAT_ACTION_TOOL_NAME,
					input: {
						action: 'respond',
						input: { message: { card: { title: 'Choose', components: [] } } },
					},
				},
				{
					type: 'tool-call-suspended',
					runId: 'run-1',
					toolCallId: 'tc-hitl',
					toolName: APPROVAL_TOOL_NAME,
					suspendPayload: {
						type: 'approval',
						toolName: 'delete_record',
						args: { id: '1' },
					},
				},
			]),
		);

		const events = await collect(
			service.streamTurn({
				channel,
				session,
				message: 'hello',
				abortSignal: new AbortController().signal,
			}),
		);

		expect(events).toEqual([
			{ type: 'text-start', id: 't-1' },
			{ type: 'text-delta', id: 't-1', delta: 'Please confirm' },
			{ type: 'text-end', id: 't-1' },
			{
				type: 'tool-call',
				toolCallId: 'tc-card',
				toolName: N8N_CHAT_ACTION_TOOL_NAME,
				input: {
					action: 'respond',
					input: { message: { card: { title: 'Choose', components: [] } } },
				},
			},
			{
				type: 'tool-call-suspended',
				payload: {
					toolCallId: 'tc-hitl',
					runId: 'run-1',
					toolName: APPROVAL_TOOL_NAME,
					input: {
						type: 'approval',
						toolName: 'delete_record',
						args: { id: '1' },
					},
				},
			},
		]);
		expect(events.some((event) => 'toolCallId' in event && event.toolCallId === 'tc-secret')).toBe(
			false,
		);
	});

	it('does not emit done after a suspension', async () => {
		const { service, orchestrator } = makeService();
		orchestrator.executeForChatPublished.mockReturnValue(
			fromChunks([
				{
					type: 'tool-call-suspended',
					runId: 'run-1',
					toolCallId: 'tc-1',
					toolName: APPROVAL_TOOL_NAME,
					suspendPayload: { type: 'approval', toolName: 'delete_record', args: {} },
				},
			]),
		);

		const events = await collect(
			service.streamTurn({
				channel,
				session,
				message: 'hello',
				abortSignal: new AbortController().signal,
			}),
		);

		expect(events.map((event) => event.type)).toEqual(['tool-call-suspended']);
	});
});
