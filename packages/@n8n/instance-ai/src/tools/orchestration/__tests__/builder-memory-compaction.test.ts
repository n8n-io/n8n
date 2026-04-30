import type { MastraDBMessage } from '@mastra/core/agent';
import type { MastraCompositeStore } from '@mastra/core/storage';
import type { Workspace } from '@mastra/core/workspace';

import { BuilderSandboxSessionRegistry } from '../../../runtime/builder-sandbox-session-registry';
import { compactBuilderMemoryThread } from '../builder-memory-compaction';

function makeMessage(id: string, text: string): MastraDBMessage {
	return {
		id,
		role: 'assistant',
		threadId: 'builder-thread-1',
		resourceId: 'user-1:workflow-builder',
		createdAt: new Date('2026-01-01T00:00:00.000Z'),
		content: {
			format: 2,
			parts: [{ type: 'text', text }],
			content: text,
		},
	};
}

function makeStorage(memoryStore: unknown): MastraCompositeStore {
	return {
		getStore: jest.fn(async (storeName: string) => {
			await Promise.resolve();
			return storeName === 'memory' ? memoryStore : undefined;
		}),
	} as unknown as MastraCompositeStore;
}

type CompactionInput = Parameters<typeof compactBuilderMemoryThread>[0];

function makeCompactionInput(
	storage: MastraCompositeStore,
	overrides: Partial<CompactionInput> = {},
): CompactionInput {
	return {
		context: {
			storage,
			threadId: 'thread-1',
			runId: 'run-1',
			messageGroupId: 'group-1',
		},
		binding: {
			thread: 'builder-thread-1',
			resource: 'user-1:workflow-builder',
		},
		sessionId: 'builder-session-1',
		workflowId: 'wf-1',
		workItemId: 'wi-1',
		sourceFilePath: '/home/daytona/workspace/src/workflow.ts',
		nodeSummaries: [
			{ name: 'Manual Trigger', type: 'n8n-nodes-base.manualTrigger' },
			{ name: 'Slack', type: 'n8n-nodes-base.slack' },
		],
		triggerNodes: [{ nodeName: 'Manual Trigger', nodeType: 'n8n-nodes-base.manualTrigger' }],
		mockedNodeNames: ['Slack'],
		mockedCredentialTypes: ['slackApi'],
		mockedCredentialsByNode: { Slack: ['slackApi'] },
		verification: {
			attempted: true,
			success: true,
			executionId: 'exec-1',
			status: 'success',
			evidence: { nodesExecuted: ['Manual Trigger', 'Slack'] },
		},
		lastRequestedChange: 'Send a Slack message when run.',
		finalBuilderResult: 'Workflow ready.',
		...overrides,
	};
}

