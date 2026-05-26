import type { BuiltMemory } from '@n8n/agents';

import type { OrchestrationContext } from '../../../types';
import {
	createSubAgentPersistence,
	createSubAgentResourceId,
	createSubAgentResourceIdPrefix,
} from '../agent-persistence';

const PARENT_THREAD_ID = '00000000-0000-4000-8000-000000000001';

function createContext(memory?: BuiltMemory): OrchestrationContext {
	return {
		threadId: PARENT_THREAD_ID,
		userId: 'user-1',
		memory,
	} as OrchestrationContext;
}

describe('sub-agent persistence', () => {
	it('creates hidden parent-scoped persistence and saves the child thread', async () => {
		const saveThread = jest.fn();
		const context = createContext({ saveThread } as unknown as BuiltMemory);

		const persistence = await createSubAgentPersistence(context, {
			agentKind: 'Workflow Builder !!!',
		});

		expect(persistence.threadId).toMatch(
			/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
		);
		expect(persistence.threadId).not.toBe(PARENT_THREAD_ID);
		expect(persistence.resourceId).toBe(
			`instance-ai-subagent:${PARENT_THREAD_ID}:workflow-builder`,
		);
		expect(saveThread).toHaveBeenCalledWith({
			id: persistence.threadId,
			resourceId: persistence.resourceId,
			title: '',
			metadata: {
				instanceAiHidden: true,
				instanceAiThreadKind: 'sub-agent',
				parentThreadId: PARENT_THREAD_ID,
				agentKind: 'workflow-builder',
			},
		});
	});

	it('respects caller-provided thread and resource IDs', async () => {
		const saveThread = jest.fn();
		const context = createContext({ saveThread } as unknown as BuiltMemory);
		const threadId = '00000000-0000-4000-8000-000000000002';
		const resourceId = createSubAgentResourceId(PARENT_THREAD_ID, 'workflow-builder');

		const persistence = await createSubAgentPersistence(context, {
			agentKind: 'workflow-builder',
			threadId,
			resourceId,
		});

		expect(persistence).toEqual({ threadId, resourceId });
		expect(saveThread).toHaveBeenCalledWith(
			expect.objectContaining({
				id: threadId,
				resourceId,
			}),
		);
	});

	it('builds the cleanup prefix for all sub-agent threads under one parent', () => {
		expect(createSubAgentResourceIdPrefix(PARENT_THREAD_ID)).toBe(
			`instance-ai-subagent:${PARENT_THREAD_ID}:`,
		);
	});
});
