import type { AgentDbMessage, BuiltMemory } from '@n8n/agents';

import { BuilderSandboxSessionRegistry } from '../../../runtime/builder-sandbox-session-registry';
import { compactBuilderMemoryThread } from '../builder-memory-compaction';

type CompactionInput = Parameters<typeof compactBuilderMemoryThread>[0];

type TestBuilderMemoryMessage = AgentDbMessage & {
	role: 'assistant';
	type: 'llm';
	content: Array<{ type: 'text'; text: string }>;
};

function makeMessage(id: string, text: string): TestBuilderMemoryMessage {
	return {
		id,
		role: 'assistant',
		createdAt: new Date('2026-01-01T00:00:00.000Z'),
		type: 'llm',
		content: [{ type: 'text', text }],
	};
}

function makeMemory(memoryStore: Partial<BuiltMemory>): jest.Mocked<BuiltMemory> {
	return {
		getThread: jest.fn(async () => {
			await Promise.resolve();
			return null;
		}),
		saveThread: jest.fn(async () => {
			await Promise.resolve();
			return {
				id: 'builder-thread-1',
				resourceId: 'user-1:workflow-builder',
				createdAt: new Date(),
				updatedAt: new Date(),
			};
		}),
		deleteThread: jest.fn(async () => {
			await Promise.resolve();
		}),
		getMessages: jest.fn(async () => {
			await Promise.resolve();
			return [];
		}),
		saveMessages: jest.fn(async () => {
			await Promise.resolve();
		}),
		deleteMessages: jest.fn(async () => {
			await Promise.resolve();
		}),
		...memoryStore,
	} as jest.Mocked<BuiltMemory>;
}

function makeCompactionInput(
	memory: CompactionInput['context']['memory'],
	overrides: Partial<CompactionInput> = {},
): CompactionInput {
	return {
		context: {
			memory,
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
		const memoryStore = makeMemory({
			getMessages: jest.fn(async () => {
				await Promise.resolve();
				return messages;
			}),
			deleteMessages: jest.fn(async () => {
				await Promise.resolve();
			}),
			saveMessages: jest.fn(async () => {
				await Promise.resolve();
			}),
		});

		const result = await compactBuilderMemoryThread(makeCompactionInput(memoryStore));

		expect(result.compacted).toBe(true);
		expect(result.rawMessageCount).toBe(2);
		expect(result.compactedMessageCount).toBe(1);
		expect(memoryStore.deleteMessages).toHaveBeenCalledWith(['msg-1', 'msg-2']);
		expect(memoryStore.saveMessages).toHaveBeenCalledTimes(1);

		const savedMessage = memoryStore.saveMessages.mock.calls[0][0]
			.messages[0] as TestBuilderMemoryMessage;
		expect(memoryStore.saveMessages).toHaveBeenCalledWith(
			expect.objectContaining({
				threadId: 'builder-thread-1',
				resourceId: 'user-1:workflow-builder',
			}),
		);
		expect(savedMessage.type).toBe('llm');
		const savedText = savedMessage.content[0].text;
		expect(savedText).toContain('<builder-memory-summary>');
		expect(savedText).toContain('Workflow ID: wf-1');
		expect(savedText).toContain('Slack: n8n-nodes-base.slack');
		expect(savedText).toContain('Mocked credential types: slackApi');
		expect(savedText).toContain('Execution ID: exec-1');
		expect(savedText).toContain('Workflow ready.');
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
				workspace: {} as never,
				cleanup,
			},
			root: '/home/daytona/workspace',
		});

		const memoryStore = makeMemory({
			getMessages: jest.fn(async () => {
				await Promise.resolve();
				return [makeMessage('msg-1', 'raw transcript')];
			}),
			deleteMessages: jest.fn(async () => {
				await Promise.resolve();
			}),
			saveMessages: jest.fn(async () => {
				await Promise.resolve();
			}),
		});

		await compactBuilderMemoryThread(makeCompactionInput(memoryStore));

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
		const memoryStore = makeMemory({
			getMessages: jest.fn(async () => {
				await Promise.resolve();
				return storedMessages;
			}),
			deleteMessages: jest.fn(async (messageIds: string[]) => {
				await Promise.resolve();
				storedMessages = storedMessages.filter((message) => !messageIds.includes(message.id));
			}),
			saveMessages: jest.fn(async ({ messages }: { messages: AgentDbMessage[] }) => {
				await Promise.resolve();
				storedMessages.push(...(messages as TestBuilderMemoryMessage[]));
			}),
		});

		await compactBuilderMemoryThread(makeCompactionInput(memoryStore));
		storedMessages.push(makeMessage('msg-3', 'follow-up raw transcript'));

		await compactBuilderMemoryThread(
			makeCompactionInput(memoryStore, {
				lastRequestedChange: 'Change the Slack channel.',
				finalBuilderResult: 'Workflow updated.',
			}),
		);

		expect(storedMessages).toHaveLength(1);
		expect(storedMessages[0].type).toBe('llm');
		expect(storedMessages[0].content[0].text).toContain('Change the Slack channel.');
		expect(storedMessages[0].content[0].text).toContain('Workflow updated.');
		expect(storedMessages[0].content[0].text).not.toContain('raw builder transcript');
	});

	it('skips safely when memory storage lacks mutation methods', async () => {
		const memoryStore = {
			getMessages: jest.fn(async () => {
				await Promise.resolve();
				return [];
			}),
		} as unknown as BuiltMemory;

		const result = await compactBuilderMemoryThread(makeCompactionInput(memoryStore));

		expect(result.compacted).toBe(false);
		expect(result.skippedReason).toBe('mutation_methods_unavailable');
		expect(memoryStore.getMessages).not.toHaveBeenCalled();
	});
});