describe('compactBuilderMemoryThread', () => {
	it('compacts a large builder thread into one summary message', async () => {
		const messages = [
			makeMessage('msg-1', 'initial builder prompt'),
			makeMessage('msg-2', 'tool output '.repeat(2000)),
		];
		const memoryStore = {
			listMessages: jest.fn(async () => {
				await Promise.resolve();
				return { messages, total: messages.length, page: 0, perPage: false, hasMore: false };
			}),
			deleteMessages: jest.fn(async () => {
				await Promise.resolve();
			}),
			saveMessages: jest.fn(async ({ messages: saved }: { messages: MastraDBMessage[] }) => {
				await Promise.resolve();
				return { messages: saved };
			}),
		};

		const result = await compactBuilderMemoryThread(makeCompactionInput(makeStorage(memoryStore)));

		expect(result.compacted).toBe(true);
		expect(result.rawMessageCount).toBe(2);
		expect(result.compactedMessageCount).toBe(1);
		expect(memoryStore.deleteMessages).toHaveBeenCalledWith(['msg-1', 'msg-2']);
		expect(memoryStore.saveMessages).toHaveBeenCalledTimes(1);

		const savedMessage = memoryStore.saveMessages.mock.calls[0][0].messages[0];
		expect(savedMessage.threadId).toBe('builder-thread-1');
		expect(savedMessage.resourceId).toBe('user-1:workflow-builder');
		expect(savedMessage.type).toBe('builder-memory-summary');
		expect(savedMessage.content.content).toContain('<builder-memory-summary>');
		expect(savedMessage.content.content).toContain('Workflow ID: wf-1');
		expect(savedMessage.content.content).toContain('Slack: n8n-nodes-base.slack');
		expect(savedMessage.content.content).toContain('Mocked credential types: slackApi');
		expect(savedMessage.content.content).toContain('Execution ID: exec-1');
		expect(savedMessage.content.content).toContain('Workflow ready.');
	});

	it('keeps the active sandbox session registry unchanged', async () => {
		const registry = new BuilderSandboxSessionRegistry(600_000);
		const cleanup = jest.fn(async () => {
			await Promise.resolve();
		});
		const session = registry.create({
			threadId: 'thread-1',
			workflowId: 'wf-1',
			workItemId: 'wi-1',
			builderThreadId: 'builder-thread-1',
			builderResourceId: 'user-1:workflow-builder',
			builderWorkspace: {
				workspace: {} as Workspace,
				cleanup,
			},
			root: '/home/daytona/workspace',
		});

		const memoryStore = {
			listMessages: jest.fn(async () => {
				await Promise.resolve();
				return {
					messages: [makeMessage('msg-1', 'raw transcript')],
					total: 1,
					page: 0,
					perPage: false,
					hasMore: false,
				};
			}),
			deleteMessages: jest.fn(async () => {
				await Promise.resolve();
			}),
			saveMessages: jest.fn(async ({ messages }: { messages: MastraDBMessage[] }) => {
				await Promise.resolve();
				return { messages };
			}),
		};

		await compactBuilderMemoryThread(makeCompactionInput(makeStorage(memoryStore)));

		expect(session).toBeDefined();
		await registry.release(session!.sessionId, { keep: true, reason: 'test' });
		const reacquired = registry.acquireByWorkflowId('thread-1', 'wf-1');
		expect(reacquired?.sessionId).toBe(session!.sessionId);
		await registry.cleanupAll('test_cleanup');
	});

	it('re-compacts after a follow-up without duplicating old summaries', async () => {
		let storedMessages = [
			makeMessage('msg-1', 'raw builder transcript'),
			makeMessage('msg-2', 'first tool output'),
		];
		const memoryStore = {
			listMessages: jest.fn(async () => {
				await Promise.resolve();
				return {
					messages: storedMessages,
					total: storedMessages.length,
					page: 0,
					perPage: false,
					hasMore: false,
				};
			}),
			deleteMessages: jest.fn(async (messageIds: string[]) => {
				await Promise.resolve();
				storedMessages = storedMessages.filter((message) => !messageIds.includes(message.id));
			}),
			saveMessages: jest.fn(async ({ messages }: { messages: MastraDBMessage[] }) => {
				await Promise.resolve();
				storedMessages.push(...messages);
				return { messages };
			}),
		};
		const storage = makeStorage(memoryStore);

		await compactBuilderMemoryThread(makeCompactionInput(storage));
		storedMessages.push(makeMessage('msg-3', 'follow-up raw transcript'));

		await compactBuilderMemoryThread(
			makeCompactionInput(storage, {
				lastRequestedChange: 'Change the Slack channel.',
				finalBuilderResult: 'Workflow updated.',
			}),
		);

		expect(storedMessages).toHaveLength(1);
		expect(storedMessages[0].type).toBe('builder-memory-summary');
		expect(storedMessages[0].content.content).toContain('Change the Slack channel.');
		expect(storedMessages[0].content.content).toContain('Workflow updated.');
		expect(storedMessages[0].content.content).not.toContain('raw builder transcript');
	});

	it('skips safely when memory storage lacks mutation methods', async () => {
		const result = await compactBuilderMemoryThread(
			makeCompactionInput(
				makeStorage({
					listMessages: jest.fn(),
				}),
			),
		);

		expect(result.compacted).toBe(false);
		expect(result.skippedReason).toBe('mutation_methods_unavailable');
	});
});
