import type { Workspace } from '@mastra/core/workspace';

import type { BuilderWorkspace } from '../../workspace/builder-sandbox-factory';
import { BuilderSandboxSessionRegistry } from '../builder-sandbox-session-registry';

function makeBuilderWorkspace(cleanup = jest.fn(async () => {})): BuilderWorkspace {
	return {
		workspace: { id: 'workspace' } as unknown as Workspace,
		cleanup,
	};
}

function createSession(registry: BuilderSandboxSessionRegistry, cleanup = jest.fn(async () => {})) {
	return registry.create({
		threadId: 'thread-1',
		workflowId: 'workflow-1',
		workItemId: 'wi_1',
		builderThreadId: 'builder-thread-1',
		builderResourceId: 'user-1:workflow-builder',
		builderWorkspace: makeBuilderWorkspace(cleanup),
		root: '/workspace',
	});
}

describe('BuilderSandboxSessionRegistry', () => {
	afterEach(() => {
		jest.useRealTimers();
	});

	it('returns undefined when retention is disabled', () => {
		const registry = new BuilderSandboxSessionRegistry(0);

		const session = createSession(registry);

		expect(session).toBeUndefined();
		expect(registry.acquireByWorkflowId('thread-1', 'workflow-1')).toBeUndefined();
	});

	it('releases and reacquires a session by workflow ID', async () => {
		const cleanup = jest.fn(async () => {});
		const registry = new BuilderSandboxSessionRegistry(10_000);
		const session = createSession(registry, cleanup);

		expect(session).toBeDefined();
		await registry.release(session!.sessionId, {
			keep: true,
			reason: 'test_release',
		});

		const acquired = registry.acquireByWorkflowId('thread-1', 'workflow-1');

		expect(acquired?.sessionId).toBe(session!.sessionId);
		expect(acquired?.busy).toBe(true);
		expect(registry.acquireByWorkflowId('thread-1', 'workflow-1')).toBeUndefined();
		expect(cleanup).not.toHaveBeenCalled();
	});

	it('aliases a submitted workflow ID to the retained session', async () => {
		const registry = new BuilderSandboxSessionRegistry(10_000);
		const session = createSession(registry);

		expect(session).toBeDefined();
		registry.aliasWorkflowId(session!.sessionId, 'workflow-2');
		await registry.release(session!.sessionId, {
			keep: true,
			reason: 'test_release',
		});

		expect(registry.acquireByWorkflowId('thread-1', 'workflow-1')).toBeUndefined();
		expect(registry.acquireByWorkflowId('thread-1', 'workflow-2')?.sessionId).toBe(
			session!.sessionId,
		);
	});

	it('cleans up after the TTL expires', async () => {
		jest.useFakeTimers();
		const cleanup = jest.fn(async () => {});
		const registry = new BuilderSandboxSessionRegistry(1_000);
		const session = createSession(registry, cleanup);

		expect(session).toBeDefined();
		await registry.release(session!.sessionId, {
			keep: true,
			reason: 'test_release',
		});

		jest.advanceTimersByTime(1_000);
		await Promise.resolve();

		expect(cleanup).toHaveBeenCalledTimes(1);
		expect(registry.acquireByWorkflowId('thread-1', 'workflow-1')).toBeUndefined();
	});

	it('cleans up immediately when release is not kept', async () => {
		const cleanup = jest.fn(async () => {});
		const registry = new BuilderSandboxSessionRegistry(10_000);
		const session = createSession(registry, cleanup);

		expect(session).toBeDefined();
		await registry.release(session!.sessionId, {
			keep: false,
			reason: 'aborted',
		});

		expect(cleanup).toHaveBeenCalledTimes(1);
		expect(registry.acquireByWorkflowId('thread-1', 'workflow-1')).toBeUndefined();
	});

	it('keeps the newer workflow alias when cleaning up an older session', async () => {
		const cleanupOne = jest.fn(async () => {});
		const cleanupTwo = jest.fn(async () => {});
		const registry = new BuilderSandboxSessionRegistry(10_000);
		const oldSession = createSession(registry, cleanupOne);

		expect(oldSession).toBeDefined();
		await registry.release(oldSession!.sessionId, {
			keep: true,
			reason: 'test_release',
		});

		const newSession = registry.create({
			threadId: 'thread-1',
			workflowId: 'workflow-1',
			workItemId: 'wi_2',
			builderThreadId: 'builder-thread-2',
			builderResourceId: 'user-1:workflow-builder',
			builderWorkspace: makeBuilderWorkspace(cleanupTwo),
			root: '/workspace',
		});

		expect(newSession).toBeDefined();
		await registry.release(newSession!.sessionId, {
			keep: true,
			reason: 'test_release',
		});

		await registry.release(oldSession!.sessionId, {
			keep: false,
			reason: 'replaced',
		});

		expect(cleanupOne).toHaveBeenCalledTimes(1);
		expect(registry.acquireByWorkflowId('thread-1', 'workflow-1')?.sessionId).toBe(
			newSession!.sessionId,
		);
		expect(cleanupTwo).not.toHaveBeenCalled();
	});

	it('cleans up sessions for a single thread', async () => {
		const cleanupOne = jest.fn(async () => {});
		const cleanupTwo = jest.fn(async () => {});
		const registry = new BuilderSandboxSessionRegistry(10_000);
		createSession(registry, cleanupOne);
		registry.create({
			threadId: 'thread-2',
			workflowId: 'workflow-2',
			workItemId: 'wi_2',
			builderThreadId: 'builder-thread-2',
			builderResourceId: 'user-1:workflow-builder',
			builderWorkspace: makeBuilderWorkspace(cleanupTwo),
			root: '/workspace',
		});

		await registry.cleanupThread('thread-1', 'thread_deleted');

		expect(cleanupOne).toHaveBeenCalledTimes(1);
		expect(cleanupTwo).not.toHaveBeenCalled();
	});
});
