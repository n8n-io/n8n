import type {
	Agent as RuntimeAgent,
	CredentialProvider,
	SerializableAgentState,
	StreamChunk,
	StreamResult,
} from '@n8n/agents';
import type { Logger } from '@n8n/backend-common';
import type { AgentsConfig } from '@n8n/config';
import type { User } from '@n8n/db';
import { mock } from 'jest-mock-extended';

import {
	builderRuntimeCacheKey,
	type AgentStreamControl,
	type CachedAgentRuntime,
	type SteerableTurnsConfig,
	type AgentsRuntimeService,
} from '../../agents-runtime.service';
import type { AgentsService } from '../../agents.service';
import type { N8NCheckpointStorage } from '../../integrations/n8n-checkpoint-storage';
import type { N8nMemory } from '../../integrations/n8n-memory';
import type { AgentCheckpointRepository } from '../../repositories/agent-checkpoint.repository';
import type { AgentsBuilderSettingsService } from '../agents-builder-settings.service';
import type { AgentsBuilderToolsService } from '../agents-builder-tools.service';
import { AgentsBuilderService } from '../agents-builder.service';

import type { NodeCatalogService } from '@/node-catalog';

const agentId = 'agent-1';
const projectId = 'project-1';
const userId = 'user-1';

async function collect(iterable: AsyncIterable<StreamChunk>): Promise<StreamChunk[]> {
	const chunks: StreamChunk[] = [];
	for await (const chunk of iterable) chunks.push(chunk);
	return chunks;
}

function makeStreamResult(
	chunks: StreamChunk[] = [{ type: 'finish', finishReason: 'stop' }],
): StreamResult {
	return {
		runId: 'run-1',
		stream: new ReadableStream<StreamChunk>({
			start(controller) {
				for (const chunk of chunks) controller.enqueue(chunk);
				controller.close();
			},
		}),
		getState: () => {
			throw new Error('not implemented');
		},
	};
}

function makeService() {
	const agentsRuntimeService = mock<AgentsRuntimeService>();
	const n8nCheckpointStorage = mock<N8NCheckpointStorage>();
	const builder = mock<RuntimeAgent>();
	const user = mock<User>({ id: userId });
	const credentialProvider = mock<CredentialProvider>();

	const service = new AgentsBuilderService(
		mock<Logger>(),
		mock<AgentsService>(),
		agentsRuntimeService,
		mock<NodeCatalogService>(),
		mock<AgentsBuilderToolsService>(),
		mock<N8nMemory>(),
		mock<AgentsBuilderSettingsService>(),
		n8nCheckpointStorage,
		mock<AgentCheckpointRepository>(),
		{ modules: [] } as unknown as AgentsConfig,
	);

	jest.spyOn(service as never, 'getBuilderRuntime').mockResolvedValue({
		agent: builder,
		agentId,
		projectId,
		toolRegistry: new Map(),
	} satisfies CachedAgentRuntime as never);

	return { service, agentsRuntimeService, n8nCheckpointStorage, builder, user, credentialProvider };
}

describe('AgentsBuilderService streaming', () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	it('streams normal builder turns through streamSteerableTurns', async () => {
		const { service, agentsRuntimeService, builder, user, credentialProvider } = makeService();
		const control = mock<AgentStreamControl>({ signal: new AbortController().signal });
		builder.stream.mockResolvedValue(makeStreamResult());

		agentsRuntimeService.streamSteerableTurns.mockImplementation(async function* (
			config: SteerableTurnsConfig,
		) {
			expect(config).toMatchObject({
				message: 'build this agent',
				streamKey: builderRuntimeCacheKey({ projectId, agentId, userId }),
			});
			expect(config).not.toHaveProperty('initialTurn');
			yield* config.streamTurn('build this agent', control);
		});

		await collect(
			service.buildAgent(agentId, projectId, 'build this agent', credentialProvider, user),
		);

		expect(agentsRuntimeService.streamSteerableTurns.mock.calls).toHaveLength(1);
		expect(builder.stream.mock.calls).toEqual([
			[
				'build this agent',
				{
					persistence: { threadId: `builder:${agentId}`, resourceId: user.id },
					abortSignal: control.signal,
				},
			],
		]);
	});

	it('streams resumed builder turns through streamSteerableTurns', async () => {
		const {
			service,
			agentsRuntimeService,
			n8nCheckpointStorage,
			builder,
			user,
			credentialProvider,
		} = makeService();
		const control = mock<AgentStreamControl>({ signal: new AbortController().signal });
		const resumeData = { approved: true };
		n8nCheckpointStorage.getStatus.mockResolvedValue({
			status: 'active',
			checkpoint: {} as SerializableAgentState,
		});
		builder.resume.mockResolvedValue(makeStreamResult());

		agentsRuntimeService.streamSteerableTurns.mockImplementation(async function* (
			config: SteerableTurnsConfig,
		) {
			expect(config).toMatchObject({
				streamKey: builderRuntimeCacheKey({ projectId, agentId, userId }),
			});
			expect(config).not.toHaveProperty('message');
			expect(config.initialTurn).toBeDefined();
			yield* config.initialTurn!(control);
		});

		await collect(
			service.resumeBuild(
				agentId,
				projectId,
				'run-1',
				'tool-call-1',
				resumeData,
				credentialProvider,
				user,
			),
		);

		expect(agentsRuntimeService.streamSteerableTurns.mock.calls).toHaveLength(1);
		expect(builder.resume.mock.calls).toEqual([
			[
				'stream',
				resumeData,
				{
					runId: 'run-1',
					toolCallId: 'tool-call-1',
					abortSignal: control.signal,
				},
			],
		]);
	});
});
