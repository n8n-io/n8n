import type { SerializableAgentState } from '@n8n/agents';
import type { InstanceAiBuildMode } from '@n8n/api-types';
import type { User } from '@n8n/db';
import { RunStateRegistry } from '@n8n/instance-ai';
import { mock } from 'vitest-mock-extended';

import { InstanceAiService } from '../instance-ai.service';
import type {
	RebuildSuspendedRunOutcome,
	ResumableOrphan,
} from '../suspended-run-restorer.service';

type Persistence = NonNullable<SerializableAgentState['persistence']>;
type ServiceInternals = {
	instanceAiConfig: { runDebugEnabled: boolean };
	aiConfig: { modelStreamIdleTimeoutMs: number; modelStreamFirstOutputTimeoutMs: number };
	runState: RunStateRegistry<User>;
	modeWhenEnvironmentBuilt?: InstanceAiBuildMode;
	threadPushRef: Map<string, string>;
	checkpointStore: { load: (key: string) => Promise<SerializableAgentState | undefined> };
	revalidateActiveUser: (userId: string) => Promise<User>;
	createExecutionEnvironment: () => Promise<{
		orchestrationContext: object;
	}>;
	createAgentFromEnvironment: () => Promise<object>;
	buildOrchestratorAgentStreamOptions: (
		user: User,
		threadId: string,
		runId: string,
		signal: AbortSignal,
	) => { persistence: Persistence };
	buildOrchestratorResumeAgentOptions: (
		user: User,
		threadId: string,
		runId: string,
		agentRunId: string,
		toolCallId: string,
		signal: AbortSignal,
	) => { persistence: Persistence };
	rebuildSuspendedRunFromCheckpoint: (
		orphan: ResumableOrphan,
	) => Promise<RebuildSuspendedRunOutcome>;
};

const user = mock<User>({ id: 'user-1' });
const orphan = mock<ResumableOrphan>({
	userId: user.id,
	threadId: 'thread-1',
	runId: 'run-1',
	checkpointKey: 'checkpoint-1',
	toolCallId: 'tool-1',
	requestId: 'request-1',
	checkpointTaskId: null,
});

function createService(checkpoint?: SerializableAgentState): ServiceInternals {
	const service = Object.create(InstanceAiService.prototype) as ServiceInternals;
	service.instanceAiConfig = { runDebugEnabled: false };
	service.aiConfig = { modelStreamIdleTimeoutMs: 90_000, modelStreamFirstOutputTimeoutMs: 180_000 };
	service.runState = new RunStateRegistry((owner: User) => owner.id);
	service.threadPushRef = new Map();
	service.checkpointStore = { load: vi.fn(async () => checkpoint) };
	service.revalidateActiveUser = vi.fn(async () => user);
	service.createExecutionEnvironment = vi.fn(async () => {
		service.modeWhenEnvironmentBuilt = service.runState.getBuildMode(orphan.threadId);
		return { orchestrationContext: {} };
	});
	service.createAgentFromEnvironment = vi.fn(async () => ({}));
	return service;
}

describe('InstanceAiService build mode recovery', () => {
	it.each(['default', 'progressive'] as const)(
		'preserves mode %s when a saved run is rebuilt in a fresh service',
		async (mode) => {
			const original = createService();
			original.runState.setBuildMode(orphan.threadId, mode);
			original.runState.setPromptVersion(orphan.threadId, `${mode}@1`);
			const signal = new AbortController().signal;
			const { persistence } = original.buildOrchestratorAgentStreamOptions(
				user,
				orphan.threadId,
				orphan.runId,
				signal,
			);
			expect(persistence.hostMetadata).toEqual({ buildMode: mode, promptVersion: `${mode}@1` });

			const checkpoint = mock<SerializableAgentState>({
				persistence: structuredClone(persistence),
			});
			const restored = createService(checkpoint);
			const result = await restored.rebuildSuspendedRunFromCheckpoint(orphan);
			expect(result.kind).toBe('ready');
			if (result.kind !== 'ready') throw new Error('Expected a restored run');
			expect(restored.runState.getBuildMode(orphan.threadId)).toBe(mode);
			expect(restored.modeWhenEnvironmentBuilt).toBe(mode);
			expect(restored.runState.getPromptVersion(orphan.threadId)).toBe(`${mode}@1`);

			const resumed = restored.buildOrchestratorResumeAgentOptions(
				user,
				orphan.threadId,
				orphan.runId,
				orphan.checkpointKey,
				orphan.toolCallId,
				signal,
			);
			expect(resumed.persistence.hostMetadata).toEqual({
				buildMode: mode,
				promptVersion: `${mode}@1`,
			});
		},
	);

	it.each([undefined, null, 'unknown'])(
		'uses control for checkpoint mode %s',
		async (buildMode) => {
			const checkpoint = mock<SerializableAgentState>({
				persistence: {
					resourceId: user.id,
					threadId: orphan.threadId,
					...(buildMode !== undefined ? { hostMetadata: { buildMode } } : {}),
				},
			});
			const restored = createService(checkpoint);
			restored.runState.setBuildMode(orphan.threadId, 'progressive');
			const result = await restored.rebuildSuspendedRunFromCheckpoint(orphan);
			expect(result.kind).toBe('ready');
			if (result.kind !== 'ready') throw new Error('Expected a restored run');
			expect(restored.runState.getBuildMode(orphan.threadId)).toBe('default');
			expect(restored.modeWhenEnvironmentBuilt).toBe('default');
		},
	);
});
